# tz-paybar — Component Contract

Footer payment bar for the skeleton-idiom hosted paywall document: a "PAY USING \<app\>" toggle
next to the primary CTA, with a slide-up drawer of detected UPI apps. The bar is **document
content** (HTML/CSS/JS inside the integrity-hashed document). The SDK's only jobs are:
(1) inject `window.TranzmitCheckout` at compose time, (2) validate `paymentApp` on the
incoming `cta` bridge message, (3) hand the host app a resolved `checkoutContext`.
The WebView never runs Razorpay code and never opens apps.

Companion prototype: [`./paybar-demo.html`](./paybar-demo.html) (self-contained, open from `file://`).

---

## a) `spec.checkout` — TypeScript interface

```ts
// packages/shared/src/spec.ts — ADDITIVE. Old SDKs ignore unknown spec fields
// (no runtime schema validation; validateRenderableSpec checks only bridge.version,
// products, document.url/html, integrity). Keep bridge.version: 1.
export interface PaywallSpec {
  // ...existing fields...
  checkout?: CheckoutSpec;
}

export interface CheckoutSpec {
  /**
   * Opaque provider payload. The SDK NEVER interprets it — it is passed verbatim to the
   * host app as `checkoutContext.provider` on CTA. Schema-free by design so the dashboard
   * can add provider fields without an SDK release. Typical Razorpay-intent fields:
   * keyId, planRef, mandateMax, currency, orderEndpoint. Must not contain secrets that
   * cannot be public: it is delivered to the client. NOT injected into the WebView.
   *
   * TRUST BOUNDARY (hard requirements): `provider` travels in the UNHASHED config channel —
   * it is OUTSIDE document.integrity; nothing about the hash covers it. Therefore:
   * (1) host apps MUST treat it as untrusted input: validate every URL-valued field
   *     (orderEndpoint, any future URL) against an allowlist compiled into the app binary
   *     before use; no eval-adjacent use; never interpolate values into native UI templates.
   * (2) the dashboard MUST reject provider values matching known secret shapes (e.g. the
   *     Razorpay key_secret pattern) at write time.
   */
  provider?: Record<string, unknown>;

  /** Behavior config for the in-document bar. Injected (sanitized) into the WebView as
   *  `window.TranzmitCheckout.config`. Pure DATA delivered outside the document hash —
   *  dashboard edits here flip behavior WITHOUT recomputing document.integrity. */
  ui?: CheckoutUiConfig;
}

export interface CheckoutUiConfig {
  /**
   * Master switch. Default: true — but `spec.checkout` PRESENCE is the master opt-in:
   * when spec.checkout is absent the SDK injects `{}` regardless of any host-provided
   * runtime (see §b), so payment routing can never be turned on from the client side
   * alone. false ⇒ the SDK likewise injects `{}` (no upiApps, no platform, no config —
   * data minimization, §b), the document renders today's plain full-width CTA, and the
   * SDK additionally strips any `paymentApp` field from incoming cta messages (defense
   * in depth — config off means no payment routing, even from a stale/cached document).
   */
  enabled?: boolean;

  /**
   * Default: true. false ⇒ no selector UI at all (plain full-width CTA), BUT the default
   * app is still resolved and silently attached as `paymentApp` on the cta message.
   * Use for "route to the user's UPI app without showing a chooser". Distinct from
   * `enabled:false`, which suppresses paymentApp entirely.
   */
  showToggle?: boolean;

  /**
   * Ordered registry ids (see §g), e.g. ["phonepe","gpay","paytm"]. Detected apps are
   * displayed in this order; detected apps not listed sort after, in device-reported
   * order. Unknown ids are ignored. Default: device-reported order.
   * Sanitizer: ≤32 entries; each entry must match the §b id-string rule
   * `^[A-Za-z0-9._-]{1,64}$` — violations are DROPPED, not truncated.
   */
  appPriority?: string[];

  /**
   * Registry id preselected in the collapsed toggle. Must be among the DETECTED apps or
   * it is ignored; resolution order: defaultApp → first appPriority match → first
   * detected app. Default: unset.
   */
  defaultApp?: string;

  /**
   * Max app rows visible in the drawer before it scrolls internally. Resolution rule,
   * IDENTICAL in the SDK sanitizer and in the document's defensive read (pin a test on
   * each side): not a finite integer ≥ 1 → default 5; else clamp to 1..12. (One rule in
   * both layers so dashboard previews and devices never diverge on 0/negative/NaN.)
   * NOTE: an internally scrolling drawer is a conscious deviation from the "exactly one
   * .tz-scroll" skeleton rule (AUTHORING §2); the drawer caps its height at
   * maxVisibleApps rows and uses overscroll-behavior: contain so it never fights the
   * main scroller.
   */
  maxVisibleApps?: number;

  // NOTE: deliberately NO `collapsedLabelToken` field. Token substitution happens at
  // compose time over the static document HTML (localizeHtml, localization.ts:47–52), so a
  // config-side token KEY could never change which token the baked markup renders without
  // editing document.html — a re-hash, contradicting the layer-3 promise. The field would
  // be dead config. Label copy is already a layer-2 edit: change the translation VALUE of
  // the document's fixed {{checkout_pay_using}} token (no re-hash, HTML-escaping
  // preserved). If per-config strings are ever genuinely needed, the contract must instead
  // specify a sanitized `TranzmitCheckout.strings` object (resolved values, length-capped)
  // with an explicit textContent-only insertion rule, added to the sanitizeCheckoutRuntime
  // allowlist — never the raw strings table.

  /** Icon frame shape for app glyphs: "tile" (rounded square, default) | "circle". */
  iconStyle?: "tile" | "circle";

  /**
   * Default: true — any activation failure (no injected checkout, empty upiApps,
   * enabled:false, iOS) renders today's full-width plain CTA, pixel-identical to
   * current samples. false ⇒ on empty upiApps the bar shell still renders with the
   * generic UPI badge, non-interactive, and the cta message carries no paymentApp
   * (for designs that want the band height stable). Old SDKs (no injection) ALWAYS
   * get the plain CTA regardless — the document defaults to plain until JS activates.
   */
  fallbackToPlainCta?: boolean;
}
```

