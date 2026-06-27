// Phase 2 — HiAstro Life Guide re-authored responsively, faithful to the
// original artboard (same assets, colors, fonts, copy) but using the shared
// SKELETON (v-final primitives) + a flex/grid plan card so the price never
// overlaps the features. See _skeleton.mjs for the inherited primitives.
import { SKELETON_CSS } from "./_skeleton.mjs";

const A = "file:///Users/Agaaz/paywalls-hires/hiastro-life-guide-paywall-done/assets";

const html = `
<main class="tz-template" style="height:100svh;height:var(--tz-vh,100svh)" aria-label="HiAstro premium paywall">
  <div class="tz-shell">
    <div class="tz-scroll">
      <section class="stats" aria-label="App statistics">
        <div class="stat"><img src="${A}/stat_laurel.png" alt="" /><span><strong>10L+</strong>Downloads</span></div>
        <div class="stat"><img src="${A}/stat_star.png" alt="" /><span><strong>4.5</strong>Rated</span></div>
        <div class="stat"><img src="${A}/stat_users.png" alt="" /><span><strong>50L+</strong>Users</span></div>
      </section>
      <h1 class="headline">Your personal <span>astrology guide for life</span></h1>
      <p class="subtitle">Get clear answers, deeper insights, and better decisions &mdash; every day.</p>
      <section class="activation-card" aria-label="Offer activity">
        <div class="activation-left">
          <small>Offer expires in</small>
          <span class="countdown"><span>0</span><span>3</span><b>:</b><span>0</span><span>0</span></span>
        </div>
        <div class="activation-right">
          <div class="activation-number">12,847</div>
          <small>people activated today</small>
        </div>
      </section>
      <section class="benefits" aria-label="Premium benefits">
        <article class="benefit"><img src="${A}/life_daily_icon.png" alt="" /><h2>Daily Guidance</h2><p>Plan your day with cosmic clarity</p></article>
        <article class="benefit"><img src="${A}/life_personal_icon.png" alt="" /><h2>Personal Insights</h2><p>Understand yourself better</p></article>
        <article class="benefit"><img src="${A}/life_remedy_icon.png" alt="" /><h2>Remedies</h2><p>Simple solutions for positive change</p></article>
      </section>
      <section class="plan-card" aria-label="HiAstro Premium Pack">
        <span class="ribbon-row">
          <span class="ribbon">&#9733; BEST VALUE</span>
          <span class="ribbon secondary">Save 89% today</span>
        </span>
        <div class="plan-grid">
          <h2 class="plan-title">HiAstro Premium Pack</h2>
          <div class="price"><strong>&#8377;49</strong> <span>for full access today</span><small>then &#8377;499/month (Just &#8377;1.63/day)</small></div>
          <ul class="features">
            <li><span class="feature-icon">=</span> Unlimited text chat</li>
            <li><span class="feature-icon">|||</span> Unlimited voice notes</li>
            <li><span class="feature-icon">&#9742;</span> Unlimited audio calls</li>
            <li><span class="feature-icon">&#9734;</span> Personalized astrology insights</li>
            <li><span class="feature-icon">&#9825;</span> Daily guidance &amp; remedies</li>
            <li><span class="feature-icon">wa</span> Updates on WhatsApp</li>
          </ul>
        </div>
        <img class="plan-art" src="${A}/life_plan_art.png" alt="" aria-hidden="true" />
      </section>
    </div>
    <footer class="tz-footer">
      <button class="cta" type="button" data-tranzmit-action="cta" data-product-id="hiastro_premium">
        <span class="cta-label">Unlock My 1-Day Trial for &#8377;49</span><span class="arrow" aria-hidden="true">&#8594;</span>
      </button>
      <div class="footer" aria-label="Purchase terms">
        <span><i>&#10003;</i> 1-day trial</span>
        <span><i>&#128274;</i> Private &amp; confidential</span>
        <span><i>&#8635;</i> Cancel anytime</span>
      </div>
    </footer>
  </div>
</main>
`;

