plugins {
    id("com.android.application")
}

dependencies {
    implementation("androidx.credentials:credentials:1.7.0-alpha03")
    implementation("androidx.credentials:credentials-play-services-auth:1.7.0-alpha03")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.2.1")
}

val googleServerClientId = providers.gradleProperty("GOOGLE_SERVER_CLIENT_ID").orNull ?: ""
val googleServerClientIdEscaped = googleServerClientId.replace("\\", "\\\\").replace("\"", "\\\"")

android {
    buildFeatures {
        buildConfig = true
    }

    namespace = "com.maliradar.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.maliradar.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 5
        versionName = "0.4.1"
        buildConfigField("String", "GOOGLE_SERVER_CLIENT_ID", "\"${googleServerClientIdEscaped}\"")
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
