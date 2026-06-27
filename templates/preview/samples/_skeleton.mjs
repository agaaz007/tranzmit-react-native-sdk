// Shared responsive paywall SKELETON — the finalized "v-final" primitives that
// every Phase-2 responsive paywall inherits, so none of them can drift or drop a
// primitive. (Not a *.sample.mjs, so the harness does not load it as a sample;
// each paywall sample imports SKELETON_CSS and appends only its own skin.)
//
// Primitives baked in here:
//   - viewport-locked flex column (height var(--tz-vh)) so the inner region
//     scrolls and the footer pins (no clip);
//   - ONE scroll region for value content + a pinned .tz-footer band (structural
//     sticky CTA — no SDK DOM-restructure);
//   - the enlarged "commanding" CTA primitive (clamp 60-72px tall, generous
//     padding, +20% type) — skins only set the gradient/radius/color;
//   - safe-area insets consumed via --tz-safe-*;
//   - a tablet width-cap (412px, centered) so wide screens show a centered
//     column instead of stretching;
//   - a reserved top-left corner on narrow screens for the SDK dismiss (×).
//
// HTML contract each sample follows:
//   <main class="tz-template" style="height:100svh;height:var(--tz-vh,100svh)">
//     <div class="tz-shell">
//       <div class="tz-scroll"> …value content (original component classes)… </div>
//       <footer class="tz-footer">
//         <button class="cta" data-tranzmit-action="cta" data-product-id="…">
//           <span class="cta-label">…</span><span class="arrow">→</span>
//         </button>
//         <div class="footer">…legal…</div>
//       </footer>
//     </div>
//   </main>

export const SKELETON_CSS = `
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; }
button { border: 0; color: inherit; font: inherit; cursor: pointer; }

.tz-template {
  height: 100svh; height: var(--tz-vh, 100svh); max-height: var(--tz-vh, 100svh);
  display: flex; flex-direction: column; align-items: center;
  padding-top: var(--tz-safe-top, 0px);
  padding-bottom: var(--tz-safe-bottom, 0px);
}
.tz-shell {
  width: 100%; max-width: 412px;
  flex: 1 1 auto; min-height: 0;
  display: flex; flex-direction: column;
  padding: 8px calc(var(--tz-safe-right, 0px) + 24px) 8px calc(var(--tz-safe-left, 0px) + 24px);
}
/* The only scroller. Flex column with flex-shrink:0 children → cards are
   content-sized and never squished (no clip); auto margins center the content
   when it fits the viewport and collapse to scroll-from-top when it doesn't. */
.tz-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; display: flex; flex-direction: column; }
.tz-scroll > * { flex-shrink: 0; }
.tz-scroll > :first-child { margin-top: auto; }
.tz-scroll > :last-child { margin-bottom: auto; }
/* Pinned footer band — CTA + legal always visible. */
.tz-footer { flex: 0 0 auto; padding-top: 8px; }

/* Finalized enlarged "commanding" CTA primitive (mirrors compose.ts
   phoneArtboardCss). Skins set ONLY background/border-radius/color on .cta —
   never its size/padding/font, which live here. */
.cta {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
  min-height: clamp(60px, 7.5vh, 72px);
  padding: clamp(16px, 2vh, 22px) clamp(20px, 5vw, 28px);
  font-size: clamp(16px, 4.4vw, 19px); line-height: 1.1; font-weight: 900;
}
.cta .cta-label { font-size: clamp(16px, 4.4vw, 19px); line-height: 1.1; }
.cta .arrow { font-size: 20px; }

/* Reserve the top-left corner for the SDK dismiss (×) overlay on narrow screens
   (wider screens keep the × in the side margin, so no reserve is needed). */
@media (max-width: 380px) { .tz-scroll { padding-top: 34px; } }
`;
