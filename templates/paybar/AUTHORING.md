# tz-paybar — authoring guide for paywall designers

How to put the UPI checkout bar (the "PAY USING \<app\>" toggle + drawer next to the CTA)
into a Tranzmit paywall document. This guide covers only what is paybar-specific. The
skeleton idiom, the `tz-footer` band, the skins-only-restyle discipline, preview frames,
and shipping/integrity are all in the main guide — read
[`../AUTHORING.md`](../AUTHORING.md) first (§2 HTML contract, §3 skeleton ownership,
§5 bridge actions, §6 shipping). The normative spec is [`CONTRACT.md`](./CONTRACT.md);
this file is the working subset for document authors.

Interactive reference: open [`paybar-demo.html`](./paybar-demo.html) from `file://` —
every scenario, both skins, and the 320/360/390/430 frames are clickable, with a live
bridge log. Screenshots in this directory (`shot-390-collapsed.png`,
`shot-390-expanded.png`, `shot-320-collapsed.png`) show the target rendering.

This feature is **Android-only** (UPI intents). Design and QA at **360px** width — the
dominant Android viewport — not just the iPhone frames.

---

## 1. Markup contract

The bar lives inside the skeleton's `tz-footer` band (`../AUTHORING.md` §2). The existing
`.cta` button moves inside `.tz-paybar-row`, otherwise unchanged — same classes, same
`data-tranzmit-action="cta"` + `data-product-id`, same children.

```html
<footer class="tz-footer">
  <div class="tz-paybar">                                          <!-- REQUIRED wrapper -->
    <div class="tz-paybar-row">                                    <!-- REQUIRED row -->
      <button type="button" class="tz-paybar-toggle"
              aria-haspopup="listbox" aria-expanded="false" hidden> <!-- ships `hidden`;
                                                          JS un-hides on activation -->
        <span class="tz-paybar-toggle-label">{{checkout_pay_using}}</span> <!-- OPTIONAL -->
        <span class="tz-paybar-toggle-main">
          <span class="tz-paybar-app-icon"></span>                 <!-- JS-filled -->
          <span class="tz-paybar-app-name"></span>                 <!-- textContent ONLY -->
          <span class="tz-paybar-chevron" aria-hidden="true"></span>
        </span>
      </button>
      <button class="cta" data-tranzmit-action="cta" data-product-id="…">
        <span class="cta-label">{{cta_label}}</span><span class="arrow">→</span>
      </button>
    </div>
    <div class="tz-paybar-scrim" hidden></div>
    <div class="tz-paybar-drawer" role="listbox" hidden>
      <div class="tz-paybar-drawer-title">{{checkout_choose_app}}</div> <!-- OPTIONAL -->
      <div class="tz-paybar-apps"></div>                           <!-- JS builds rows -->
    </div>
  </div>
  <div class="footer">…legal line, skin-owned as today…</div>
</footer>
```

Rules that are easy to get wrong:

- **`hidden` is the no-JS default.** With JS absent, failed, or the bar inactive, the
  static markup IS today's full-width plain CTA. Never remove the `hidden` attributes.
- **Never** put class `cta` or `tz-cta`, or any `data-tranzmit-action`, on the toggle,
  drawer, app rows, or scrim. The SDK bridge's conservative fallback treats any click on
  `.cta`/`.tz-cta` as a purchase (CONTRACT §c gotcha) — a mislabeled scrim would buy on
  tap-to-close.
- App names go into the DOM via `textContent` only — never `innerHTML` (see §5).
- State classes are JS-owned: `.is-open` (drawer + scrim), `.is-selected` (app rows),
  `.tz-paybar--plain` (wrapper, when degraded).

## 2. CSS ownership — base vs skin

Exactly the `.cta` discipline from `../AUTHORING.md` §3, extended to the paybar parts.
The **component base CSS** (ships with the skeleton concatenation) owns ALL sizing and
mechanics: flex layout, min-height (`clamp(60px, 7.5vh, 72px)` on the toggle to row-match
the CTA), padding, gaps, font-size, icon dimensions (20px collapsed / 24px drawer),
positioning, z-index, overflow, transitions, and both breakpoints:

