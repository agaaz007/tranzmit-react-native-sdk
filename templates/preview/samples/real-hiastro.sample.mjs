// Loads the real exported HiAstro paywalls from disk into the harness so we can
// reproduce exactly how each one renders in the app. Each exported file is a
// full standalone HTML document, so we extract its <style> and <body>, strip
// runtime <script>s (not needed for layout), and rewrite relative `assets/...`
// references to absolute file:// URLs so the images load in the preview iframe.
//
// Set TZ_REAL_DIR to point elsewhere; set TZ_REAL_LANG=both to also load the
// Hinglish "index 2.html" twins.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const REAL_DIR =
  process.env.TZ_REAL_DIR ||
  "/Users/Agaaz/Downloads/final-paywalls-hiastro (updated footers)";

const LANG = process.env.TZ_REAL_LANG || "en"; // "en" | "both"

function fileUrl(absPath) {
  // Percent-encode spaces etc.; encodeURI leaves "/" and "()" intact.
  return "file://" + encodeURI(absPath);
}

function rewriteAssets(text, folderAbs) {
  const base = fileUrl(join(folderAbs, "assets")) + "/";
  return text
    // attribute refs: src="assets/x", data-tranzmit-src='assets/x', href="assets/x"
    .replace(/(=\s*["'])assets\//g, `$1${base}`)
    // css url(assets/x), url("assets/x"), url('assets/x')
    .replace(/url\(\s*(["']?)assets\//g, `url($1${base}`);
}

function extract(htmlDoc, folderAbs) {
  const css = [...htmlDoc.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");
  const bodyMatch = htmlDoc.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : htmlDoc;
  body = body.replace(/<script[\s\S]*?<\/script>/gi, ""); // drop runtime scripts
  return {
    html: rewriteAssets(body, folderAbs),
    css: rewriteAssets(css, folderAbs),
  };
}

function buildSamples() {
  if (!existsSync(REAL_DIR)) {
    console.warn(`[real-hiastro] dir not found, skipping: ${REAL_DIR}`);
    return [];
  }
  const out = [];
  const dirs = readdirSync(REAL_DIR)
    .filter((d) => statSync(join(REAL_DIR, d)).isDirectory())
    .sort();

  const files = LANG === "both"
    ? [["index.html", "EN"], ["index 2.html", "HI"]]
    : [["index.html", "EN"]];

  for (const dir of dirs) {
    for (const [fname, langTag] of files) {
      const abs = join(REAL_DIR, dir, fname);
      if (!existsSync(abs)) continue;
      const doc = readFileSync(abs, "utf8");
      const { html, css } = extract(doc, join(REAL_DIR, dir));
      out.push({
        id: `real-${dir.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${langTag.toLowerCase()}`,
        name: `${dir} (${langTag})`,
        presentation: "fullscreen",
        spec: {
          renderer: "webview",
          products: [{ id: "pro_monthly", name: dir, price: { amount: 4900, currency: "INR" } }],
          document: { html, css },
        },
      });
    }
  }
  return out;
}

export default buildSamples();
