import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, PixelRatio, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import WebView, { type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";
import { localizeHtml, resolveLocalizedStrings, verifyDocumentIntegrity, type PaywallSpec, type ProductSpec } from "@tranzmit/shared";
import type { PaywallUserContext, PresentationMode } from "../types.js";

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

function defaultProduct(spec: PaywallSpec) {
  return spec.products.find((product) => product.isDefault || product.highlighted) || spec.products[0];
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

export interface PaywallViewportContract {
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  safeLeft: number;
  safeRight: number;
  pixelRatio: number;
  scale: number;
  presentation: PresentationMode;
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
  const document = spec.document || legacyDocument(spec);
  const js = document.js ? `<script>${document.js}</script>` : "";
  const presentationClass = `tz-presentation-${presentation}`;
  const resolvedViewport = viewport || fallbackViewport(presentation);
  const viewportJson = JSON.stringify(resolvedViewport).replace(/</g, "\\u003c");
  const sanitizedUser = sanitizeUserContext(user);
  const userJson = JSON.stringify(sanitizedUser).replace(/</g, "\\u003c");
  const localizedHtml = localizeHtml(document.html || "", resolveLocalizedStrings(spec.localization, locale));
  const documentHtml = bakePersonalizedSources(localizedHtml, sanitizedUser);
  const viewportCss = viewportCssVariables(resolvedViewport);
  const safeAreaCss = hostedSafeAreaCss(document.html || "");
  return `<!doctype html>
<html class="${presentationClass}" data-tranzmit-presentation="${presentation}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<script>
window.TranzmitImageFallback = function(node){
  try {
    if (!node || !node.getAttribute) return;
    var fallback = node.getAttribute('data-tranzmit-fallback-src');
    node.onerror = null;
    node.removeAttribute('onerror');
    if (fallback && node.getAttribute('src') !== fallback) {
      node.setAttribute('src', fallback);
    }
  } catch (_) {}
};
</script>
<style>
  :root {
${viewportCss}
  }
  html, body { margin: 0; padding: 0; width: var(--tz-vw); min-height: var(--tz-vh); background: transparent; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  body { min-height: var(--tz-vh); overflow-y: auto; -webkit-overflow-scrolling: touch; }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  button, a { touch-action: manipulation; }
  ${document.css || ""}
${safeAreaCss}
  html, body { max-width: var(--tz-vw); overflow-x: hidden !important; }
  .tz-paywall:not(.phone), .tranzmit-paywall {
    max-width: var(--tz-vw);
    overflow-x: hidden !important;
    overflow-y: auto !important;
  }
  .${presentationClass} .tz-paywall:not(.phone),
  .${presentationClass} .tranzmit-paywall {
    min-height: 100%;
  }
  .tz-presentation-fullscreen,
  .tz-presentation-fullscreen body {
    width: var(--tz-vw);
    height: var(--tz-vh);
    min-height: var(--tz-vh);
    overflow: hidden;
  }
  .tz-presentation-fullscreen .tz-paywall:not(.phone),
  .tz-presentation-fullscreen .tranzmit-paywall {
    width: var(--tz-vw) !important;
    height: var(--tz-vh) !important;
    min-height: var(--tz-vh) !important;
    max-height: var(--tz-vh) !important;
    margin: 0 !important;
    padding-bottom: calc(var(--tz-safe-bottom) + var(--tz-cta-reserved-height)) !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    overflow-y: auto !important;
  }
  .tz-presentation-fullscreen .tz-paywall:not(.phone) .cta,
  .tz-presentation-fullscreen .tranzmit-paywall .cta {
    left: calc(var(--tz-safe-left) + clamp(14px, 4vw, 22px)) !important;
    right: calc(var(--tz-safe-right) + clamp(14px, 4vw, 22px)) !important;
    bottom: calc(var(--tz-safe-bottom) + clamp(10px, 3vw, 18px)) !important;
  }
  .tz-presentation-fullscreen .tz-paywall:not(.phone) .tz-close,
  .tz-presentation-fullscreen .tranzmit-paywall .tz-close,
  .tz-presentation-fullscreen .tz-paywall:not(.phone) .close,
  .tz-presentation-fullscreen .tranzmit-paywall .close {
    display: none !important;
  }
  @media (max-height: 880px) {
    .tz-presentation-fullscreen .influish_intro_offer {
      gap: clamp(4px, 0.75vh, 8px) !important;
    }
    .tz-presentation-fullscreen .influish_intro_offer .intro-brand {
      margin-top: 0 !important;
      margin-bottom: 2px !important;
    }
    .tz-presentation-fullscreen .influish_intro_offer h1 {
      font-size: clamp(30px, 8.6vw, 39px) !important;
      line-height: 0.98 !important;
    }
    .tz-presentation-fullscreen .influish_intro_offer .subtitle {
      font-size: clamp(13px, 3.6vw, 15px) !important;
      line-height: 1.25 !important;
      margin-top: 2px !important;
    }
    .tz-presentation-fullscreen .influish_intro_offer .intro-offer {
      margin-top: 6px !important;
      padding: 18px 14px 10px !important;
    }
    .tz-presentation-fullscreen .influish_intro_offer .intro-price strong {
      font-size: clamp(28px, 7.8vw, 36px) !important;
    }
    .tz-presentation-fullscreen .influish_intro_offer .feature-panel {
      padding: 10px 12px !important;
    }
    .tz-presentation-fullscreen .influish_intro_offer .feature-panel li {
      padding-top: 6px !important;
      padding-bottom: 6px !important;
    }
    .tz-presentation-fullscreen .influish_intro_offer .intro-testimonial {
      display: flex !important;
      gap: 9px !important;
      padding: 9px 10px !important;
      border-radius: 16px !important;
      font-size: 12px !important;
      line-height: 1.18 !important;
    }
    .tz-presentation-fullscreen .influish_intro_offer .intro-testimonial .avatar {
      width: 42px !important;
      height: 42px !important;
      flex: 0 0 42px !important;
    }
    .tz-presentation-fullscreen .influish_intro_offer .intro-testimonial p {
      margin: 1px 0 0 !important;
      letter-spacing: 1px !important;
      line-height: 1 !important;
    }
    .tz-presentation-fullscreen .influish_intro_offer .intro-testimonial em {
      display: none !important;
    }
    .tz-presentation-fullscreen .influish_intro_offer .legal-row {
      margin-top: auto !important;
    }
  }
  .tz-presentation-sheet .tz-paywall:not(.phone),
  .tz-presentation-sheet .tranzmit-paywall,
  .tz-presentation-modal .tz-paywall:not(.phone),
  .tz-presentation-modal .tranzmit-paywall {
    border-radius: clamp(20px, 7vw, 28px);
  }
  .tz-paywall:not(.phone) h1,
  .tz-paywall:not(.phone) h2,
  .tz-paywall:not(.phone) h3,
  .tz-paywall:not(.phone) p,
  .tz-paywall:not(.phone) strong,
  .tz-paywall:not(.phone) span,
  .tz-paywall:not(.phone) button,
  .tz-paywall:not(.phone) a,
  .tranzmit-paywall h1,
  .tranzmit-paywall h2,
  .tranzmit-paywall h3,
  .tranzmit-paywall p,
  .tranzmit-paywall strong,
  .tranzmit-paywall span,
  .tranzmit-paywall button,
  .tranzmit-paywall a { overflow-wrap: anywhere; }
</style>
</head>
<body class="${presentationClass}">
${documentHtml}
${js}
<script>window.TranzmitNativeViewport = ${viewportJson};</script>
<script>window.TranzmitUser = ${userJson};</script>
<script>
(function(){
  var viewport = window.TranzmitNativeViewport || null;
  var user = window.TranzmitUser || {};
  function post(message){
    try { window.ReactNativeWebView.postMessage(JSON.stringify(message)); } catch (_) {}
  }
  function fillTemplate(template){
    return String(template).replace(/\\{(\\w+)\\}/g, function(match, key){
      var value = user[key];
      return value == null ? '' : encodeURIComponent(String(value));
    });
  }
  function resolvePersonalizedSources(){
    var nodes = document.querySelectorAll('[data-tranzmit-src]');
    for (var i = 0; i < nodes.length; i++){
      var template = nodes[i].getAttribute('data-tranzmit-src');
      if (template) nodes[i].setAttribute('src', fillTemplate(template));
    }
    var fallbackNodes = document.querySelectorAll('[data-tranzmit-fallback-src]');
    for (var j = 0; j < fallbackNodes.length; j++){
      var node = fallbackNodes[j];
      var resolvedFallback = fillTemplate(node.getAttribute('data-tranzmit-fallback-src') || '');
      node.setAttribute('data-tranzmit-fallback-src', resolvedFallback);
      if (!node.onerror) {
        node.onerror = function(){ window.TranzmitImageFallback && window.TranzmitImageFallback(this); };
      }
    }
  }
  window.Tranzmit = {
    viewport: viewport,
    user: user,
    post: post,
    fillTemplate: fillTemplate,
    cta: function(productId){ post({ type: 'cta', productId: productId }); },
    dismiss: function(){ post({ type: 'dismiss' }); },
    customAction: function(name, payload){ post({ type: 'custom_action', name: name, payload: payload || {} }); }
  };
  resolvePersonalizedSources();
  document.addEventListener('click', function(event){
    var node = event.target;
    while (node && node !== document) {
      var action = node.getAttribute && node.getAttribute('data-tranzmit-action');
      if (action) {
        event.preventDefault();
        post({
          type: action === 'cta' ? 'cta' : action,
          productId: node.getAttribute('data-product-id') || undefined,
          name: node.getAttribute('data-action-name') || undefined,
          url: node.getAttribute('href') || undefined
        });
        return;
      }
      node = node.parentNode;
    }
  }, true);
  window.addEventListener('load', function(){ post({ type: 'ready' }); });
})();
</script>
</body>
</html>`;
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

// Managed paywall containers (legacy block-tree + influish hosted designs) already consume the
// `--tz-safe-*` variables internally, so they must not get a second, document-wide inset.
const MANAGED_CONTAINER_PATTERN = /\b(?:tranzmit-paywall|tz-paywall)\b/;

// Documents that size a shell to the full viewport (e.g. `min-height: 100svh/100dvh/100vh`) cannot
// receive a document-level `body` inset: the rigid full-height shell would then overflow the viewport
// by the inset amount and clip its own footer (CTA) below the fold. Such documents are expected to
// consume the `--tz-safe-*` variables inside their own border-box layout instead.
const FULL_VIEWPORT_HEIGHT_PATTERN = /\b100(?:svh|dvh|vh)\b/;

// Hosted documents that bring their own full-bleed layout (e.g. `.device`/`.screen` shells) never
// reference the safe-area variables themselves, so their first row can slide under the status bar
// or notch and their footer under the home indicator. When we detect such a document we apply the
// native insets as document-level padding so the content is always inside the safe area while the
// document's own background still paints edge-to-edge (the padding area shows the body background).
function hostedSafeAreaCss(html: string): string {
  if (MANAGED_CONTAINER_PATTERN.test(html)) return "";
  if (FULL_VIEWPORT_HEIGHT_PATTERN.test(html)) return "";
  return `  /* Tranzmit safe-area insets for hosted documents (status bar, notch, home indicator) */
  body {
    padding-top: max(env(safe-area-inset-top, 0px), var(--tz-safe-top, 0px)) !important;
    padding-right: max(env(safe-area-inset-right, 0px), var(--tz-safe-right, 0px)) !important;
    padding-bottom: calc(max(env(safe-area-inset-bottom, 0px), var(--tz-safe-bottom, 0px)) + clamp(10px, 3vw, 16px)) !important;
    padding-left: max(env(safe-area-inset-left, 0px), var(--tz-safe-left, 0px)) !important;
  }`;
}

function viewportCssVariables(viewport: PaywallViewportContract) {
  return [
    `  --tz-container-width: ${viewport.width.toFixed(2)}px;`,
    `  --tz-container-height: ${viewport.height.toFixed(2)}px;`,
    `  --tz-vw: ${viewport.width.toFixed(2)}px;`,
    `  --tz-vh: ${viewport.height.toFixed(2)}px;`,
    `  --tz-safe-top: ${viewport.safeTop.toFixed(2)}px;`,
    `  --tz-safe-bottom: ${viewport.safeBottom.toFixed(2)}px;`,
    `  --tz-safe-left: ${viewport.safeLeft.toFixed(2)}px;`,
    `  --tz-safe-right: ${viewport.safeRight.toFixed(2)}px;`,
    `  --tz-device-pixel-ratio: ${viewport.pixelRatio.toFixed(3)};`,
    `  --tz-scale: ${viewport.scale.toFixed(4)};`,
    "  --tz-cta-reserved-height: clamp(86px, 10.5vh, 108px);",
  ].join("\n");
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

function legacyDocument(spec: PaywallSpec) {
  const product = defaultProduct(spec);
  const title = spec.header?.title || spec.headline || "Upgrade";
  const subtitle = spec.header?.subtitle || spec.subheadline;
  const ctaText = typeof spec.cta === "string" ? spec.cta : spec.cta.text;
  const features = (spec.features || [])
    .map((feature) => `<li>${escapeHtml(featureText(feature))}</li>`)
    .join("");
  const productHtml = product
    ? `<div class="product">
        ${product.badge ? `<span class="badge">${escapeHtml(product.badge)}</span>` : ""}
        <strong>${escapeHtml(product.name)}</strong>
        <span>${escapeHtml(priceText(product))}</span>
      </div>`
    : "";

  return {
    html: spec.customHtml || `<main class="tranzmit-paywall">
      <section class="card">
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
        ${features ? `<ul>${features}</ul>` : ""}
        ${productHtml}
        <button data-tranzmit-action="cta" data-product-id="${escapeHtml(product?.id || "product")}">${escapeHtml(ctaText)}</button>
        ${spec.secondaryCta ? `<button class="secondary" data-tranzmit-action="dismiss">${escapeHtml(spec.secondaryCta)}</button>` : ""}
      </section>
    </main>`,
    css: spec.customCss || `
body { min-height: 100vh; display: grid; place-items: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: rgba(15, 23, 42, 0.48); color: #111827; }
.tranzmit-paywall { width: 100%; padding: 24px; }
.card { background: #fff; border-radius: 28px; box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28); padding: 28px; text-align: center; }
h1 { margin: 0; font-size: 32px; line-height: 1.05; letter-spacing: -0.04em; }
.subtitle { color: #6b7280; font-size: 16px; line-height: 1.45; }
ul { padding: 0; list-style: none; display: grid; gap: 10px; margin: 20px 0; text-align: left; }
li { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px; }
.product { display: grid; gap: 6px; border: 1px solid #dbeafe; background: #eff6ff; border-radius: 18px; padding: 16px; margin: 18px 0; }
.badge { justify-self: center; background: #1d4ed8; color: white; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; }
button { width: 100%; border: 0; border-radius: 999px; background: #1d4ed8; color: white; padding: 16px; font-size: 16px; font-weight: 800; }
.secondary { margin-top: 10px; background: transparent; color: #64748b; }
`,
    js: undefined,
  };
}

function featureText(feature: unknown) {
  if (feature && typeof feature === "object") {
    const record = feature as Record<string, unknown>;
    const text = record.text || record.title || record.label;
    if (text != null) return String(text);
  }
  return String(feature).split("|")[0];
}

function priceText(product: ProductSpec) {
  const price = product.price;
  if (typeof price === "string") return price;
  const amount = typeof price.amount === "number" ? (price.amount / 100).toFixed(2) : "";
  const interval = price.interval ? ` / ${price.interval}` : "";
  return `${price.currency} ${amount}${interval}`.trim();
}

function sanitizeUserContext(user?: PaywallUserContext): Record<string, string> {
  if (!user) return {};
  const out: Record<string, string> = {};
  for (const key of ["id", "userId", "stableID"] as const) {
    const value = user[key];
    if (typeof value === "string" && value) out[key] = value;
  }
  return out;
}

function fillTemplateString(template: string, user: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = user[key];
    return value == null ? "" : encodeURIComponent(String(value));
  });
}

/**
 * Resolves personalization templates at compose time (in React Native, before
 * the WebView parses the markup):
 *
 * 1. `data-tranzmit-src` tokens are resolved into a baked `src` so the browser
 *    preload scanner can start the image fetch at the earliest possible moment.
 * 2. `data-tranzmit-fallback-src` tokens are resolved in place, and an inline
 *    `onerror` handler is attached so a failed load swaps to the fallback image.
 *
 * The WebView bridge also re-resolves these at runtime, which covers any nodes
 * a hosted paywall inserts dynamically.
 */
function bakePersonalizedSources(html: string, user: Record<string, string>): string {
  return html
    .replace(/data-tranzmit-src=("|')([\s\S]*?)\1/g, (match, quote: string, template: string) => {
      return `${match} src=${quote}${fillTemplateString(template, user)}${quote}`;
    })
    .replace(/data-tranzmit-fallback-src=("|')([\s\S]*?)\1/g, (_match, quote: string, template: string) => {
      const resolved = fillTemplateString(template, user);
      return `data-tranzmit-fallback-src=${quote}${resolved}${quote} onerror=${quote}window.TranzmitImageFallback&&window.TranzmitImageFallback(this)${quote}`;
    });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
