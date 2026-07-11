# HiAstro exact paywall telemetry

This branch adds the React Native half of the HiAstro V2 exposure spine. It is additive and is not a package release.

## Server decision contract

Each enabled placement returned by `/v1/config` should include these immutable values. Snake case and camel case are both accepted during rollout.

| Field | Owner | Purpose |
|---|---|---|
| `paywall_id` | server | Stable paywall definition |
| `variant_id`, `variant_key` | server | Assigned arm |
| `creative_id` | server | Rendered creative revision |
| `decision_id` | server | One assignment decision |
| `snapshot_id` | server | Frozen decision inputs/config |
| `experiment_id` | server/Statsig | Experiment identity |
| `experiment_snapshot_id` | server | Frozen experiment configuration |
| `decision_token` | server | Signed binding of the immutable decision fields |

The SDK generates `exposure_id` when `gate()` creates a presentation, `event_id` for each event, and `batch_id` for each persisted upload. A retry reuses the original event and batch IDs. One decision may therefore produce multiple exposure IDs across separate presentations.

Events are marked `linkage_quality=exact` only when every immutable server field above is present. Older configs continue as `legacy_partial`; the SDK does not invent missing provenance.

## Host integration

```tsx
<TranzmitProvider
  publicKey={TRANZMIT_PUBLIC_KEY}
  userId={currentUser?.id}
  identifiers={{ stableID: stableId }}
  replay={{ consent: analyticsConsent, samplePercent: 10, retentionDays: 30 }}
  onExperimentExposure={(exposure) => {
    // Invoke the HiAstro Statsig adapter's manual-exposure API here.
    // Use exposure.experimentId, variantKey, stableID, userID and exposureId.
    statsigExposureAdapter(exposure);
  }}
>
  <App />
</TranzmitProvider>
```

The SDK still creates and persists `stableID` when the host does not provide one. `userId` remains an additional custom identity and must be the real logged-in app identifier, never a fabricated anonymous ID.

Carry the second `onCTA` argument into checkout and report every terminal client result against it:

```tsx
const { gate, reportOutcome } = useTranzmit();

gate("upgrade_pro", {
  onCTA: async (product, exposure) => {
    reportOutcome({
      exposure,
      outcome: { status: "checkout_started", productId: product.id },
    });

    const purchase = await purchaseProduct(product.id);
    reportOutcome({
      exposure,
      outcome: purchase.ok
        ? {
            status: "purchase_client_confirmed",
            productId: product.id,
            transactionId: purchase.transactionId,
          }
        : { status: "checkout_failed", productId: product.id },
    });
  },
});
```

`purchase_client_confirmed` is not a verified business conversion. The backend must carry `exposure_id` through order creation and attribute conversion only after its purchase webhook verifies the transaction.

## Semantic WebView bridge

The SDK injects a nonce-bound bridge into the integrity-checked hosted document. It emits only bounded semantic values:

- `render_confirmed`
- `scroll_depth` at 25/50/75/100 percent
- `plan_toggle` from `data-tranzmit-plan-id`
- `price_visible` from `data-tranzmit-price`
- `cta_click`
- `rage_click`
- `dismissal`

Every accepted event must contain the native `exposure_id` and per-render `bridge_nonce`. Unknown events, extra fields, invalid ranges, oversized messages, mismatched exposure IDs, and mismatched nonces are dropped.

Raw DOM, selectors, text, URLs, emails, phone numbers, names, cookies, passwords, and private traits are removed at the telemetry boundary. `/v1/events` receives identity plus event context, but not `userTraits` or `privateTraits`.

## Replay policy

The SDK does not record or upload raw replay. With host consent it deterministically records only sampling metadata (`replay_consented`, `replay_sampled`, `replay_retention_days`) on render. The default sample is 10% and the supported retention declaration is 30 days. A separate reviewed rrweb/object-storage integration is required before any raw replay exists.

## Ingress requirements

`POST /v1/events` receives:

```json
{
  "publicKey": "pk_...",
  "identity": { "userId": "...", "identifiers": { "stableID": "..." } },
  "sessionId": "sess_...",
  "batch_id": "uuid",
  "events": [
    {
      "event_id": "uuid",
      "event": "paywall_rendered",
      "timestamp": 1783761000000,
      "properties": {
        "exposure_id": "uuid",
        "paywall_id": "paywall_1",
        "decision_id": "decision_1",
        "linkage_quality": "exact"
      }
    }
  ]
}
```

Ingress must enforce uniqueness on `(public_key, event_id)` and `(public_key, batch_id)`, verify `decision_token`, persist before acknowledging, and return success for a duplicate batch without creating duplicate events.
