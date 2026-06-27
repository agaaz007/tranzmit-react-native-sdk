// Phase 2 — love-clarity-trial-reminder re-authored responsively, faithful to the
// original artboard (same assets, colors, fonts, copy) but using the shared
// SKELETON (v-final primitives) + a flex/grid plan card so the price never
// overlaps the features. See _skeleton.mjs for the inherited primitives.
//
// This variant is the "trial reminder" cut of love-clarity: it has no avatar
// testimonials and no plan_art (only stats_bar + journey_strip ship as assets),
// a price-detail block in the plan card, and two full-bleed bars (a green
// trial-reminder badge and a bottom no-surprise-charges note).
import { SKELETON_CSS } from "./_skeleton.mjs";

const A = "file:///Users/Agaaz/paywalls-hires/love-clarity-trial-reminder-paywall-done/assets";

const html = `
<main class="tz-template" style="height:100svh;height:var(--tz-vh,100svh)" aria-label="Love clarity paywall">
  <div class="tz-shell">
    <div class="tz-scroll">
      <img class="stats-bar" src="${A}/stats_bar.png" alt="10L+ downloads, 4.5 rated, 50L+ users" />
      <div class="rule"></div>
      <div class="badge">&#9825; Love &amp; Relationship Clarity</div>
      <h1 class="headline">See where this <span>relationship is going</span></h1>
      <p class="subtitle">Get clarity on feelings, future potential, and the right next step in your love life.</p>
      <div class="journey-wrap"><img class="journey" src="${A}/journey_strip.png" alt="Love clarity journey: feelings, future path, remedies" /></div>
      <div class="insight-pill">&#9789; Relationship Insights</div>
      <section class="plan-card" aria-label="Love Clarity Pack">
        <span class="ribbon">&#9733; BEST VALUE</span>
        <span class="selected" aria-hidden="true">&#10003;</span>
        <div class="plan-grid">
          <h2 class="plan-title">Love Clarity Pack</h2>
          <div class="price">
            <strong>&#8377;49</strong> <span>today</span>
            <div class="price-detail"><span>&#10003; Only &#8377;49 charged today</span><small>then &#8377;499/month</small></div>
          </div>
          <ul class="features">
            <li><span class="feature-icon">=</span> Unlimited text chat</li>
            <li><span class="feature-icon">|||</span> Unlimited voice notes</li>
            <li><span class="feature-icon">&#9742;</span> Unlimited audio calls</li>
            <li><span class="feature-icon">&#9825;</span> Relationship compatibility insights</li>
            <li><span class="feature-icon">wa</span> Horoscope updates on WhatsApp</li>
          </ul>
        </div>
      </section>
      <div class="trial-reminder-badge" role="note">
        <span class="trial-reminder-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span>We&rsquo;ll remind you before your trial ends</span>
      </div>
      <div class="bottom-note"><strong>No surprise charges. Cancel online anytime.</strong></div>
    </div>
    <footer class="tz-footer">
      <button class="cta" type="button" data-tranzmit-action="cta" data-product-id="love_clarity">
        <span class="cta-label">Unlock Love Clarity</span><span class="arrow" aria-hidden="true">&#8594;</span>
      </button>
      <div class="footer">1-day trial &nbsp;&bull;&nbsp; Payment starts after trial &nbsp;&bull;&nbsp; Private &amp; confidential</div>
    </footer>
  </div>
</main>
`;