const skin = `
:root { --paper: #fffdf6; --paper-warm: #fff7df; --ink: #1b100d; --muted: #5b514b; --orange: #ee6d05; --orange-deep: #e83303; --gold: #f3ac17; --line: rgba(210, 173, 80, 0.34); --line-strong: rgba(199, 143, 28, 0.5); }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif; color: var(--ink); }
.tz-template { background: radial-gradient(circle at -2% 20%, rgba(247, 175, 17, 0.2) 0 13px, transparent 14px), radial-gradient(circle at 50% 41%, rgba(255, 223, 138, 0.22), transparent 30%), linear-gradient(180deg, #fffefa 0%, var(--paper) 100%); }

.stats { width: 100%; min-height: 58px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: center; margin: 0 0 14px; border: 1px solid rgba(241, 224, 177, 0.8); border-radius: 18px; background: rgba(255, 255, 255, 0.82); box-shadow: 0 10px 24px rgba(137, 101, 20, 0.08); }
.stat { display: grid; grid-template-columns: 35px minmax(0, 1fr); align-items: center; gap: 7px; min-width: 0; padding: 8px 10px; }
.stat + .stat { border-left: 1px solid rgba(116, 91, 54, 0.18); }
.stat img { width: 32px; height: 34px; object-fit: contain; }
.stat strong { display: block; color: #15100d; font-size: 15px; font-weight: 900; line-height: 1; }
.stat span { display: block; margin-top: 4px; color: #3f3732; font-size: 8.9px; font-weight: 620; line-height: 1.1; }

.headline { width: 100%; margin: 0 0 10px; text-align: center; color: #1b100d; font-size: 27px; font-weight: 900; line-height: 1.15; }
.headline span { display: block; color: var(--orange); }
.subtitle { width: min(310px, 100%); margin: 0 auto 18px; color: #49423e; text-align: center; font-size: 12.4px; font-weight: 560; line-height: 1.45; }

.activation-card { width: 100%; min-height: 53px; display: grid; grid-template-columns: 1fr 1px 1fr; align-items: center; gap: 16px; margin: 0 0 18px; padding: 8px 18px; border: 1px solid var(--line); border-radius: 16px; background: rgba(255, 253, 242, 0.85); }
.activation-card::before { content: ""; width: 1px; height: 36px; background: rgba(164, 133, 58, 0.18); grid-column: 2; grid-row: 1; }
.activation-left { grid-column: 1; text-align: center; }
.activation-right { grid-column: 3; text-align: center; }
.activation-card small { display: block; color: #201713; font-size: 9.8px; font-weight: 650; line-height: 1.1; }
.countdown { display: inline-flex; gap: 3px; margin-top: 5px; font-variant-numeric: tabular-nums; }
.countdown span { min-width: 17px; padding: 2px 3px; border-radius: 4px; background: #fff0c6; color: #20140f; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65); font-size: 16px; font-weight: 900; line-height: 1.1; }
.countdown b { color: #2a1b13; font-size: 17px; line-height: 1; }
.activation-number { color: #c95d1f; font-size: 21px; font-weight: 900; line-height: 1; }

.benefits { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 0 0 17px; }
.benefit { position: relative; min-width: 0; text-align: center; }
.benefit + .benefit::before { content: ""; position: absolute; left: -4px; top: 30px; width: 1px; height: 50px; background: rgba(199, 173, 86, 0.38); }
.benefit img { width: 58px; height: 58px; object-fit: contain; display: block; margin: 0 auto 4px; }
.benefit h2 { margin: 0 0 5px; color: #17110e; font-size: 10px; font-weight: 850; line-height: 1.1; }
.benefit p { margin: 0 auto; max-width: 92px; color: #5a504b; font-size: 8.9px; font-weight: 520; line-height: 1.28; }

/* Plan card: faithful look, price as a GRID column (not absolute) → no overlap. */
.plan-card { position: relative; width: 100%; margin: 0 0 10px; padding: 30px 14px 12px; border: 1px solid var(--line-strong); border-radius: 11px; background: rgba(255, 253, 242, 0.89); box-shadow: 0 8px 20px rgba(140, 91, 12, 0.08); overflow: hidden; text-align: left; }
.ribbon-row { position: absolute; top: -1px; left: -1px; display: flex; gap: 3px; z-index: 3; }
.ribbon { height: 24px; display: inline-flex; align-items: center; padding: 0 11px; border-radius: 10px 0 9px 0; background: linear-gradient(90deg, #ffad00, #f57100); color: #fff8df; font-size: 8.8px; font-weight: 900; white-space: nowrap; }
.ribbon.secondary { border-radius: 0 0 9px 0; background: linear-gradient(90deg, #ffbc24, #f36a00); }
.plan-grid { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "title price" "features price"; column-gap: 12px; align-items: start; }
.plan-title { grid-area: title; max-width: 205px; margin: 0 0 12px; color: #11100e; font-size: 16.4px; font-weight: 900; line-height: 1.02; }
.features { grid-area: features; align-self: start; display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.features li { display: grid; grid-template-columns: 17px minmax(0, 1fr); align-items: center; gap: 9px; color: #231914; font-size: 9.4px; font-weight: 650; line-height: 1; }
.feature-icon { width: 15px; height: 15px; display: grid; place-items: center; border: 1px solid rgba(183, 117, 29, 0.5); border-radius: 5px; color: #b96123; background: rgba(255, 248, 229, 0.88); font-size: 8px; font-weight: 900; line-height: 1; }
.price { grid-area: price; align-self: start; text-align: left; white-space: nowrap; width: 119px; color: #241812; line-height: 1.03; }
.price strong { color: #ca5d1d; font-size: 27px; font-weight: 900; }
.price span { font-size: 10.3px; font-weight: 780; line-height: 1.08; }
.price small { display: block; margin-top: 8px; color: #66554a; font-size: 7.7px; font-weight: 620; white-space: normal; }
.plan-art { position: absolute; right: 0; bottom: 0; z-index: 1; width: 173px; max-width: 42%; pointer-events: none; opacity: 0.96; mix-blend-mode: multiply; }

/* CTA skin only (size comes from the skeleton's enlarged-CTA primitive). */
.cta { border-radius: 10px; background: linear-gradient(90deg, #ff9f00 0%, #ed2f00 100%); color: #fff8dd; box-shadow: 0 9px 20px rgba(220, 90, 0, 0.2); }
.footer { width: 100%; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px 16px; color: #635646; font-size: 8.7px; font-weight: 650; text-align: center; line-height: 1.2; }
.footer span { display: inline-flex; justify-content: center; align-items: center; gap: 5px; min-width: 0; }
.footer i { font-style: normal; color: #997427; font-size: 12px; }
`;

export default {
  id: "phase2-general-02",
  name: "✨ general-02 — Phase 2 (responsive)",
  presentation: "fullscreen",
  spec: {
    renderer: "webview",
    products: [{ id: "hiastro_premium", name: "HiAstro Premium Pack", isDefault: true, price: { amount: 4900, currency: "INR" } }],
    document: { html, css: SKELETON_CSS + skin },
  },
};
