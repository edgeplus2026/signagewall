plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
}

// Per-environment config, injected by CI (`-PsignagewallPlayerUrl=… -PversionName=… -PversionCode=…`).
// Dev defaults mirror the Tauri shell's DEFAULT_PLAYER_URL so `./gradlew installDebug`
// just works against a local vite player (10.0.2.2 = host loopback from the emulator).
val signagewallPlayerUrl: String =
    (project.findProperty("signagewallPlayerUrl") as String?) ?: "http://10.0.2.2:5174"
val updateManifestUrl: String =
    (project.findProperty("updateManifestUrl") as String?) ?: ""
val appVersionName: String = (project.findProperty("versionName") as String?) ?: "0.1.0"
val appVersionCode: Int =
    (project.findProperty("versionCode") as String?)?.toInt() ?: 1

android {
    namespace = "com.signagewall.player"
    compileSdk = 35

    defaultConfig {
        // Reused from the Tauri shell (`tauri.conf.json` identifier) so the device
        // identity + R2 release pathing stay consistent across desktop and mobile.
        applicationId = "com.signagewall.player"
        // 26 (Android 8.0): adaptive icons are pure-XML (no binary mipmaps needed),
        // and Device Owner / LockTask / silent PackageInstaller are all robust from
        // here. Lowering it requires adding PNG launcher densities — see README.
        minSdk = 26
        targetSdk = 35
        versionCode = appVersionCode
        versionName = appVersionName

        buildConfigField("String", "SIGNAGEWALL_PLAYER_URL", "\"$signagewallPlayerUrl\"")
        buildConfigField("String", "UPDATE_MANIFEST_URL", "\"$updateManifestUrl\"")
    }

    signingConfigs {
        // Release keystore comes from CI env (base64 secret → temp file); never committed.
        create("release") {
            System.getenv("ANDROID_KEYSTORE_FILE")?.let { ksPath ->
                storeFile = file(ksPath)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        getByName("debug") {
            isDebuggable = true
            applicationIdSuffix = ".debug"
        }
        getByName("release") {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            // Sign only when CI provided a keystore; a local release build stays
            // unsigned rather than failing configuration.
            if (System.getenv("ANDROID_KEYSTORE_FILE") != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    sourceSets {
        getByName("main").java.srcDirs("src/main/kotlin")
        getByName("test").java.srcDirs("src/test/kotlin")
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.lifecycle:lifecycle-process:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
}
