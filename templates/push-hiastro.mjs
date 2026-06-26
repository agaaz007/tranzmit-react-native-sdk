// Push the 12 hi-res, flatten-baked HiAstro paywalls to the Tranzmit backend.
//
// What it does, per folder:
//   1. Reads index.html.
//   2. Resizes each referenced `assets/*.png` to max 512 px on longest side via
//      sharp, PNG-optimizes, base64-inlines as data: URIs in src= and url(...).
//   3. Bakes the SDK flatten layer (full-bleed `.device/.screen`, safe-area,
//      bigger CTA) into the document <style> so the doc self-corrects
//      regardless of which SDK version the client app ships.
//   4. Computes SHA-256 integrity over the final HTML.
//   5. PUT /admin/specs/<spec-id> with { spec: { ..existing, document: { html, integrity, revision++ } } }.
//      The endpoint cascades the new spec to any placement that points at it.
//
// Backups: dumps every target spec to /tmp/hiastro-backup-<ts>.json BEFORE writing.
//
// Modes:
//   node templates/push-hiastro.mjs                # dry-run (default): no API writes
//   node templates/push-hiastro.mjs --apply       # actually PUT
//   node templates/push-hiastro.mjs --only=love-01,marriage-02
//
// Env required (use `railway run --service api -- node templates/push-hiastro.mjs ...`):
//   ADMIN_SECRET
//
// Other:
//   SRC defaults to /Users/Agaaz/paywalls-hires
//   API defaults to https://api-production-2146.up.railway.app

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const API = process.env.TRANZMIT_API || "https://api-production-2146.up.railway.app";
const SRC = process.env.PAYWALLS_SRC || "/Users/Agaaz/paywalls-hires";
const PUBLIC_KEY = process.env.HIASTRO_PUBLIC_KEY || "pk_test_320da03ab659ffc56d58acd2"; // HiAstro (test by default; override with HIASTRO_PUBLIC_KEY=pk_live_... for prod)
const APPLY = process.argv.includes("--apply");
const ONLY = (process.argv.find(a => a.startsWith("--only=")) || "").split("=")[1]?.split(",") || null;

if (!ADMIN_SECRET) { console.error("ERROR: ADMIN_SECRET not set. Use: railway run --service api -- node templates/push-hiastro.mjs ..."); process.exit(1); }

// Folder -> existing spec name. Spec ID is resolved from the live export.
const MAPPING = [
  { folder: "hiastro-expert-predictions-paywall-done", spec: "HiAstro general-01" },
  { folder: "hiastro-life-guide-paywall-done",         spec: "HiAstro general-02" },
  { folder: "hiastro-premium-offer-paywall-done",      spec: "HiAstro general-03" },
  { folder: "kundli-analysis-paywall 2-done",          spec: "HiAstro marriage-01" },
  { folder: "marriage-contextual-unlock",              spec: "HiAstro marriage-02" },
  { folder: "marriage-discount-reading-paywall",       spec: "HiAstro marriage-03" },
  { folder: "love-clarity-north-social-paywall-done",  spec: "HiAstro love-01" },
  { folder: "love-clarity-trial-reminder-paywall-done", spec: "HiAstro love-02" },
  { folder: "love-clarity-trusted-paywall-done",       spec: "HiAstro love-03" },
  { folder: "love-clarity-urgency-paywall-done",       spec: "HiAstro love-04" },
  { folder: "career-growth-paywall 2-done",            spec: "HiAstro career-01" },
  { folder: "career-progress-paywall-done",            spec: "HiAstro career-02" },
];

// Same CSS as packages/react-native/src/renderer/compose.ts phoneArtboardCss
// + bigger CTA rules, with env(safe-area-inset-*) fallbacks for older SDKs.
const FLATTEN_CSS = `
/* === Tranzmit full-bleed flatten (baked; works regardless of SDK version) === */
body { padding: 0 !important; margin: 0 !important; }
.device {
  width: 100% !important; max-width: 100vw !important;
  min-height: var(--tz-vh, 100dvh) !important;
  margin: 0 !important; padding: 0 !important;
  border-radius: 0 !important; background: transparent !important; box-shadow: none !important;
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
/* Hide low-res corner mandala/ornament images that bleed into safe areas
   (top "Lakh+" overlap, bottom orange smudge). They are purely decorative. */
.decor, .decor-top, .decor-bottom, .decor-left, .decor-right,
.decor-top-right, .decor-bottom-left, .decor-left-mid,
.price-watermark { display: none !important; }
/* === end Tranzmit flatten === */
`.trim();

// Asset-class-aware compression: avatars are opaque photos that compress hard as JPEG;
// stat/decorative icons need PNG alpha but are small on screen; everything else gets
// a moderate PNG. All sized to comfortably exceed 3x retina at typical display sizes.
function classifyAsset(name) {
  if (/^avatar_/i.test(name)) return { kind: "avatar", maxSide: 384, format: "jpeg", quality: 78 };
  if (/^(stat_|icon_|chip_|proof_|slots_)/i.test(name)) return { kind: "icon", maxSide: 256, format: "png" };
  // Larger illustrations / mandalas / hero shapes.
  return { kind: "art", maxSide: 512, format: "png" };
}