- `@media (max-width: 359px)` — compact toggle: label + app name hidden, icon + chevron
  only.
- `@media (max-width: 380px)` — the skeleton's dismiss-corner reserve
  (`.tz-scroll { padding-top: 34px }`). A 360–380px Android frame keeps the FULL toggle
  but still needs this reserve — the two breakpoints are independent.

**Layering (base-owned, do not touch in skins):** `.tz-footer` and `.tz-paybar-row` are
`position: relative; z-index: 6`; drawer `z-index: 6`; scrim `position: fixed; inset: 0;
z-index: 5`. The row must itself be positioned at z-index 6 — the footer's z-index alone
does NOT lift its unpositioned children above the positioned scrim, and the bar would be
dead under the scrim while the drawer is open. This layering is what keeps the CTA
tappable with the drawer open (a CTA tap then closes the drawer AND fires with the
selected app).

**Skins may restyle ONLY**: `background`, `border-color`/`border-style`,
`border-radius`, `color`, `box-shadow`, `font-weight`, `letter-spacing` on
`.tz-paybar-toggle`, `.tz-paybar-drawer`, `.tz-paybar-drawer-title`, `.tz-paybar-app`,
`.tz-paybar-app.is-selected`, `.tz-paybar-app-radio`, `.tz-paybar-scrim` (tint only).
Never size, padding, font-size, position, or the CTA's flexing
(`.tz-paybar-row .cta { flex: 1 1 auto; min-width: 0 }` is base-owned).

**Border pattern**: the base ships `border: 1px solid transparent` on the toggle and
drawer; skins set **only `border-color`** — the `border:` shorthand in a skin violates
the allowlist. Specificity gotcha: the skeleton has `.tz-template button { border: 0 }`
(0,1,1), so the toggle's base border rule must be written as
`.tz-template .tz-paybar-toggle { border: 1px solid transparent }` (0,2,0) or it
silently loses and every skin's `border-color` renders 0px none.

## 3. The JS pattern — parse-time interceptor, lazy globals

The document's `${js}` executes BEFORE the SDK's injected globals
(`window.TranzmitCheckout`, `window.TranzmitUser`) and BEFORE the bridge IIFE — compose
order is: document html+js → injected globals → bridge IIFE (CONTRACT §b). Two rules
follow, and both are load-bearing:

1. **Register the capture-phase CTA click interceptor at top-level parse time.**
   Registration needs no globals. The bridge IIFE registers its own capture-phase
   document click listener synchronously during parse; same node + same phase means
   registration order decides firing order. Parse-time registration is the ONLY thing
   that guarantees your interceptor fires first. If you register inside
   `DOMContentLoaded`, you are ordered AFTER the bridge listener: the bridge posts a
   plain `cta` first, your `stopImmediatePropagation()` arrives too late, and **`onCTA`
   fires twice per tap** — a double UPI mandate attempt. (The SDK's native 500 ms cta
   dedup, CONTRACT §c, is the backstop; do not rely on it.)
