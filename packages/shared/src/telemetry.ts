import type { PlacementConfig } from "./config.js";
import type { IdentityStorage } from "./identity.js";

export type SemanticPaywallEventName =
  | "render_confirmed"
  | "scroll_depth"
  | "plan_toggle"
  | "price_visible"
  | "cta_click"
  | "rage_click"
  | "dismissal";

export interface ExposureContext {
  readonly exposureId: string;
  readonly sessionId: string;
  readonly trigger: string;
  readonly paywallId?: string;
  readonly variantId: string;
  readonly variantKey: string;
  readonly creativeId?: string;
  readonly decisionId?: string;
  readonly snapshotId?: string;
  readonly experimentId?: string;
  readonly experimentSnapshotId?: string;
  readonly decisionToken?: string;
}

export interface TelemetryEventInput {
  readonly eventId?: string;
  readonly event: string;
  readonly timestamp: number;
  readonly properties: Readonly<Record<string, unknown>>;
}

export interface QueuedTelemetryEvent extends TelemetryEventInput {
  readonly eventId: string;
}

export interface TelemetryBatch {
  readonly batchId: string;
  readonly events: readonly QueuedTelemetryEvent[];
}

export type CheckoutOutcomeStatus =
  | "checkout_started"
  | "checkout_cancelled"
  | "checkout_failed"
  | "purchase_client_confirmed";

export interface ExposureOutcomeInput {
  readonly exposure: ExposureContext;
  readonly outcome: {
    readonly status: CheckoutOutcomeStatus;
    readonly productId?: string;
    readonly transactionId?: string;
    readonly revenue?: number;
    readonly currency?: string;
  };
}

interface PersistedQueue {
  readonly events: readonly QueuedTelemetryEvent[];
  readonly inFlight?: TelemetryBatch;
}

const QUEUE_PREFIX = "tranzmit:telemetry_queue:";
const MAX_EVENTS = 500;

export class DurableTelemetryQueue {
  private events: QueuedTelemetryEvent[] = [];
  private inFlight: TelemetryBatch | undefined;
  private loaded = false;

  constructor(
    private readonly publicKey: string,
    private readonly storage: IdentityStorage,
    private readonly createId: () => string = generateUuid
  ) {}

  async load(): Promise<void> {
    const raw = await this.storage.get(QUEUE_PREFIX + this.publicKey);
    const persisted = raw ? parsePersistedQueue(raw) : null;
    this.events = persisted ? [...persisted.events] : [];
    this.inFlight = persisted?.inFlight;
    this.loaded = true;
  }

  async enqueue(input: TelemetryEventInput): Promise<void> {
    this.assertLoaded();
    const eventId = input.eventId ?? this.createId();
    if (!isUuid(eventId)) throw new TelemetryQueueError("eventId must be a UUID");
    if (!isSafeString(input.event, 80)) throw new TelemetryQueueError("event name is invalid");
    if (!Number.isFinite(input.timestamp)) throw new TelemetryQueueError("event timestamp is invalid");
    if (this.hasEvent(eventId)) return;
    this.events.push({ ...input, eventId });
    if (this.events.length > MAX_EVENTS) this.events.splice(0, this.events.length - MAX_EVENTS);
    await this.persist();
  }

  async beginBatch(limit = 50): Promise<TelemetryBatch | null> {
    this.assertLoaded();
    if (this.inFlight) return this.inFlight;
    if (this.events.length === 0) return null;
    this.inFlight = {
      batchId: this.createId(),
      events: this.events.slice(0, Math.max(1, Math.min(limit, 100))),
    };
    if (!isUuid(this.inFlight.batchId)) throw new TelemetryQueueError("batchId must be a UUID");
    await this.persist();
    return this.inFlight;
  }

  async acknowledge(batchId: string): Promise<void> {
    this.assertLoaded();
    if (!this.inFlight || this.inFlight.batchId !== batchId) return;
    const acknowledged = new Set(this.inFlight.events.map((event) => event.eventId));
    this.events = this.events.filter((event) => !acknowledged.has(event.eventId));
    this.inFlight = undefined;
    await this.persist();
  }

  async retry(batchId: string): Promise<void> {
    this.assertLoaded();
    if (this.inFlight?.batchId === batchId) await this.persist();
  }

  pendingCount(): number {
    this.assertLoaded();
    return this.events.length;
  }