Runtime (SDK-side, not in the spec — these are the SHIPPED names):

```ts
// Host app → TranzmitProvider prop `checkoutApps` (the host runs
// react-native-customui's getAppsWhichSupportUPI natively and passes the
// result in; empty array / omitted on iOS or when none detected).
// NOTE: Razorpay's detection reports `appName` — mapping appName → `name`
// happens in HOST code (see the README provider-wiring example).
export interface CheckoutAppInput { packageName: string; name?: string; id?: string }

// Sanitized list (also exposed on TranzmitContextValue.checkoutApps):
export interface ResolvedCheckoutApp { id: string; name: string; packageName: string }

// Native-side resolution handed to the host on CTA:
export interface CheckoutContext {
  paymentApp?: ResolvedCheckoutApp;   // undefined if none selected / validation miss
  provider?: Record<string, unknown>; // spec.checkout.provider, verbatim
}
```

`GateOptions.onCTA` widens (backward-compatible — existing one-arg callbacks ignore extras):

```ts
onCTA?: (product: ProductSpec, checkoutContext?: CheckoutContext) => void;
```

Every hop takes the added optional param, on BOTH render surfaces:

- **Provider surface**: `SpecRenderer.handleMessage` → `SpecRendererProps.onCTA` →
  `PaywallHost` → provider closure (`TranzmitProvider.tsx:400`) → `GateOptions.onCTA`.
- **Declarative surface** (`TranzmitPaywall.tsx` — README Steps 9/11 bless it for the
  Razorpay flow): `TranzmitPaywallProps.onCTA` (line 15) widens to
  `(product, checkoutContext?)` and its own `SpecRenderer` closure (lines 66–73) threads
  the second arg through. Without this, checkoutContext is silently dropped for
  declarative consumers.

