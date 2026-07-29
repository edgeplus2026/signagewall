# The @JavascriptInterface host is called by name from injected JS — R8 must not
# rename or strip its methods, or the whole native bridge silently disappears.
-keepclassmembers class com.signagewall.player.bridge.AndroidBridge {
    @android.webkit.JavascriptInterface <methods>;
}

# kotlinx.serialization generated serializers.
-keepclassmembers @kotlinx.serialization.Serializable class ** {
    *** Companion;
    kotlinx.serialization.KSerializer serializer(...);
}
-keepclasseswithmembers class ** {
    kotlinx.serialization.KSerializer serializer(...);
}
