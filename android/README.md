# MALIRADAR Android

This is the native Android shell for MALIRADAR. It loads the production web app at:

https://maliradar.onrender.com/

CI build is enabled for the Android shell.

The first Android build is intentionally a thin native shell so the existing web experience remains the source of truth. It supports JavaScript, local web storage, the web app's file picker, Android back navigation, and external links/downloads.

CI uses the runner's installed Android SDK.

## Build

Use JDK 17, Android SDK 36, and Gradle 9.5.1.

Debug APK:
./gradlew assembleDebug

The debug application id is com.maliradar.app.debug.

## Next native integrations

The web app/backend already contains the Google Play verification surface. Native Play Billing, native push delivery, signed release configuration, and Play Console product/base-plan setup should be connected before production release.


## StockCrash account sign-in

The Android shell now uses Credential Manager for Sign in with Google and the web layer supports email/password authentication. Google sign-in requires the same Google web/server client ID to be supplied to the Android build as the Gradle property `GOOGLE_SERVER_CLIENT_ID` and to Render as the `GOOGLE_SERVER_CLIENT_ID` environment variable. Email sign-in works without that Google configuration.
