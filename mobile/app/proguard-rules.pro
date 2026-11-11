# R8 / ProGuard de Itemli Mobile.
# En release: minify + shrinkResources + obfuscation activados en build.gradle.kts.

# --- kotlinx.serialization: conservar nombres de campos serializados ---
-keepattributes *Annotation*, InnerClasses, Signature
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class * { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class com.itemli.mobile.**$$serializer { *; }
-keepclassmembers class com.itemli.mobile.** { *** Companion; }
-keepclasseswithmembers class com.itemli.mobile.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# --- Retrofit / OkHttp ---
-keepattributes Exceptions, RuntimeVisibleAnnotations
-keep,allowobfuscation interface com.itemli.mobile.features.**.infrastructure.datasources.*Api
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn okhttp3.internal.platform.**
-dontwarn org.codehaus.mojo.animal_sniffer.*

# --- Koin 4 (DSL sin reflexión; solo se protege el contexto global) ---
-keep class org.koin.** { *; }

# --- Room ---
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# --- Coroutines ---
-dontwarn kotlinx.coroutines.**
