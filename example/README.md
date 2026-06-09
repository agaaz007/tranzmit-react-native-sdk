# Tranzmit React Native SDK Example

Expo harness for testing `@tranzmit/react-native` from this repository.

## Run

```bash
npm install --legacy-peer-deps
EXPO_PUBLIC_TRANZMIT_TRIGGER=missing_trigger npm run start
```

Open the app on iOS, Android, or web. Tap **Present**.

For `missing_trigger`, the app should show an alert titled **Existing paywall fallback** with reason `placement_not_found`.

## Test The Happy Path

Use a real trigger configured in the dashboard:

```bash
EXPO_PUBLIC_TRANZMIT_TRIGGER=upgrade_pro npm run start
```

Then confirm:

1. SDK status shows `Ready: yes`.
2. Remote placement shows a placement and variant.
3. Tapping Present opens the hosted WebView paywall.
4. Tapping the CTA logs the selected `product.id`.

## Environment Overrides

- `EXPO_PUBLIC_TRANZMIT_API_BASE_URL` - optional API URL override. Defaults to the SDK production API.
- `EXPO_PUBLIC_TRANZMIT_PUBLIC_KEY` - dashboard public key. Defaults to the Tranzmit test key.
- `EXPO_PUBLIC_TRANZMIT_TRIGGER` - placement trigger. Defaults to `upgrade_pro`.
- `EXPO_PUBLIC_TRANZMIT_USER_ID` - stable user ID for assignment testing.
