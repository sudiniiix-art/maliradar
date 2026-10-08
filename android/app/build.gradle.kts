plugins {
    id("com.android.application")
}

android {
    namespace = "com.maliradar.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.maliradar.app"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        debug {
            // Keep the sideload build on the normal MaliRadar package ID.
            // This avoids package/signature confusion with earlier builds.
        }
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
