// Phase 2 — HiAstro Expert Predictions re-authored responsively, faithful to the
// original artboard (same assets, colors, fonts, copy) but using the shared
// SKELETON (v-final primitives) + a flex/grid plan card so the price never
// overlaps the features. See _skeleton.mjs for the inherited primitives.
import { SKELETON_CSS } from "./_skeleton.mjs";

const A = "file:///Users/Agaaz/paywalls-hires/hiastro-expert-predictions-paywall-done/assets";

const html = `
<main class="tz-template" style="height:100svh;height:var(--tz-vh,100svh)" aria-label="HiAstro expert predictions paywall">
  <div class="tz-shell">
    <div class="tz-scroll">
      <section class="activity-card" aria-label="Offer activity">
        <div class="offer-copy">Offer ends in <span class="timer">03:00</span></div>
        <span class="divider" aria-hidden="true"></span>
        <div class="joined"><strong>&#9679;&#9679; 2,847 users</strong><br />joined today in your city</div>
      </section>
      <h1 class="headline">Get Accurate Predictions from <span>Expert Astrologers</span></h1>
      <p class="subtitle">Trusted by 50L+ users for cosmic clarity and life decisions</p>
      <section class="rating-strip" aria-label="Rating proof">
        <img class="faces" src="${A}/proof_faces.png" alt="" />
        <div>
          <div class="stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <div class="trusted">Trusted by 50L+ users</div>
        </div>
        <span class="rating-divider" aria-hidden="true"></span>
        <div class="rating-number">4.5 <span>average rating</span></div>
      </section>
      <section class="benefits" aria-label="Premium benefits">
        <article class="benefit">
          <img src="${A}/life_daily_icon.png" alt="" />
          <h2>Daily accurate<br />guidance</h2>
        </article>
        <article class="benefit">
          <img src="${A}/life_personal_icon.png" alt="" />
          <h2>Expert Personal<br />Insights</h2>
        </article>
        <article class="benefit">
          <img src="${A}/life_remedy_icon.png" alt="" />
          <h2>Proven<br />Remedies</h2>
        </article>
      </section>
      <section class="premium-card" aria-label="HiAstro Premium Pack">
        <span class="ribbon">&#9733; BEST VALUE</span>
        <div class="plan-grid">
          <h2 class="premium-title">HiAstro Premium Pack</h2>
          <div class="premium-price"><strong>&#8377;49</strong> <span>today</span><small>then &#8377;499/month</small></div>
          <ul class="feature-list">
            <li><span class="feature-icon">=</span> Unlimited text chat</li>
            <li><span class="feature-icon">|||</span> Unlimited voice notes</li>
            <li><span class="feature-icon">&#9742;</span> Unlimited audio calls</li>
            <li><span class="feature-icon">&#9734;</span> Personalized astrology insights</li>
            <li><span class="feature-icon">&#9825;</span> Daily guidance &amp; remedies</li>
            <li><span class="feature-icon">wa</span> Updates on WhatsApp</li>
          </ul>
        </div>
        <img class="plan-art" src="${A}/life_meditation_imagegen.png" alt="" aria-hidden="true" />
      </section>
    </div>
    <footer class="tz-footer">
      <button class="cta" type="button" data-tranzmit-action="cta" data-product-id="hiastro_premium">
        <span class="cta-label">Unlock HiAstro Premium</span><span class="arrow" aria-hidden="true">&#8594;</span>
      </button>
      <div class="footer">1-day trial &nbsp;&bull;&nbsp; Private &amp; confidential &nbsp;&bull;&nbsp; Cancel anytime</div>
    </footer>
  </div>
</main>
`;

