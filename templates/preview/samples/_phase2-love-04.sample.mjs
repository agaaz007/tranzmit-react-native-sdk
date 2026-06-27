// Phase 2 — love-clarity-urgency ("love-04") re-authored responsively, faithful
// to the original artboard (same assets, colors, fonts, copy) but using the
// shared SKELETON (v-final primitives) + a flex/grid plan card so the price
// never overlaps the features. See _skeleton.mjs for the inherited primitives.
import { SKELETON_CSS } from "./_skeleton.mjs";

const A = "file:///Users/Agaaz/paywalls-hires/love-clarity-urgency-paywall-done/assets";

const html = `
<main class="tz-template" style="height:100svh;height:var(--tz-vh,100svh)" aria-label="Love clarity urgency paywall">
  <div class="tz-shell">
    <div class="tz-scroll">
      <img class="stats-bar" src="${A}/stats_bar.png" alt="10L+ downloads, 4.5 rated, 50L+ users" />
      <div class="rule"></div>
      <div class="urgency-bar">&#9719; Offer expires in <time>14:59</time></div>
      <h1 class="headline">See where this <span>relationship is going</span></h1>
      <p class="subtitle">Get clarity on feelings, future potential, and the right next step in your love life.</p>
      <div class="journey-wrap"><img class="journey" src="${A}/journey_strip.png" alt="Love clarity journey: feelings, future path, remedies" /></div>
      <section class="live-feed" aria-label="Live user activity">
        <div class="live-feed-bar">
          <div class="live-feed-head"><span class="live-dot" aria-hidden="true"></span><span>Live</span></div>
          <div class="live-feed-viewport"><p class="live-item"><strong>Priya</strong> from Mumbai just unlocked her reading</p></div>
        </div>
      </section>
      <div class="slots-badge" role="status">
        <span class="slots-badge-icon" aria-hidden="true"><img src="${A}/slots_timer_icon.png" alt="" /></span>
        <span>Only 3 slots left today</span>
      </div>
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
      <div class="proof-strip"><b>&#128149; Most loved by users</b><span>&#9733;&#9733;&#9733;&#9733;&#9733;</span><span>50L+ users</span><span>4.5 rating</span><span>Private &amp; confidential</span></div>
    </div>
    <footer class="tz-footer">
      <button class="cta" type="button" data-tranzmit-action="cta" data-product-id="love_clarity">
        <span class="cta-label">Unlock Love Clarity</span><span class="arrow" aria-hidden="true">&#8594;</span>
      </button>
      <div class="footer">1-day trial &nbsp;&bull;&nbsp; Private &amp; confidential &nbsp;&bull;&nbsp; Cancel anytime &nbsp;&bull;&nbsp; Privacy Guaranteed</div>
    </footer>
  </div>
</main>
`;

