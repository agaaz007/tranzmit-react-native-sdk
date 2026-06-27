// Phase 2 — love-clarity-trusted re-authored responsively, faithful to the
// original artboard (same assets, colors, fonts, copy) but using the shared
// SKELETON (v-final primitives) + a flex/grid plan card so the price never
// overlaps the features. See _skeleton.mjs for the inherited primitives.
import { SKELETON_CSS } from "./_skeleton.mjs";

const A = "file:///Users/Agaaz/paywalls-hires/love-clarity-trusted-paywall-done/assets";

const html = `
<main class="tz-template" style="height:100svh;height:var(--tz-vh,100svh)" aria-label="Love clarity paywall">
  <div class="tz-shell">
    <div class="tz-scroll">
      <img class="stats-bar" src="${A}/stats_bar.png" alt="10L+ downloads, 4.5 rated, 50L+ users" />
      <div class="rule"></div>
      <p class="region-proof"><strong>Trusted by thousands for love clarity</strong></p>
      <section class="testimonial-row" aria-label="Love clarity testimonials">
        <article class="testimonial-card"><div class="testimonial-head"><img src="${A}/avatar_priya.png" alt="" /><span><strong>Dr. Priya K.</strong><span>Mumbai</span></span></div><p>&ldquo;Finally got clarity on whether he&rsquo;s the one. Accurate!&rdquo;</p></article>
        <article class="testimonial-card"><div class="testimonial-head"><img src="${A}/avatar_rahul.png" alt="" /><span><strong>Rahul S.</strong><span>Delhi</span></span></div><p>&ldquo;The relationship insights were spot on. Game changer.&rdquo;</p></article>
        <article class="testimonial-card"><div class="testimonial-head"><img src="${A}/avatar_anjali.png" alt="" /><span><strong>Anjali</strong><span>Bangalore</span></span></div><p>&ldquo;Helped me understand our future path. Highly recommend!&rdquo;</p></article>
      </section>
      <div class="badge">&#9825; Love &amp; Relationship Clarity</div>
      <h1 class="headline">See where this <span>relationship is going</span></h1>
      <p class="subtitle">Get clarity on feelings, future potential, and the right next step in your love life.</p>
      <div class="journey-wrap"><img class="journey" src="${A}/journey_strip.png" alt="Love clarity journey" /></div>
      <div class="insight-pill">&#9789; Relationship Insights</div>
      <section class="plan-card" aria-label="Love Clarity Pack">
        <span class="ribbon">&#9733; BEST VALUE</span>
        <span class="selected" aria-hidden="true">&#10003;</span>
        <div class="plan-grid">
          <h2 class="plan-title">Love Clarity Pack</h2>
          <div class="price"><strong>&#8377;49</strong> <span>today</span><small>then &#8377;499/month</small></div>
          <ul class="features">
            <li><span class="feature-icon">=</span> Unlimited text chat</li>
            <li><span class="feature-icon">|||</span> Unlimited voice notes</li>
            <li><span class="feature-icon">&#9742;</span> Unlimited audio calls</li>
            <li><span class="feature-icon">&#9825;</span> Relationship compatibility insights</li>
            <li><span class="feature-icon">wa</span> Horoscope updates on WhatsApp</li>
          </ul>
        </div>
        <img class="plan-art" src="${A}/plan_art.png" alt="" aria-hidden="true" />
      </section>
      <div class="proof-strip"><span>&#127470;&#127475; Loved by 10L+ Indians across 500 cities</span></div>
    </div>
    <footer class="tz-footer">
      <button class="cta" type="button" data-tranzmit-action="cta" data-product-id="love_clarity">
        <span class="cta-label">Unlock Love Clarity</span><span class="arrow" aria-hidden="true">&#8594;</span>
      </button>
      <div class="footer">1-day trial &nbsp;&bull;&nbsp; Private &amp; confidential &nbsp;&bull;&nbsp; Cancel anytime</div>
    </footer>
  </div>
</main>
`;

