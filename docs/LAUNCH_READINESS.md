# MaliRadar launch readiness

## Google Play subscriptions
Use Google Play Billing Library 9.1.0 in the Android client. The Android purchase flow must:
1. Load the Founder Pro and MaliRadar Pro subscription products from Google Play.
2. When the launch offer is active, call `POST /api/launch-offer/reserve` before starting the purchase and keep the returned reservation ID.
3. After purchase, send the purchase token, product ID, reservation ID, MaliRadar ID and deletion token to `POST /api/google-play/verify-subscription`.
4. Only unlock paid features after the server returns a verified entitlement.
5. The server confirms delivery of an initial verified subscription; renewals do not need a second acknowledgement.
6. Restore purchases through the same server verification path.
7. Let Google Play remain the source of truth for recurring billing, renewals, grace periods and expiration.

Default product IDs:
- Founder Pro: `maliradar_founder_monthly`
- Pro: `maliradar_pro_monthly`

Launch offer ID: `launch_2_months` by default; set `GOOGLE_PLAY_LAUNCH_OFFER_ID` to the exact Play Console offer ID you create.

Create the two products/base plans and configure the first-two-month launch prices in Play Console. The app UI prices are marketing labels; Google Play product details are the final purchase price.

## Required Render environment
```
GOOGLE_PLAY_PACKAGE_NAME=<Android application id>
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<Google Play publisher service-account JSON>
GOOGLE_PLAY_FOUNDER_PRODUCT_ID=maliradar_founder_monthly
GOOGLE_PLAY_PRO_PRODUCT_ID=maliradar_pro_monthly
GOOGLE_PLAY_LAUNCH_OFFER_ID=launch_2_months
MYSTOCKS_BASE_URL=https://mystocks.africa/api/v1/partner
MYSTOCKS_API_KEY=<production MyStocks Africa key>
MALIRADAR_DATA_DIR=<durable storage path>
```

For staging/sandbox, omit `MYSTOCKS_BASE_URL` so the backend uses the MyStocks sandbox base URL.

## Launch offer
Founder Pro is KSh79/month for the first 2 months, then KSh99/month.
Pro is KSh99/month for the first 2 months, then KSh199/month.
There are 100 paid places shared across the two paid plans. A reservation lasts 15 minutes and the slot is counted only after a verified Google Play purchase consumes that reservation.

## Important persistence requirement
The 100-place counter and subscription state are server-side, but the current JSON database is only as durable as the filesystem it is stored on. Before taking real payments at scale, deploy the DB on durable persistent storage or move the state to a managed database with atomic writes. Do not rely on an ephemeral filesystem for the global 100-place promise.

## Data integrity
The server never trusts a client-supplied paid tier for the protected paper-order API. Server paper orders use provider-verified prices and server-recorded holdings/cash for their validation. Competitive trading metrics are derived from server-recorded paper transactions.

## Account deletion
`/delete-account.html` provides an external deletion path and is also linked from the in-app Trust Center. The deletion endpoint removes the server-stored profile, simulation records, alerts, social connections and associated competition records.

## Provider data
The market-data bridge reports production or sandbox state dynamically from `MYSTOCKS_BASE_URL`. When no provider key is configured, the state is `UNAVAILABLE`; the app does not present seeded prices as verified market data.

## Final release sequence
Deploy `main` to Render, verify the backend health endpoint, configure production provider/billing credentials, then run the fresh Android install test: intro → tutorial → Home → every tab → Free/Founder/Pro access → paper trading → reload/reconnect → account data management.
