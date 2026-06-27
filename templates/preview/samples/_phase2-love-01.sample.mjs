// Phase 2 — love-clarity-north-social re-authored responsively, faithful to the
// original artboard (same assets, colors, fonts, copy) but using the shared
// SKELETON (v-final primitives) + a flex/grid plan card so the price never
// overlaps the features. See _skeleton.mjs for the inherited primitives.
import { SKELETON_CSS } from "./_skeleton.mjs";

const A = "file:///Users/Agaaz/paywalls-hires/love-clarity-north-social-paywall-done/assets";

const html = `
<main class="tz-template" style="height:100svh;height:var(--tz-vh,100svh)" aria-label="Love clarity paywall">
  <div class="tz-shell">
    <div class="tz-scroll">
      <h1 class="headline">Understand Your <span>Relationship&rsquo;s Future</span></h1>
      <p class="region-proof"><strong>82,500 people in North India</strong> used Love Clarity this week</p>
      <div class="stats-row" aria-label="App statistics">
        <div class="stat">
          <img class="stat-icon laurel" src="${A}/stat_laurel.png" alt="" aria-hidden="true" />
          <span><strong>10L+</strong><span>Downloads</span></span>
        </div>
        <div class="stat">
          <svg class="stat-icon gold" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="m16 2.8 3.9 8 8.8 1.3-6.3 6.1 1.5 8.7-7.9-4.1-7.9 4.1 1.5-8.7-6.3-6.1 8.8-1.3L16 2.8Z" /></svg>
          <span><strong>4.5</strong><span>Rated</span></span>
        </div>
        <div class="stat">
          <svg class="stat-icon gold" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M12.7 15.1a5.2 5.2 0 1 0 0-10.4 5.2 5.2 0 0 0 0 10.4Zm10.1.7a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM3.8 27.4h17.8c0-5.4-3.6-9.2-8.9-9.2s-8.9 3.8-8.9 9.2Zm16.1-8.5c2.6 1.6 4.1 4.4 4.1 8.5h4.2c0-4.9-2.5-8.3-6.5-8.7-.6.1-1.2.2-1.8.2Z" /></svg>
          <span><strong>50L+</strong><span>Users</span></span>
        </div>
      </div>
      <section class="testimonial-row" aria-label="Love clarity testimonials">
        <article class="testimonial-card"><div class="testimonial-head"><img src="${A}/avatar_priya.png" alt="" /><span><strong>Priya</strong><span>Mumbai</span></span></div><p>Finally understood why my relationship felt stuck - so much clarity!</p></article>
        <article class="testimonial-card"><div class="testimonial-head"><img src="${A}/avatar_rahul.png" alt="" /><span><strong>Rahul</strong><span>Delhi</span></span></div><p>Accurate predictions that helped me plan my future</p></article>
        <article class="testimonial-card"><div class="testimonial-head"><img src="${A}/avatar_anjali.png" alt="" /><span><strong>Anjali</strong><span>Bengaluru</span></span></div><p>Best investment for peace of mind in my love life</p></article>
      </section>
      <section class="plan-card" aria-label="Love Clarity Pack">
        <span class="ribbon">&#9733; BEST VALUE</span>
        <span class="selected" aria-hidden="true">&#10003;</span>
        <div class="plan-grid">
          <h2 class="plan-title">Love Clarity Pack</h2>
          <div class="price"><span class="price-label">Try for</span><strong>&#8377;49</strong> <span>today</span><small>Then only &#8377;499/month</small></div>
          <ul class="features">
            <li><span class="feature-icon">=</span> Unlimited text chat</li>
            <li><span class="feature-icon">|||</span> Unlimited voice notes</li>
            <li><span class="feature-icon">&#9742;</span> Unlimited audio calls</li>
            <li><span class="feature-icon">&#9825;</span> Relationship compatibility insights</li>
            <li><span class="feature-icon">wa</span> Daily guidance on WhatsApp</li>
          </ul>
        </div>
        <img class="plan-art" src="${A}/plan_art.png" alt="" aria-hidden="true" />
      </section>
      <p class="bottom-note">Only &#8377;49 due now</p>
    </div>
    <footer class="tz-footer">
      <button class="cta" type="button" data-tranzmit-action="cta" data-product-id="love_clarity">
        <span class="cta-label">Start My 1-Day Trial</span><span class="arrow" aria-hidden="true">&#8594;</span>
      </button>
      <div class="footer">1-day trial &nbsp;&bull;&nbsp; Private &amp; confidential &nbsp;&bull;&nbsp; Cancel anytime</div>
    </footer>
  </div>
</main>
`;

