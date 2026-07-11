import type { PlatformAdapter, PlatformMetadata } from "./adapter.js";
import type { ConfigResponse, PlacementConfig } from "./config.js";
import type { TranzmitIdentity } from "./identity.js";
import type { WebViewDocumentSpec } from "./spec.js";
import { hashString, resolveIdentity, stableJson } from "./identity.js";
import { PaywallIntegrityError, assertDocumentIntegrity } from "./integrity.js";

export const DEFAULT_API_BASE_URL = "https://api.tranzmitai.com";

/**
 * Railway-provided domain. Some mobile carriers (notably Indian ISPs) block
 * DNS for the shared `*.up.railway.app` zone, which is why it is no longer
 * the primary host — but it stays reachable everywhere else, so it serves as
 * the built-in fallback.
 */
export const LEGACY_API_BASE_URL = "https://api-production-2146.up.railway.app";

export const DEFAULT_FALLBACK_API_BASE_URLS = [LEGACY_API_BASE_URL];

const CONFIG_KEY_PREFIX = "tranzmit:config:";
const API_FETCH_TIMEOUT_MS = 8000;
const DOCUMENT_FETCH_TIMEOUT_MS = 20_000;
const SERVER_RETRY_DELAY_MS = 350;

export interface InitConfig {
  publicKey: string;
  userId?: string;
  identifiers?: Record<string, string>;
  userTraits?: Record<string, unknown>;
  privateTraits?: Record<string, unknown>;
  apiBaseUrl?: string;
  /**
   * Extra hosts tried in order when `apiBaseUrl` is unreachable. When
   * `apiBaseUrl` is set and this is undefined, no fallback occurs — an
   * explicit host (e.g. staging) must never silently fall back to production.
   */
  fallbackApiBaseUrls?: string[];
  onError?: (error: TranzmitError) => void;
  debug?: boolean;
}

export interface TranzmitError extends Error {
  name: "TranzmitError";
  code: string;
  recoverable: boolean;
}

export interface SharedClient {
  init(config: InitConfig): Promise<void>;
  refreshConfig(): Promise<void>;
  setTraits(traits: Record<string, unknown>, options?: { merge?: boolean }): Promise<void>;
  getPlacement(trigger: string): PlacementConfig | null;
  track(event: string, properties?: Record<string, unknown>): void;
  reportConversion(data: Record<string, unknown>): void;
  flush(): Promise<void>;
  isReady(): boolean;
  getConfig(): ConfigResponse | null;
  getSessionId(): string;
  getIdentity(): TranzmitIdentity | null;
  reset(): void;
}

interface QueuedEvent {
  event: string;
  timestamp: number;
  properties?: Record<string, unknown>;
  attempts: number;
}

interface HostedDocumentContent {
  html: string;
  css?: string;
  js?: string;
  baseUrl?: string;
}

interface FetchedDocumentResponse {
  ok: boolean;
  status: number;
  headers: Headers;
  body: string;
}

