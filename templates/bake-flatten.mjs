// Bakes the Tranzmit full-bleed flatten directly into a paywall document's CSS,
// so it renders correctly in any WebView WITHOUT depending on the SDK version.
// This is the "option A" hotfix path: corrected documents get pushed to the
// backend (Railway) and the live app picks them up at runtime — no app update.
//
// The baked CSS mirrors phoneArtboardCss in packages/react-native/src/renderer/
// compose.ts, but uses env(safe-area-inset-*) + 100dvh fallbacks instead of the
// SDK's --tz-* variables. If a newer SDK also injects --tz-*, those win (var()
// fallback), so the two are compatible.
//
// Usage:
//   node templates/bake-flatten.mjs <input.html> <output.html> [--prod]
// Without --prod, relative assets/ refs are rewritten to absolute file:// URLs
// (so the local preview shows images). With --prod, asset refs are left as-is
// (host them or embed as data: URIs before importing — see README).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const BAKE_CSS = `
/* === Tranzmit full-bleed flatten (baked; no SDK required) === */
body { padding: 0 !important; margin: 0 !important; }
.device {
  width: 100% !important;
  max-width: 100vw !important;
  min-height: var(--tz-vh, 100dvh) !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.screen, .paywall-screen {
  height: var(--tz-vh, 100dvh) !important;
  min-height: var(--tz-vh, 100dvh) !important;
  max-height: var(--tz-vh, 100dvh) !important;
  border-radius: 0 !important;
  display: block !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
}
.screen > .content, .paywall-screen > .content, .screen > .sheet, .paywall-screen > .sheet {
  box-sizing: border-box !important;
  min-height: 100% !important;
  margin: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  padding-top: calc(var(--tz-safe-top, env(safe-area-inset-top, 0px)) + clamp(10px, 2vh, 18px)) !important;
  padding-bottom: calc(var(--tz-safe-bottom, env(safe-area-inset-bottom, 0px)) + clamp(10px, 1.6vh, 16px)) !important;
  padding-left: calc(var(--tz-safe-left, env(safe-area-inset-left, 0px)) + clamp(14px, 4.5vw, 20px)) !important;
  padding-right: calc(var(--tz-safe-right, env(safe-area-inset-right, 0px)) + clamp(14px, 4.5vw, 20px)) !important;
}
.screen > .content > :first-child, .paywall-screen > .content > :first-child,
.screen > .sheet > :first-child, .paywall-screen > .sheet > :first-child { margin-top: auto !important; }
.screen .cta, .paywall-screen .cta { margin-top: auto !important; }
.screen .cta ~ *, .paywall-screen .cta ~ * { margin-top: 0 !important; }
/* Bigger, more commanding CTA: ~65px tall (dynamic with viewport), generous
   padding, ~+20% type. Keeps each design's own colors / radius / gradient. */
.screen .cta, .paywall-screen .cta {
  min-height: clamp(60px, 7.5vh, 72px) !important;
  padding: clamp(16px, 2vh, 22px) clamp(20px, 5vw, 28px) !important;
  font-size: clamp(16px, 4.4vw, 19px) !important;
  line-height: 1.1 !important;
}
.screen .cta .cta-label, .paywall-screen .cta .cta-label {
  font-size: clamp(16px, 4.4vw, 19px) !important;
  line-height: 1.1 !important;
}
/* === end Tranzmit flatten === */
`;

const [inPath, outPath, ...flags] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error("usage: node templates/bake-flatten.mjs <input.html> <output.html> [--prod]");
  process.exit(1);
}
const prod = flags.includes("--prod");

let html = readFileSync(inPath, "utf8");

// Idempotent: don't double-bake.
if (html.includes("Tranzmit full-bleed flatten (baked")) {
  console.log("already baked; leaving as-is");
} else if (html.includes("</style>")) {
  // inject before the LAST </style> so it overrides the document's own rules
  const idx = html.lastIndexOf("</style>");
  html = html.slice(0, idx) + BAKE_CSS + html.slice(idx);
} else if (html.includes("</head>")) {
  html = html.replace("</head>", `<style>${BAKE_CSS}</style></head>`);
} else {
  html = `<style>${BAKE_CSS}</style>` + html;
}

if (!prod) {
  const assetsBase = "file://" + encodeURI(resolve(dirname(inPath), "assets")) + "/";
  html = html
    .replace(/(=\s*["'])assets\//g, `$1${assetsBase}`)
    .replace(/url\(\s*(["']?)assets\//g, `url($1${assetsBase}`);
}

writeFileSync(outPath, html);
console.log(`baked -> ${outPath}${prod ? " (prod: asset refs untouched)" : " (preview: assets -> file://)"}`);
