import type { CheckoutUiConfig } from "@tranzmit/shared";

/**
 * Native-side helpers for the embedded UPI checkout ("pay-bar"). The host app
 * reports installed payment apps; this module sanitizes that list once so the
 * WebView only ever sees display-safe `{ id, name }` pairs — never a
 * `packageName` field. Registry apps are identified by a Tranzmit alias id;
 * a non-registry app is identified by its package name as its id. The document
 * can only echo an id back and the SDK resolves it against this list natively,
 * so a document can never route to an arbitrary package or open apps.
 */

export const KNOWN_UPI_APPS: Record<string, { id: string; name: string }> = {
  "net.one97.paytm": { id: "paytm", name: "Paytm" },
  "com.phonepe.app": { id: "phonepe", name: "PhonePe" },
  "com.google.android.apps.nbu.paisa.user": { id: "gpay", name: "Google Pay" },
  "in.org.npci.upiapp": { id: "bhim", name: "BHIM" },
  "in.amazon.mShop.android.shopping": { id: "amazonpay", name: "Amazon Pay" },
  "com.dreamplug.androidapp": { id: "cred", name: "CRED" },
};

export interface CheckoutAppInput {
  packageName: string;
  name?: string;
  id?: string;
}

export interface ResolvedCheckoutApp {
  id: string;
  name: string;
  packageName: string;
}

/**
 * Checkout details delivered alongside the product on a CTA. `provider` is the
 * spec's opaque provider payload (order tokens etc.), passed through verbatim.
 */
export interface CheckoutContext {
  paymentApp?: ResolvedCheckoutApp;
  provider?: Record<string, unknown>;
}

const APP_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const MAX_APPS = 16;
const MAX_APP_NAME_LENGTH = 48;
const MAX_APP_PRIORITY = 32;
// C0/C1 control chars plus every Unicode format character (category Cf) that
// could visually spoof a trusted app name in the pay-bar. \p{Cf} is a strict
// superset of the contract's enumerated bidi list (U+200E/F, U+202A-U+202E,
// U+2066-U+2069): it additionally strips invisible characters such as
// ZWSP/ZWNJ/ZWJ (U+200B-U+200D), soft hyphen (U+00AD), word joiner (U+2060),
// and BOM (U+FEFF), which would otherwise let a zero-width-spaced "GooglePay"
// bypass the anti-spoof drop while rendering identically to "Google Pay".
const CONTROL_AND_BIDI_PATTERN = /[\u0000-\u001F\u007F-\u009F]|\p{Cf}/gu;
const REGISTRY_APP_IDS = new Set(Object.values(KNOWN_UPI_APPS).map((app) => app.id));
const REGISTRY_APP_NAMES = new Set(
  Object.values(KNOWN_UPI_APPS).map((app) => app.name.toLowerCase().replace(/\s+/g, "")),
);

export function sanitizeCheckoutApps(apps: unknown): ResolvedCheckoutApp[] {
  if (!Array.isArray(apps)) return [];
  const out: ResolvedCheckoutApp[] = [];
  const seenIds = new Set<string>();
  for (const entry of apps) {
    if (out.length >= MAX_APPS) break;
    if (typeof entry !== "object" || entry === null) continue;
    const packageName = (entry as CheckoutAppInput).packageName;
    if (typeof packageName !== "string") continue;

    const known = KNOWN_UPI_APPS[packageName];
    let resolved: ResolvedCheckoutApp | undefined;
    if (known) {
      // Registry apps always use the registry display name; the
      // device-reported name is ignored.
      resolved = { id: known.id, name: known.name, packageName };
    } else {
      if (!APP_ID_PATTERN.test(packageName)) continue;
      // An unknown app whose packageName equals a registry id (e.g. a bare
      // "paytm") would impersonate that registry app in dedup and analytics;
      // real Android package names contain a dot, so nothing legitimate is lost.
      if (REGISTRY_APP_IDS.has(packageName)) continue;
      const name = sanitizeAppName((entry as CheckoutAppInput).name);
      if (!name) continue;
      // Anti-spoof: an unknown app impersonating a registry display name
      // (e.g. a malicious app calling itself "Google Pay") is dropped.
      if (REGISTRY_APP_NAMES.has(name.toLowerCase().replace(/\s+/g, ""))) continue;
      resolved = { id: packageName, name, packageName };
    }

    if (seenIds.has(resolved.id)) continue;
    seenIds.add(resolved.id);
    out.push(resolved);
  }
  return out;
}

export function sanitizeCheckoutUi(ui: unknown): CheckoutUiConfig {
  const input = typeof ui === "object" && ui !== null ? ui as Record<string, unknown> : {};
  const out: CheckoutUiConfig = {
    enabled: typeof input.enabled === "boolean" ? input.enabled : true,
    showToggle: typeof input.showToggle === "boolean" ? input.showToggle : true,
    maxVisibleApps: sanitizeMaxVisibleApps(input.maxVisibleApps),
    iconStyle: input.iconStyle === "circle" ? "circle" : "tile",
    fallbackToPlainCta: typeof input.fallbackToPlainCta === "boolean" ? input.fallbackToPlainCta : true,
  };
  if (Array.isArray(input.appPriority)) {
    out.appPriority = input.appPriority
      .filter((id): id is string => typeof id === "string" && APP_ID_PATTERN.test(id))
      .slice(0, MAX_APP_PRIORITY);
  }
  if (typeof input.defaultApp === "string" && APP_ID_PATTERN.test(input.defaultApp)) {
    out.defaultApp = input.defaultApp;
  }
  return out;
}

export function resolveDefaultApp(
  apps: ResolvedCheckoutApp[],
  ui: CheckoutUiConfig,
): ResolvedCheckoutApp | undefined {
  if (ui.defaultApp) {
    const match = apps.find((app) => app.id === ui.defaultApp);
    if (match) return match;
  }
  for (const id of ui.appPriority || []) {
    const match = apps.find((app) => app.id === id);
    if (match) return match;
  }
  return apps[0];
}

/**
 * Analytics normalization: unknown apps report as "other" so raw installed-app
 * inventory never lands in the events pipeline.
 */
export function checkoutAnalyticsAppId(appId: string): string {
  return REGISTRY_APP_IDS.has(appId) ? appId : "other";
}

function sanitizeAppName(name: unknown): string | undefined {
  if (typeof name !== "string") return undefined;
  const cleaned = name
    .replace(CONTROL_AND_BIDI_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_APP_NAME_LENGTH)
    // The 48-char cap can slice an astral character in half; a lone high
    // surrogate renders as U+FFFD and breaks strict-UTF-8 consumers.
    .replace(/[\uD800-\uDBFF]$/, "");
  return cleaned || undefined;
}

function sanitizeMaxVisibleApps(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return 5;
  return Math.min(value, 12);
}
