// Phase 2 — career-progress-paywall re-authored responsively, faithful to the
// original artboard (same assets, colors, fonts, copy) but using the shared
// SKELETON (v-final primitives) + a flex/grid plan card so the price never
// overlaps the features. See _skeleton.mjs for the inherited primitives.
import { SKELETON_CSS } from "./_skeleton.mjs";

const A = "file:///Users/Agaaz/paywalls-hires/career-progress-paywall-done/assets";

const html = `
<main class="tz-template" style="height:100svh;height:var(--tz-vh,100svh)" aria-label="Career progress paywall">
  <div class="tz-shell">
    <div class="tz-scroll">
      <img class="decor decor-top" src="${A}/career_mandala_top.png" alt="" aria-hidden="true" />
      <img class="decor decor-left" src="${A}/career_mandala_left.png" alt="" aria-hidden="true" />
      <section class="stats" aria-label="App statistics">
        <div class="stat"><img src="${A}/stat_laurel.png" alt="" /><span><strong>10 Lakh+</strong>Downloads</span></div>
        <div class="stat"><img src="${A}/stat_star.png" alt="" /><span><strong>4.5</strong>Rated</span></div>
        <div class="stat"><img src="${A}/stat_users.png" alt="" /><span><strong>50 Lakh+</strong>Users</span></div>
      </section>
      <div class="chips" aria-label="Topics">
        <span class="chip">&#9635; Career</span>
        <span class="chip">&#8599; Growth &amp; Timing</span>
      </div>
      <h1 class="hero-title">Get clarity on <span>career moves, timing</span> &amp; your next opportunity</h1>
      <p class="lede">Get practical astrology guidance to evaluate job changes, promotion timing, and your next move with confidence.</p>
      <section class="insight-card" aria-label="Career guidance benefits">
        <img class="road-art" src="${A}/career_road_art.png" alt="Career path road climbing toward a flag" />
        <span class="card-divider" aria-hidden="true"></span>
        <div class="insights">
          <div class="insight"><img src="${A}/career_icon_growth.png" alt="" /><span>Career<br />Growth</span></div>
          <div class="insight"><img src="${A}/career_icon_time.png" alt="" /><span>Best<br />Timing</span></div>
          <div class="insight"><img src="${A}/career_icon_move.png" alt="" /><span>Next<br />Move</span></div>
        </div>
      </section>
      <div class="proof-line" aria-label="Career consultations proof">
        <img src="${A}/career_proof_cluster.png" alt="" />
        <span><strong>12,400+</strong> career consultations this week</span>
      </div>
      <section class="plan-card" aria-label="Career Growth Pass">
        <span class="ribbon">&#9733; BEST VALUE</span>
        <span class="save-pill">Save 90% today</span>
        <div class="plan-grid">
          <h2 class="plan-title">Career Growth Pass</h2>
          <div class="price"><strong>&#8377;49</strong> <span>today</span><small>then &#8377;499/month</small></div>
          <ul class="career-features">
            <li><span class="feature-icon">=</span> Unlimited text chat</li>
            <li><span class="feature-icon">|||</span> Unlimited voice notes</li>
            <li><span class="feature-icon">&#9678;</span> Career timing insights</li>
            <li><span class="feature-icon">wa</span> Horoscope updates on WhatsApp</li>
          </ul>
        </div>
        <img class="chart-watermark" src="${A}/career_chart_watermark.png" alt="" aria-hidden="true" />
      </section>
    </div>
    <footer class="tz-footer">
      <button class="cta" type="button" data-tranzmit-action="cta" data-product-id="career_growth">
        <span class="cta-label">Unlock My Career Guidance</span><span class="arrow" aria-hidden="true">&#8594;</span>
      </button>
      <div class="footer">Try for just &#8377;49 &nbsp;&bull;&nbsp; Private &amp; confidential &nbsp;&bull;&nbsp; Cancel anytime</div>
    </footer>
  </div>
</main>
`;