export function createTranzmitClient(
  adapter: PlatformAdapter,
  metadata: PlatformMetadata = {}
): SharedClient {
  let currentConfig: InitConfig | null = null;
  let currentIdentity: TranzmitIdentity | null = null;
  let configResponse: ConfigResponse | null = null;
  let initialized = false;
  let initPromise: Promise<void> | null = null;
  let currentInitKey: string | null = null;
  let sessionId = generateSessionId();
  let queue: QueuedEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribeBackground: (() => void) | null = null;
  let unsubscribeForeground: (() => void) | null = null;
  let activeApiBaseUrl: string | null = null;
  let configGeneration = 0;
  const hostedDocumentLoads = new Map<string, Promise<HostedDocumentContent>>();

  /** Hosts to try, with the last host that succeeded moved to the front. */
  function hostCandidates(config: InitConfig): string[] {
    const hosts = resolveApiBaseUrls(config.apiBaseUrl, config.fallbackApiBaseUrls);
    if (!activeApiBaseUrl || activeApiBaseUrl === hosts[0] || !hosts.includes(activeApiBaseUrl)) {
      return hosts;
    }
    return [activeApiBaseUrl, ...hosts.filter((host) => host !== activeApiBaseUrl)];
  }

  function noteHostSuccess(config: InitConfig, endpoint: string) {
    return (host: string, failures: { host: string; error: string }[]): void => {
      const switched = activeApiBaseUrl !== host;
      activeApiBaseUrl = host;
      const primary = resolveApiBaseUrls(config.apiBaseUrl, config.fallbackApiBaseUrls)[0];
      if (!switched || host === primary) return;

      track("sdk_host_fallback", {
        endpoint,
        host,
        ...(failures.length
          ? { failed_hosts: failures.map((f) => `${f.host}: ${f.error}`).join("; ") }
          : {}),
      });
      config.onError?.(
        makeError(
          "api_host_fallback",
          `Primary API host unreachable for ${endpoint}; using ${host}`,
          true
        )
      );
    };
  }

  async function fetchConfig(config: InitConfig, identity: TranzmitIdentity): Promise<ConfigResponse> {
    if (typeof fetch !== "function") {
      throw new Error("Config fetch unavailable: fetch is not defined");
    }

    const response = await sendAcrossHosts(
      hostCandidates(config),
      "/v1/config",
      (baseUrl, signal) =>
        fetch(`${baseUrl}/v1/config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            publicKey: config.publicKey,
            identity,
            traits: config.userTraits || {},
            privateTraits: config.privateTraits || {},
          }),
        }),
      noteHostSuccess(config, "/v1/config")
    );

    if (!response.ok) {
      throw new Error(`Config fetch failed: HTTP ${response.status}`);
    }

    return response.json() as Promise<ConfigResponse>;
  }

  /**
   * Fetches a hosted document, retrying the same path against every
   * configured host when the document's own origin is unreachable. Covers
   * cached configs whose absolute URLs are pinned to a blocked host.
   */
  async function fetchDocumentAcrossHosts(
    config: InitConfig,
    url: string
  ): Promise<FetchedDocumentResponse> {
    const hosts = hostCandidates(config);
    const originalOrigin = originOf(url);
    const orderedHosts = originalOrigin && !hosts.some((host) => originOf(host) === originalOrigin)
      ? [originalOrigin, ...hosts]
      : hosts;
    const candidates: string[] = [];
    for (const base of orderedHosts) {
      const rebased = rebaseUrl(url, base);
      if (rebased && !candidates.some((c) => originOf(c) === originOf(rebased))) {
        candidates.push(rebased);
      }
    }
    if (candidates.length === 0) candidates.push(url);
    return sendAcrossHosts(
      candidates.map((c) => originOf(c) ?? c),
      url,
      async (_origin, signal) => {
        const candidate = candidates.find((c) => originOf(c) === _origin) ?? url;
        const response = await fetch(candidate, { signal });
        // Await the body inside the timed operation. React Native's XHR-backed
        // fetch already buffers it, while standards-based fetch may resolve at
        // headers; this keeps the timeout correct in both implementations.
        const body = await response.text();
        return {
          ok: response.ok,
          status: response.status,
          headers: response.headers,
          body,
        };
      },
      noteHostSuccess(config, originOf(url) ? url.slice(originOf(url)!.length) : url),
      { timeoutMs: DOCUMENT_FETCH_TIMEOUT_MS }
    );
  }

  function loadHostedDocument(
    config: InitConfig,
    key: string,
    document: WebViewDocumentSpec
  ): Promise<HostedDocumentContent> {
    const existing = hostedDocumentLoads.get(key);
    if (existing) return existing;

    const load = (async () => {
      const docResponse = await fetchDocumentAcrossHosts(config, document.url!);
      if (!docResponse.ok) {
        throw new Error(`Paywall document fetch failed: HTTP ${docResponse.status}`);
      }

      const contentType = docResponse.headers.get("content-type") || "";
      let content: HostedDocumentContent;
      if (!contentType.includes("application/json")) {
        content = { html: docResponse.body };
      } else {
        const payload = JSON.parse(docResponse.body) as {
          html?: string;
          css?: string;
          js?: string;
          baseUrl?: string;
          integrity?: string;
        };
        if (!payload.html) throw new Error("Paywall document payload is missing html");
        content = {
          html: payload.html,
          css: payload.css,
          js: payload.js,
          baseUrl: payload.baseUrl,
        };
      }

      // Validate before retaining a successful content-addressed promise. A
      // transiently corrupted response must be evicted and fetched again.
      assertDocumentIntegrity({ ...document, ...content }, content.html);
      return content;
    })();

    hostedDocumentLoads.set(key, load);
    // Content-addressed payloads are immutable and can stay warm for this
    // client. Custom URLs are only single-flighted while a request is active.
    void load.then(
      () => {
        if (key.startsWith("url:") && hostedDocumentLoads.get(key) === load) {
          hostedDocumentLoads.delete(key);
        }
      },
      () => {
        if (hostedDocumentLoads.get(key) === load) hostedDocumentLoads.delete(key);
      }
    );
    return load;
  }

  async function hydratePaywallDocuments(config: InitConfig, response: ConfigResponse): Promise<void> {
    const placements = Object.values(response.placements || {});
    const hostedDocuments = new Map<
      string,
      Array<{ spec: PlacementConfig["spec"]; document: WebViewDocumentSpec }>
    >();

    for (const placement of placements) {
      if (!placement) continue;
      const spec = placement.spec;
      const document = spec.document;
      if (!document) {
        throw new Error(`Paywall ${placement.trigger} is missing a WebView document`);
      }
      if (!document.url) {
        if (document.html && document.integrity) assertDocumentIntegrity(document, document.html);
        continue;
      }
      if (document.html) {
        assertDocumentIntegrity(document, document.html);
        continue;
      }

      const key = hostedDocumentHydrationKey(document);
      const group = hostedDocuments.get(key) || [];
      group.push({ spec, document });
      hostedDocuments.set(key, group);
    }

    // Hosted documents can be hundreds of kilobytes. Download unique payloads
    // serially so multiple placements do not divide a weak mobile connection's
    // bandwidth and independently trip the per-document timeout.
    for (const group of hostedDocuments.values()) {
      const source = group[0]!.document;
      const key = hostedDocumentHydrationKey(source);
      const content = await loadHostedDocument(config, key, source);

      for (const target of group) {
        const hydrated = {
          ...target.document,
          html: content.html,
          css: content.css ?? target.document.css,
          js: content.js ?? target.document.js,
          baseUrl: content.baseUrl ?? target.document.baseUrl,
          integrity: target.document.integrity,
        };
        assertDocumentIntegrity(hydrated, content.html);
        target.spec.document = hydrated;
      }
    }
  }

  async function init(config: InitConfig): Promise<void> {
    validatePublicKey(config.publicKey);

    const identity = await resolveIdentity(
      config.publicKey,
      { userId: config.userId, identifiers: config.identifiers },
      adapter.storage
    );
    const nextKey = initKey(config, identity);

    if (currentInitKey === nextKey && initPromise) return initPromise;
    if (currentInitKey === nextKey && initialized) return;

    clearLifecycle();
    clearFlushTimer();
    queue = [];
    currentConfig = config;
    currentIdentity = identity;
    currentInitKey = nextKey;
    configResponse = null;
    initialized = false;
    sessionId = generateSessionId();

    unsubscribeBackground = adapter.lifecycle.onBackground(() => {
      void flush();
    });
    unsubscribeForeground = adapter.lifecycle.onForeground(() => {
      sessionId = generateSessionId();
    });

    const generation = ++configGeneration;
    initPromise = initFromCacheThenNetwork(config, identity, generation);
    return initPromise;
  }

  async function initFromCacheThenNetwork(
    config: InitConfig,
    identity: TranzmitIdentity,
    generation: number
  ): Promise<void> {
    const cached = await getCachedConfig(adapter, config, identity);
    if (generation !== configGeneration) return;
    if (cached) {
      configResponse = cached;
      initialized = true;
      track("page_view");
      void refreshConfig(config, identity);
      return;
    }

    try {
      const fresh = await fetchConfig(config, identity);
      if (generation !== configGeneration) return;
      await hydratePaywallDocuments(config, fresh);
      if (generation !== configGeneration) return;
      configResponse = fresh;
      initialized = true;
      await setCachedConfig(adapter, config, identity, fresh);
      track("page_view");
    } catch (err: any) {
      if (generation !== configGeneration) return;
      const error = makeError(configErrorCode(err, "config_fetch_failed"), err?.message || "Config fetch failed", true);
      config.onError?.(error);
      initPromise = null;
      currentInitKey = null;
      throw error;
    }
  }

  async function refreshConfig(config: InitConfig, identity: TranzmitIdentity): Promise<void> {
    const generation = ++configGeneration;
    try {
      const fresh = await fetchConfig(config, identity);
      if (generation !== configGeneration) return;
      await hydratePaywallDocuments(config, fresh);
      if (generation !== configGeneration) return;
      configResponse = fresh;
      await setCachedConfig(adapter, config, identity, fresh);
    } catch (err: any) {
      if (generation !== configGeneration) return;
      config.onError?.(
        makeError(configErrorCode(err, "config_refresh_failed"), err?.message || "Config refresh failed", true)
      );
    }
  }

  async function refreshCurrentConfig(): Promise<void> {
    if (!currentConfig || !currentIdentity) return;
    const generation = ++configGeneration;
    try {
      const fresh = await fetchConfig(currentConfig, currentIdentity);
      if (generation !== configGeneration) return;
      await hydratePaywallDocuments(currentConfig, fresh);
      if (generation !== configGeneration) return;
      configResponse = fresh;
      initialized = true;
      await setCachedConfig(adapter, currentConfig, currentIdentity, fresh);
    } catch (err: any) {
      if (generation !== configGeneration) return;
      currentConfig.onError?.(
        makeError(configErrorCode(err, "config_refresh_failed"), err?.message || "Config refresh failed", true)
      );
      throw err;
    }
  }

  async function setTraits(
    traits: Record<string, unknown>,
    options?: { merge?: boolean }
  ): Promise<void> {
    // The category is typically set mid-session; wait for the in-flight init so
    // we update a settled config rather than racing the bootstrap fetch.
    if (initPromise) {
      try {
        await initPromise;
      } catch {
        // Init failure is already surfaced via onError; setTraits still tries to
        // fetch below using whatever currentConfig/identity were established.
      }
    }
    if (!currentConfig) return;

    const nextTraits = options?.merge === false
      ? { ...traits }
      : { ...(currentConfig.userTraits || {}), ...traits };
    currentConfig = { ...currentConfig, userTraits: nextTraits };
    if (currentIdentity) {
      currentInitKey = initKey(currentConfig, currentIdentity);
    }

    // Refetch + hydrate so the backend can re-route on the new traits. Resolves
    // only after hydration, so awaiting setTraits is the "paywall is warm"
    // signal. On failure the previous configResponse (and its hydrated default)
    // is left intact for gate() to fall back to.
    await refreshCurrentConfig();
  }

  function getPlacement(trigger: string): PlacementConfig | null {
    const placement = configResponse?.placements?.[trigger];
    if (!initialized || !placement || !placement.enabled) return null;
    return placement;
  }

  function track(event: string, properties?: Record<string, unknown>): void {
    if (!currentConfig) return;
    queue.push({
      event,
      timestamp: Date.now(),
      properties: addMetadata(properties),
      attempts: 0,
    });

    if (queue.length > 100) {
      queue = queue.slice(queue.length - 100);
    }

    if (queue.length >= 10) {
      void flush();
    } else if (!timer) {
      timer = setTimeout(() => {
        void flush();
      }, 30_000);
    }
  }

  function reportConversion(data: Record<string, unknown>): void {
    const trigger = typeof data.trigger === "string" ? data.trigger : undefined;
    const placement = trigger ? configResponse?.placements?.[trigger] : null;
    track("conversion", placement ? { ...data, ...attribution(trigger!, placement) } : data);
    void flush();
  }

  async function flush(): Promise<void> {
    if (!currentConfig || queue.length === 0) return;

    clearFlushTimer();
    const batch = queue.splice(0, queue.length);

    if (typeof fetch !== "function") {
      requeue(batch);
      return;
    }

    const config = currentConfig;
    try {
      const response = await sendAcrossHosts(
        hostCandidates(config),
        "/v1/events",
        (baseUrl, signal) =>
          fetch(`${baseUrl}/v1/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal,
            body: JSON.stringify({
              publicKey: config.publicKey,
              userId: config.userId,
              identity: currentIdentity || undefined,
              traits: config.userTraits || {},
              privateTraits: config.privateTraits || {},
              sessionId,
              events: batch.map(({ attempts: _attempts, ...event }) => event),
            }),
          }),
        noteHostSuccess(config, "/v1/events")
      );

      if (!response.ok) {
        throw new Error(`Event flush failed: HTTP ${response.status}`);
      }
    } catch {
      requeue(batch);
    }
  }

  function reset(): void {
    clearLifecycle();
    clearFlushTimer();
    currentConfig = null;
    currentIdentity = null;
    configResponse = null;
    initialized = false;
    initPromise = null;
    currentInitKey = null;
    sessionId = generateSessionId();
    queue = [];
    activeApiBaseUrl = null;
    configGeneration += 1;
    hostedDocumentLoads.clear();
  }

  function addMetadata(properties?: Record<string, unknown>): Record<string, unknown> | undefined {
    const next = { ...(properties || {}) };
    if (metadata.platform) next.platform = metadata.platform;
    if (metadata.os) next.os = metadata.os;
    if (metadata.sdkVersion) next.sdk_version = metadata.sdkVersion;
    return Object.keys(next).length ? next : undefined;
  }

  function attribution(trigger: string, placement: PlacementConfig): Record<string, unknown> {
    const placementId = placement.placement_id || placement.placementId;
    const variantKey = placement.variant_key || placement.variantKey || placement.variantId;
    return {
      trigger,
      variantId: placement.variantId,
      variant_key: variantKey,
      ...(placementId ? { placement_id: placementId } : {}),
    };
  }

  function requeue(events: QueuedEvent[]): void {
    const retryable = events
      .map((event) => ({ ...event, attempts: event.attempts + 1 }))
      .filter((event) => event.attempts <= 3);
    queue = [...retryable, ...queue].slice(-100);
  }

  function clearLifecycle(): void {
    unsubscribeBackground?.();
    unsubscribeForeground?.();
    unsubscribeBackground = null;
    unsubscribeForeground = null;
  }

  function clearFlushTimer(): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return {
    init,
    refreshConfig: refreshCurrentConfig,
    setTraits,
    getPlacement,
    track,
    reportConversion,
    flush,
    isReady: () => initialized,
    getConfig: () => configResponse,
    getSessionId: () => sessionId,
    getIdentity: () => currentIdentity,
    reset,
  };
}