async function dataUriForAsset(absPath) {
  const buf = readFileSync(absPath);
  const isPng = /\.png$/i.test(absPath);
  const isJpg = /\.(jpe?g)$/i.test(absPath);
  if (!isPng && !isJpg) {
    const mime = absPath.endsWith(".webp") ? "image/webp" : "application/octet-stream";
    return `data:${mime};base64,${buf.toString("base64")}`;
  }
  const cls = classifyAsset(basename(absPath));
  const pipeline = sharp(buf).resize({
    width: cls.maxSide,
    height: cls.maxSide,
    fit: "inside",
    withoutEnlargement: true,
  });
  let mime, encoded;
  if (cls.format === "jpeg") {
    // Avatars: flatten any alpha onto white, then JPEG-encode.
    encoded = await pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: cls.quality || 78, progressive: true, mozjpeg: true }).toBuffer();
    mime = "image/jpeg";
  } else {
    encoded = await pipeline.png({ compressionLevel: 9, palette: true, quality: 90, effort: 8 }).toBuffer();
    mime = "image/png";
  }
  return `data:${mime};base64,${encoded.toString("base64")}`;
}

function inlineAssetsInHtml(html, folderAbsPath, dataUris) {
  // src/href attributes
  html = html.replace(/(src|href)=(["'])assets\/([^"']+)\2/g, (match, attr, q, name) => {
    const uri = dataUris[name];
    return uri ? `${attr}=${q}${uri}${q}` : match;
  });
  // CSS url(...)
  html = html.replace(/url\(\s*(["']?)assets\/([^"')]+)\1\s*\)/g, (match, q, name) => {
    const uri = dataUris[name];
    return uri ? `url(${q}${uri}${q})` : match;
  });
  return html;
}

function bakeFlattenCss(html) {
  if (html.includes("Tranzmit full-bleed flatten (baked")) return html;
  if (html.includes("</style>")) {
    const idx = html.lastIndexOf("</style>");
    return html.slice(0, idx) + "\n" + FLATTEN_CSS + "\n" + html.slice(idx);
  }
  if (html.includes("</head>")) {
    return html.replace("</head>", `<style>${FLATTEN_CSS}</style></head>`);
  }
  return `<style>${FLATTEN_CSS}</style>` + html;
}

// Idempotently tag the primary CTA button with the SDK bridge contract.
// The HiAstro themed paywalls historically shipped `<button class="cta">` without
// `data-tranzmit-action="cta"`, which meant the SDK silently dropped CTA events.
// This guard ensures every push leaves the bridge marker in place even if a
// future source export forgets it. No-op if the marker is already present.
function bakeCtaBridge(html) {
  if (html.includes('data-tranzmit-action="cta"')) return html;
  // Match common variants of the primary CTA button.
  return html.replace(
    /(<button)((?:[^>]*?\sclass="[^"]*\bcta\b[^"]*"[^>]*?))(>)/g,
    '$1$2 data-tranzmit-action="cta"$3',
  );
}

function sha256Integrity(s) {
  return "sha256-" + createHash("sha256").update(s, "utf8").digest("base64");
}

async function buildUpdatedHtml(folderName) {
  const folderAbs = join(SRC, folderName);
  const indexPath = join(folderAbs, "index.html");
  if (!existsSync(indexPath)) throw new Error(`Missing: ${indexPath}`);
  const html = readFileSync(indexPath, "utf8");

  const assetsDir = join(folderAbs, "assets");
  let assetFiles = [];
  try {
    assetFiles = readdirSync(assetsDir).filter(f => /\.(png|jpe?g|webp|svg|gif)$/i.test(f));
  } catch { /* no assets dir */ }

  const referenced = new Set();
  for (const f of assetFiles) {
    if (html.includes(`assets/${f}`)) referenced.add(f);
  }

  const before = {};
  const after = {};
  const dataUris = {};
  for (const name of referenced) {
    const abs = join(assetsDir, name);
    before[name] = statSync(abs).size;
    const uri = await dataUriForAsset(abs);
    dataUris[name] = uri;
    const decoded = Buffer.byteLength(uri.split(",")[1] || "", "base64");
    after[name] = decoded;
  }

  let baked = inlineAssetsInHtml(html, folderAbs, dataUris);
  baked = bakeFlattenCss(baked);
  baked = bakeCtaBridge(baked);
  const integrity = sha256Integrity(baked);
  return {
    html: baked,
    integrity,
    htmlBytes: Buffer.byteLength(baked, "utf8"),
    referenced: [...referenced],
    before,
    after,
  };
}

// Coerce any metadata value to a string (the schema requires strings only).
// Existing live specs sometimes have object values (e.g. assetEmbedding) — JSON.stringify them.
function sanitizeMetadata(meta) {
  if (!meta || typeof meta !== "object") return undefined;
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v == null) continue;
    out[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  return Object.keys(out).length ? out : undefined;
}

// Only the keys the schema allows for `document`.
function cleanDocument(html, integrity, existingDoc) {
  const doc = { html };
  if (integrity) doc.integrity = integrity;
  // Preserve schema-allowed sibling props if they exist on the existing doc.
  for (const k of ["css", "js", "baseUrl", "cacheTtlSeconds"]) {
    if (existingDoc && existingDoc[k] !== undefined) doc[k] = existingDoc[k];
  }
  return doc;
}

// --- Fetch live config + build the spec-name -> spec-id map ---
async function fetchConfig() {
  const url = `${API}/admin/config/export?publicKey=${PUBLIC_KEY}`;
  const res = await fetch(url, { headers: { "x-admin-secret": ADMIN_SECRET } });
  if (!res.ok) throw new Error(`config export failed HTTP ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function putSpec(specId, updatedSpec) {
  const url = `${API}/admin/specs/${specId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "x-admin-secret": ADMIN_SECRET, "Content-Type": "application/json" },
    body: JSON.stringify({ spec: updatedSpec }),
  });
  if (!res.ok) throw new Error(`PUT ${specId} failed HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return await res.json();
}

// --- Main ---
console.log("=== HiAstro paywalls — push to Railway ===");
console.log(`API:      ${API}`);
console.log(`SRC:      ${SRC}`);
console.log(`MODE:     ${APPLY ? "APPLY (will write to API)" : "DRY-RUN (no API writes)"}`);
if (ONLY) console.log(`ONLY:     ${ONLY.join(", ")}`);
console.log("");

const config = await fetchConfig();
const specByName = new Map((config.specs || []).map(s => [s.name, s]));

// Backup BEFORE any write.
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = `/tmp/hiastro-backup-${ts}.json`;
const targetSpecs = MAPPING.map(m => specByName.get(m.spec)).filter(Boolean);
writeFileSync(backupPath, JSON.stringify({
  publicKey: PUBLIC_KEY,
  exported_at: new Date().toISOString(),
  specs: targetSpecs,
}, null, 2));
console.log(`Backup written: ${backupPath} (${targetSpecs.length} specs)\n`);

// Process each mapping.
const summary = [];
for (const m of MAPPING) {
  if (ONLY && !ONLY.includes(m.spec.replace(/^HiAstro /, ""))) {
    console.log(`SKIP  ${m.spec} (not in --only)`);
    continue;
  }
  const existing = specByName.get(m.spec);
  if (!existing) { console.log(`MISS  ${m.spec} (not found in workspace) — folder=${m.folder}`); continue; }

  try {
    const { html, integrity, htmlBytes, before, after } = await buildUpdatedHtml(m.folder);
    const beforeTotal = Object.values(before).reduce((a, b) => a + b, 0);
    const afterTotal = Object.values(after).reduce((a, b) => a + b, 0);
    const existingSpec = existing.spec || {};
    const updatedSpec = {
      ...existingSpec,
      document: cleanDocument(html, integrity, existingSpec.document),
      revision: (Number(existingSpec.revision) || 0) + 1,
    };
    const cleanMeta = sanitizeMetadata(existingSpec.metadata);
    if (cleanMeta) updatedSpec.metadata = cleanMeta;
    else delete updatedSpec.metadata;
    const payloadBytes = Buffer.byteLength(JSON.stringify({ spec: updatedSpec }), "utf8");

    console.log(`PREP  ${m.spec.padEnd(22)}  spec=${existing.id.slice(0, 8)}  folder=${m.folder}`);
    console.log(`        assets: ${Object.keys(before).length} files,  ${(beforeTotal/1024).toFixed(0)}KB → ${(afterTotal/1024).toFixed(0)}KB (resized to 512px max)`);
    console.log(`        html:   ${(htmlBytes/1024).toFixed(0)}KB  payload:  ${(payloadBytes/1024).toFixed(0)}KB`);
    console.log(`        revision: ${existing.spec?.document?.revision || 0} → ${updatedSpec.document.revision}`);
    console.log(`        integrity: ${integrity.slice(0, 40)}...`);

    if (APPLY) {
      const result = await putSpec(existing.id, updatedSpec);
      console.log(`        APPLIED  version=${result.version}  updated_at=${result.updated_at}`);
    }
    summary.push({ spec: m.spec, ok: true, htmlBytes, payloadBytes, applied: APPLY });
  } catch (e) {
    console.log(`FAIL  ${m.spec}  ${String(e.message || e).slice(0, 400)}`);
    summary.push({ spec: m.spec, ok: false, error: String(e.message || e) });
  }
  console.log("");
}

const ok = summary.filter(s => s.ok).length;
const fail = summary.length - ok;
console.log("=== SUMMARY ===");
console.log(`prepared: ${ok}/${summary.length}    failed: ${fail}`);
console.log(`mode: ${APPLY ? "APPLIED to API" : "DRY-RUN — no API writes"}`);
console.log(`backup: ${backupPath}`);
if (!APPLY) console.log(`\nTo apply, re-run with --apply.`);
if (fail > 0) process.exit(1);
