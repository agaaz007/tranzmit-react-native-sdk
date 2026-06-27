// Phase 2 — kundli-analysis (Marriage Clarity Pass) re-authored responsively,
// faithful to the original artboard (same assets, colors, fonts, copy) but using
// the shared SKELETON (v-final primitives) + a flex/grid plan card so the price
// never overlaps the features. See _skeleton.mjs for the inherited primitives.
import { SKELETON_CSS } from "./_skeleton.mjs";

const A = "file:///Users/Agaaz/paywalls-hires/kundli-analysis-paywall 2-done/assets";

const html = `
<main class="tz-template" style="height:100svh;height:var(--tz-vh,100svh)" aria-label="Kundli analysis paywall">
  <div class="tz-shell">
    <div class="tz-scroll">
      <img class="decor decor-top-right" src="${A}/mandala_top_right.png" alt="" aria-hidden="true" />
      <img class="decor decor-left-mid" src="${A}/mandala_left_mid.png" alt="" aria-hidden="true" />
      <img class="decor decor-bottom-left" src="${A}/mandala_bottom_left.png" alt="" aria-hidden="true" />

      <h1 class="headline">Your <span>Kundli</span> Analysis is Ready</h1>

      <section class="offer-card" aria-label="Limited time offer">
        <div class="timer-pill">
          <span>Offer expires in</span>
          <time datetime="PT3M">00:03:00</time>
        </div>
        <p>Limited Time Offer!</p>
      </section>

      <p class="lead">Understand your compatibility and the right timing to move ahead with confidence. Verified Vedic astrologers.</p>

      <div class="hero-art-wrap">
        <img class="hero-art" src="${A}/hero_rings_exact.png" alt="Gold wedding rings with flowers and a faint zodiac wheel" />
      </div>

      <div class="proof-row" aria-label="Social proof">
        <span><strong>50 Lakh+</strong> Indian families guided</span>
        <span class="proof-divider" aria-hidden="true"></span>
        <span><strong>4.5</strong> <span class="star" aria-hidden="true">&#9733;</span> rated by <strong>2.3 Lakh+</strong> users</span>
      </div>

      <section class="testimonial-row" aria-label="Customer testimonials">
        <article class="quote-card"><img src="${A}/avatar_priya.png" alt="" /><p>&ldquo;Finally understood our compatibility&rdquo;<small>- Priya, Mumbai</small></p></article>
        <article class="quote-card"><img src="${A}/avatar_rahul.png" alt="" /><p>&ldquo;Accurate timing guidance&rdquo;<small>- Rahul, Delhi</small></p></article>
        <article class="quote-card"><img src="${A}/avatar_amit.png" alt="" /><p>&ldquo;Helped us decide&rdquo;<small>- Amit, Bangalore</small></p></article>
      </section>

      <div class="trust-row" aria-label="Trust badges">
        <span class="trust-pill"><span class="trust-icon" aria-hidden="true">&#10003;</span> Verified Vedic astrologers</span>
        <span class="trust-pill"><span class="trust-icon" aria-hidden="true">&#9906;</span> Confidential &amp; Secure</span>
      </div>

      <section class="plan-card" aria-label="Marriage Clarity Pass">
        <span class="value-ribbon"><span aria-hidden="true">&#9733;</span> BEST VALUE</span>
        <span class="selected-icon" aria-hidden="true">&#10003;</span>
        <div class="plan-grid">
          <h2 class="plan-title">Marriage Clarity Pass</h2>
          <div class="price">
            <strong>&#8377;49</strong> <span>today</span>
            <small>then &#8377;499/month</small>
          </div>
          <ul class="features" aria-label="Included benefits">
            <li><span class="feature-icon" aria-hidden="true">=</span> Unlimited text chat</li>
            <li><span class="feature-icon" aria-hidden="true">|||</span> Unlimited voice notes</li>
            <li><span class="feature-icon" aria-hidden="true">&#9825;</span> Compatibility guidance</li>
            <li><span class="feature-icon" aria-hidden="true">wa</span> Horoscope updates on WhatsApp</li>
          </ul>
        </div>
        <img class="price-watermark" src="${A}/price_card_zodiac.png" alt="" aria-hidden="true" />
      </section>

      <p class="footer-proof"><strong>Join 12,000+ families this week</strong></p>
    </div>
    <footer class="tz-footer">
      <button class="cta" type="button" data-tranzmit-action="cta" data-product-id="marriage_clarity">
        <span class="cta-label">Start My Marriage Reading</span><span class="arrow" aria-hidden="true">&#8594;</span>
      </button>
      <div class="footer">1-day trial &nbsp;&bull;&nbsp; Private &amp; confidential &nbsp;&bull;&nbsp; Cancel anytime (कोई बंधन नहीं)</div>
    </footer>
  </div>
</main>
`;

