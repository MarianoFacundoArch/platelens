# Runbooks

## Push Notification Ramp
1. Check Firestore `devices` collection for expo push token.
2. Trigger Cloud Function `sendTestNotification` via `firebase functions:shell` or HTTPS endpoint `/v1/notify/test`.
3. Verify Expo push receipt in Cloud Logging; if errors, recycle token on device.
4. For aggressive cadence adjustments set `notification_cadence` remote config flag to `aggressive` or `moderate`.

## RevenueCat Webhook Failure
1. Inspect Cloud Function logs for `/v1/rc/webhook` errors.
2. Re-send event from RevenueCat dashboard after fixing secret mismatch.
3. Use Firestore console to ensure `users.subscriptionStatus` updated.

## OpenAI Cost Spike
1. Review `scans` collection for `costEstimateUsd` > threshold.
2. Toggle remote config `ai_model_override` to fallback string.
3. If needed, enable `enable_free_mode=off` to lock camera behind paywall.
