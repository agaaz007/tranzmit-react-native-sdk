// Phase 2 — career-growth re-authored responsively, faithful to the original
// artboard (same assets, colors, fonts, copy) but using the shared SKELETON
// (v-final primitives) + a flex/grid plan card so the price never overlaps the
// features. See _skeleton.mjs for the inherited primitives.
import { SKELETON_CSS } from "./_skeleton.mjs";

const A = "file:///Users/Agaaz/paywalls-hires/career-growth-paywall 2-done/assets";

const html = `
<main class="tz-template" style="height:100svh;height:var(--tz-vh,100svh)" aria-label="Career growth paywall">
  <div class="tz-shell">
    <div class="tz-scroll">
      <img class="decor decor-top" src="${A}/career_mandala_top.png" alt="" aria-hidden="true" />
      <img class="decor decor-left" src="${A}/career_mandala_left.png" alt="" aria-hidden="true" />

      <h1 class="top-title">Today&rsquo;s Exclusive Offer</h1>
      <div class="timer-line"><i aria-hidden="true">&#9719;</i> Offer expires in: <time datetime="PT3M">00:03:00</time></div>

      <h2 class="hero-title">Get clarity on <span>career moves, timing</span> &amp; your next opportunity</h2>
      <p class="lede">Get practical astrology guidance to evaluate job changes, promotion timing, and your next move with confidence.</p>

      <section class="insight-card" aria-label="Career guidance benefits">
        <img class="briefcase" src="${A}/career_briefcase_exact.png" alt="Briefcase with upward growth arrow" />
        <span class="card-divider" aria-hidden="true"></span>
        <div class="insights">
          <div class="insight"><img src="${A}/career_icon_growth.png" alt="" /><span>Career<br />Growth</span></div>
          <div class="insight"><img src="${A}/career_icon_time.png" alt="" /><span>Best<br />Timing</span></div>
          <div class="insight"><img src="${A}/career_icon_target.png" alt="" /><span>Next<br />Move</span></div>
        </div>
      </section>

      <section class="proof-card" aria-label="Career social proof">
        <img class="proof-cluster" src="${A}/career_proof_cluster.png" alt="" />
        <div class="proof-copy">
          <div class="stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <strong>12,400+</strong>
          <span>career consultations this week</span>
        </div>
        <p class="proof-sub">Trusted by thousands. Guided to better career decisions.</p>
      </section>

      <section class="plan-card" aria-label="Career Growth Pass">
        <span class="scarcity">&#9719; Limited Availability: 3/10 passes left today</span>
        <div class="plan-grid">
          <h2 class="plan-title">Career Growth Pass<small>1 day trial</small></h2>
          <div class="price">
            <strong>&#8377;49</strong> <span>today</span>
            <small>then &#8377;499/month</small>
          </div>
          <ul class="career-features">
            <li><span class="check">&#10003;</span> Unlimited text chat</li>
            <li><span class="check">&#10003;</span> Unlimited voice notes</li>
            <li><span class="check">&#10003;</span> Career timing insights</li>
            <li><span class="check">&#10003;</span> Horoscope updates on WhatsApp</li>
          </ul>
        </div>
        <img class="chart-watermark" src="${A}/career_chart_watermark.png" alt="" aria-hidden="true" />
      </section>

      <p class="payment-due">Try for just &#8377;49</p>
    </div>
    <footer class="tz-footer">
      <button class="cta" type="button" data-tranzmit-action="cta" data-product-id="career_growth">
        <span class="cta-label">Start My Career Guidance</span><span class="arrow" aria-hidden="true">&#8594;</span>
      </button>
      <p class="fine-print">1 day trial, then &#8377;499/mo. &nbsp;&bull;&nbsp; Cancel anytime.</p>
    </footer>
  </div>
</main>
`;

