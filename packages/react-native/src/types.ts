import type { ReactNode } from "react";
import type { PlacementConfig, ProductSpec } from "@tranzmit/shared";

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
   * Active locale (for example `es` or `es-MX`) used to localize paywall text
   * tokens from `spec.localization`. When omitted, the spec's default locale is
   * used.
   */
  locale?: string;
  onError?: (error: Error) => void;
  debug?: boolean;
  children: ReactNode;
}

export interface GateOptions {
  onCTA?: (product: ProductSpec) => void;
  onDismiss?: () => void;
  onFallback?: (event: FallbackEvent) => void;
  onImpression?: () => void;
  presentation?: PresentationMode;
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
  gate: (trigger: string, options?: GateOptions) => GateResult;
  track: (event: string, properties?: Record<string, unknown>) => void;
  reportConversion: (data: ReportConversionData) => void;
  refreshConfig: () => Promise<void>;
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