const skin = `
:root { --paper: #fffafd; --ink: #141116; --muted: #5d5961; --pink: #df2b65; --pink-deep: #c61756; }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif; color: var(--ink); }
.tz-template { background: radial-gradient(circle at 50% 30%, rgba(255, 230, 241, 0.8), transparent 30%), linear-gradient(180deg, #ffffff 0%, var(--paper) 100%); }

.stats-bar { display: block; width: 280px; max-width: 100%; height: auto; margin: 0 auto 7px; object-fit: contain; }
.rule { width: 100%; height: 1px; margin-bottom: 7px; background: rgba(31, 25, 29, 0.08); }
.region-proof { color: #171317; text-align: center; font-size: 11px; font-weight: 700; line-height: 1.28; margin: 0 0 7px; }
.region-proof strong { font-weight: 900; }
.testimonial-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; width: 100%; margin: 0 0 10px; }
.testimonial-card { min-height: 70px; padding: 8px; border: 1px solid rgba(174, 95, 130, 0.22); border-radius: 8px; background: rgba(255, 255, 255, 0.86); box-shadow: 0 7px 17px rgba(60, 33, 44, 0.08); }
.testimonial-head { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 7px; align-items: center; margin-bottom: 8px; }
.testimonial-card img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.testimonial-head > span { min-width: 0; }
.testimonial-head strong, .testimonial-head > span > span { display: block; line-height: 1.05; }
.testimonial-head strong { font-size: 10px; font-weight: 900; }
.testimonial-head > span > span { margin-top: 2px; color: #5f5760; font-size: 8.4px; font-weight: 560; }
.testimonial-card p { margin: 0; color: #171116; font-size: 9.2px; font-weight: 590; line-height: 1.18; }
.badge { width: max-content; max-width: 100%; min-height: 26px; display: flex; align-items: center; justify-content: center; gap: 7px; margin: 0 auto 8px; padding: 4px 14px; border-radius: 999px; background: rgba(255, 233, 242, 0.9); color: #a92a5a; box-shadow: 0 7px 18px rgba(190, 55, 105, 0.1); font-size: 10px; font-weight: 750; }
.headline { width: min(324px, 100%); margin: 0 auto 9px; color: #121016; text-align: center; font-size: 22px; font-weight: 900; line-height: 1.18; }
.headline span { color: var(--pink-deep); }
.subtitle { width: min(318px, 100%); margin: 0 auto 7px; color: #5c5962; text-align: center; font-size: 11.1px; font-weight: 560; line-height: 1.4; }
.journey-wrap { width: min(286px, 100%); margin: 0 auto 6px; padding-top: 3px; filter: drop-shadow(0 7px 14px rgba(176, 41, 92, 0.08)); }
.journey { width: 100%; height: auto; display: block; object-fit: contain; }
.insight-pill { width: max-content; max-width: 100%; min-height: 25px; display: flex; align-items: center; justify-content: center; gap: 7px; margin: 0 auto 7px; padding: 4px 13px; border-radius: 999px; background: rgba(255, 232, 241, 0.9); color: #ad2d5e; font-size: 9.8px; font-weight: 760; }

/* Plan card: faithful look, price as a GRID column (not absolute) → no overlap. */
.plan-card { position: relative; width: 100%; margin: 0 auto 7px; padding: 28px 14px 10px; border: 1px solid rgba(210, 31, 91, 0.78); border-radius: 10px; background: linear-gradient(180deg, rgba(255, 239, 246, 0.96), rgba(255, 246, 250, 0.92)); box-shadow: 0 9px 22px rgba(178, 35, 92, 0.14); overflow: hidden; text-align: left; }
.ribbon { position: absolute; top: -1px; left: -1px; min-width: 84px; height: 24px; display: flex; align-items: center; padding: 0 11px; border-radius: 9px 0 8px 0; background: linear-gradient(90deg, #ef3b70, #d81f57); color: #fff7fa; font-size: 8.9px; font-weight: 900; z-index: 3; }
.selected { position: absolute; top: 15px; right: 13px; width: 19px; height: 19px; display: grid; place-items: center; border-radius: 50%; background: #df336a; color: #fff; font-size: 12px; font-weight: 900; z-index: 3; }
.plan-grid { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "title price" "features price"; column-gap: 12px; align-items: start; }
.plan-title { grid-area: title; max-width: 210px; margin: 0 0 12px; color: #111015; font-size: 16.5px; font-weight: 900; line-height: 1.05; }
.features { grid-area: features; align-self: start; display: grid; gap: 9px; margin: 0; padding: 0; list-style: none; }
.features li { display: grid; grid-template-columns: 17px minmax(0, 1fr); align-items: center; gap: 8px; color: #21161d; font-size: 9.2px; font-weight: 640; line-height: 1.1; }
.feature-icon { width: 15px; height: 15px; display: grid; place-items: center; border: 1px solid rgba(191, 44, 102, 0.48); border-radius: 5px; color: #bd2c66; background: rgba(255, 247, 250, 0.9); font-size: 8px; font-weight: 900; }
.price { grid-area: price; align-self: start; text-align: right; white-space: nowrap; color: #3d333b; line-height: 1.05; padding-top: 18px; }
.price strong { color: #ce225f; font-size: 31px; font-weight: 900; }
.price span { font-size: 13px; font-weight: 660; }
.price small { display: block; margin-top: 9px; color: #5f5660; font-size: 10px; font-weight: 600; }
.plan-art { position: absolute; right: 2px; bottom: 0; width: 126px; max-width: 37%; opacity: 0.9; pointer-events: none; mix-blend-mode: multiply; z-index: 1; }
.proof-strip { width: 100%; min-height: 20px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 8px; margin: 0 0 2px; padding: 3px 6px; border-radius: 999px; background: rgba(255, 234, 241, 0.82); color: #594b54; font-size: 9px; font-weight: 650; }

/* CTA skin only (size comes from the skeleton's enlarged-CTA primitive). */
.cta { border-radius: 7px; background: linear-gradient(90deg, #ef386a, #cf1550); color: #fff7fb; box-shadow: 0 10px 22px rgba(197, 24, 83, 0.22); }
.footer { width: 100%; color: #6d666d; text-align: center; font-size: 9.5px; font-weight: 560; line-height: 1.2; }
`;

export default {
  id: "phase2-love-responsive",
  name: "✨ love-03 — Phase 2 (responsive, original assets)",
  presentation: "fullscreen",
  spec: {
    renderer: "webview",
    products: [{ id: "love_clarity", name: "Love Clarity Pack", isDefault: true, price: { amount: 4900, currency: "INR" } }],
    document: { html, css: SKELETON_CSS + skin },
  },
};
