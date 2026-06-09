# Tranzmit React Native SDK Example

Expo harness for testing `@tranzmit/react-native` from this repository.

## Run

```bash
npm install
EXPO_PUBLIC_TRANZMIT_TRIGGER=missing_trigger npm run start
```

Open the app on iOS, Android, or web. Tap **Present**.

For `missing_trigger`, the app should show an alert titled **Existing paywall fallback** with reason `placement_not_found`.

## Environment Overrides

- `EXPO_PUBLIC_TRANZMIT_API_BASE_URL` - optional API URL override.
- `EXPO_PUBLIC_TRANZMIT_PUBLIC_KEY` - dashboard public key. Defaults to the Tranzmit test key.
- `EXPO_PUBLIC_TRANZMIT_TRIGGER` - placement trigger. Defaults to `upgrade_pro`.
- `EXPO_PUBLIC_TRANZMIT_USER_ID` - stable user ID for assignment testing.
