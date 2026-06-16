import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createTranzmitClient, type SharedClient, type TranzmitIdentity } from "@tranzmit/shared";
import { reactNativeAdapter, reactNativeMetadata } from "./adapter.js";
import { PaywallHost } from "./PaywallHost.js";
import { TranzmitContext } from "./TranzmitContext.js";
import type {
  ActivePaywall,
  GateOptions,
  GateResult,
  PaywallUserContext,
  ReportConversionData,
  FallbackReason,
  TranzmitContextValue,
  TranzmitProviderProps,
} from "./types.js";

const noopResult: GateResult = { shown: false, dismiss: () => {} };

export function TranzmitProvider({
  publicKey,
  userId,
  identifiers,
  userTraits,
  privateTraits,
  apiBaseUrl,
  locale,
  onError,
  debug,
  children,
}: TranzmitProviderProps) {
  const clientRef = useRef<SharedClient | null>(null);
  const activeRef = useRef<Map<string, ActivePaywall>>(new Map());
  // Traits set at runtime via setTraits (for example the category resolved
  // mid-session). Kept in a ref and merged into init so a later prop-driven
  // re-init preserves them.
  const dynamicTraitsRef = useRef<Record<string, unknown>>({});
  const [isReady, setIsReady] = useState(false);
  const [readyError, setReadyError] = useState<Error | undefined>();
  const [activePaywalls, setActivePaywalls] = useState<ActivePaywall[]>([]);
  const [userContext, setUserContext] = useState<PaywallUserContext | undefined>();
  const [configVersion, setConfigVersion] = useState(0);

  if (!clientRef.current) {
    clientRef.current = createTranzmitClient(reactNativeAdapter, reactNativeMetadata);
  }

  const dismissPaywall = useCallback((id: string, trackDismissal: boolean) => {
    const active = activeRef.current.get(id);
    if (!active) return;

    activeRef.current.delete(id);
    setActivePaywalls((items) => items.filter((item) => item.id !== id));

    if (trackDismissal) {
      clientRef.current?.track("dismissal", {
        ...attribution(active.trigger, active.placement),
        time_on_screen_ms: Date.now() - active.shownAt,
      });
      active.options.onDismiss?.();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const client = clientRef.current!;
    setIsReady(false);
    setReadyError(undefined);
    activeRef.current.clear();
    setActivePaywalls([]);

    client
      .init({
        publicKey,
        userId,
        identifiers,
        userTraits: { ...userTraits, ...dynamicTraitsRef.current },
        privateTraits,
        apiBaseUrl,
        onError: onError as any,
        debug,
      })
      .then(() => {
        if (!cancelled) {
          setReadyError(undefined);
          setUserContext(deriveUserContext(client.getIdentity()));
          setIsReady(client.isReady());
        }
      })
      .catch((err) => {
        onError?.(err);
        if (!cancelled) {
          setReadyError(err);
          setIsReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, debug, identifiers, onError, privateTraits, publicKey, userId, userTraits]);

  const gate = useCallback((trigger: string, options: GateOptions = {}): GateResult => {
    const client = clientRef.current;
    if (!client?.isReady()) {
      options.onFallback?.({
        trigger,
        reason: fallbackReasonFromError(readyError) || "not_ready",
        error: readyError,
      });
      return noopResult;
    }

    const placement = client.getPlacement(trigger);
    if (!placement) {
      options.onFallback?.({ trigger, reason: "placement_not_found" });
      return noopResult;
    }

    const existing = activeRef.current.get(trigger);
    if (existing) {
      return {
        shown: true,
        variantId: existing.placement.variantId,
        dismiss: () => dismissPaywall(existing.id, true),
      };
    }

    const active: ActivePaywall = {
      id: trigger,
      trigger,
      placement,
      presentation: options.presentation || presentationFromSpec(placement.spec),
      options,
      shownAt: Date.now(),
    };

    activeRef.current.set(trigger, active);
    setActivePaywalls((items) => [...items, active]);
    client.track("impression", attribution(trigger, placement));
    options.onImpression?.();

    return {
      shown: true,
      variantId: placement.variantId,
      dismiss: () => dismissPaywall(active.id, true),
    };
  }, [dismissPaywall, readyError]);

  const handlePaywallError = useCallback((active: ActivePaywall, error: Error) => {
    const reason = fallbackReasonFromError(error) || "render_error";
    clientRef.current?.track("paywall_error", {
      ...attribution(active.trigger, active.placement),
      reason,
      message: error.message,
    });
    dismissPaywall(active.id, false);
    active.options.onFallback?.({
      trigger: active.trigger,
      reason,
      error,
      placement: active.placement,
      variantId: active.placement.variantId,
    });
  }, [dismissPaywall]);

  const track = useCallback((event: string, properties?: Record<string, unknown>) => {
    clientRef.current?.track(event, properties);
  }, []);

  const reportConversion = useCallback((data: ReportConversionData) => {
    clientRef.current?.reportConversion(data);
  }, []);

  const refreshConfig = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    setIsReady(false);
    setReadyError(undefined);
    activeRef.current.clear();
    setActivePaywalls([]);
    try {
      await client.refreshConfig();
      setUserContext(deriveUserContext(client.getIdentity()));
      setIsReady(client.isReady());
    } catch (err: any) {
      setReadyError(err);
      setIsReady(false);
      throw err;
    }
  }, []);

  const setTraits = useCallback(async (traits: Record<string, unknown>, options?: { merge?: boolean }) => {
    const client = clientRef.current;
    if (!client) return;
    dynamicTraitsRef.current = options?.merge === false
      ? { ...traits }
      : { ...dynamicTraitsRef.current, ...traits };
    // Refetch + hydrate in place. isReady stays true so any active paywall is
    // not torn down; bump configVersion afterwards so getPlacement re-renders.
    await client.setTraits(traits, options);
    setConfigVersion((version) => version + 1);
  }, []);

  const value = useMemo<TranzmitContextValue>(() => ({
    isReady,
    ready: isReady,
    user: userContext,
    locale,
    gate,
    track,
    reportConversion,
    refreshConfig,
    setTraits,
    flush: () => clientRef.current?.flush() || Promise.resolve(),
    getPlacement: (trigger) => clientRef.current?.getPlacement(trigger) || null,
  }), [configVersion, gate, isReady, locale, refreshConfig, reportConversion, setTraits, track, userContext]);

  return (
    <TranzmitContext.Provider value={value}>
      {children}
      <PaywallHost
        activePaywalls={activePaywalls}
        user={userContext}
        locale={locale}
        onCTA={(active, product) => {
          clientRef.current?.track("cta_click", {
            ...attribution(active.trigger, active.placement),
            productId: product.id,
          });
          dismissPaywall(active.id, false);
          active.options.onCTA?.(product);
        }}
        onDismiss={(active) => dismissPaywall(active.id, true)}
        onError={handlePaywallError}
      />
    </TranzmitContext.Provider>
  );
}

function deriveUserContext(identity: TranzmitIdentity | null): PaywallUserContext | undefined {
  if (!identity) return undefined;
  const userId = identity.userId?.trim() || undefined;
  const stableID = identity.identifiers?.stableID?.trim() || undefined;
  const id = userId || stableID;
  if (!id && !userId && !stableID) return undefined;
  return { id, userId, stableID };
}

function presentationFromSpec(spec: any) {
  const mode = spec?.presentation?.mode;
  return mode === "modal" || mode === "fullscreen" || mode === "inline" || mode === "sheet"
    ? mode
    : "sheet";
}

function fallbackReasonFromError(error: Error | undefined): FallbackReason | undefined {
  const code = (error as any)?.code;
  if (code === "paywall_integrity_failed") return "integrity_failed";

  const message = error?.message || "";
  if (/integrity/i.test(message)) return "integrity_failed";
  if (/unsupported.*version/i.test(message)) return "unsupported_version";
  if (/missing a WebView document|no products|not hydrated/i.test(message)) return "invalid_paywall";
  return undefined;
}

function attribution(trigger: string, placement: ActivePaywall["placement"]): Record<string, unknown> {
  const placementId = placement.placement_id || placement.placementId;
  const variantKey = placement.variant_key || placement.variantKey || placement.variantId;
  return {
    trigger,
    variantId: placement.variantId,
    variant_key: variantKey,
    ...(placementId ? { placement_id: placementId } : {}),
  };
}
