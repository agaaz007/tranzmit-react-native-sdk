import { localizeHtml, resolveLocalizedStrings, type PaywallSpec, type ProductSpec } from "@tranzmit/shared";
import type { PaywallUserContext, PresentationMode } from "../types.js";

/**
 * Platform-agnostic paywall document composition.
 *
 * This module contains the *pure* string-composition pipeline that turns a
 * `PaywallSpec` + a resolved viewport into the final WebView HTML. It imports
 * nothing from `react-native`, so it runs unchanged in React Native, in Node
 * (the `templates/preview` harness), and under the test runner. The
 * React-Native-specific viewport derivation (`PixelRatio`, `useWindowDimensions`,
 * safe-area insets) lives in `SpecRenderer.tsx` and is passed in here as a
 * fully-resolved `PaywallViewportContract`.
 */

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

/**
 * Composes the final WebView document for a fully-resolved viewport. This is
 * the single source of truth for the on-device markup; the preview harness
 * calls it with synthetic per-device viewports so the browser preview is
 * byte-identical to what the app renders.
 */
export interface RenderOptions {
  /**
   * Flatten imported `.device`/`.screen` phone artboards to full-bleed in-app
   * (default true). The preview harness sets this false to render the pre-fix
   * "before" state through the same pipeline.
   */
  flattenArtboards?: boolean;
}

export function renderDocument(
  spec: PaywallSpec,
  presentation: PresentationMode,
  viewport: PaywallViewportContract,
  user?: PaywallUserContext,
  locale?: string,
  options?: RenderOptions,
) {
  const flattenArtboards = options?.flattenArtboards ?? true;
  const document = spec.document || legacyDocument(spec);
  const js = document.js ? `<script>${document.js}</script>` : "";
  const presentationClass = `tz-presentation-${presentation}`;
  const resolvedViewport = viewport;
  const viewportJson = JSON.stringify(resolvedViewport).replace(/</g, "\\u003c");
  const sanitizedUser = sanitizeUserContext(user);
  const userJson = JSON.stringify(sanitizedUser).replace(/</g, "\\u003c");
  const localizedHtml = localizeHtml(document.html || "", resolveLocalizedStrings(spec.localization, locale));
  const documentHtml = bakePersonalizedSources(localizedHtml, sanitizedUser);
  const viewportCss = viewportCssVariables(resolvedViewport);
  const safeAreaCss = hostedSafeAreaCss(document.html || "", flattenArtboards);
  const artboardCss = flattenArtboards ? phoneArtboardCss(document.html || "") : "";
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
${artboardCss}
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
export function hostedSafeAreaCss(html: string, flattenArtboards = true): string {
  if (MANAGED_CONTAINER_PATTERN.test(html)) return "";
  if (FULL_VIEWPORT_HEIGHT_PATTERN.test(html)) return "";
  // Phone artboards consume the safe area inside their flattened layout (see
  // phoneArtboardCss), so they must not also get a document-wide body inset.
  if (flattenArtboards && isPhoneArtboard(html)) return "";
  return `  /* Tranzmit safe-area insets for hosted documents (status bar, notch, home indicator) */
  body {
    padding-top: max(env(safe-area-inset-top, 0px), var(--tz-safe-top, 0px)) !important;
    padding-right: max(env(safe-area-inset-right, 0px), var(--tz-safe-right, 0px)) !important;
    padding-bottom: calc(max(env(safe-area-inset-bottom, 0px), var(--tz-safe-bottom, 0px)) + clamp(10px, 3vw, 16px)) !important;
    padding-left: max(env(safe-area-inset-left, 0px), var(--tz-safe-left, 0px)) !important;
  }`;
}

// Imported "phone artboard" documents wrap their UI in a `.device` mockup frame
// (a dark phone bezel) around a `.screen` with a fixed pixel height, and only
// switch to a full-bleed layout at `@media (max-width: 390px)`. In the app the
// WebView is the whole screen at the real device width, so on anything wider
// than 390px (a 430px Pro Max, an iPad) the media query never fires and the
// bezel mockup renders centered in the viewport; on short screens the fixed
// height overflows and the footer/CTA is clipped. We detect this family and,
// in-app, flatten the artboard to full-bleed, center the content with the
// safe-area consumed, and let it scroll instead of clip.
const PHONE_ARTBOARD_PATTERN = /class=["'][^"']*\bdevice\b[^"']*["'][\s\S]*?class=["'][^"']*\b(?:screen|paywall-screen)\b/;

export function isPhoneArtboard(html: string): boolean {
  return PHONE_ARTBOARD_PATTERN.test(html);
}

export function phoneArtboardCss(html: string): string {
  if (!isPhoneArtboard(html)) return "";
  return `  /* Tranzmit: flatten imported phone artboards (.device > .screen) to full-bleed in-app */
  body { padding: 0 !important; }
  .device {
    width: 100% !important;
    max-width: var(--tz-vw) !important;
    min-height: var(--tz-vh) !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }
  .screen, .paywall-screen {
    height: var(--tz-vh) !important;
    min-height: var(--tz-vh) !important;
    max-height: var(--tz-vh) !important;
    border-radius: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }
  .screen > .content, .paywall-screen > .content, .screen .content {
    flex: 1 0 auto !important;
    min-height: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    padding-top: calc(var(--tz-safe-top, 0px) + clamp(12px, 2.4vh, 20px)) !important;
    padding-bottom: calc(var(--tz-safe-bottom, 0px) + clamp(12px, 2vh, 18px)) !important;
    padding-left: calc(var(--tz-safe-left, 0px) + clamp(16px, 5vw, 22px)) !important;
    padding-right: calc(var(--tz-safe-right, 0px) + clamp(16px, 5vw, 22px)) !important;
  }
  /* Keep the CTA in the bottom thumb zone while still centering the value
     content. Two auto top-margins (first child + CTA) split the slack evenly:
     half above the content, half above the CTA, so the CTA sits just above the
     safe area on tall screens instead of floating in the middle with dead space
     below it. When content exceeds the viewport the autos collapse to 0 and the
     screen scrolls. */
  .screen .content > :first-child, .paywall-screen .content > :first-child { margin-top: auto !important; }
  .screen .content > .cta, .paywall-screen .content > .cta { margin-top: auto !important; }
  .screen .content > .cta ~ *, .paywall-screen .content > .cta ~ * { margin-top: 0 !important; }`;
}

export function viewportCssVariables(viewport: PaywallViewportContract) {
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

export function defaultProduct(spec: PaywallSpec) {
  return spec.products.find((product) => product.isDefault || product.highlighted) || spec.products[0];
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
