// Phase 2 — marriage-discount-reading re-authored responsively, faithful to the
// original artboard (same assets, colors, fonts, copy) but using the shared
// SKELETON (v-final primitives) + a flex/grid plan card so the price never
// overlaps the features. See _skeleton.mjs for the inherited primitives.
import { SKELETON_CSS } from "./_skeleton.mjs";

const A = "file:///Users/Agaaz/paywalls-hires/marriage-discount-reading-paywall/assets";

const html = `
<main class="tz-template" style="height:100svh;height:var(--tz-vh,100svh)" aria-label="Marriage reading discount paywall">
  <div class="tz-shell">
    <div class="tz-scroll">
      <section class="stats-row" aria-label="App statistics">
        <div class="stat">
          <img class="stat-icon laurel" src="${A}/stat_laurel.png" alt="" aria-hidden="true" />
          <div class="stat-copy"><strong>10L+</strong><span>Downloads</span></div>
        </div>
        <div class="stat">
          <svg class="stat-icon gold" viewBox="0 0 32 32" aria-hidden="true">
            <path fill="currentColor" d="m16 2.8 3.9 8 8.8 1.3-6.3 6.1 1.5 8.7-7.9-4.1-7.9 4.1 1.5-8.7-6.3-6.1 8.8-1.3L16 2.8Z" />
          </svg>
          <div class="stat-copy"><strong>4.5</strong><span>Rated</span></div>
        </div>
        <div class="stat">
          <svg class="stat-icon gold" viewBox="0 0 32 32" aria-hidden="true">
            <path fill="currentColor" d="M12.7 15.1a5.2 5.2 0 1 0 0-10.4 5.2 5.2 0 0 0 0 10.4Zm10.1.7a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM3.8 27.4h17.8c0-5.4-3.6-9.2-8.9-9.2s-8.9 3.8-8.9 9.2Zm16.1-8.5c2.6 1.6 4.1 4.4 4.1 8.5h4.2c0-4.9-2.5-8.3-6.5-8.7-.6.1-1.2.2-1.8.2Z" />
          </svg>
          <div class="stat-copy"><strong>50L+</strong><span>Users</span></div>
        </div>
      </section>

      <div class="chips" aria-label="Marriage topics">
        <span class="chip"><img src="${A}/chip_compatibility.png" alt="" />Compatibility Guidance</span>
        <span class="chip"><img src="${A}/chip_timing.png" alt="" />Marriage Timing</span>
      </div>

      <h1 class="headline">Get clarity on <span>marriage timing, compatibility</span> &amp; next steps</h1>
      <p class="subtitle">Understand your compatibility and the right timing to move ahead with confidence.</p>

      <section class="benefit-card" aria-label="Marriage clarity benefits">
        <img class="rings" src="${A}/rings_art.png" alt="Wedding rings and flowers" />
        <span class="card-divider" aria-hidden="true"></span>
        <div class="benefits">
          <div class="benefit">
            <img class="benefit-icon" src="${A}/benefit_compatibility.png" alt="" aria-hidden="true" />
            <span>Compatibility</span>
          </div>
          <div class="benefit">
            <img class="benefit-icon" src="${A}/benefit_family.png" alt="" aria-hidden="true" />
            <span>Family<br />Harmony</span>
          </div>
          <div class="benefit">
            <img class="benefit-icon" src="${A}/benefit_muhurat.png" alt="" aria-hidden="true" />
            <span>Shubh<br />Muhurat</span>
          </div>
        </div>
      </section>

      <div class="proof-line" aria-label="Marriage consultation proof">
        <div class="proof-faces" aria-hidden="true">
          <img src="${A}/avatar_priya.png" alt="" />
          <img src="${A}/avatar_rahul.png" alt="" />
          <img src="${A}/avatar_anjali.png" alt="" />
        </div>
        <span><strong>12,400+</strong> marriage consultations this week</span>
      </div>

      <section class="plan-card" aria-label="Marriage Clarity Pass">
        <span class="ribbon">&#9733; BEST VALUE</span>
        <span class="discount">50% OFF</span>
        <div class="plan-grid">
          <h2 class="plan-title">Marriage Clarity Pass</h2>
          <div class="price">
            <del class="price-strike">&#8377;99</del>
            <div class="price-main"><strong>&#8377;49</strong><span>today</span></div>
            <small class="price-sub">then &#8377;499/month</small>
          </div>
          <ul class="features">
            <li><span class="feature-icon">=</span> Unlimited text chat</li>
            <li><span class="feature-icon">|||</span> Unlimited voice notes</li>
            <li><span class="feature-icon">&#9678;</span> Compatibility guidance</li>
            <li><span class="feature-icon">wa</span> Horoscope updates on WhatsApp</li>
          </ul>
        </div>
        <img class="plan-art" src="${A}/plan_zodiac.png" alt="" aria-hidden="true" />
      </section>
    </div>
    <footer class="tz-footer">
      <button class="cta" type="button" data-tranzmit-action="cta" data-product-id="marriage_clarity">
        <span class="cta-label">Unlock My Marriage Reading</span><span class="arrow" aria-hidden="true">&#8594;</span>
      </button>
      <div class="footer">1-day trial &nbsp;&bull;&nbsp; Private &amp; confidential &nbsp;&bull;&nbsp; Cancel anytime</div>
    </footer>
  </div>
</main>
`;

