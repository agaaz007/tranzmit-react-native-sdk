// Tranzmit paywall preview harness.
//
// Renders every sample in ./samples through the SDK's REAL composer
// (`renderDocument` from the built package) at several device viewports, twice:
//   - BEFORE: the fix disabled (flattenArtboards:false) = how the app rendered
//     it previously;
//   - AFTER:  the fix enabled (default) = how the app renders it now.
// It also emits a raw-browser view (no SDK wrapping). Because it calls the same
// composer the app uses, the preview is byte-identical to the app.
//
// Usage:
//   npm run preview            (build + compose + write index.html)
//   open templates/preview/index.html
//
// Env: TZ_REAL_DIR (real-paywalls source), TZ_REAL_LANG=both (also Hinglish).

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
const samplesDir = join(here, "samples");

const composePath = join(here, "..", "..", "packages", "react-native", "dist", "renderer", "compose.js");
let renderDocument;
try {
  ({ renderDocument } = await import(composePath));
} catch (err) {
  console.error(`\nCould not import the compiled composer at:\n  ${composePath}\n`);
  console.error("Run `npm run build` first so the SDK is compiled, then re-run this script.\n");
  console.error(String(err.message || err));
  process.exit(1);
}

// --- Device profiles (logical CSS px, portrait) -----------------------------
const DEVICES = [
  { id: "se",   label: "iPhone SE · 320×568",  width: 320, height: 568,  dpr: 2, safeTop: 20, safeBottom: 0,  safeLeft: 0, safeRight: 0, notch: false },
  { id: "i14",  label: "iPhone 14 · 390×844",  width: 390, height: 844,  dpr: 3, safeTop: 47, safeBottom: 34, safeLeft: 0, safeRight: 0, notch: true  },
  { id: "max",  label: "16 Pro Max · 430×932", width: 430, height: 932,  dpr: 3, safeTop: 59, safeBottom: 34, safeLeft: 0, safeRight: 0, notch: true  },
  { id: "ipad", label: "iPad · 768×1024",      width: 768, height: 1024, dpr: 2, safeTop: 24, safeBottom: 20, safeLeft: 0, safeRight: 0, notch: false },
];

