// Representative sample that mimics the production astrology paywalls
// (HiAstro / Love Clarity): a full-height (`100svh`) document with its own
// design classes, authored the way they look correct in a desktop browser.
//
// It deliberately uses the failure-prone pattern the screenshots exhibit:
//   - `min-height: 100svh` + `justify-content: space-between` on the column,
//     so on tall viewports the slack pools into one big gap (sparse upper half);
//   - its own class names (NOT `tz-paywall` / `tranzmit-paywall`), so the SDK's
//     fullscreen container rules don't apply and `--tz-safe-*` is never consumed
//     (top can slide under the notch, bottom under the home indicator);
//   - no short-viewport compaction (the SDK only compacts `.influish_intro_offer`).
//
// Swap this file's `html`/`css` for the real pasted paywalls to reproduce them.

const html = `
<main class="pw" aria-label="Astrology expert predictions paywall">
  <div class="pw-promo">⏳ Offer ends in 14:54 · 7,821 joined today in your city</div>

  <header class="pw-hero">
    <h1>Apni Kundli ke Experts se <span>Sahi Predictions Paayein</span></h1>
    <p class="pw-sub">50 Lakh+ logon ka bharosa — zindagi ke har sawaal ka jawaab</p>
    <div class="pw-rating">★★★★★ <b>4.5</b> · 50L+ users</div>
    <ul class="pw-icons">
      <li><span>🌅</span>Rozana sateek margdarshan</li>
      <li><span>🧑‍🏫</span>Expert se personal raaz</li>
      <li><span>🪔</span>Aazmaaye hue upay</li>
    </ul>
  </header>

  <section class="pw-offer">
    <div class="pw-badge">★ BEST DEAL</div>
    <div class="pw-plan">
      <strong>HiAstro Premium Pack</strong>
      <div class="pw-price"><b>₹49</b> today <small>then ₹499/month</small></div>
    </div>
    <ul class="pw-features">
      <li>Unlimited chat</li>
      <li>Unlimited voice notes</li>
      <li>Unlimited audio calls</li>
      <li>Aapki Kundli ke hisaab se insights</li>
      <li>Roz ke upay aur sujhaav</li>
      <li>Updates on WhatsApp</li>
    </ul>
    <div class="pw-testimonial">
      <span class="avatar">👩</span>
      <p>"Maine apni shaadi ka sahi muhurat yahin se nikalwaaya."<em>— Priya, Delhi</em></p>
    </div>
  </section>

  <footer class="pw-foot">
    <button class="pw-cta" data-tranzmit-action="cta" data-product-id="pro_monthly">Abhi Premium Shuru Karein</button>
    <ul class="pw-legal">
      <li>1-day trial</li>
      <li>100% gupt aur safe</li>
      <li>Kabhi bhi cancel karein</li>
    </ul>
  </footer>
</main>
`;

const css = `
.pw {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;   /* <-- the failure mode: slack pools into one gap */
  gap: 18px;
  padding: 18px 20px 22px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(180deg, #fff7ed 0%, #ffffff 45%);
  color: #1f2937;
}
.pw-promo {
  background: #fff1f2; color: #9f1239; font-weight: 700; font-size: 13px;
  text-align: center; padding: 8px 12px; border-radius: 999px;
}
.pw-hero { text-align: center; }
.pw-hero h1 { margin: 12px 0 6px; font-size: 28px; line-height: 1.1; letter-spacing: -0.02em; }
.pw-hero h1 span { color: #ea580c; }
.pw-sub { margin: 0 0 10px; color: #6b7280; font-size: 15px; line-height: 1.4; }
.pw-rating { font-size: 14px; color: #b45309; font-weight: 600; }
.pw-rating b { color: #1f2937; }
.pw-icons {
  list-style: none; margin: 16px 0 0; padding: 0;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
}
.pw-icons li { font-size: 12px; color: #4b5563; line-height: 1.3; }
.pw-icons li span { display: block; font-size: 30px; margin-bottom: 4px; }
.pw-offer {
  border: 1px solid #fed7aa; background: #fffbeb; border-radius: 22px;
  padding: 18px 16px; position: relative;
}
.pw-badge {
  position: absolute; top: -12px; left: 16px; background: #ea580c; color: #fff;
  font-size: 11px; font-weight: 800; letter-spacing: 0.4px; padding: 5px 10px; border-radius: 999px;
}
.pw-plan { display: flex; align-items: baseline; justify-content: space-between; }
.pw-plan strong { font-size: 16px; }
.pw-price b { font-size: 30px; color: #ea580c; }
.pw-price small { color: #6b7280; font-size: 12px; display: block; }
.pw-features {
  list-style: none; margin: 14px 0 0; padding: 0;
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px;
}
.pw-features li { font-size: 13px; color: #374151; padding-left: 18px; position: relative; }
.pw-features li::before { content: "✓"; color: #16a34a; position: absolute; left: 0; font-weight: 800; }
.pw-testimonial {
  display: flex; gap: 10px; align-items: center; margin-top: 14px;
  background: #fff; border: 1px solid #f3f4f6; border-radius: 16px; padding: 10px 12px;
}
.pw-testimonial .avatar { font-size: 28px; }
.pw-testimonial p { margin: 0; font-size: 12px; color: #4b5563; line-height: 1.3; }
.pw-testimonial em { display: block; color: #9ca3af; margin-top: 2px; }
.pw-foot { display: grid; gap: 12px; }
.pw-cta {
  width: 100%; border: 0; border-radius: 999px; cursor: pointer;
  background: linear-gradient(90deg, #f97316, #ea580c); color: #fff;
  font-size: 17px; font-weight: 800; padding: 17px;
}
.pw-legal {
  list-style: none; margin: 0; padding: 0; display: flex; justify-content: center; gap: 16px;
  color: #9ca3af; font-size: 11px;
}
`;

export default {
  name: "Astro intro offer (representative)",
  presentation: "fullscreen",
  spec: {
    renderer: "webview",
    products: [{ id: "pro_monthly", name: "HiAstro Premium Pack", price: { amount: 4900, currency: "INR", interval: "month" } }],
    document: { html, css },
  },
};