const skin = `
:root {
  --paper: #fffdf7; --ink: #1a100d; --muted: #5d554e;
  --orange: #e9650c; --orange-deep: #e33800; --gold: #f5ae17;
  --line: rgba(202, 170, 76, 0.38); --line-strong: rgba(174, 129, 38, 0.68);
}
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif; color: var(--ink); }
.tz-template { background: radial-gradient(circle at -2% 22%, rgba(247, 176, 23, 0.22) 0 13px, transparent 14px), radial-gradient(circle at 103% 21%, rgba(218, 192, 115, 0.16), transparent 80px), linear-gradient(180deg, #fffefa 0%, var(--paper) 100%); }

/* Activity card: countdown timer + joined-today proof. */
.activity-card { width: 100%; min-height: 58px; display: grid; grid-template-columns: 1fr 1px 1fr; align-items: center; gap: 14px; margin: 0 0 10px; padding: 8px 16px; border: 1px solid rgba(244, 229, 190, 0.88); border-radius: 18px; background: rgba(255, 255, 255, 0.88); box-shadow: 0 12px 28px rgba(126, 87, 18, 0.11); }
.offer-copy { display: inline-flex; align-items: center; gap: 8px; color: #16110e; font-size: 14px; font-weight: 540; line-height: 1.05; white-space: nowrap; }
.timer { padding: 3px 7px; border-radius: 6px; background: #fff3d5; color: #1d130f; font-size: 23px; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; }
.divider { width: 1px; height: 36px; background: rgba(111, 89, 50, 0.17); }
.joined { color: #201511; text-align: center; font-size: 13px; font-weight: 820; line-height: 1.12; }
.joined strong { color: #c76122; font-size: 16px; }

.headline { width: 100%; margin: 14px 0 10px; text-align: center; color: #190f0b; font-size: 26px; font-weight: 900; line-height: 1.17; }
.headline span { color: var(--orange); white-space: nowrap; }
.subtitle { width: min(305px, 100%); margin: 0 auto 15px; color: #5a514c; text-align: center; font-size: 12.4px; font-weight: 560; line-height: 1.43; }

/* Rating strip: faces + stars + average rating. */
.rating-strip { width: 100%; min-height: 55px; display: grid; grid-template-columns: 104px minmax(0, 1fr) 1px 82px; align-items: center; gap: 10px; margin: 0 0 14px; padding: 7px 13px; border: 1px solid var(--line); border-radius: 16px; background: rgba(255, 253, 239, 0.87); box-shadow: 0 7px 17px rgba(128, 88, 18, 0.06); }
.faces { width: 98px; height: 38px; object-fit: contain; justify-self: start; }
.stars { color: var(--gold); font-size: 14px; font-weight: 900; letter-spacing: 1px; white-space: nowrap; }
.trusted { color: #1c1511; font-size: 9px; font-weight: 700; line-height: 1.1; }
.rating-divider { width: 1px; height: 34px; background: rgba(141, 112, 51, 0.22); }
.rating-number { color: #c65f20; text-align: center; font-size: 17px; font-weight: 900; line-height: 1.08; }
.rating-number span { display: block; color: #665a50; font-size: 8.8px; font-weight: 640; }

/* Benefits: 3 icon columns with hairline separators. */
.benefits { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 0 0 16px; }
.benefit { position: relative; min-width: 0; text-align: center; }
.benefit + .benefit::before { content: ""; position: absolute; left: -4px; top: 27px; width: 1px; height: 55px; background: rgba(199, 173, 86, 0.38); }
.benefit img { width: 58px; height: 58px; display: block; object-fit: contain; margin: 0 auto 7px; }
.benefit h2 { margin: 0; color: #17110e; font-size: 12px; font-weight: 820; line-height: 1.16; }

/* Plan card: faithful look, price as a GRID column (not absolute) → no overlap. */
.premium-card { position: relative; width: 100%; margin: 0 auto 4px; padding: 31px 14px 12px; border: 1px solid var(--line-strong); border-radius: 11px; background: rgba(255, 253, 242, 0.9); box-shadow: 0 9px 20px rgba(140, 91, 12, 0.08); overflow: hidden; text-align: left; }
.ribbon { position: absolute; top: -1px; left: -1px; height: 25px; display: inline-flex; align-items: center; gap: 5px; padding: 0 13px; border-radius: 10px 0 9px 0; background: linear-gradient(90deg, #ffac00, #f36b00); color: #fff8df; font-size: 9px; font-weight: 900; z-index: 3; white-space: nowrap; }
.plan-grid { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "title price" "features price"; column-gap: 12px; align-items: start; }
.premium-title { grid-area: title; max-width: 210px; margin: 0 0 12px; color: #11100e; font-size: 16.5px; font-weight: 900; line-height: 1.02; }
.feature-list { grid-area: features; align-self: start; display: grid; gap: 8px; max-width: 220px; margin: 0; padding: 0; list-style: none; }
.feature-list li { display: grid; grid-template-columns: 17px minmax(0, 1fr); align-items: center; gap: 9px; color: #231914; font-size: 9.4px; font-weight: 650; line-height: 1.1; }
.feature-icon { width: 15px; height: 15px; display: grid; place-items: center; border: 1px solid rgba(183, 117, 29, 0.5); border-radius: 5px; color: #b96123; background: rgba(255, 248, 229, 0.88); font-size: 8px; font-weight: 900; line-height: 1; }
.premium-price { grid-area: price; align-self: start; text-align: right; white-space: nowrap; color: #241812; line-height: 1.03; padding-top: 4px; }
.premium-price strong { color: #d45f1b; font-size: 31px; font-weight: 900; }
.premium-price span { font-size: 12px; font-weight: 760; }
.premium-price small { display: block; margin-top: 8px; color: #66554a; font-size: 9px; font-weight: 620; }
.plan-art { position: absolute; right: 0; bottom: 0; z-index: 1; width: 172px; max-width: 44%; pointer-events: none; opacity: 0.96; mix-blend-mode: multiply; }

/* CTA skin only (size comes from the skeleton's enlarged-CTA primitive). */
.cta { border-radius: 10px; background: linear-gradient(90deg, #ff9f00 0%, #ed2f00 100%); color: #fff8dd; box-shadow: 0 9px 20px rgba(220, 90, 0, 0.2); }
.footer { width: 100%; color: #635646; text-align: center; font-size: 9px; font-weight: 650; line-height: 1.2; }
`;

export default {
  id: "phase2-general-01",
  name: "✨ general-01 — Phase 2 (responsive)",
  presentation: "fullscreen",
  spec: {
    renderer: "webview",
    products: [{ id: "hiastro_premium", name: "HiAstro Premium Pack", isDefault: true, price: { amount: 4900, currency: "INR" } }],
    document: { html, css: SKELETON_CSS + skin },
  },
};