**Runtime plumbing**: the sanitized `ResolvedCheckoutApp[]` is exposed as
`TranzmitContextValue.checkoutApps` (provider prop `checkoutApps` → context); BOTH
`PaywallHost` and `TranzmitPaywall` read it from context and
pass it to `SpecRenderer` → compose. A declarative render whose provider received no runtime
behaves as "no checkout runtime" — a documented §f matrix row, not silent non-activation.

**`GateOptions.dismissOnCTA` is a HARD co-landing dependency of this contract** (not an
optional follow-up): without it, the unconditional `dismissPaywall(active.id, false)`
(TranzmitProvider.tsx:400–407) strands the user after a failed UPI mandate. Lifecycle and
analytics semantics are pinned in §h.

---

## b) `window.TranzmitCheckout` — injected shape + exact injection point

Injected shape (post-sanitization; this is what document JS reads):

```ts
interface InjectedCheckout {
  upiApps: { id: string; name: string }[]; // id: registry id, or raw packageName for unknown
                                           // apps (≤64 chars). name: display name — comes
                                           // from the DEVICE and is UNTRUSTED (≤48 chars).
  platform: "android" | "ios";
  config: CheckoutUiConfig;                // sanitized spec.checkout.ui; {} when absent
}
// Old SDK: window.TranzmitCheckout is undefined.
// New SDK: bare `{}` — no upiApps, no platform, no config — whenever ANY of:
//   · no host-provided checkout runtime
//   · spec.checkout absent (spec presence is the master opt-in, §a)
//   · ui.enabled === false
// Data minimization: the detected-app list is installed-financial-app inventory (sensitive
// under Play policy / DPDP) and the composed document currently has no CSP restricting
// fetch/XHR — the list only enters the WebView when the bar can actually use it.
```

`packageName` is deliberately NOT injected — the document only ever echoes back an `id`;
the SDK resolves id → `{ id, name, packageName }` natively (see §c).