const skin = `
:root { --paper: #fff9f4; --ink: #14100e; --muted: #5e5860; --accent: #c95e21; --orange: #e9670f; --orange-deep: #e13a00; --line: rgba(171, 103, 49, 0.22); --line-strong: rgba(144, 78, 38, 0.52); --green: #5eb86f; }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif; color: var(--ink); }
.tz-template { background: radial-gradient(circle at 50% 44%, rgba(255, 228, 206, 0.22), transparent 33%), linear-gradient(180deg, #fffaf6 0%, var(--paper) 100%); }

/* Scroll region acts as positioning context for the decorative mandalas. */
.tz-scroll { position: relative; }
.decor { position: absolute; z-index: 1; opacity: 0.6; pointer-events: none; mix-blend-mode: multiply; }
.decor-top { top: 0; right: 0; width: 77px; max-width: 22%; }
.decor-left { top: 96px; left: 0; width: 48px; max-width: 14%; }

.top-title { position: relative; z-index: 2; margin: 0 0 7px; color: #111; text-align: center; font-size: 21px; font-weight: 900; line-height: 1.05; }
.timer-line { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 6px; margin: 0 auto 12px; color: #16110e; font-size: 12px; font-weight: 700; white-space: nowrap; }
.timer-line i { width: 13px; height: 13px; display: grid; place-items: center; border: 1px solid rgba(160, 91, 44, 0.56); border-radius: 50%; color: #a7673a; font-style: normal; font-size: 8px; }
.timer-line time { color: #b25c2c; font-weight: 900; font-variant-numeric: tabular-nums; }

.hero-title { position: relative; z-index: 2; width: min(330px, 100%); margin: 0 auto 14px; color: #0b0908; text-align: center; font-family: Georgia, "Times New Roman", serif; font-size: 26px; font-weight: 800; line-height: 1.18; }
.hero-title span { color: var(--accent); }
.lede { position: relative; z-index: 2; width: min(330px, 100%); margin: 0 auto 14px; color: #5b5661; text-align: center; font-size: 10.8px; font-weight: 560; line-height: 1.48; }

.insight-card { position: relative; z-index: 2; width: 100%; min-height: 114px; display: grid; grid-template-columns: 132px 1px minmax(0, 1fr); align-items: center; margin-bottom: 10px; padding: 8px 13px; border: 1px solid var(--line); border-radius: 13px; background: rgba(255, 251, 247, 0.86); box-shadow: 0 8px 20px rgba(92, 56, 33, 0.06); }
.briefcase { width: 124px; max-width: 100%; justify-self: start; object-fit: contain; filter: drop-shadow(0 6px 9px rgba(125, 66, 28, 0.12)); }
.card-divider { width: 1px; height: 86px; background: rgba(160, 103, 70, 0.16); }
.insights { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; align-items: start; padding-left: 13px; text-align: center; }
.insight img { display: block; width: 46px; height: 46px; object-fit: contain; margin: 0 auto 5px; }
.insight span { display: block; color: #191513; font-size: 10.2px; font-weight: 650; line-height: 1.2; }

.proof-card { position: relative; z-index: 2; width: 100%; min-height: 84px; display: grid; grid-template-columns: 138px minmax(0, 1fr); align-items: center; margin-bottom: 9px; padding: 9px 15px; border: 1px solid var(--line-strong); border-radius: 13px; background: rgba(255, 251, 246, 0.92); overflow: hidden; }
.proof-cluster { width: 134px; max-width: 100%; object-fit: contain; }
.proof-copy { position: relative; z-index: 2; text-align: left; }
.stars { color: #ec7514; font-size: 11px; font-weight: 900; letter-spacing: 4px; white-space: nowrap; }
.proof-copy strong { display: block; margin-top: 3px; color: #111; font-size: 22px; font-weight: 900; line-height: 1; }
.proof-copy span { color: #211a17; font-size: 10.4px; font-weight: 600; line-height: 1.15; }
.proof-sub { grid-column: 1 / -1; margin: 4px 0 0; text-align: center; color: #261d19; font-size: 9.5px; font-weight: 600; line-height: 1.1; }

/* Plan card: faithful look, price as a GRID column (not absolute) → no overlap. */
.plan-card { position: relative; z-index: 2; width: 100%; margin-bottom: 7px; padding: 26px 14px 10px; border: 1px solid rgba(217, 96, 29, 0.78); border-radius: 11px; background: rgba(255, 251, 247, 0.92); overflow: hidden; text-align: left; box-shadow: 0 8px 22px rgba(156, 70, 28, 0.15); }
.scarcity { position: absolute; top: -1px; left: -1px; min-height: 26px; display: inline-flex; align-items: center; padding: 0 12px; border-radius: 10px 0 7px 0; background: linear-gradient(90deg, #ec7716, #d83800); color: #fff4df; font-size: 9.2px; font-weight: 850; z-index: 3; box-shadow: 0 0 8px rgba(236, 119, 22, 0.24); }
.plan-grid { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "title price" "features price"; column-gap: 12px; align-items: start; }
.plan-title { grid-area: title; max-width: 218px; margin: 0 0 12px; color: #14100e; font-size: 15.3px; font-weight: 900; line-height: 1.1; }
.plan-title small { display: block; margin-top: 3px; font-size: 7.7px; font-weight: 700; }
.career-features { grid-area: features; align-self: start; display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
.career-features li { display: grid; grid-template-columns: 17px minmax(0, 1fr); align-items: center; gap: 9px; color: #14100e; font-size: 9.2px; font-weight: 620; line-height: 1; }
.check { width: 15px; height: 15px; display: grid; place-items: center; border-radius: 50%; background: var(--green); color: #fff; font-size: 9px; font-weight: 900; }
.price { grid-area: price; align-self: start; text-align: right; white-space: nowrap; color: #231d1a; line-height: 1; padding-top: 2px; }
.price strong { color: #d7601d; font-size: 31px; font-weight: 900; }
.price span { color: #373038; font-size: 13px; font-weight: 680; }
.price small { display: block; margin-top: 11px; color: #5c5355; font-size: 10px; font-weight: 620; }
.chart-watermark { position: absolute; right: 18px; bottom: 10px; width: 72px; max-width: 24%; opacity: 0.82; mix-blend-mode: multiply; pointer-events: none; z-index: 1; }

.payment-due { position: relative; z-index: 2; margin: 0 0 2px; color: #15110f; text-align: center; font-size: 10px; font-weight: 900; line-height: 1; }

/* CTA skin only (size comes from the skeleton's enlarged-CTA primitive). */
.cta { border-radius: 8px; background: linear-gradient(90deg, #f1750e, #e53400); color: #fff8e6; box-shadow: 0 9px 18px rgba(202, 76, 8, 0.18); }
.fine-print { width: 100%; margin: 0; color: #1c1715; text-align: center; font-size: 9.5px; font-weight: 580; line-height: 1.2; }
`;

export default {
  id: "phase2-career-01",
  name: "✨ career-01 — Phase 2 (responsive)",
  presentation: "fullscreen",
  spec: {
    renderer: "webview",
    products: [{ id: "career_growth", name: "Career Growth Pass", isDefault: true, price: { amount: 4900, currency: "INR" } }],
    document: { html, css: SKELETON_CSS + skin },
  },
};