export function resolveApiBaseUrl(explicit?: string): string {
  if (explicit?.trim()) return explicit.replace(/\/$/, "");
  return DEFAULT_API_BASE_URL;
}

/** Hosts to try in order: the primary first, then fallbacks, deduped. */
export function resolveApiBaseUrls(explicit?: string, fallbacks?: string[]): string[] {
  const extras = fallbacks ?? (explicit?.trim() ? [] : DEFAULT_FALLBACK_API_BASE_URLS);
  const hosts = new Set<string>([resolveApiBaseUrl(explicit)]);
  for (const url of extras) {
    const trimmed = url?.trim();
    if (trimmed) hosts.add(trimmed.replace(/\/$/, ""));
  }
  return [...hosts];
}

interface HostFailure {
  host: string;
  error: string;
}

interface HostResponseLike {
  status: number;
  headers?: { get(name: string): string | null };
}

interface SendAcrossHostsOptions {
  timeoutMs?: number;
}

/**
 * Sends a request against each candidate base URL until one answers.
 *
 * Network-level failures (DNS lookup, timeout, connection reset) advance to
 * the next host immediately — a blocked hostname will not recover within a
 * request. 5xx gets one same-host retry before advancing. Any response below
 * 500 is returned to the caller as-is, so 4xx handling stays deterministic
 * and never falls back.
 */