const skin = `
:root { --paper: #fffafd; --ink: #141116; --muted: #5d5961; --pink: #df2b65; --pink-deep: #c61756; --line-strong: rgba(177, 52, 102, 0.5); }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif; color: var(--ink); }
.tz-template { background: radial-gradient(circle at 50% 39%, rgba(255, 230, 241, 0.8), transparent 27%), linear-gradient(180deg, #ffffff 0%, var(--paper) 100%); }

.headline { width: min(324px, 100%); margin: 0 auto 9px; color: #121016; text-align: center; font-size: 26px; font-weight: 900; line-height: 1.05; letter-spacing: -0.8px; }
.headline span { color: var(--pink-deep); }
.region-proof { margin: 0 0 12px; color: #171317; text-align: center; font-size: 12.2px; font-weight: 700; line-height: 1.18; }
.region-proof strong { font-weight: 900; }

.stats-row { width: min(328px, 100%); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: center; gap: 0; margin: 6px auto 14px; }
.stat { min-height: 38px; display: grid; grid-template-columns: 32px minmax(0, 1fr); align-items: center; gap: 8px; padding: 0 10px; color: #131016; }
.stat + .stat { border-left: 1px solid rgba(112, 89, 101, 0.12); }
.stat-icon { width: 31px; height: 31px; display: block; object-fit: contain; }
.stat-icon.laurel { filter: brightness(0); }
.stat-icon.gold { color: #e8b63d; }
.stat strong, .stat span { display: block; line-height: 1.05; }
.stat strong { font-size: 13px; font-weight: 900; }
.stat span { margin-top: 3px; color: #4b454d; font-size: 8.4px; font-weight: 620; }

.testimonial-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; width: 100%; margin: 0 0 12px; }
.testimonial-card { min-height: 88px; padding: 9px 8px; border: 1px solid rgba(174, 95, 130, 0.22); border-radius: 10px; background: rgba(255, 255, 255, 0.92); box-shadow: 0 9px 22px rgba(77, 39, 54, 0.09); }
.testimonial-head { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 7px; align-items: center; margin-bottom: 8px; }
.testimonial-card img { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; }
.testimonial-head > span { min-width: 0; }
.testimonial-head strong, .testimonial-head > span > span { display: block; line-height: 1.05; }
.testimonial-head strong { font-size: 10.5px; font-weight: 900; }
.testimonial-head > span > span { margin-top: 2px; color: #5f5760; font-size: 8.6px; font-weight: 560; }
.testimonial-card p { margin: 0; color: #171116; font-size: 9px; font-weight: 600; line-height: 1.22; }

/* Plan card: faithful look, price as a GRID column (not absolute) → no overlap. */
.plan-card { position: relative; width: 100%; margin: 0 auto 10px; padding: 30px 16px 14px; border: 1px solid rgba(210, 31, 91, 0.78); border-radius: 14px; background: linear-gradient(180deg, rgba(255, 239, 246, 0.96), rgba(255, 246, 250, 0.92)); box-shadow: 0 9px 22px rgba(178, 35, 92, 0.14); overflow: hidden; text-align: left; }
.ribbon { position: absolute; top: -1px; left: -1px; min-width: 84px; height: 28px; display: flex; align-items: center; padding: 0 12px; border-radius: 12px 0 9px 0; background: linear-gradient(90deg, #ef3b70, #d81f57); color: #fff7fa; font-size: 9.6px; font-weight: 900; z-index: 3; }
.selected { position: absolute; top: 19px; right: 16px; width: 24px; height: 24px; display: grid; place-items: center; border-radius: 50%; background: #df336a; color: #fff; font-size: 12px; font-weight: 900; z-index: 3; }
.plan-grid { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr) 130px; grid-template-areas: "title price" "features price"; column-gap: 12px; align-items: start; }
.plan-title { grid-area: title; max-width: none; margin: 0 0 14px; color: #111015; font-size: 18px; font-weight: 900; line-height: 1.08; }
.features { grid-area: features; align-self: start; display: grid; gap: 11px; margin: 0; padding: 0; list-style: none; }
.features li { display: grid; grid-template-columns: 17px minmax(0, 1fr); align-items: center; gap: 9px; color: #21161d; font-size: 10px; font-weight: 640; line-height: 1.05; }
.feature-icon { width: 17px; height: 17px; display: grid; place-items: center; border: 1px solid rgba(191, 44, 102, 0.48); border-radius: 5px; color: #bd2c66; background: rgba(255, 247, 250, 0.9); font-size: 8.6px; font-weight: 900; }
.price { grid-area: price; align-self: start; text-align: right; white-space: nowrap; color: #181318; line-height: 1; padding-top: 4px; }
.price-label { display: block; margin-bottom: 6px; color: #171318; font-size: 13px; font-weight: 850; }
.price strong { color: #ce225f; font-size: 33px; font-weight: 900; letter-spacing: 0; }
.price span { font-size: 13px; font-weight: 750; }
.price small { display: flex; width: max-content; max-width: 100%; margin-left: auto; align-items: center; min-height: 22px; margin-top: 9px; padding: 0 7px; border-radius: 999px; background: rgba(255, 230, 240, 0.9); color: #5f5660; font-size: 8.6px; font-weight: 760; white-space: nowrap; }
.plan-art { position: absolute; right: -8px; bottom: 0; width: 104px; max-width: 32%; opacity: 0.18; pointer-events: none; mix-blend-mode: multiply; z-index: 1; }

.bottom-note { width: 100%; margin: 0 0 4px; color: #141116; text-align: center; background: transparent; box-shadow: none; font-size: 14px; font-weight: 900; }

/* CTA skin only (size comes from the skeleton's enlarged-CTA primitive). */
.cta { border-radius: 10px; background: linear-gradient(90deg, #ef386a, #cf1550); color: #fff7fb; box-shadow: 0 10px 22px rgba(197, 24, 83, 0.23); }
.footer { width: 100%; color: #6d666d; text-align: center; font-size: 9px; font-weight: 560; line-height: 1.2; }
`;

export default {
  id: "phase2-love-01",
  name: "✨ love-01 — Phase 2 (responsive)",
  presentation: "fullscreen",
  spec: {
    renderer: "webview",
    products: [{ id: "love_clarity", name: "Love Clarity Pack", isDefault: true, price: { amount: 4900, currency: "INR" } }],
    document: { html, css: SKELETON_CSS + skin },
  },
};