  private hasEvent(eventId: string): boolean {
    return this.events.some((event) => event.eventId === eventId)
      || Boolean(this.inFlight?.events.some((event) => event.eventId === eventId));
  }

  private async persist(): Promise<void> {
    const state: PersistedQueue = {
      events: this.events,
      ...(this.inFlight ? { inFlight: this.inFlight } : {}),
    };
    await this.storage.set(QUEUE_PREFIX + this.publicKey, JSON.stringify(state));
  }

  private assertLoaded(): void {
    if (!this.loaded) throw new TelemetryQueueError("Telemetry queue must be loaded before use");
  }
}

export class TelemetryQueueError extends Error {
  readonly name = "TelemetryQueueError";
}

export function exposureContextFromPlacement(
  placement: PlacementConfig,
  sessionId: string,
  createId: () => string = generateUuid
): ExposureContext {
  const variantKey = placement.variant_key ?? placement.variantKey ?? placement.variantId;
  return {
    exposureId: createId(),
    sessionId,
    trigger: placement.trigger,
    variantId: placement.variantId,
    variantKey,
    ...((placement.paywall_id ?? placement.paywallId) ? { paywallId: placement.paywall_id ?? placement.paywallId } : {}),
    ...((placement.creative_id ?? placement.creativeId) ? { creativeId: placement.creative_id ?? placement.creativeId } : {}),
    ...((placement.decision_id ?? placement.decisionId) ? { decisionId: placement.decision_id ?? placement.decisionId } : {}),
    ...((placement.snapshot_id ?? placement.snapshotId) ? { snapshotId: placement.snapshot_id ?? placement.snapshotId } : {}),
    ...((placement.experiment_id ?? placement.experimentId) ? { experimentId: placement.experiment_id ?? placement.experimentId } : {}),
    ...((placement.experiment_snapshot_id ?? placement.experimentSnapshotId)
      ? { experimentSnapshotId: placement.experiment_snapshot_id ?? placement.experimentSnapshotId }
      : {}),
    ...((placement.decision_token ?? placement.decisionToken) ? { decisionToken: placement.decision_token ?? placement.decisionToken } : {}),
  };
}

export function hasExactExposureLinkage(context: ExposureContext): boolean {
  return Boolean(
    context.paywallId
    && context.creativeId
    && context.decisionId
    && context.snapshotId
    && context.experimentId
    && context.experimentSnapshotId
    && context.decisionToken
  );
}

export function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function deterministicReplaySample(exposureId: string, percent: number): boolean {
  if (percent <= 0) return false;
  if (percent >= 100) return true;
  let hash = 2166136261;
  for (let index = 0; index < exposureId.length; index += 1) {
    hash ^= exposureId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 10_000 < Math.round(percent * 100);
}

export function sanitizeTelemetryProperties(
  input: Readonly<Record<string, unknown>> | undefined
): Record<string, unknown> | undefined {
  if (!input) return undefined;
  const blocked = /(dom|html|text|email|phone|name|trait|selector|url|cookie|token|password|address)/i;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (blocked.test(key) && key !== "decision_token") continue;
    if (typeof value === "string" && value.length <= 256) output[key] = value;
    if (typeof value === "number" && Number.isFinite(value)) output[key] = value;
    if (typeof value === "boolean") output[key] = value;
  }
  return Object.keys(output).length > 0 ? output : undefined;
}

function parsePersistedQueue(raw: string): PersistedQueue | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isObject(value) || !Array.isArray(value.events)) return null;
    const events = value.events.map(parseQueuedEvent).filter(isPresent);
    const inFlight = parseBatch(value.inFlight);
    return { events, ...(inFlight ? { inFlight } : {}) };
  } catch (error: unknown) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

function parseQueuedEvent(value: unknown): QueuedTelemetryEvent | null {
  if (!isObject(value)) return null;
  if (!isUuid(value.eventId) || !isSafeString(value.event, 80)) return null;
  if (typeof value.timestamp !== "number" || !Number.isFinite(value.timestamp)) return null;
  if (!isObject(value.properties)) return null;
  return { eventId: value.eventId, event: value.event, timestamp: value.timestamp, properties: value.properties };
}

function parseBatch(value: unknown): TelemetryBatch | null {
  if (!isObject(value) || !isUuid(value.batchId) || !Array.isArray(value.events)) return null;
  const events = value.events.map(parseQueuedEvent).filter(isPresent);
  return events.length > 0 ? { batchId: value.batchId, events } : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