async function sendAcrossHosts<T extends HostResponseLike>(
  hosts: string[],
  endpoint: string,
  send: (baseUrl: string, signal?: AbortSignal) => Promise<T>,
  onHostSuccess?: (host: string, failures: HostFailure[]) => void,
  options: SendAcrossHostsOptions = {}
): Promise<T> {
  const failures: HostFailure[] = [];
  const timeoutMs = options.timeoutMs ?? API_FETCH_TIMEOUT_MS;

  for (const base of hosts) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
      let response: T;
      try {
        response = await send(base, controller?.signal);
      } catch (err: any) {
        failures.push({
          host: base,
          error: err?.name === "AbortError" ? "timed out" : String(err?.message || err),
        });
        break;
      } finally {
        if (timeout) clearTimeout(timeout);
      }
      if (response.status >= 500) {
        if (attempt === 0) {
          await delay(SERVER_RETRY_DELAY_MS);
          continue;
        }
        failures.push({ host: base, error: `HTTP ${response.status}` });
        break;
      }
      const mitigation = response.status === 403
        ? response.headers?.get?.("x-vercel-mitigated")
        : null;
      if (mitigation) {
        failures.push({ host: base, error: `HTTP 403 (${mitigation})` });
        break;
      }
      onHostSuccess?.(base, failures);
      return response;
    }
  }

  throw new Error(
    `All hosts failed for ${endpoint}: ${failures.map((f) => `${f.host}: ${f.error}`).join("; ")}`
  );
}