const skin = `
:root { --paper: #fffafd; --ink: #141116; --muted: #5d5961; --pink: #df2b65; --pink-deep: #c61756; --line-strong: rgba(177, 52, 102, 0.5); }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif; color: var(--ink); }
.tz-template { background: radial-gradient(circle at 50% 39%, rgba(255, 230, 241, 0.8), transparent 27%), linear-gradient(180deg, #ffffff 0%, var(--paper) 100%); }

.stats-bar { display: block; width: 280px; max-width: 100%; height: auto; margin: 0 auto 8px; object-fit: contain; }
.rule { width: 100%; height: 1px; margin-bottom: 0; background: rgba(31, 25, 29, 0.08); }

/* Full-bleed urgency bar (original spanned the sheet padding). */
.urgency-bar { width: calc(100% + 48px); min-height: 29px; display: flex; align-items: center; justify-content: center; gap: 7px; margin: 0 -24px 11px; padding: 5px 0; background: linear-gradient(90deg, #e92d61, #ee6c09); color: #fff6ed; font-size: 13px; font-weight: 850; font-variant-numeric: tabular-nums; }

.headline { width: min(324px, 100%); margin: 0 auto 9px; color: #121016; text-align: center; font-size: 22px; font-weight: 900; line-height: 1.18; }
.headline span { color: var(--pink-deep); }
.subtitle { width: min(318px, 100%); margin: 0 auto 11px; color: #5c5962; text-align: center; font-size: 11.1px; font-weight: 560; line-height: 1.45; }
.journey-wrap { width: min(294px, 100%); margin: 0 auto 11px; padding-top: 3px; filter: drop-shadow(0 7px 14px rgba(176, 41, 92, 0.08)); }
.journey { width: 100%; height: auto; display: block; object-fit: contain; object-position: center top; }

/* Live feed pill. */
.live-feed { width: 100%; margin: 0 0 10px; padding: 6px 10px; border-radius: 999px; background: linear-gradient(180deg, rgba(255, 244, 248, 0.96), rgba(255, 236, 243, 0.9)); border: 1px solid rgba(203, 83, 128, 0.16); box-shadow: 0 4px 12px rgba(176, 41, 92, 0.06); }
.live-feed-bar { display: flex; align-items: center; gap: 8px; min-height: 18px; }
.live-feed-head { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; padding: 2px 7px; border-radius: 999px; background: rgba(255, 255, 255, 0.78); color: #a92a5a; font-size: 7.6px; font-weight: 850; letter-spacing: 0.06em; text-transform: uppercase; line-height: 1; }
.live-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45); animation: live-pulse 2.4s ease-in-out infinite; }
@keyframes live-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.42); } 50% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); } }
.live-feed-viewport { flex: 1; min-width: 0; }
.live-item { margin: 0; color: #4a4046; font-size: 9px; font-weight: 640; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.live-item strong { color: #111015; font-weight: 850; }

/* Animated-border slots badge. */
.slots-badge { position: relative; width: max-content; max-width: calc(100% - 12px); min-height: 30px; display: flex; align-items: center; gap: 8px; margin: 0 auto 11px; padding: 6px 14px 6px 7px; border-radius: 999px; background: linear-gradient(180deg, #fff4ea 0%, #ffe8d6 100%); border: 1px solid transparent; box-shadow: 0 5px 14px rgba(168, 72, 52, 0.12); color: #7b2f22; font-size: 11.2px; font-weight: 800; line-height: 1; letter-spacing: -0.01em; isolation: isolate; }
.slots-badge::before { content: ""; position: absolute; inset: -2px; border-radius: 999px; padding: 2px; background: linear-gradient(90deg, #ffe8d6, #ffb07a, #e84a6f, #ff6a8a, #ffc94a, #ffe8d6); background-size: 400% 100%; animation: slots-border-run 6s linear infinite; -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; z-index: -1; }
@keyframes slots-border-run { to { background-position: 400% 0; } }
.slots-badge-icon { width: 20px; height: 20px; flex-shrink: 0; display: block; }
.slots-badge-icon img { width: 20px; height: 20px; display: block; object-fit: contain; }

/* Plan card: faithful look, price as a GRID column (not absolute) → no overlap. */
.plan-card { position: relative; width: 100%; margin: 0 auto 11px; padding: 30px 14px 12px; border: 1px solid rgba(210, 31, 91, 0.78); border-radius: 10px; background: linear-gradient(180deg, rgba(255, 239, 246, 0.96), rgba(255, 246, 250, 0.92)); box-shadow: 0 9px 22px rgba(178, 35, 92, 0.14); overflow: hidden; text-align: left; }
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
.plan-art { position: absolute; right: 4px; bottom: 0; width: 139px; max-width: 38%; opacity: 0.94; pointer-events: none; mix-blend-mode: multiply; object-fit: contain; object-position: bottom right; z-index: 1; }

.proof-strip { width: 100%; min-height: 22px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 8px; margin: 0 0 2px; padding: 4px 8px; border-radius: 999px; background: rgba(255, 234, 241, 0.82); color: #594b54; font-size: 8.6px; font-weight: 650; }
.proof-strip b { color: #c4215c; font-weight: 850; }

/* CTA skin only (size comes from the skeleton's enlarged-CTA primitive). */
.cta { border-radius: 7px; background: linear-gradient(90deg, #ef386a, #cf1550); color: #fff7fb; box-shadow: 0 10px 22px rgba(197, 24, 83, 0.22); }
.footer { width: 100%; color: #6d666d; text-align: center; font-size: 9.5px; font-weight: 560; line-height: 1.25; }
`;

export default {
  id: "phase2-love-04",
  name: "✨ love-04 — Phase 2 (responsive)",
  presentation: "fullscreen",
  spec: {
    renderer: "webview",
    products: [{ id: "love_clarity", name: "Love Clarity Pack", isDefault: true, price: { amount: 4900, currency: "INR" } }],
    document: { html, css: SKELETON_CSS + skin },
  },
};