function heightFromPresentation(presentation, height) {
  if (presentation === "inline") return height * 0.72;
  if (presentation === "fullscreen") return height;
  if (presentation === "modal") return height * 0.9;
  return height * 0.86;
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function makeViewport(device, presentation) {
  const width = device.width;
  const height = heightFromPresentation(presentation, device.height);
  return {
    width,
    height,
    safeTop: device.safeTop,
    safeBottom: device.safeBottom,
    safeLeft: device.safeLeft,
    safeRight: device.safeRight,
    pixelRatio: device.dpr,
    scale: clamp(Math.min(width / 390, height / 844), 0.82, 1.12),
    presentation,
  };
}

function rawDocument(spec) {
  const doc = spec.document || {};
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;padding:0}${doc.css || ""}</style></head>
<body>${doc.html || ""}</body></html>`;
}

// --- Load samples ------------------------------------------------------------
const sampleFiles = readdirSync(samplesDir).filter((f) => f.endsWith(".sample.mjs")).sort();
if (sampleFiles.length === 0) {
  console.error(`No *.sample.mjs files found in ${samplesDir}`);
  process.exit(1);
}

const loaded = [];
for (const file of sampleFiles) {
  const def = (await import(join(samplesDir, file))).default;
  for (const mod of Array.isArray(def) ? def : [def]) loaded.push(mod);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const samples = [];
for (const mod of loaded) {
  const id = mod.id || (mod.name || "sample").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const presentation = mod.presentation || "fullscreen";

  const rawFile = `${id}__raw.html`;
  writeFileSync(join(outDir, rawFile), rawDocument(mod.spec));

  let changed = false;
  const devices = [];
  for (const device of DEVICES) {
    const viewport = makeViewport(device, presentation);
    const beforeHtml = renderDocument(mod.spec, presentation, viewport, undefined, undefined, { flattenArtboards: false });
    const afterHtml = renderDocument(mod.spec, presentation, viewport);
    if (beforeHtml !== afterHtml) changed = true;
    const beforeFile = `${id}__${device.id}__before.html`;
    const afterFile = `${id}__${device.id}__after.html`;
    writeFileSync(join(outDir, beforeFile), beforeHtml);
    writeFileSync(join(outDir, afterFile), afterHtml);
    devices.push({ ...device, beforeFile, afterFile });
  }

  samples.push({ id, name: mod.name || id, presentation, rawFile, devices, changed });
  console.log(`composed: ${mod.name || id}${changed ? "  (artboard → auto-flattened)" : "  (no change)"}`);
}

// --- Generate index.html -----------------------------------------------------
const Z = 0.44;
const escapeHtml = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function frame({ file, label, width, height, safeTop = 0, safeBottom = 0, notch = false, guides = false }) {
  const w = Math.round(width * Z);
  const h = Math.round(height * Z);
  const overlay = guides
    ? `
      <div class="statusbar" style="height:${Math.round(safeTop)}px"></div>
      ${safeTop ? `<div class="safe-line" style="top:${Math.round(safeTop)}px"></div>` : ""}
      ${safeBottom ? `<div class="homebar" style="height:${Math.round(safeBottom)}px"></div>
      <div class="safe-line" style="top:${Math.round(height - safeBottom)}px"></div>` : ""}
      ${notch ? `<div class="notch"></div>` : ""}`
    : "";
  return `
    <figure class="frame">
      <div class="phone" style="width:${w}px;height:${h}px">
        <div class="phone-inner" style="width:${width}px;height:${height}px;transform:scale(${Z})">
          <iframe src="out/${file}" width="${width}" height="${height}" loading="lazy"></iframe>
          ${overlay}
        </div>
      </div>
      <figcaption>${label}</figcaption>
    </figure>`;
}

function deviceRow(s, which) {
  return s.devices.map((d) => frame({
    file: which === "before" ? d.beforeFile : d.afterFile,
    label: d.label, width: d.width, height: d.height,
    safeTop: d.safeTop, safeBottom: d.safeBottom, notch: d.notch, guides: true,
  })).join("");
}

const sections = samples.map((s) => `
  <section class="sample">
    <h2>${escapeHtml(s.name)} <span class="mode">${s.presentation}</span>
      ${s.changed ? `<span class="tag tag-fix">artboard → auto-flattened</span>` : `<span class="tag tag-same">no change needed</span>`}</h2>
    <div class="grid">
      <div class="col col-raw">
        <div class="rowlabel">Raw (browser)</div>
        ${frame({ file: s.rawFile, label: "as designed", width: 390, height: 880 })}
      </div>
      <div class="col">
        <div class="rowlabel rowlabel-before">Before — previous app render</div>
        <div class="row">${deviceRow(s, "before")}</div>
      </div>
      <div class="col">
        <div class="rowlabel rowlabel-after">After — this fix</div>
        <div class="row">${deviceRow(s, "after")}</div>
      </div>
    </div>
  </section>`).join("");

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tranzmit paywall preview — before / after</title>
<style>
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b1020; color: #e5e7eb; }
  header { padding: 18px 24px; border-bottom: 1px solid #1f2937; position: sticky; top: 0; background: #0b1020; z-index: 5; }
  header h1 { margin: 0 0 4px; font-size: 18px; }
  header p { margin: 0; color: #94a3b8; font-size: 13px; max-width: 980px; }
  .legend { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: #cbd5e1; flex-wrap: wrap; }
  .legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
  .sample { padding: 22px 24px; border-bottom: 1px solid #1f2937; }
  .sample h2 { font-size: 15px; margin: 0 0 14px; font-weight: 600; }
  .sample h2 .mode { font-size: 11px; color: #93c5fd; background: #1e293b; padding: 2px 8px; border-radius: 999px; margin-left: 8px; }
  .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; margin-left: 6px; }
  .tag-fix { color: #bbf7d0; background: #14532d; }
  .tag-same { color: #cbd5e1; background: #334155; }
  .grid { display: flex; gap: 26px; align-items: flex-start; overflow-x: auto; padding-bottom: 10px; }
  .col { flex: 0 0 auto; }
  .rowlabel { font-size: 12px; font-weight: 700; margin-bottom: 8px; color: #cbd5e1; }
  .rowlabel-before { color: #fca5a5; }
  .rowlabel-after { color: #86efac; }
  .row { display: flex; gap: 16px; align-items: flex-start; }
  .frame { margin: 0; }
  .frame figcaption { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 6px; }
  .phone { position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.5); background: #fff; outline: 2px solid #334155; }
  .col-raw .phone { outline: 2px dashed #fcd34d; }
  .phone-inner { position: relative; transform-origin: top left; }
  .phone-inner iframe { border: 0; display: block; background: #fff; }
  .notch { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 160px; height: 30px; background: #000; border-radius: 0 0 18px 18px; z-index: 3; }
  .statusbar { position: absolute; top: 0; left: 0; right: 0; background: rgba(2,6,23,0.10); z-index: 2; pointer-events: none; }
  .homebar { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(2,6,23,0.10); z-index: 2; pointer-events: none; }
  .homebar::after { content: ""; position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 140px; height: 5px; border-radius: 999px; background: rgba(2,6,23,0.55); }
  .safe-line { position: absolute; left: 0; right: 0; height: 0; border-top: 2px dashed rgba(220,38,38,0.7); z-index: 4; pointer-events: none; }
</style>
</head>
<body>
<header>
  <h1>Tranzmit paywall preview — before / after</h1>
  <p>Every frame is composed through the SDK's real <code>renderDocument()</code>, so it matches the app's WebView. <b>Before</b> = previous render (fix disabled); <b>After</b> = this fix. Red dashed lines mark the safe-area edge (content beyond them can be clipped by the notch / home indicator).</p>
  <div class="legend">
    <span><i style="background:rgba(2,6,23,0.25)"></i>status-bar / home-indicator zone</span>
    <span><i style="background:transparent;border:2px dashed rgba(220,38,38,0.8)"></i>safe-area edge</span>
    <span><i style="background:transparent;border:2px dashed #fcd34d"></i>raw browser view</span>
  </div>
</header>
${sections}
</body>
</html>`;

writeFileSync(join(here, "index.html"), page);
console.log(`\nWrote ${join(here, "index.html")}  (${samples.length} samples)`);