/**
 * Railway document URLs contain a full-payload content revision in the final
 * path segment. Different placements can therefore point at the same immutable
 * document under different URLs; collapse those downloads without changing the
 * placement-specific URL or integrity metadata stored in config.
 */
function hostedDocumentHydrationKey(document: WebViewDocumentSpec): string {
  const url = document.url || "";
  const path = url.split(/[?#]/, 1)[0] || "";
  const encodedName = path.slice(path.lastIndexOf("/") + 1);
  let name = encodedName;
  try {
    name = decodeURIComponent(encodedName);
  } catch {
    // Keep the encoded path when a custom document URL contains malformed escapes.
  }
  const isTranzmitHostedPath = /\/v1\/paywall-documents\/[^/]+\/[^/]+\/[^/]+$/i.test(path);
  return isTranzmitHostedPath && /:doc-[a-f0-9]{12}\.json$/i.test(name)
    ? `content:${originOf(url) || ""}:${name}:${document.integrity || ""}`
    : `url:${url}`;
}

function originOf(url: string): string | null {
  return /^https?:\/\/[^/]+/.exec(url)?.[0] ?? null;
}

/** Swaps the origin of an absolute URL onto another base, keeping path+query. */
function rebaseUrl(url: string, base: string): string | null {
  const match = /^https?:\/\/[^/]+(\/.*)?$/.exec(url);
  if (!match) return null;
  return base + (match[1] || "/");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function makeError(code: string, message: string, recoverable: boolean): TranzmitError {
  const err = new Error(message) as TranzmitError;
  err.name = "TranzmitError";
  err.code = code;
  err.recoverable = recoverable;
  return err;
}

export function validatePublicKey(key: string): void {
  if (!/^pk_(live|test)_[A-Za-z0-9_]+$/.test(key)) {
    throw makeError("init_invalid_key", "publicKey must match pk_live_xxx or pk_test_xxx", false);
  }
}

async function getCachedConfig(
  adapter: PlatformAdapter,
  config: InitConfig,
  identity: TranzmitIdentity
): Promise<ConfigResponse | null> {
  try {
    const raw = await adapter.storage.get(configStorageKey(config, identity));
    if (!raw) return null;
    const cached = JSON.parse(raw) as { config: ConfigResponse; cachedAt: number };
    // Stale configs are still valuable offline. init() always refreshes in the
    // background when cache exists, so TTL controls freshness, not availability.
    validateCachedPaywallDocuments(cached.config);
    return cached.config;
  } catch {
    return null;
  }
}

async function setCachedConfig(
  adapter: PlatformAdapter,
  config: InitConfig,
  identity: TranzmitIdentity,
  response: ConfigResponse
): Promise<void> {
  try {
    await adapter.storage.set(
      configStorageKey(config, identity),
      JSON.stringify({ config: response, cachedAt: Date.now() })
    );
  } catch {
    // Best-effort cache.
  }
}

function validateCachedPaywallDocuments(config: ConfigResponse): void {
  for (const placement of Object.values(config.placements || {})) {
    if (!placement) continue;
    const document = placement.spec.document;
    if (!document?.html) continue;
    if (document.url || document.integrity) {
      assertDocumentIntegrity(document, document.html);
    }
  }
}

function configErrorCode(error: unknown, fallback: string): string {
  return error instanceof PaywallIntegrityError ? "paywall_integrity_failed" : fallback;
}

function configStorageKey(config: InitConfig, identity: TranzmitIdentity): string {
  return CONFIG_KEY_PREFIX + config.publicKey + ":" + configCacheKey(config, identity);
}

function initKey(config: InitConfig, identity: TranzmitIdentity): string {
  return stableJson({
    publicKey: config.publicKey,
    identity,
    apiBaseUrl: resolveApiBaseUrl(config.apiBaseUrl),
    userTraits: config.userTraits || {},
    privateTraits: config.privateTraits || {},
  });
}

function configCacheKey(config: InitConfig, identity: TranzmitIdentity): string {
  return hashString(stableJson({
    publicKey: config.publicKey,
    identity,
    userTraits: config.userTraits || {},
    privateTraits: config.privateTraits || {},
  }));
}

function generateSessionId(): string {
  return "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}