const skin = `
:root { --paper: #fffaf6; --ink: #15100e; --muted: #5b5660; --orange: #e8650d; --orange-deep: #df3400; --line: rgba(175, 109, 50, 0.24); --line-strong: rgba(207, 95, 29, 0.82); }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif; color: var(--ink); }
.tz-template { background: radial-gradient(circle at 50% 46%, rgba(255, 225, 202, 0.18), transparent 34%), linear-gradient(180deg, #fffefa 0%, var(--paper) 100%); }

/* Decorative mandalas — absolute, behind the scroll content. */
.tz-scroll { position: relative; }
.decor { position: absolute; z-index: 0; pointer-events: none; opacity: 0.55; mix-blend-mode: multiply; }
.decor-top { top: 0; right: 0; width: 76px; }
.decor-left { top: 118px; left: 0; width: 60px; }
.tz-scroll > .stats, .tz-scroll > .chips, .tz-scroll > .hero-title, .tz-scroll > .lede, .tz-scroll > .insight-card, .tz-scroll > .proof-line, .tz-scroll > .plan-card { position: relative; z-index: 2; }

.stats { width: 100%; min-height: 64px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: center; margin-bottom: 16px; border: 1px solid rgba(220, 199, 168, 0.8); border-radius: 20px; background: rgba(255, 255, 255, 0.82); box-shadow: 0 10px 24px rgba(117, 75, 28, 0.08); }
.stat { min-width: 0; display: grid; grid-template-columns: 34px minmax(0, 1fr); align-items: center; gap: 7px; padding: 8px 11px; }
.stat + .stat { border-left: 1px solid rgba(116, 91, 54, 0.18); }
.stat img { width: 32px; height: 35px; object-fit: contain; }
.stat strong, .stat span { display: block; }
.stat strong { color: #15100d; font-size: 15px; font-weight: 900; line-height: 1; }
.stat span { margin-top: 4px; color: #3f3732; font-size: 8.5px; font-weight: 620; line-height: 1.1; }

.chips { display: flex; justify-content: center; gap: 12px; margin-bottom: 14px; }
.chip { min-height: 28px; display: inline-flex; align-items: center; gap: 7px; padding: 0 15px; border: 1px solid rgba(184, 108, 57, 0.22); border-radius: 999px; background: rgba(255, 247, 237, 0.86); color: #a84c20; font-size: 10px; font-weight: 750; white-space: nowrap; }

.hero-title { width: 100%; margin: 0 0 11px; text-align: center; color: #0d0b0a; font-family: Georgia, "Times New Roman", serif; font-size: 27px; font-weight: 800; line-height: 1.16; letter-spacing: 0; }
.hero-title span { color: #cf5518; white-space: nowrap; }
.lede { width: min(333px, 100%); margin: 0 auto 15px; color: #5a5460; text-align: center; font-size: 11.4px; font-weight: 540; line-height: 1.55; }

.insight-card { width: 100%; min-height: 145px; display: grid; grid-template-columns: 140px 1px minmax(0, 1fr); align-items: center; gap: 12px; margin-bottom: 12px; padding: 12px 15px; border: 1px solid rgba(216, 196, 174, 0.75); border-radius: 13px; background: rgba(255, 252, 247, 0.86); box-shadow: 0 7px 18px rgba(117, 77, 39, 0.04); }
.road-art { width: 136px; max-height: 128px; object-fit: contain; justify-self: center; mix-blend-mode: multiply; }
.card-divider { width: 1px; height: 106px; background: rgba(171, 122, 81, 0.24); }
.insights { min-width: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; text-align: center; }
.insight img { width: 43px; height: 43px; object-fit: contain; display: block; margin: 0 auto 6px; }
.insight span { display: block; color: #181311; font-size: 10px; font-weight: 650; line-height: 1.16; }

.proof-line { width: 100%; display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 12px; color: #2e2929; font-size: 11px; font-weight: 560; line-height: 1.1; white-space: nowrap; }
.proof-line img { width: 70px; object-fit: contain; }
.proof-line strong { color: #111; font-size: 13px; font-weight: 900; }

/* Plan card: faithful look, price as a GRID column (not absolute) → no overlap. */
.plan-card { position: relative; width: 100%; margin: 0 auto 10px; padding: 34px 14px 12px; border: 1px solid var(--line-strong); border-radius: 11px; background: rgba(255, 251, 247, 0.92); box-shadow: 0 8px 18px rgba(99, 55, 31, 0.06); overflow: hidden; text-align: left; }
.ribbon { position: absolute; top: -1px; left: -1px; height: 25px; display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; border-radius: 10px 0 7px 0; background: linear-gradient(90deg, #f08011, #dc3b00); color: #fff4df; font-size: 9.2px; font-weight: 900; white-space: nowrap; z-index: 3; }
.save-pill { position: absolute; top: 12px; right: 13px; z-index: 3; padding: 4px 9px; border-radius: 999px; background: #fff0dc; color: #b84d1c; font-size: 9px; font-weight: 830; }
.plan-grid { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "title price" "features price"; column-gap: 12px; align-items: start; }
.plan-title { grid-area: title; max-width: 200px; margin: 0 0 13px; color: #15100d; font-size: 20px; font-weight: 900; line-height: 1; }
.career-features { grid-area: features; align-self: start; display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.career-features li { display: grid; grid-template-columns: 17px minmax(0, 1fr); align-items: center; gap: 10px; color: #15100d; font-size: 9.8px; font-weight: 620; line-height: 1; }
.feature-icon { width: 16px; height: 16px; display: grid; place-items: center; border: 1px solid rgba(211, 86, 18, 0.72); border-radius: 6px; color: #c65018; background: rgba(255, 246, 235, 0.85); font-size: 8px; font-weight: 900; }
.price { grid-area: price; align-self: start; text-align: right; white-space: nowrap; color: #231d1a; line-height: 1; padding-top: 6px; }
.price strong { color: #dc5f1a; font-size: 31px; font-weight: 900; letter-spacing: 0; }
.price span { color: #373038; font-size: 13px; font-weight: 680; }
.price small { display: block; margin-top: 10px; color: #5c5355; font-size: 10px; font-weight: 620; }
.chart-watermark { position: absolute; right: 16px; bottom: 12px; width: 103px; max-width: 33%; opacity: 0.76; mix-blend-mode: multiply; pointer-events: none; z-index: 1; }

/* CTA skin only (size comes from the skeleton's enlarged-CTA primitive). */
.cta { border-radius: 8px; background: linear-gradient(90deg, #f87d0b, #e53600); color: #fff8e6; box-shadow: 0 9px 18px rgba(202, 76, 8, 0.18); }
.footer { width: 100%; color: #5f5960; text-align: center; font-size: 9.5px; font-weight: 650; line-height: 1.2; }
`;

export default {
  id: "phase2-career-02",
  name: "✨ career-02 — Phase 2 (responsive)",
  presentation: "fullscreen",
  spec: {
    renderer: "webview",
    products: [{ id: "career_growth", name: "Career Growth Pass", isDefault: true, price: { amount: 4900, currency: "INR" } }],
    document: { html, css: SKELETON_CSS + skin },
  },
};