const skin = `
:root { --ink: #15100d; --orange: #e96512; --orange-deep: #db3600; --gold: #af6e2a; }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif; color: var(--ink); }
.tz-template { background: radial-gradient(circle at 50% 34%, rgba(255, 235, 202, 0.9) 0 11%, rgba(255, 248, 240, 0) 28%), linear-gradient(180deg, #fffaf4 0%, #fff8f0 100%); }

/* Decorative mandalas — absolute behind the scroll content (within the shell). */
.tz-shell { position: relative; }
.decor { position: absolute; z-index: 0; pointer-events: none; opacity: 0.64; mix-blend-mode: multiply; }
.decor-top-right { top: -2px; right: -1px; width: 76px; }
.decor-left-mid { top: 156px; left: -1px; width: 68px; }
.decor-bottom-left { bottom: 0; left: 0; width: 76px; }
.tz-scroll { position: relative; z-index: 1; text-align: center; }

.headline { width: 100%; margin: 0 0 18px; text-align: center; color: #090705; font-family: Georgia, "Times New Roman", serif; font-size: 22px; font-weight: 800; line-height: 1.05; }
.headline span { color: #9a5d22; }

.offer-card { width: min(248px, 82vw); margin: 0 auto 18px; padding: 8px 9px 10px; border: 1px solid rgba(174, 121, 55, 0.2); border-radius: 14px; background: rgba(255, 241, 211, 0.62); box-shadow: 0 12px 26px rgba(130, 79, 24, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.76); }
.timer-pill { min-height: 26px; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 4px 9px; border-radius: 9px; background: linear-gradient(90deg, #f07d21 0%, #e02d00 100%); color: #fff5df; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18); font-size: 13px; font-weight: 800; line-height: 1; white-space: nowrap; }
.timer-pill time { min-width: 64px; display: inline-block; font-variant-numeric: tabular-nums; text-align: left; }
.offer-card p { margin: 8px 0 0; text-align: center; font-size: 13px; font-weight: 750; line-height: 1.1; }

.lead { width: min(322px, 100%); margin: 0 auto; text-align: center; color: #111; font-size: 11.2px; font-weight: 620; line-height: 1.25; }
.hero-art-wrap { width: 100%; margin: 8px 0 10px; display: flex; justify-content: center; align-items: center; }
.hero-art { width: min(248px, 78vw); height: auto; max-height: 104px; display: block; object-fit: contain; filter: drop-shadow(0 8px 11px rgba(128, 73, 27, 0.13)); }

.proof-row { display: flex; align-items: center; justify-content: center; gap: 6px; width: min(342px, 100%); margin: 0 auto 12px; color: #12100e; font-size: 9.5px; font-weight: 650; line-height: 1.1; white-space: nowrap; }
.proof-row strong { font-weight: 900; }
.proof-divider { width: 1px; height: 15px; background: rgba(120, 91, 57, 0.23); }
.star { color: #f4a51c; text-shadow: 0 1px 1px rgba(140, 78, 20, 0.25); }

/* Testimonials: original was a swipe carousel; render as a static 3-up row. */
.testimonial-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; width: 100%; margin: 0 auto 14px; }
.quote-card { min-height: 68px; display: grid; grid-template-columns: 34px minmax(0, 1fr); align-items: center; gap: 8px; padding: 10px; border: 1px solid rgba(177, 119, 55, 0.18); border-radius: 12px; background: rgba(255, 251, 245, 0.88); box-shadow: 0 6px 16px rgba(96, 58, 22, 0.1); text-align: left; }
.quote-card img { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; }
.quote-card p { margin: 0; color: #16110e; font-size: 9.2px; font-weight: 760; line-height: 1.15; }
.quote-card small { display: block; margin-top: 3px; color: #2a2019; font-size: 8px; font-weight: 650; line-height: 1.1; }

.trust-row { display: flex; justify-content: center; gap: 6px; width: min(306px, 100%); margin: 0 auto 12px; }
.trust-pill { min-height: 26px; display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border: 1px solid rgba(178, 117, 55, 0.16); border-radius: 999px; background: rgba(255, 243, 223, 0.82); color: #2f2116; font-size: 8.8px; font-weight: 850; white-space: nowrap; }
.trust-icon { width: 15px; height: 15px; display: inline-grid; place-items: center; flex: 0 0 auto; border: 1px solid rgba(166, 101, 43, 0.35); border-radius: 6px; color: #9c642d; background: rgba(255, 247, 235, 0.82); font-size: 9px; font-weight: 900; line-height: 1; }

/* Plan card: faithful look, price as a GRID column (not absolute) → no overlap. */
.plan-card { position: relative; width: min(328px, 100%); margin: 0 auto 12px; padding: 30px 16px 14px; border: 1px solid rgba(151, 84, 28, 0.72); border-radius: 14px; background: rgba(255, 248, 238, 0.9); box-shadow: 0 7px 17px rgba(100, 58, 21, 0.09); overflow: hidden; text-align: left; }
.value-ribbon { position: absolute; top: -1px; left: -1px; min-width: 70px; height: 27px; display: inline-flex; align-items: center; gap: 5px; padding: 0 12px 0 10px; border-radius: 13px 0 9px 0; background: linear-gradient(90deg, #ee7a18, #db4b08); color: #fff7df; font-size: 9px; font-weight: 900; line-height: 1; z-index: 3; }
.selected-icon { position: absolute; top: 14px; right: 14px; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; background: #dc641a; color: #fff7dc; font-size: 13px; font-weight: 900; line-height: 1; z-index: 3; }
.plan-grid { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "title price" "features price"; column-gap: 12px; align-items: start; }
.plan-title { grid-area: title; max-width: 200px; margin: 0 0 10px; color: #14100d; font-size: 16.5px; font-weight: 900; line-height: 1.06; }
.features { grid-area: features; align-self: start; display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.features li { display: grid; grid-template-columns: 17px minmax(0, 1fr); align-items: center; gap: 8px; color: #211712; font-size: 10px; font-weight: 680; line-height: 1.14; }
.feature-icon { width: 17px; height: 17px; display: grid; place-items: center; border: 1px solid rgba(166, 101, 43, 0.35); border-radius: 5px; color: #9c642d; background: rgba(255, 247, 235, 0.82); font-size: 8.6px; font-weight: 900; line-height: 1; }
.price { grid-area: price; align-self: start; text-align: left; white-space: nowrap; color: #b65b20; font-weight: 900; line-height: 0.95; }
.price strong { font-size: 34px; }
.price span { color: #2b2019; font-size: 12px; font-weight: 700; }
.price small { display: block; margin-top: 6px; color: #4e3a2b; font-size: 10px; font-weight: 700; line-height: 1.1; }
.price-watermark { position: absolute; right: -1px; bottom: -1px; width: 112px; max-width: 37%; pointer-events: none; opacity: 0.82; mix-blend-mode: multiply; z-index: 1; }

.footer-proof { width: min(330px, 100%); margin: 10px auto 0; color: #17120f; text-align: center; font-size: 9.8px; font-weight: 650; line-height: 1.28; }
.footer-proof strong { font-weight: 900; }

/* CTA skin only (size comes from the skeleton's enlarged-CTA primitive). */
.cta { border-radius: 10px; background: linear-gradient(90deg, #eb760f 0%, #e23000 100%); color: #fff7e3; box-shadow: 0 10px 20px rgba(205, 74, 6, 0.19); }
.footer { width: 100%; color: #4e3a2b; text-align: center; font-size: 9.8px; font-weight: 650; line-height: 1.28; }
`;

export default {
  id: "phase2-marriage-01",
  name: "✨ marriage-01 — Phase 2 (responsive)",
  presentation: "fullscreen",
  spec: {
    renderer: "webview",
    products: [{ id: "marriage_clarity", name: "Marriage Clarity Pass", isDefault: true, price: { amount: 4900, currency: "INR" } }],
    document: { html, css: SKELETON_CSS + skin },
  },
};
