import type { ReactNode } from "react";
import type { PlacementConfig, ProductSpec } from "@tranzmit/shared";
import type { CheckoutAppInput, CheckoutContext, ResolvedCheckoutApp } from "./checkout.js";

export type PresentationMode = "modal" | "sheet" | "fullscreen" | "inline";
export type FallbackReason =
  | "not_ready"
  | "placement_not_found"
  | "render_error"
  | "integrity_failed"
  | "invalid_paywall"
  | "unsupported_version";

export interface TranzmitProviderProps {
  publicKey: string;
  userId?: string;
  identifiers?: Record<string, string>;
  userTraits?: Record<string, unknown>;
  privateTraits?: Record<string, unknown>;
  apiBaseUrl?: string;
  /**
   * Extra hosts tried in order when `apiBaseUrl` is unreachable. When
   * `apiBaseUrl` is set and this is omitted, no fallback occurs — an explicit
   * host (e.g. staging) never silently falls back to production.
   */
  fallbackApiBaseUrls?: string[];
  /**
   * Active locale (for example `es` or `es-MX`) used to localize paywall text
   * tokens from `spec.localization`. When omitted, the spec's default locale is
   * used.
   */
  locale?: string;
  /**
   * Installed UPI payment apps reported by the host app (the SDK cannot query
   * package visibility itself). Sanitized once; the WebView only ever sees
   * `{ id, name }` pairs — never a `packageName` field. Registry apps get a
   * Tranzmit alias id; a non-registry app is identified by its package name
   * as its id.
   */
  checkoutApps?: CheckoutAppInput[];
  onError?: (error: Error) => void;
  debug?: boolean;
  children: ReactNode;
}

export interface GateOptions {
  onCTA?: (product: ProductSpec, checkout?: CheckoutContext) => void;
  onDismiss?: () => void;
  onFallback?: (event: FallbackEvent) => void;
  onImpression?: () => void;
  presentation?: PresentationMode;
  /**
   * Default true. When false the paywall stays up after a CTA (a failed UPI
   * mandate must not strand the user); the host dismisses via the gate result.
   */
  dismissOnCTA?: boolean;
}

export interface PreloadPlacementOptions {
  presentation?: PresentationMode;
}

export type PreloadStatus = "loading" | "ready" | "failed";

export interface PreloadResult {
  ok: boolean;
  trigger: string;
  status: PreloadStatus;
  reason?: FallbackReason;
  error?: Error;
  placement?: PlacementConfig;
  variantId?: string;
}

export interface FallbackEvent {
  trigger: string;
  reason: FallbackReason;
  error?: Error;
  placement?: PlacementConfig;
  variantId?: string;
}

export interface GateResult {
  shown: boolean;
  variantId?: string;
  dismiss: () => void;
}

export interface ReportConversionData {
  trigger?: string;
  variantId?: string;
  productId?: string;
  revenue?: number;
  currency?: string;
  [key: string]: unknown;
}

export interface TranzmitContextValue {
  isReady: boolean;
  ready: boolean;
  user?: PaywallUserContext;
  locale?: string;
  checkoutApps?: ResolvedCheckoutApp[];
  gate: (trigger: string, options?: GateOptions) => GateResult;
  preloadPlacement: (trigger: string, options?: PreloadPlacementOptions) => Promise<PreloadResult>;
  track: (event: string, properties?: Record<string, unknown>) => void;
  reportConversion: (data: ReportConversionData) => void;
  refreshConfig: () => Promise<void>;
  setTraits: (traits: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
  flush: () => Promise<void>;
  getPlacement: (trigger: string) => PlacementConfig | null;
}

export interface ActivePaywall {
  id: string;
  trigger: string;
  placement: PlacementConfig;
  presentation: PresentationMode;
  options: GateOptions;
  shownAt: number;
}

export interface PreloadedPaywall {
  id: string;
  trigger: string;
  placement: PlacementConfig;
  presentation: PresentationMode;
  signature: string;
  status: PreloadStatus;
  error?: Error;
  active?: ActivePaywall;
}

/**
 * Minimal, resolved user identity exposed to the paywall WebView so hosted
 * documents can personalize runtime resources (for example a per-user image URL
 * via a `data-tranzmit-src` template). No traits or raw identifier maps are
 * exposed; only the resolved id and its components.
 */
export interface PaywallUserContext {
  /** Resolved id: the app-provided userId when present, otherwise the stableID. */
  id?: string;
  /** App-provided user id, if a logged-in user was passed to the provider. */
  userId?: string;
  /** SDK-generated anonymous stable id. */
  stableID?: string;
}