const skin = `
:root { --paper: #fffaf4; --ink: #162131; --muted: #59616e; --orange: #e96812; --orange-deep: #e33a00; --green: #198754; --red: #d22f37; --line: rgba(184, 106, 44, 0.26); --line-strong: rgba(197, 107, 35, 0.74); }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif; color: var(--ink); }
.tz-template { background: radial-gradient(circle at 50% 34%, rgba(255, 225, 191, 0.22), transparent 31%), linear-gradient(180deg, #fffdf8 0%, var(--paper) 100%); }

/* Stats bar */
.stats-row { width: 100%; min-height: 62px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: center; margin: 0 0 12px; border: 1px solid rgba(222, 197, 169, 0.74); border-radius: 18px; background: #fff; box-shadow: 0 10px 24px rgba(137, 101, 20, 0.08); overflow: hidden; }
.stat { min-width: 0; display: grid; grid-template-columns: 30px minmax(0, 1fr); align-items: center; gap: 7px; padding: 10px 8px; background: #fff; }
.stat + .stat { border-left: 1px solid rgba(116, 91, 54, 0.18); }
.stat-icon { width: 28px; height: 28px; display: block; object-fit: contain; flex-shrink: 0; }
.stat-icon.laurel { filter: brightness(0); }
.stat-icon.gold { width: 26px; height: 26px; color: #e8b63d; }
.stat-copy { min-width: 0; }
.stat-copy strong { display: block; color: #111827; font-size: 13px; font-weight: 900; line-height: 1; }
.stat-copy span { display: block; margin-top: 3px; color: #3e414a; font-size: 8.4px; font-weight: 620; line-height: 1.1; }

/* Chips */
.chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin: 0 0 11px; }
.chip { min-height: 27px; display: inline-flex; align-items: center; gap: 7px; padding: 4px 13px; border: 1px solid rgba(184, 108, 57, 0.24); border-radius: 999px; background: rgba(255, 244, 233, 0.92); color: #8f4b28; font-size: 9.4px; font-weight: 720; white-space: nowrap; }
.chip img { width: 15px; height: 15px; object-fit: contain; }

/* Headline + subtitle */
.headline { width: 100%; margin: 0 0 9px; text-align: center; color: #172131; font-family: Georgia, "Times New Roman", serif; font-size: 28px; font-weight: 800; line-height: 1.05; }
.headline span { color: #c95a21; }
.subtitle { width: min(303px, 100%); margin: 0 auto 14px; color: #4b5563; text-align: center; font-size: 11.4px; font-weight: 520; line-height: 1.45; }

/* Benefit card (rings art + 3 benefits) */
.benefit-card { width: 100%; min-height: 132px; display: grid; grid-template-columns: 112px 1px minmax(0, 1fr); align-items: center; gap: 8px; margin: 0 0 11px; padding: 12px 10px 12px 12px; border: 1px solid rgba(232, 196, 170, 0.8); border-radius: 14px; background: rgba(255, 250, 244, 0.9); box-shadow: 0 8px 20px rgba(151, 87, 34, 0.06); }
.rings { width: 112px; height: auto; max-height: 100px; display: block; object-fit: contain; justify-self: center; }
.card-divider { width: 1px; height: 98px; background: rgba(171, 122, 81, 0.24); }
.benefits { min-width: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px; padding: 0 1px; text-align: center; }
.benefit { min-width: 0; }
.benefit-icon { width: 40px; height: 40px; display: block; margin: 0 auto 5px; object-fit: contain; }
.benefit span { display: block; color: #111827; font-size: 7.4px; font-weight: 650; line-height: 1.15; }

/* Proof line */
.proof-line { width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px; margin: 0 0 9px; color: #5b5860; font-size: 9.3px; font-weight: 580; white-space: nowrap; }
.proof-faces { display: flex; align-items: center; flex-shrink: 0; }
.proof-faces img { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(17, 24, 39, 0.1); }
.proof-faces img + img { margin-left: -8px; }
.proof-line strong { color: #111827; font-size: 11px; font-weight: 900; }

/* Plan card: faithful look, price as a GRID column (not absolute) → no overlap. */
.plan-card { position: relative; width: 100%; min-height: 143px; margin: 0 0 8px; padding: 33px 14px 10px; border: 1px solid var(--line-strong); border-radius: 11px; background: rgba(255, 252, 247, 0.93); box-shadow: 0 8px 18px rgba(99, 55, 31, 0.06); overflow: hidden; text-align: left; }
.ribbon { position: absolute; top: -1px; left: -1px; z-index: 4; height: 25px; display: inline-flex; align-items: center; gap: 5px; padding: 0 12px; border-radius: 10px 0 7px 0; background: linear-gradient(90deg, #f07a13, #dc3d00); color: #fff4df; font-size: 9px; font-weight: 900; white-space: nowrap; }
.discount { position: absolute; top: -6px; right: 8px; z-index: 4; min-height: 34px; display: inline-flex; align-items: center; padding: 0 10px; border-radius: 4px; background: linear-gradient(90deg, #c82633, #e73a36); color: #fff; font-size: 17px; font-weight: 900; box-shadow: 0 4px 10px rgba(136, 18, 31, 0.18); }
.plan-grid { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "title price" "features price"; column-gap: 12px; align-items: start; }
.plan-title { grid-area: title; max-width: 220px; margin: 0 0 12px; color: #172131; font-size: 18.6px; font-weight: 900; line-height: 1; }
.features { grid-area: features; align-self: start; display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
.features li { display: grid; grid-template-columns: 17px minmax(0, 1fr); align-items: center; gap: 9px; color: #202938; font-size: 9.2px; font-weight: 620; line-height: 1; }
.feature-icon { width: 16px; height: 16px; display: grid; place-items: center; border: 1px solid rgba(218, 111, 44, 0.5); border-radius: 5px; color: #bc6228; background: #fff2e3; font-size: 8px; font-weight: 900; }
.price { grid-area: price; align-self: start; display: grid; gap: 3px; justify-items: end; color: #111827; line-height: 1.05; text-align: right; white-space: nowrap; padding-top: 4px; }
.price-strike { color: #8a8181; font-size: 10px; font-weight: 650; text-decoration: line-through; }
.price-main { display: flex; align-items: baseline; justify-content: flex-end; gap: 4px; }
.price-main strong { color: #de641c; font-size: 28px; font-weight: 900; letter-spacing: -0.02em; line-height: 1; }
.price-main span { color: #334155; font-size: 11px; font-weight: 700; line-height: 1; }
.price-sub { display: block; margin: 0; color: #64748b; font-size: 9.5px; font-weight: 600; line-height: 1.15; }
.plan-art { position: absolute; right: 2px; bottom: 0; width: 116px; max-width: 36%; opacity: 0.55; pointer-events: none; mix-blend-mode: multiply; z-index: 1; }

/* CTA skin only (size comes from the skeleton's enlarged-CTA primitive). */
.cta { border-radius: 10px; background: linear-gradient(90deg, #f77d0c, #e73600); color: #fff8e6; box-shadow: 0 9px 18px rgba(202, 76, 8, 0.18); }
.footer { width: 100%; color: #344051; text-align: center; font-size: 8.5px; font-weight: 650; line-height: 1.2; }
`;

export default {
  id: "phase2-marriage-03",
  name: "✨ marriage-03 — Phase 2 (responsive)",
  presentation: "fullscreen",
  spec: {
    renderer: "webview",
    products: [{ id: "marriage_clarity", name: "Marriage Clarity Pass", isDefault: true, price: { amount: 4900, currency: "INR" } }],
    document: { html, css: SKELETON_CSS + skin },
  },
};
