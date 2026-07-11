import type { SemanticPaywallEventName } from "./telemetry.js";

export interface BridgeExpectation {
  readonly bridgeNonce: string;
  readonly exposureId: string;
}

export interface SemanticBridgeEvent {
  readonly event: SemanticPaywallEventName;
  readonly properties: Readonly<Record<string, string | number | boolean>>;
}

export function parseSemanticBridgeMessage(
  raw: string,
  expected: BridgeExpectation
): SemanticBridgeEvent | null {
  if (raw.length > 4_096) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error: unknown) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
  if (!isObject(value) || value.type !== "telemetry") return null;
  if (value.bridge_nonce !== expected.bridgeNonce || value.exposure_id !== expected.exposureId) return null;
  if (!isObject(value.properties)) return null;

  switch (value.event) {
    case "render_confirmed":
      return Object.keys(value.properties).length === 0
        ? { event: "render_confirmed", properties: {} }
        : null;
    case "scroll_depth":
      return percentEvent("scroll_depth", "depth_percent", value.properties);
    case "price_visible":
      return priceVisibility(value.properties);
    case "plan_toggle":
      return planToggle(value.properties);
    case "cta_click":
      return optionalProductEvent("cta_click", value.properties);
    case "rage_click":
      return rageClick(value.properties);
    case "dismissal":
      return dismissal(value.properties);
    default:
      return null;
  }
}

function percentEvent(
  event: "scroll_depth",
  field: "depth_percent",
  properties: Record<string, unknown>
): SemanticBridgeEvent | null {
  const percent = properties[field];
  if (!isPercent(percent) || Object.keys(properties).some((key) => key !== field)) return null;
  return { event, properties: { [field]: percent } };
}

function priceVisibility(properties: Record<string, unknown>): SemanticBridgeEvent | null {
  if (!onlyKeys(properties, ["product_id", "visible_percent", "is_visible"])) return null;
  if (!isPercent(properties.visible_percent) || typeof properties.is_visible !== "boolean") return null;
  const productId = optionalSafeString(properties.product_id, 128);
  if (properties.product_id !== undefined && productId === null) return null;
  return {
    event: "price_visible",
    properties: {
      visible_percent: properties.visible_percent,
      is_visible: properties.is_visible,
      ...(productId ? { product_id: productId } : {}),
    },
  };
}

function planToggle(properties: Record<string, unknown>): SemanticBridgeEvent | null {
  if (!onlyKeys(properties, ["from_plan_id", "to_plan_id"])) return null;
  const from = optionalSafeString(properties.from_plan_id, 128);
  const to = optionalSafeString(properties.to_plan_id, 128);
  if (!to || (properties.from_plan_id !== undefined && from === null)) return null;
  return { event: "plan_toggle", properties: { ...(from ? { from_plan_id: from } : {}), to_plan_id: to } };
}

function optionalProductEvent(
  event: "cta_click",
  properties: Record<string, unknown>
): SemanticBridgeEvent | null {
  if (!onlyKeys(properties, ["product_id"])) return null;
  const productId = optionalSafeString(properties.product_id, 128);
  if (properties.product_id !== undefined && productId === null) return null;
  return { event, properties: productId ? { product_id: productId } : {} };
}

function rageClick(properties: Record<string, unknown>): SemanticBridgeEvent | null {
  if (!onlyKeys(properties, ["click_count", "window_ms", "target_role"])) return null;
  const count = properties.click_count;
  const windowMs = properties.window_ms;
  const role = optionalSafeString(properties.target_role, 40);
  if (!Number.isInteger(count) || typeof count !== "number" || count < 3 || count > 20) return null;
  if (!Number.isInteger(windowMs) || typeof windowMs !== "number" || windowMs < 100 || windowMs > 10_000) return null;
  if (properties.target_role !== undefined && role === null) return null;
  return { event: "rage_click", properties: { click_count: count, window_ms: windowMs, ...(role ? { target_role: role } : {}) } };
}

function dismissal(properties: Record<string, unknown>): SemanticBridgeEvent | null {
  if (!onlyKeys(properties, ["method"])) return null;
  const method = properties.method;
  if (method !== "button" && method !== "backdrop" && method !== "gesture" && method !== "system") return null;
  return { event: "dismissal", properties: { method } };
}

function onlyKeys(properties: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(properties).every((key) => allowed.includes(key));
}

function isPercent(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
}

function optionalSafeString(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  return typeof value === "string" && value.length > 0 && value.length <= maxLength ? value : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
