import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, PixelRatio, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import WebView, { type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";
import { verifyDocumentIntegrity, type PaywallSpec, type ProductSpec } from "@tranzmit/shared";
import type { PaywallUserContext, PresentationMode } from "../types.js";
import { defaultProduct, renderDocument, type PaywallViewportContract } from "./compose.js";

export type { PaywallViewportContract } from "./compose.js";

let useSafeAreaInsets: undefined | (() => { top: number; bottom: number; left: number; right: number });
try {
  useSafeAreaInsets = require("react-native-safe-area-context").useSafeAreaInsets;
} catch {
  useSafeAreaInsets = undefined;
}

export interface SpecRendererProps {
  spec: PaywallSpec;
  presentation?: PresentationMode;
  user?: PaywallUserContext;
  locale?: string;
  onCTA: (product: ProductSpec) => void;
  onDismiss: () => void;
  onError?: (error: Error) => void;
  onReady?: () => void;
}

export function SpecRenderer({
  spec,
  presentation = "sheet",
  user,
  locale,
  onCTA,
  onDismiss,
  onError,
  onReady,
}: SpecRendererProps) {
  const windowSize = useWindowDimensions();
  const insets = useSafeAreaInsets ? useSafeAreaInsets() : { top: 0, bottom: 0, left: 0, right: 0 };
  const [layout, setLayout] = useState<{ width: number; height: number } | undefined>();
  const viewport = useMemo(
    () => viewportFromNativeLayout(presentation, windowSize, layout, insets),
    [insets.bottom, insets.left, insets.right, insets.top, layout, presentation, windowSize.height, windowSize.width],
  );
  const validationError = useMemo(() => validateRenderableSpec(spec), [spec]);
  const html = useMemo(
    () => validationError ? "" : composeDocument(spec, presentation, viewport, user, locale),
    [locale, presentation, spec, user, validationError, viewport]
  );
  const readyKeyRef = useRef(html);
  const readyFiredRef = useRef(false);

  useEffect(() => {
    if (validationError) onError?.(validationError);
  }, [onError, validationError]);

  if (readyKeyRef.current !== html) {
    readyKeyRef.current = html;
    readyFiredRef.current = false;
  }

  const markReady = () => {
    if (readyFiredRef.current) return;
    readyFiredRef.current = true;
    onReady?.();
  };

  if (validationError) {
    return null;
  }

  const handleMessage = (event: WebViewMessageEvent) => {
    const raw = event.nativeEvent.data;
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    if (!isPlainObject(message)) return;

    const type = String(message.type || message.action || "");
    if (!isAllowed(spec, type)) return;

    if (type === "ready") {
      markReady();
      return;
    }

    if (type === "cta" || type === "cta_click") {
      const product = productFromMessage(spec, message) || defaultProduct(spec);
      if (product) onCTA(product);
      return;
    }

    if (type === "dismiss") {
      onDismiss();
      return;
    }

    if (type === "open_url" && typeof message.url === "string") {
      if (isAllowedExternalUrl(spec, message.url)) {
        void Linking.openURL(message.url);
      }
    }
  };

  const shouldStart = (request: WebViewNavigation) => {
    const url = request.url || "";
    if (isInternalWebViewUrl(url) || isAllowedWebViewOrigin(spec, url)) return true;
    if (isAllowedExternalUrl(spec, url)) {
      void Linking.openURL(url);
    }
    return false;
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    setLayout((current) => {
      if (current && Math.abs(current.width - width) < 0.5 && Math.abs(current.height - height) < 0.5) {
        return current;
      }
      return { width, height };
    });
  };

  const handleRenderError = (event: unknown) => {
    onError?.(webViewError(event));
  };

  return (
    <View
      onLayout={handleLayout}
      style={{
        width: "100%",
        height: heightForPresentation(presentation),
        overflow: "hidden",
        borderRadius: presentation === "inline" || presentation === "fullscreen" ? 0 : 28,
      }}
    >
      <WebView
        originWhitelist={originWhitelist(spec)}
        source={{ html, baseUrl: spec.document?.baseUrl }}
        javaScriptEnabled
        javaScriptCanOpenWindowsAutomatically={false}
        domStorageEnabled={false}
        thirdPartyCookiesEnabled={false}
        sharedCookiesEnabled={false}
        setSupportMultipleWindows={false}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        onMessage={handleMessage}
        onError={handleRenderError}
        onHttpError={handleRenderError}
        onContentProcessDidTerminate={() => onError?.(new Error("Tranzmit WebView content process terminated"))}
        onLoadEnd={markReady}
        onShouldStartLoadWithRequest={shouldStart}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
      />
    </View>
  );
}

function webViewError(event: unknown) {
  const nativeEvent = typeof event === "object" && event !== null && "nativeEvent" in event
    ? (event as { nativeEvent?: Record<string, unknown> }).nativeEvent
    : undefined;
  const description = stringValue(nativeEvent?.description)
    || stringValue(nativeEvent?.title)
    || stringValue(nativeEvent?.code)
    || "Tranzmit WebView failed to render";
  return new Error(description);
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function heightForPresentation(presentation: PresentationMode) {
  if (presentation === "inline") return 560;
  return "100%";
}

function productFromMessage(spec: PaywallSpec, message: Record<string, unknown>) {
  const productId = typeof message.productId === "string"
    ? message.productId
    : typeof message.product_id === "string"
      ? message.product_id
      : undefined;
  if (!productId || productId.length > 256) return undefined;
  return spec.products.find((product) => product.id === productId);
}

function isAllowed(spec: PaywallSpec, type: string) {
  if (type === "cta_click" || type === "ready") return true;
  const allowed = spec.bridge?.allowedActions;
  if (!allowed || allowed.length === 0) {
    return ["cta", "dismiss", "custom_action", "open_url"].includes(type);
  }
  return allowed.includes(type as any);
}

function validateRenderableSpec(spec: PaywallSpec): Error | null {
  if (spec.bridge && spec.bridge.version !== 1) {
    return new Error("Unsupported Tranzmit paywall bridge version");
  }
  if (!Array.isArray(spec.products) || spec.products.length === 0) {
    return new Error("Tranzmit paywall has no products");
  }
  if (spec.document?.url && !spec.document.html) {
    return new Error("Hosted Tranzmit paywall document was not hydrated");
  }
  if (spec.document?.html && spec.document.integrity) {
    const result = verifyDocumentIntegrity(spec.document, spec.document.html);
    if (!result.ok) return new Error(result.failure.message);
  }
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInternalWebViewUrl(url: string): boolean {
  return url.startsWith("about:") || url.startsWith("data:text/html");
}

function originWhitelist(spec: PaywallSpec): string[] {
  const origins = new Set(["about:blank"]);
  const baseOrigin = originOf(spec.document?.baseUrl);
  if (baseOrigin) origins.add(baseOrigin);
  for (const origin of spec.security?.allowedOrigins || []) {
    const normalized = originOf(origin);
    if (normalized) origins.add(normalized);
  }
  return Array.from(origins);
}

function isAllowedWebViewOrigin(spec: PaywallSpec, url: string): boolean {
  const origin = originOf(url);
  if (!origin) return false;
  return originWhitelist(spec).includes(origin);
}

function isAllowedExternalUrl(spec: PaywallSpec, url: string): boolean {
  const parsed = parseUrl(url);
  if (!parsed) return false;
  const schemes = spec.security?.externalUrlSchemes || ["https"];
  if (!schemes.includes(parsed.protocol.replace(":", ""))) return false;
  const allowedHosts = spec.security?.externalUrlHosts || [];
  return allowedHosts.includes(parsed.hostname);
}

function originOf(url: string | undefined): string | null {
  const parsed = parseUrl(url);
  return parsed?.origin || null;
}

function parseUrl(url: string | undefined): { protocol: string; hostname: string; origin: string } | null {
  if (!url) return null;
  const match = url.match(/^([a-z][a-z0-9+.-]*:)?\/\/([^/?#]+)(?:[/?#]|$)/i);
  if (!match || !match[1]) return null;
  const protocol = match[1].toLowerCase();
  const hostname = match[2].split("@").pop()?.split(":")[0]?.toLowerCase();
  if (!hostname) return null;
  return {
    protocol,
    hostname,
    origin: `${protocol}//${match[2].toLowerCase()}`,
  };
}

export function composeDocumentForTest(
  spec: PaywallSpec,
  presentation: PresentationMode = "sheet",
  viewport?: PaywallViewportContract,
  user?: PaywallUserContext,
  locale?: string,
) {
  return composeDocument(spec, presentation, viewport, user, locale);
}

function composeDocument(
  spec: PaywallSpec,
  presentation: PresentationMode,
  viewport?: PaywallViewportContract,
  user?: PaywallUserContext,
  locale?: string,
) {
  const resolvedViewport = viewport || fallbackViewport(presentation);
  return renderDocument(spec, presentation, resolvedViewport, user, locale);
}

function viewportFromNativeLayout(
  presentation: PresentationMode,
  windowSize: { width: number; height: number },
  layout?: { width: number; height: number },
  safeArea: { top: number; bottom: number; left: number; right: number } = { top: 0, bottom: 0, left: 0, right: 0 },
): PaywallViewportContract {
  const width = positive(layout?.width) || positive(windowSize.width) || 390;
  const height = positive(layout?.height) || heightFromPresentation(presentation, positive(windowSize.height) || 844);
  const widthScale = width / 390;
  const heightScale = height / 844;
  return {
    width,
    height,
    safeTop: safeArea.top,
    safeBottom: safeArea.bottom,
    safeLeft: safeArea.left,
    safeRight: safeArea.right,
    pixelRatio: PixelRatio.get(),
    scale: clamp(Math.min(widthScale, heightScale), 0.82, 1.12),
    presentation,
  };
}

function fallbackViewport(presentation: PresentationMode): PaywallViewportContract {
  return viewportFromNativeLayout(presentation, { width: 390, height: 844 });
}

function heightFromPresentation(presentation: PresentationMode, height: number) {
  if (presentation === "inline") return height * 0.72;
  if (presentation === "fullscreen") return height;
  if (presentation === "modal") return height * 0.9;
  return height * 0.86;
}

function positive(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
