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
  PreloadedPaywall,
  PreloadPlacementOptions,
  PreloadResult,
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
  const preloadedRef = useRef<Map<string, PreloadedPaywall>>(new Map());
  const preloadWaitersRef = useRef<Map<string, Array<(result: PreloadResult) => void>>>(new Map());
  // Traits set at runtime via setTraits (for example the category resolved
  // mid-session). Kept in a ref and merged into init so a later prop-driven
  // re-init preserves them.
  const dynamicTraitsRef = useRef<Record<string, unknown>>({});
  const [isReady, setIsReady] = useState(false);
  const [readyError, setReadyError] = useState<Error | undefined>();
  const [activePaywalls, setActivePaywalls] = useState<ActivePaywall[]>([]);
  const [preloadedPaywalls, setPreloadedPaywalls] = useState<PreloadedPaywall[]>([]);
  const [userContext, setUserContext] = useState<PaywallUserContext | undefined>();
  const [configVersion, setConfigVersion] = useState(0);

  if (!clientRef.current) {
    clientRef.current = createTranzmitClient(reactNativeAdapter, reactNativeMetadata);
  }

  const syncPreloadedState = useCallback(() => {
    setPreloadedPaywalls(Array.from(preloadedRef.current.values()));
  }, []);

  const resolvePreloadWaiters = useCallback((id: string, result: PreloadResult) => {
    const waiters = preloadWaitersRef.current.get(id);
    if (!waiters) return;
    preloadWaitersRef.current.delete(id);
    waiters.forEach((resolve) => resolve(result));
  }, []);

  const clearPreloads = useCallback((reason: FallbackReason = "not_ready", error?: Error) => {
    for (const preload of preloadedRef.current.values()) {
      resolvePreloadWaiters(preload.id, {
        ok: false,
        trigger: preload.trigger,
        status: "failed",
        reason,
        error,
        placement: preload.placement,
        variantId: preload.placement.variantId,
      });
    }
    preloadedRef.current.clear();
    preloadWaitersRef.current.clear();
    setPreloadedPaywalls([]);
  }, [resolvePreloadWaiters]);

  const dropInactivePreloads = useCallback(() => {
    let changed = false;
    for (const [id, preload] of preloadedRef.current.entries()) {
      if (preload.active) continue;
      resolvePreloadWaiters(id, {
        ok: false,
        trigger: preload.trigger,
        status: "failed",
        reason: "not_ready",
        placement: preload.placement,
        variantId: preload.placement.variantId,
      });
      preloadedRef.current.delete(id);
      changed = true;
    }
    if (changed) syncPreloadedState();
  }, [resolvePreloadWaiters, syncPreloadedState]);

  const dismissPaywall = useCallback((id: string, trackDismissal: boolean) => {
    const active = activeRef.current.get(id);
    if (!active) return;

    activeRef.current.delete(id);
    setActivePaywalls((items) => items.filter((item) => item.id !== id));
    let preloadedChanged = false;
    for (const [preloadId, preload] of preloadedRef.current.entries()) {
      if (preload.active?.id !== id) continue;
      preloadedRef.current.set(preloadId, { ...preload, active: undefined });
      preloadedChanged = true;
    }
    if (preloadedChanged) syncPreloadedState();

    if (trackDismissal) {
      clientRef.current?.track("dismissal", {
        ...attribution(active.trigger, active.placement),
        time_on_screen_ms: Date.now() - active.shownAt,
      });
      active.options.onDismiss?.();
    }
  }, [syncPreloadedState]);

  useEffect(() => {
    let cancelled = false;
    const client = clientRef.current!;
    setIsReady(false);
    setReadyError(undefined);
    activeRef.current.clear();
    setActivePaywalls([]);
    clearPreloads("not_ready");

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
  }, [apiBaseUrl, clearPreloads, debug, identifiers, onError, privateTraits, publicKey, userId, userTraits]);

  const preloadPlacement = useCallback((trigger: string, options: PreloadPlacementOptions = {}): Promise<PreloadResult> => {
    const client = clientRef.current;
    if (!client?.isReady()) {
      return Promise.resolve({
        ok: false,
        trigger,
        status: "failed",
        reason: fallbackReasonFromError(readyError) || "not_ready",
        error: readyError,
      });
    }

    const placement = client.getPlacement(trigger);
    if (!placement) {
      return Promise.resolve({
        ok: false,
        trigger,
        status: "failed",
        reason: "placement_not_found",
      });
    }

    const presentation = options.presentation || presentationFromSpec(placement.spec);
    const signature = preloadSignature(trigger, placement, presentation);
    const id = preloadId(trigger, signature);
    const existing = preloadedRef.current.get(id);
    if (existing?.status === "ready") {
      return Promise.resolve({
        ok: true,
        trigger,
        status: "ready",
        placement,
        variantId: placement.variantId,
      });
    }
    if (existing?.status === "failed") {
      return Promise.resolve({
        ok: false,
        trigger,
        status: "failed",
        reason: fallbackReasonFromError(existing.error) || "render_error",
        error: existing.error,
        placement,
        variantId: placement.variantId,
      });
    }

    const waitForReady = new Promise<PreloadResult>((resolve) => {
      const waiters = preloadWaitersRef.current.get(id) || [];
      waiters.push(resolve);
      preloadWaitersRef.current.set(id, waiters);
    });

    if (!existing) {
      const preload: PreloadedPaywall = {
        id,
        trigger,
        placement,
        presentation,
        signature,
        status: "loading",
      };
      preloadedRef.current.set(id, preload);
      syncPreloadedState();
    }

    return waitForReady;
  }, [readyError, syncPreloadedState]);

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

    const presentation = options.presentation || presentationFromSpec(placement.spec);
    const signature = preloadSignature(trigger, placement, presentation);
    const warmPreload = preloadedRef.current.get(preloadId(trigger, signature));
    const active: ActivePaywall = {
      id: trigger,
      trigger,
      placement,
      presentation,
      options,
      shownAt: Date.now(),
    };

    activeRef.current.set(trigger, active);
    if (warmPreload && warmPreload.status !== "failed") {
      preloadedRef.current.set(warmPreload.id, { ...warmPreload, active });
      syncPreloadedState();
    } else {
      setActivePaywalls((items) => [...items, active]);
    }
    client.track("impression", attribution(trigger, placement));
    options.onImpression?.();

    return {
      shown: true,
      variantId: placement.variantId,
      dismiss: () => dismissPaywall(active.id, true),
    };
  }, [dismissPaywall, readyError, syncPreloadedState]);

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

  const handlePreloadReady = useCallback((preload: PreloadedPaywall) => {
    const current = preloadedRef.current.get(preload.id);
    if (!current || current.signature !== preload.signature || current.status === "ready") return;
    const next = { ...current, status: "ready" as const, error: undefined };
    preloadedRef.current.set(preload.id, next);
    syncPreloadedState();
    resolvePreloadWaiters(preload.id, {
      ok: true,
      trigger: preload.trigger,
      status: "ready",
      placement: preload.placement,
      variantId: preload.placement.variantId,
    });
  }, [resolvePreloadWaiters, syncPreloadedState]);

  const handlePreloadError = useCallback((preload: PreloadedPaywall, error: Error) => {
    const current = preloadedRef.current.get(preload.id);
    if (!current || current.signature !== preload.signature) return;
    const next = { ...current, status: "failed" as const, error };
    preloadedRef.current.set(preload.id, next);
    syncPreloadedState();
    resolvePreloadWaiters(preload.id, {
      ok: false,
      trigger: preload.trigger,
      status: "failed",
      reason: fallbackReasonFromError(error) || "render_error",
      error,
      placement: preload.placement,
      variantId: preload.placement.variantId,
    });
  }, [resolvePreloadWaiters, syncPreloadedState]);

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
    clearPreloads("not_ready");
    try {
      await client.refreshConfig();
      setUserContext(deriveUserContext(client.getIdentity()));
      setIsReady(client.isReady());
    } catch (err: any) {
      setReadyError(err);
      setIsReady(false);
      throw err;
    }
  }, [clearPreloads]);

  const setTraits = useCallback(async (traits: Record<string, unknown>, options?: { merge?: boolean }) => {
    const client = clientRef.current;
    if (!client) return;
    dynamicTraitsRef.current = options?.merge === false
      ? { ...traits }
      : { ...dynamicTraitsRef.current, ...traits };
    // Refetch + hydrate in place. isReady stays true so any active paywall is
    // not torn down; bump configVersion afterwards so getPlacement re-renders.
    await client.setTraits(traits, options);
    dropInactivePreloads();
    setConfigVersion((version) => version + 1);
  }, [dropInactivePreloads]);

  const value = useMemo<TranzmitContextValue>(() => ({
    isReady,
    ready: isReady,
    user: userContext,
    locale,
    gate,
    preloadPlacement,
    track,
    reportConversion,
    refreshConfig,
    setTraits,
    flush: () => clientRef.current?.flush() || Promise.resolve(),
    getPlacement: (trigger) => clientRef.current?.getPlacement(trigger) || null,
  }), [configVersion, gate, isReady, locale, preloadPlacement, refreshConfig, reportConversion, setTraits, track, userContext]);

  return (
    <TranzmitContext.Provider value={value}>
      {children}
      <PaywallHost
        activePaywalls={activePaywalls}
        preloadedPaywalls={preloadedPaywalls}
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
        onPreloadReady={handlePreloadReady}
        onPreloadError={handlePreloadError}
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

function preloadId(trigger: string, signature: string) {
  return `${trigger}:${signature}`;
}

function preloadSignature(trigger: string, placement: ActivePaywall["placement"], presentation: string) {
  const spec = placement.spec as any;
  const document = spec?.document || {};
  const documentKey = spec?.cacheKey
    || spec?.revision
    || document.integrity
    || document.url
    || spec?.templateId
    || "document";
  return [
    trigger,
    placement.variantId,
    documentKey,
    presentation,
  ].join(":");
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