2. **Read all injected state lazily** — `window.TranzmitCheckout`, `window.Tranzmit.post`,
   the activation mode — inside the click handler and inside your
   `DOMContentLoaded`/`load` render pass, never at parse time (they don't exist yet).

Interceptor behavior: when the bar is ACTIVE and the click resolves to `.cta`, call
`event.preventDefault(); event.stopImmediatePropagation();` and post
`{ type: 'cta', productId, paymentApp }`. When inactive, do nothing — the click falls
through to the bridge's declarative `data-tranzmit-action="cta"` path, which is why the
CTA button keeps its data attributes as fallback wiring. `paybar-demo.html` implements
this two-listener interplay verbatim.

## 4. Localization tokens

Two new tokens, plus the existing `cta_label`:

| Token | Where | Demo copy |
|---|---|---|
| `{{checkout_pay_using}}` | collapsed toggle label | "PAY USING" |
| `{{checkout_choose_app}}` | drawer title | "Pay using UPI app" |

Token values are **text only** — `localizeHtml` HTML-escapes `& < > " '`, so
translations cannot carry markup. Any markup lives in `document.html` around the tokens.
Every token used in the document **must exist in `defaultLocale`** (and each shipped
locale): a missing token substitutes as the **empty string**, not the literal token, and
`validateLocalizationCoverage` flags it per locale. Copy changes are a layer-2 edit
(translation VALUE) — no re-hash. There is deliberately no config field that selects the
label token (CONTRACT §a).

## 5. Icon registry + generic fallback

All icons ship **in the document** (inline SVG / data-URI) keyed by registry id — the
document is hash-stable, so no network fetches and no per-device assets. The canonical
id list (CONTRACT §g): `paytm`, `phonepe`, `gpay`, `bhim`, `amazonpay`, `cred`.

- **Known apps**: icon looked up by id; display name is the registry constant (trusted).
- **Unknown apps**: `id` = raw packageName, `name` = device-reported label. Render the
  **generic UPI glyph** + the reported name. Device-reported names are untrusted input
  (any installed app chooses its own label): insert via `textContent`/`createTextNode`
  ONLY. Never `innerHTML`, never attribute interpolation. Icon SVGs are trusted
  document-local constants, never built from injected strings.
- Adding a new branded icon = a document edit = layer 1 = **re-hash**.

The demo's scenario 5 injects an app named `FakePay <img src=x onerror=alert(1)> "Ltd"`
— it must render as inert literal text in the drawer.

## 6. Fallback matrix (what the document must do)

Compute activation on DOMContentLoaded; anything not active leaves the shipped static
markup = today's plain full-width CTA, and the cta message carries no `paymentApp`.
Full matrix with SDK-side detail: CONTRACT §f.

| Condition | Render | cta message |
|---|---|---|
| `window.TranzmitCheckout === undefined` (old SDK) | plain CTA (static default) | plain, via declarative path |
| `TranzmitCheckout` is `{}` (no runtime, or `spec.checkout` absent — spec presence is the master opt-in; the client alone can never activate routing) | plain CTA | plain |
| `upiApps: []` | plain CTA — or inert generic badge if `fallbackToPlainCta: false` | plain |
| `config.enabled === false` | plain CTA (SDK also strips `paymentApp`) | plain |
| `platform === "ios"` | plain CTA | plain |
| `config.showToggle === false` | plain CTA visuals | `paymentApp` silently attached |
| exactly 1 app | toggle shown, chevron hidden, non-expandable | `paymentApp` = that app |
| paybar JS throws | static default = plain CTA | plain, via declarative path |

`maxVisibleApps` defensive read must match the SDK sanitizer exactly (one rule, both
layers): **not a finite integer ≥ 1 → default 5; else clamp to 1..12.**

## 7. Review checklist (use the demo)

Open `paybar-demo.html`, then per skin and per frame (320 / **360** / 390 / 430):

- [ ] Drawer open: bar stays bright and tappable above the scrim; CTA tap closes the
      drawer and fires ONE cta with the selected app (watch the bridge log).
- [ ] Scenario 2: single app → chevron hidden, toggle inert.
- [ ] Scenarios 3 / 3b: empty apps → plain CTA / inert generic badge.
- [ ] Scenario 4: no toggle rendered, but cta carries `paymentApp`.
- [ ] Scenario 5: 7 apps → drawer scrolls internally at 5 rows; FakePay name inert.
- [ ] Scenario 6: old SDK → indistinguishable from today's paywall.
- [ ] 320: icon-only toggle. 360: full toggle + dismiss-corner reserve. Switching frames
      never carries an open drawer.
- [ ] Keyboard: toggle opens drawer → focus lands on selected row; Escape/select closes
      → focus returns to the toggle.