**Exact injection point** — `compose.ts`, body assembly (today's lines 215–222). One new
`<script>` line after `TranzmitUser`, before the bridge IIFE, plus one read inside it:

```
${documentHtml}
${js}
<script>window.TranzmitNativeViewport = ${viewportJson};</script>
<script>window.TranzmitUser = ${userJson};</script>
<script>window.TranzmitCheckout = ${checkoutJson};</script>      ← NEW (after line 218)
<script>
(function(){
  var viewport = window.TranzmitNativeViewport || null;
  var user = window.TranzmitUser || {};
  var checkout = window.TranzmitCheckout || {};                   ← NEW (defensive default)
  ...
  window.Tranzmit = { viewport, user, checkout, post, ... };      ← NEW member
```

Built exactly like `userJson` (compose.ts:56–58):

```ts
const checkoutJson = JSON.stringify(sanitizeCheckoutRuntime(spec, runtime))
  .replace(/</g, "\\u003c");   // </script>-breakout escape, same as viewport/user
```

`sanitizeCheckoutRuntime` is a strict allowlist mirroring `sanitizeUserContext` (compose.ts:487):
upiApps capped at 16 entries, each `{id, name}` type-checked string with length caps (64/48),
packageName mapped through the registry (§g) and dropped from the payload; `platform` must be
`"android"|"ios"`; `config` keeps only the seven `CheckoutUiConfig` keys with per-field type
checks (`maxVisibleApps` per the §a rule). Never a passthrough. Two cross-cutting rules:

- **Id-string rule**: every id-valued string (`upiApps[].id`, `appPriority[]` entries,
  `defaultApp`, and the incoming `paymentApp` echo in §c) must match
  `^[A-Za-z0-9._-]{1,64}$` — Android package names are structurally within this set.
  Violations are DROPPED, not truncated (defense in depth for the DOM `data-app-id`
  attributes, analytics, and logs these strings flow into).
- **Name rule** (device-reported `name` is untrusted, §g): strip C0/C1 control characters
  and every Unicode format character (category Cf) — a strict superset of the bidi list
  U+200E/F, U+202A–U+202E, U+2066–U+2069 (bidi overrides visually reorder drawer text)
  that also covers invisibles like ZWSP/ZWNJ/ZWJ (U+200B–U+200D), soft hyphen (U+00AD),
  word joiner (U+2060), and BOM, which would otherwise render a spoofed name identically
  to a brand name while dodging the comparison; then, if an UNKNOWN app's stripped name
  matches a registry display name case-/whitespace-insensitively (Paytm, PhonePe,
  Google Pay, BHIM, Amazon Pay, CRED), the entry is DROPPED from the injected list —
  it never renders — so a trusted brand string never renders next to the generic glyph
  (anti-spoofing: a phishing app labeled "Google Pay" must never look like Google Pay
  in the drawer).

**Timing caveat (load-bearing — the split is precise):** the document's own `${js}` executes
at line 216, BEFORE the injected globals (217–219) and the bridge exist.

- **Register the capture-phase CTA click interceptor at TOP-LEVEL PARSE TIME** inside
  `${js}`. Registration needs no injected globals, and parse-time registration is the ONLY
  thing that guarantees the interceptor fires before the bridge IIFE's own capture-phase
  listener (§c) — the bridge IIFE registers synchronously during parse at line 258. An
  interceptor registered inside DOMContentLoaded would be ordered AFTER the bridge listener:
  the bridge's declarative path would post a plain cta first, the interceptor's
  stopImmediatePropagation would arrive too late, and `onCTA` would fire TWICE per tap.
- **Read all injected STATE lazily** — `window.TranzmitCheckout`, `window.Tranzmit.post`,
  the activation mode — inside the click handler and inside the `DOMContentLoaded` (or
  `load`) render pass. Rendering/activation is DOMContentLoaded work; only the listener
  registration is parse-time.

Tests should pin the literal, mirroring specRenderer.test.tsx:201/277:
`expect(html).toContain('window.TranzmitCheckout = {')` and the empty case
`window.TranzmitCheckout = {}`.

---

## c) Bridge messages

### Outgoing CTA (WebView → native)

```jsonc
{ "type": "cta", "productId": "monthly_299", "paymentApp": "phonepe" }
// paymentApp omitted entirely when the bar is inactive → byte-compatible with today.
```

SDK-side validation in `productFromMessage`'s image (`SpecRenderer.tsx:190`): accept
`paymentApp` (camelCase only — no `payment_app` alias; the shipped documents post
camelCase), require `typeof === "string"`, length ≤ 64, then
**look up in the SDK-side list it injected** (the host-provided `checkoutApps`,
post-registry-mapping) — exactly mirroring `productId ∈ spec.products`. On miss: the message
is still processed as a plain cta with `checkoutContext.paymentApp = undefined`. Raw WebView
strings are never forwarded; the host receives the natively-resolved
`{ id, name, packageName }`.

**Native-side cta dedup (wire contract):** `handleMessage` MUST drop any `cta` message
arriving within **500 ms** of the previously accepted one (per-WebView monotonic timestamp;
the dropped message produces no `onCTA` and no analytics). This is the backstop for
double-emission — a document whose interceptor mis-orders against the bridge's declarative
listener (§b timing caveat) emits two cta posts per tap, and a UPI mandate must never be
initiated twice. Document JS must NOT rely on posting multiple rapid ctas; the second is
contractually dropped.

**Emission mechanism (bridge v1-compatible, no bridge change):** the declarative click path
only forwards `data-product-id` / `data-action-name` / `href` — it cannot carry `paymentApp`.
The paybar document JS therefore registers its own **capture-phase document click listener**.
Because `${js}` runs before the bridge IIFE, the paybar's listener is registered first at the
same node+phase and fires first. When the bar is ACTIVE and the click resolves to the `.cta`
button, it calls `event.preventDefault(); event.stopImmediatePropagation();` and posts
`{ type:'cta', productId, paymentApp }` via `window.Tranzmit.post`. When the bar is INACTIVE
(or JS failed), it does nothing and the click falls through to the bridge's declarative
`data-tranzmit-action="cta"` path — today's plain cta, unchanged. The CTA button therefore
KEEPS `data-tranzmit-action="cta"` + `data-product-id` as its fallback wiring.

**Gotcha (pinned by compose.ts:274–291):** the bridge's conservative fallback treats any click
on `button.cta, a.cta, [role="button"].cta, .tz-cta` as a CTA purchase. The toggle, drawer,
app rows, and scrim must NEVER carry class `cta` or `tz-cta`, and must not carry
`data-tranzmit-action` (all selector interaction is in-document).

### Selector analytics (custom_action convention)

```js
window.Tranzmit.customAction('checkout_app_selected', { app: 'gpay' });
// wire: { type: 'custom_action', name: 'checkout_app_selected', payload: { app: 'gpay' } }
```

Fired on every drawer selection (including re-selecting the current app). `payload.app` is a
registry id / packageName string, same value space as `paymentApp`. Landed in SDK 0.4.0:
`handleMessage` dispatches `custom_action` with `name === "checkout_app_selected"` to the
`onCheckoutAppSelected` callback (`SpecRenderer.tsx`), which the provider tracks as
`checkout_app_selected` with `app` normalized to a registry id or `"other"`. All other
`custom_action` names remain no-ops. **Selection dedup (wire contract, mirrors the 500 ms
cta rule):** the SDK ignores a `checkout_app_selected` event arriving within **250 ms** of
the previously accepted one — document JS must not rely on rapid double selections reaching
analytics. The document may emit the event unconditionally; it is harmless on old SDKs
(pre-0.4.0 SDKs drop it silently — `custom_action` is in the default allowlist but old
`handleMessage` has no dispatch branch).

### Incoming

Nothing new. `ready` unchanged. No native → WebView messages are added.

---

## d) Markup contract

Lives in the `.tz-footer` band of the skeleton (`main.tz-template > .tz-shell >
.tz-scroll + footer.tz-footer`). The existing `.cta` button moves inside `.tz-paybar-row`,
otherwise unchanged (same classes, same data attributes, same children).

```html
<footer class="tz-footer">
  <div class="tz-paybar">                                          <!-- REQUIRED wrapper -->
    <div class="tz-paybar-row">                                    <!-- REQUIRED row -->
      <button type="button" class="tz-paybar-toggle"
              aria-haspopup="listbox" aria-expanded="false" hidden> <!-- REQUIRED; ships
                                                       `hidden` — JS un-hides on activation -->
        <span class="tz-paybar-toggle-label">{{checkout_pay_using}}</span> <!-- OPTIONAL -->
        <span class="tz-paybar-toggle-main">
          <span class="tz-paybar-app-icon"></span>                 <!-- REQUIRED, JS-filled -->
          <span class="tz-paybar-app-name"></span>                 <!-- REQUIRED, textContent ONLY -->
          <span class="tz-paybar-chevron" aria-hidden="true"></span><!-- REQUIRED; JS hides
                                                                        when 1 app detected -->
        </span>
      </button>
      <button class="cta" data-tranzmit-action="cta" data-product-id="monthly_299">
        <span class="cta-label">{{cta_label}}</span><span class="arrow">→</span>
      </button>
    </div>
    <div class="tz-paybar-scrim" hidden></div>                     <!-- REQUIRED -->
    <div class="tz-paybar-drawer" role="listbox" hidden>           <!-- REQUIRED -->
      <div class="tz-paybar-drawer-title">{{checkout_choose_app}}</div> <!-- OPTIONAL -->
      <div class="tz-paybar-apps"></div>                           <!-- REQUIRED; JS builds rows -->
    </div>
  </div>
  <div class="footer">…legal, skin-owned as today…</div>
</footer>
```

JS-built app row:

```html
<button type="button" class="tz-paybar-app is-selected" role="option"
        aria-selected="true" data-app-id="phonepe">
  <span class="tz-paybar-app-icon">…inline SVG from registry…</span>
  <span class="tz-paybar-app-name"><!-- textContent only --></span>
  <span class="tz-paybar-app-radio" aria-hidden="true"></span>
</button>
```

State classes (JS-owned): `.is-open` on drawer + scrim, `.is-selected` on app rows,
`.tz-paybar--plain` on the wrapper when degraded to plain CTA. The `hidden` attribute is the
no-JS/inactive default: with JS absent or failed, the static markup IS today's full-width CTA.

**Layering / positioning (base-owned):** `.tz-footer { position: relative; z-index: 6 }`;
drawer `position: absolute; left:0; right:0; bottom: calc(100% + 8px); z-index: 6`; scrim
`position: fixed; inset: 0; z-index: 5` (highest z-index in any sample is 4, so 5/6 clears all
content; the footer sits above the scrim so the bar stays visible and tappable while the
drawer is open). The native dismiss × is drawn by the SDK outside the DOM — the scrim cannot
and need not cover it. Drawer app list: `overflow-y: auto` capped at
`maxVisibleApps` rows, `overscroll-behavior: contain` (the documented one-scroller deviation).

**CSS ownership — mirrors the `.cta` rule exactly.** The component base CSS (shipped with the
skeleton concatenation, skeleton-first) owns ALL sizing: display/flex, width/min-width/
max-width, min-height (`clamp(60px, 7.5vh, 72px)` on the toggle to row-match the CTA),
padding, gap, font-size, icon dimensions (20px collapsed / 24px drawer), positioning,
z-index, overflow, transitions, and the compact breakpoint
`@media (max-width: 359px) { .tz-paybar-toggle-label, .tz-paybar-toggle .tz-paybar-app-name
{ display: none } }` (icon+chevron only; at 320px the shell's usable width is 272px).
`.tz-paybar-row .cta { flex: 1 1 auto; min-width: 0 }` is base-owned — skins must not touch
the CTA's flexing.

Skins may restyle ONLY: `background`, `border-color`/`border-style`, `border-radius`,
`color`, `box-shadow`, `font-weight`, `letter-spacing` on `.tz-paybar-toggle`,
`.tz-paybar-drawer`, `.tz-paybar-drawer-title`, `.tz-paybar-app`,
`.tz-paybar-app.is-selected`, `.tz-paybar-app-radio`, `.tz-paybar-scrim` (tint). Never
size/padding/font-size/position — same discipline as AUTHORING §3 for `.cta`.

---

## e) Three configurability layers

1. **Skin CSS** (per template variant, inside `document.css` after the skeleton+base): brand
   colors, radii, shadows on the paybar parts listed above. Changes the document ⇒ requires
   re-hash of `document.integrity`.
2. **Copy via `{{tokens}}`** (`checkout_pay_using`, `checkout_choose_app`, plus the existing
   `cta_label`): localization values are TEXT ONLY — `localizeHtml` HTML-escapes `& < > " '`,
   so translations cannot carry markup (report-confirmed, pinned by the
   "html-escapes localized strings" test). Any markup (icons, bold price) lives in
   `document.html` around the tokens. Strings live at spec level, outside
   `document.integrity` — contract requirement: keep it that way so copy edits don't re-hash.
3. **Behavior via `spec.checkout.ui`**: pure config data outside the document hash. Dashboard
   edits flip behavior with NO re-hash and NO document redeploy. The document JS must render
   sensibly for ANY config value, including absent (`{}` and `undefined` behave identically).

| Customer wants to change            | Edits where                         | Re-hash document? |
|-------------------------------------|-------------------------------------|-------------------|
| Bar accent color, radius, shadow    | Skin CSS (layer 1)                  | Yes               |
| "PAY USING" wording / translations  | Localized strings (layer 2)         | No                |
| Turn the bar on/off                 | `ui.enabled` (layer 3)              | No                |
| Hide chooser, keep silent routing   | `ui.showToggle` (layer 3)           | No                |
| App ordering / preselected app      | `ui.appPriority`, `ui.defaultApp`   | No                |
| Drawer height cap                   | `ui.maxVisibleApps`                 | No                |
| Icon shape (tile vs circle)         | `ui.iconStyle`                      | No                |
| Razorpay key / plan / mandate cap   | `checkout.provider` (opaque)        | No                |
| Add an app ICON for a new app       | Document icon registry (layer 1)    | Yes               |

---

## f) Fallback matrix

Document JS computes `active` on DOMContentLoaded; anything not `active` leaves the shipped
static markup = today's full-width plain CTA, and the cta message carries no `paymentApp`.

| Condition                                   | Detected by document JS as              | Rendered result                          | cta message              |
|---------------------------------------------|-----------------------------------------|------------------------------------------|--------------------------|
| Old SDK (no injection)                      | `window.TranzmitCheckout === undefined` | Plain full-width CTA (static default)    | `{type,productId}` via declarative path |
| New SDK, no checkout runtime                | `TranzmitCheckout` is `{}`              | Plain full-width CTA                     | `{type,productId}`       |
| Runtime present, `spec.checkout` absent     | `TranzmitCheckout` is `{}` (spec presence is the master opt-in, §a/§b — the SDK injects `{}` no matter what the host passes; client-side alone can never activate payment routing) | Plain full-width CTA | `{type,productId}` |
| `upiApps: []` (none detected)               | empty array                             | Plain CTA (or inert generic badge if `fallbackToPlainCta:false`) | `{type,productId}` |
| `config.enabled === false`                  | config flag                             | Plain CTA; SDK also strips `paymentApp`  | `{type,productId}`       |
| iOS                                         | `platform === "ios"` (host also passes `upiApps: []` on iOS) | Plain CTA           | `{type,productId}`       |
| `config.showToggle === false`               | config flag                             | Plain CTA visuals, no selector           | `paymentApp` silently attached if a default resolves |
| Exactly 1 app detected                      | `upiApps.length === 1`                  | Toggle shown, chevron hidden, non-expandable | `paymentApp` = that app |
| Paybar JS throws                            | —                                       | Static default = plain CTA; bridge fallback path still fires cta | `{type,productId}` |
| **Old document + new SDK**                  | no `.tz-paybar` markup                  | Unchanged rendering; `paymentApp` parse finds nothing | today's behavior, `checkoutContext.paymentApp` undefined (provider passthrough still delivered) |

Old SDK + new document is safe by construction: the selector never renders (no injection ⇒
not active), and its cta degrades to today's plain `onCTA(product)` path. `bridge.version`
stays `1` — bumping it is the kill-switch that would blank ALL old SDKs
(`unsupported_version`), which this design deliberately avoids.

---

## g) Known-app registry

Canonical id list — shared by BOTH sides: the SDK maps device packageNames → ids before
injecting; the document ships icons keyed by the same ids. The document is hash-stable, so
**all icons ship IN the document** as inline SVG (or data-URI) keyed by app id — no network,
no per-device assets.

| packageName                              | id          | Display name | Icon key    |
|------------------------------------------|-------------|--------------|-------------|
| `net.one97.paytm`                        | `paytm`     | Paytm        | `paytm`     |
| `com.phonepe.app`                        | `phonepe`   | PhonePe      | `phonepe`   |
| `com.google.android.apps.nbu.paisa.user` | `gpay`      | Google Pay   | `gpay`      |
| `in.org.npci.upiapp`                     | `bhim`      | BHIM         | `bhim`      |
| `in.amazon.mShop.android.shopping`       | `amazonpay` | Amazon Pay   | `amazonpay` |
| `com.dreamplug.androidapp`               | `cred`      | CRED         | `cred`      |
| *(anything else)*                        | raw packageName | device-reported `name` | `generic` |

Rules:

- **Known apps**: injected `name` is the registry display name (trusted constant); icon looked
  up by id. The registry is `KNOWN_UPI_APPS` in `packages/react-native/src/checkout.ts`; the
  table above is the canonical id vocabulary shared by dashboard, SDK, and document templates.
- **Unknown apps**: injected `id` = raw packageName (≤64 chars), `name` = device-reported
  label (≤48 chars). The document renders the **generic UPI glyph** + the reported name.
- **Untrusted-name rule (hard requirement)**: device-reported app names are attacker-ish
  input (any installed app chooses its own label). The document must insert names via
  `textContent` / `createTextNode` ONLY — never `innerHTML`, never attribute interpolation.
  Icon SVGs are trusted document-local constants and are never built from injected strings.
- `paymentApp` echoed on the wire is the `id`; the SDK resolves it against its own native
  list to `{ id, name, packageName }` — a forged/unknown id resolves to `undefined`
  (mirroring the forged-productId → `defaultProduct` precedent, but for paymentApp the
  correct miss behavior is *absence*, not a default app).

---

## h) Lifecycle

**Preload staleness — `upiApps` are a compose-time snapshot.** The injected
`window.TranzmitCheckout.upiApps` is captured once, when `compose.ts` builds the document
from the host-provided `checkoutApps`. Preloaded paywalls sit composed before display
(`PaywallHost` keeps `preloadedPaywalls` warm), and a displayed paywall can stay open while
the user backgrounds the app and installs/uninstalls UPI apps — the drawer list does NOT
live-update. This staleness is display-only by design:

- **CTA-time resolution uses the CURRENT native list**, not the snapshot. The §c validation
  looks the echoed `paymentApp` id up in the list the SDK holds at the moment the cta
  message arrives. An app uninstalled after compose therefore resolves to
  `checkoutContext.paymentApp = undefined` — plain-cta semantics for the host — **never a
  dead `packageName`**. The host must not receive a packageName it cannot open.
- An app installed after compose simply doesn't appear in the drawer until the next
  compose. Cosmetic only; no correctness impact.

**`dismissOnCTA` semantics (pinned here, referenced from §a).** Today the provider tracks
`cta_click`, then unconditionally `dismissPaywall(active.id, false)` (no dismissal
analytics), then invokes `GateOptions.onCTA` (TranzmitProvider.tsx:400–407). With
`dismissOnCTA: false` the paywall stays mounted through the native UPI/Razorpay flow;
`cta_click` still fires exactly once per accepted cta (the 500 ms dedup in §c guarantees
"accepted" is singular per tap); the host ends the paywall explicitly — dismiss on payment
success, keep or re-gate on failure. A user-initiated dismissal (`onDismiss`) keeps today's
tracked-dismissal behavior unchanged.

---

## Status of previously open items

Landed in SDK 0.4.0 (no longer open):

- The `custom_action` → `client.track` dispatch branch and its `SpecRendererProps` callback:
  shipped as the `checkout_app_selected` branch in `SpecRenderer.tsx` +
  `onCheckoutAppSelected`, tracked by the provider (§c).
- `GateOptions.dismissOnCTA`: shipped in `packages/react-native/src/types.ts` with the §h
  semantics (default true; false keeps the paywall up through the native Razorpay flow).
- Sanitizer field caps: final numbers are the contract numbers (16 apps, 64/48 char,
  1–12 rows), pinned by `packages/react-native/tests/checkout.test.ts`.

Still deliberately out of scope:

- Success/failure feedback INTO the WebView after payment (no native→WebView channel exists;
  current assumption: host dismisses or re-gates).