const skin = `
:root { --paper: #fffafd; --ink: #141116; --muted: #5d5961; --pink: #df2b65; --pink-deep: #c61756; --line-strong: rgba(177, 52, 102, 0.5); }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif; color: var(--ink); }
.tz-template { background: radial-gradient(circle at 50% 39%, rgba(255, 230, 241, 0.8), transparent 27%), linear-gradient(180deg, #ffffff 0%, var(--paper) 100%); }

.stats-bar { display: block; width: 280px; max-width: 100%; height: auto; margin: 0 auto 11px; object-fit: contain; }
.rule { width: 100%; height: 1px; margin-bottom: 11px; background: rgba(31, 25, 29, 0.08); }
.badge { width: max-content; max-width: 100%; min-height: 26px; display: flex; align-items: center; justify-content: center; gap: 7px; margin: 2px auto 11px; padding: 4px 14px; border-radius: 999px; background: rgba(255, 233, 242, 0.9); color: #a92a5a; box-shadow: 0 7px 18px rgba(190, 55, 105, 0.1); font-size: 10px; font-weight: 750; }
.headline { width: min(324px, 100%); margin: 0 auto 9px; color: #121016; text-align: center; font-size: 22px; font-weight: 900; line-height: 1.18; }
.headline span { color: var(--pink-deep); }
.subtitle { width: min(318px, 100%); margin: 0 auto 13px; color: #5c5962; text-align: center; font-size: 11.1px; font-weight: 560; line-height: 1.48; }
.journey-wrap { width: min(294px, 100%); margin: 0 auto 9px; padding-top: 6px; filter: drop-shadow(0 7px 14px rgba(176, 41, 92, 0.08)); }
.journey { width: 100%; height: auto; display: block; object-fit: contain; }
.insight-pill { width: max-content; max-width: 100%; min-height: 25px; display: flex; align-items: center; justify-content: center; gap: 7px; margin: 0 auto 9px; padding: 4px 13px; border-radius: 999px; background: rgba(255, 232, 241, 0.9); color: #ad2d5e; font-size: 9.8px; font-weight: 760; }

/* Plan card: faithful look, price as a GRID column (not absolute) → no overlap. */
.plan-card { position: relative; width: 100%; margin: 0 auto 8px; padding: 30px 14px 12px; border: 1px solid rgba(210, 31, 91, 0.78); border-radius: 10px; background: linear-gradient(180deg, rgba(255, 239, 246, 0.96), rgba(255, 246, 250, 0.92)); box-shadow: 0 9px 22px rgba(178, 35, 92, 0.14); overflow: hidden; text-align: left; }
.ribbon { position: absolute; top: -1px; left: -1px; min-width: 84px; height: 24px; display: flex; align-items: center; padding: 0 11px; border-radius: 9px 0 8px 0; background: linear-gradient(90deg, #ef3b70, #d81f57); color: #fff7fa; font-size: 8.9px; font-weight: 900; z-index: 3; }
.selected { position: absolute; top: 15px; right: 13px; width: 19px; height: 19px; display: grid; place-items: center; border-radius: 50%; background: #df336a; color: #fff; font-size: 12px; font-weight: 900; z-index: 3; }
.plan-grid { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "title price" "features price"; column-gap: 12px; align-items: start; }
.plan-title { grid-area: title; max-width: 200px; margin: 0 0 12px; color: #111015; font-size: 16.5px; font-weight: 900; line-height: 1.05; }
.features { grid-area: features; align-self: start; display: grid; gap: 9px; margin: 0; padding: 0; list-style: none; }
.features li { display: grid; grid-template-columns: 17px minmax(0, 1fr); align-items: center; gap: 8px; color: #21161d; font-size: 9.2px; font-weight: 640; line-height: 1.1; }
.feature-icon { width: 15px; height: 15px; display: grid; place-items: center; border: 1px solid rgba(191, 44, 102, 0.48); border-radius: 5px; color: #bd2c66; background: rgba(255, 247, 250, 0.9); font-size: 8px; font-weight: 900; }
.price { grid-area: price; align-self: start; text-align: right; color: #3d333b; line-height: 1.05; padding-top: 6px; }
.price strong { color: #ce225f; font-size: 31px; font-weight: 900; }
.price span { font-size: 13px; font-weight: 660; }
.price-detail { display: grid; gap: 6px; margin-top: 6px; color: #2b2228; font-size: 11px; font-weight: 760; }
.price-detail span { color: #2b2228; }
.price-detail small { display: block; color: #5f5660; font-size: 10px; font-weight: 600; }

/* Full-bleed trial-reminder bar (green) — breaks the shell's side padding. */
.trial-reminder-badge { width: calc(100% + 48px); min-height: 40px; display: flex; align-items: center; justify-content: center; gap: 8px; margin: 10px -24px 0; padding: 10px 18px; background: linear-gradient(180deg, #eefbf3 0%, #e4f7eb 100%); border-top: 1px solid rgba(34, 139, 84, 0.16); border-bottom: 1px solid rgba(34, 139, 84, 0.16); color: #14532d; font-size: 11.5px; font-weight: 760; line-height: 1.28; text-align: center; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72); }
.trial-reminder-icon { flex-shrink: 0; width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; background: #22a55b; color: #fff; box-shadow: 0 2px 6px rgba(34, 139, 84, 0.28); }
.trial-reminder-icon svg { width: 11px; height: 11px; display: block; }

/* Full-bleed bottom note bar — breaks the shell's side padding. */
.bottom-note { width: calc(100% + 48px); min-height: 43px; display: flex; align-items: center; justify-content: center; margin: 0 -24px 0; padding: 6px 18px; background: rgba(255, 255, 255, 0.9); box-shadow: 0 -9px 21px rgba(88, 71, 77, 0.08); color: #171317; text-align: center; font-size: 12px; font-weight: 700; line-height: 1.28; }
.bottom-note strong { font-weight: 900; }

/* CTA skin only (size comes from the skeleton's enlarged-CTA primitive). */
.cta { border-radius: 7px; background: linear-gradient(90deg, #ef386a, #cf1550); color: #fff7fb; box-shadow: 0 10px 22px rgba(197, 24, 83, 0.22); }
.footer { width: 100%; color: #6d666d; text-align: center; font-size: 9.5px; font-weight: 560; line-height: 1.2; }
`;

export default {
  id: "phase2-love-02",
  name: "✨ love-02 — Phase 2 (responsive)",
  presentation: "fullscreen",
  spec: {
    renderer: "webview",
    products: [{ id: "love_clarity", name: "Love Clarity Pack", isDefault: true, price: { amount: 4900, currency: "INR" } }],
    document: { html, css: SKELETON_CSS + skin },
  },
};
