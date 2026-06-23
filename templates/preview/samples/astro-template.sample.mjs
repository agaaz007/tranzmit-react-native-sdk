// The SAME astrology paywall content as astro-intro-offer, but authored on the
// fixed `tz-template` structure. This should stay balanced and safe across
// every viewport in the harness — the proof that the template solves the
// "sparse upper half / clipped CTA / web≠app" problem.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const contractCss = readFileSync(join(here, "..", "..", "paywall.css"), "utf8");

const html = `
<main class="tz-template" aria-label="Astrology expert predictions paywall">
  <header class="tz-band tz-band--top">
    <div class="tz-promo">⏳ Offer ends in 14:54 · 7,821 joined today in your city</div>
    <h1 class="tz-headline">Apni Kundli ke Experts se <span>Sahi Predictions Paayein</span></h1>
    <p class="tz-subhead">50 Lakh+ logon ka bharosa — zindagi ke har sawaal ka jawaab</p>
    <div class="tz-rating">★★★★★ <b>4.5</b> · 50L+ users</div>
  </header>

  <section class="tz-band tz-band--focus">
    <ul class="tz-value tz-icons">
      <li><span>🌅</span>Rozana sateek margdarshan</li>
      <li><span>🧑‍🏫</span>Expert se personal raaz</li>
      <li><span>🪔</span>Aazmaaye hue upay</li>
    </ul>

    <div class="tz-offer">
      <div class="tz-badge">★ BEST DEAL</div>
      <div class="tz-plan">
        <strong>HiAstro Premium Pack</strong>
        <div class="tz-price"><b>₹49</b> today <small>then ₹499/month</small></div>
      </div>
      <ul class="tz-features">
        <li>Unlimited chat</li>
        <li>Unlimited voice notes</li>
        <li>Unlimited audio calls</li>
        <li>Aapki Kundli ke insights</li>
        <li>Roz ke upay aur sujhaav</li>
        <li>Updates on WhatsApp</li>
      </ul>
    </div>

    <div class="tz-proof">
      <span class="avatar">👩</span>
      <p>"Maine apni shaadi ka sahi muhurat yahin se nikalwaaya."<em>— Priya, Delhi</em></p>
    </div>
  </section>

  <footer class="tz-band tz-band--bottom">
    <button class="tz-cta" data-tranzmit-action="cta" data-product-id="pro_monthly">Abhi Premium Shuru Karein</button>
    <ul class="tz-legal">
      <li>1-day trial</li>
      <li>100% gupt aur safe</li>
      <li>Kabhi bhi cancel karein</li>
    </ul>
  </footer>
</main>
`;

// Author SKIN — visual styling only; the layout/scaling comes from the contract.
const skin = `
.tz-template {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(180deg, #fff7ed 0%, #ffffff 45%);
  color: #1f2937;
  text-align: center;
}
.tz-promo { background: #fff1f2; color: #9f1239; font-weight: 700; padding: 8px 12px; border-radius: 999px; font-size: var(--tz-step-legal); }
.tz-headline span { color: #ea580c; }
.tz-subhead { color: #6b7280; }
.tz-rating { font-size: var(--tz-step-body); color: #b45309; font-weight: 600; }
.tz-rating b { color: #1f2937; }
.tz-icons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 0; padding: 0; list-style: none; }
.tz-icons li { font-size: 12px; color: #4b5563; line-height: 1.3; }
.tz-icons li span { display: block; font-size: clamp(26px, 7vw, 34px); margin-bottom: 4px; }
.tz-offer { position: relative; text-align: left; border: 1px solid #fed7aa; background: #fffbeb; border-radius: var(--tz-radius); padding: clamp(14px, 2vh, 18px) 16px; }
.tz-badge { position: absolute; top: -12px; left: 16px; background: #ea580c; color: #fff; font-size: 11px; font-weight: 800; letter-spacing: .4px; padding: 5px 10px; border-radius: 999px; }
.tz-plan { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.tz-plan strong { font-size: var(--tz-step-body); }
.tz-price b { font-size: clamp(26px, 7.6vw, 32px); color: #ea580c; }
.tz-price small { color: #6b7280; font-size: 12px; display: block; }
.tz-features { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; margin: 12px 0 0; padding: 0; list-style: none; }
.tz-features li { font-size: 13px; color: #374151; padding-left: 18px; position: relative; text-align: left; }
.tz-features li::before { content: "✓"; color: #16a34a; position: absolute; left: 0; font-weight: 800; }
.tz-proof { display: flex; gap: 10px; align-items: center; text-align: left; background: #fff; border: 1px solid #f3f4f6; border-radius: 16px; padding: 10px 12px; }
.tz-proof .avatar { font-size: 28px; }
.tz-proof p { margin: 0; font-size: 12px; color: #4b5563; line-height: 1.3; }
.tz-proof em { display: block; color: #9ca3af; margin-top: 2px; }
.tz-cta { background: linear-gradient(90deg, #f97316, #ea580c); color: #fff; }
.tz-legal { color: #9ca3af; }
`;

export default {
  name: "Astro on tz-template (fixed structure)",
  presentation: "fullscreen",
  spec: {
    renderer: "webview",
    products: [{ id: "pro_monthly", name: "HiAstro Premium Pack", price: { amount: 4900, currency: "INR", interval: "month" } }],
    document: { html, css: contractCss + "\n" + skin },
  },
};
