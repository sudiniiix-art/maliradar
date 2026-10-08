# MALIRADAR Android

This is the native Android shell for MALIRADAR. It loads the production web app at:

https://maliradar.onrender.com/

CI build is enabled for the Android shell.

The first Android build is intentionally a thin native shell so the existing web experience remains the source of truth. It supports JavaScript, local web storage, the web app's file picker, Android back navigation, and external links/downloads.

## Build

Use JDK 17, Android SDK 37, and Gradle 9.6.0.

Debug APK:
./gradlew assembleDebug

The debug application id is com.maliradar.app.debug.

## Next native integrations

The web app/backend already contains the Google Play verification surface. Native Play Billing, native push delivery, signed release configuration, and Play Console product/base-plan setup should be connected before production release.
