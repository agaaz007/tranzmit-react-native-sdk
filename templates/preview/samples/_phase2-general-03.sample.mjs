// Phase 2 — HiAstro premium-offer re-authored responsively, faithful to the
// original artboard (same assets, colors, fonts, copy) but using the shared
// SKELETON (v-final primitives) + a flex/grid plan card so the price never
// overlaps the features. See _skeleton.mjs for the inherited primitives.
import { SKELETON_CSS } from "./_skeleton.mjs";

const A = "file:///Users/Agaaz/paywalls-hires/hiastro-premium-offer-paywall-done/assets";

const html = `
<main class="tz-template" style="height:100svh;height:var(--tz-vh,100svh)" aria-label="HiAstro premium offer paywall">
  <div class="tz-shell">
    <div class="tz-scroll">
      <img class="zodiac-arc" src="${A}/zodiac_arc.png" alt="" aria-hidden="true" />
      <h1 class="headline">HiAstro Premium Pack</h1>
      <section class="features" aria-label="Premium features">
        <div class="feature-row">
          <span class="feature-icon" aria-hidden="true">&#9788;</span>
          <p>Personalized astrology insights</p>
        </div>
        <div class="feature-row feature-row-stack">
          <span class="feature-icon feature-icon-tall" aria-hidden="true">&#10003;</span>
          <ul class="feature-lines">
            <li>Chat with astrologers anytime</li>
            <li>Unlimited voice notes</li>
            <li>Unlimited audio calls</li>
          </ul>
        </div>
        <div class="feature-row">
          <span class="feature-icon" aria-hidden="true">&#10003;</span>
          <p>Daily remedies tailored to your chart</p>
        </div>
        <div class="feature-row">
          <span class="feature-icon" aria-hidden="true">&#9993;</span>
          <p>Updates on WhatsApp</p>
        </div>
      </section>

      <section class="price-card" aria-label="HiAstro Premium Pack">
        <img class="badge" src="${A}/limited_badge.png" alt="" aria-hidden="true" />
        <div class="price-grid">
          <div class="price-copy">
            <p class="trial-copy">Try for just &#8377;49</p>
            <div class="price-big">&#8377;49</div>
            <span class="chai">Less than a cup of chai</span>
            <span class="renewal">then &#8377;499/month</span>
          </div>
        </div>
        <img class="meditation" src="${A}/premium_meditation_imagegen.png" alt="" aria-hidden="true" />
      </section>

      <p class="reassurance">Koi tension nahi &ndash; Cancel anytime</p>
    </div>
    <footer class="tz-footer">
      <button class="cta" type="button" data-tranzmit-action="cta" data-product-id="hiastro_premium">
        <span class="cta-label">Unlock HiAstro Premium</span><span class="arrow" aria-hidden="true">&#8594;</span>
      </button>
      <div class="footer" aria-label="Purchase terms">
        <span>&#10003; 1-day trial</span>
        <span>&#128274; Private &amp; confidential</span>
        <span>&#8635; Cancel anytime</span>
      </div>
    </footer>
  </div>
</main>
`;

const skin = `
:root { --paper: #fff8df; --paper-low: #fffdf8; --ink: #1a100d; --muted: #645b52; --orange: #f06d06; --orange-deep: #ec3200; --gold: #d6a12d; --line: rgba(204, 164, 64, 0.48); }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif; color: var(--ink); }
.tz-template { background: radial-gradient(circle at 49% 10%, rgba(255, 220, 107, 0.75), transparent 160px), linear-gradient(180deg, #ffebb8 0%, #fff9df 42%, #fffdf8 100%); }

/* Decorative zodiac arc spanning the top of the scroll region (was absolute in
   the original screen; here it leads the column and bleeds full-width). */
.zodiac-arc { display: block; width: 100%; height: auto; margin: 0 0 6px; opacity: 0.74; mix-blend-mode: screen; pointer-events: none; }

.headline { width: 100%; margin: 0 0 18px; text-align: center; color: #20140f; font-size: 28px; font-weight: 900; line-height: 1.05; }

.features { width: 100%; display: grid; gap: 8px; margin: 0 0 18px; }
.feature-row { display: grid; grid-template-columns: 42px minmax(0, 1fr); align-items: center; gap: 12px; min-height: 42px; padding: 6px 14px 6px 8px; border-radius: 999px; background: rgba(255, 176, 77, 0.16); }
.feature-row-stack { align-items: start; padding-top: 8px; padding-bottom: 8px; }
.feature-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 9px; background: linear-gradient(180deg, #f49a1e 0%, #e8630a 100%); color: #fff; font-size: 15px; font-weight: 900; line-height: 1; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28); }
.feature-icon-tall { height: 68px; align-self: start; }
.feature-row p, .feature-lines { margin: 0; color: #241915; font-size: 12.5px; font-weight: 580; line-height: 1.28; }
.feature-lines { padding: 2px 0; list-style: none; display: grid; gap: 6px; }

/* Price card: faithful look. Copy lives in a grid sibling above the absolute
   decorative art (badge + meditation) so nothing overlaps the price text. */
.price-card { position: relative; width: 100%; margin: 0 auto 16px; padding: 50px 18px 18px; border: 1px solid var(--line); border-radius: 13px; background: rgba(255, 255, 250, 0.86); box-shadow: 0 18px 36px rgba(160, 106, 21, 0.14); overflow: hidden; text-align: center; }
.badge { position: absolute; top: -18px; left: -8px; width: 90px; height: 90px; object-fit: contain; z-index: 3; filter: drop-shadow(0 6px 10px rgba(137, 86, 16, 0.18)); pointer-events: none; }
.price-grid { position: relative; z-index: 2; display: grid; }
.price-copy { display: grid; justify-items: center; max-width: 62%; }
.trial-copy { margin: 0 0 12px; color: #21140f; font-size: 20px; font-weight: 850; line-height: 1; }
.price-big { color: var(--orange); font-size: 60px; font-weight: 900; line-height: 0.96; }
.chai { display: inline-flex; align-items: center; min-height: 28px; margin: 16px 0 12px; padding: 0 18px; border-radius: 999px; background: #fff0c7; color: #2b1e19; font-size: 13px; font-weight: 700; white-space: nowrap; }
.renewal { display: block; color: #70645d; font-size: 14px; font-weight: 620; }
.meditation { position: absolute; right: 0; bottom: 0; width: 150px; max-width: 40%; opacity: 0.9; mix-blend-mode: multiply; pointer-events: none; z-index: 1; }

.reassurance { margin: 0 0 4px; color: #18120f; text-align: center; font-size: 14px; font-weight: 850; line-height: 1.15; }

/* CTA skin only (size comes from the skeleton's enlarged-CTA primitive). */
.cta { border-radius: 10px; background: linear-gradient(90deg, #ffa000 0%, #ef3200 100%); color: #fff8df; box-shadow: 0 10px 20px rgba(218, 96, 0, 0.22); }
.footer { width: 100%; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px 16px; color: #6a5f52; font-size: 9.2px; font-weight: 650; text-align: center; }
`;

export default {
  id: "phase2-general-03",
  name: "✨ general-03 — Phase 2 (responsive)",
  presentation: "fullscreen",
  spec: {
    renderer: "webview",
    products: [{ id: "hiastro_premium", name: "HiAstro Premium Pack", isDefault: true, price: { amount: 4900, currency: "INR" } }],
    document: { html, css: SKELETON_CSS + skin },
  },
};
