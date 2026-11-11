package com.itemli.mobile.shared.infrastructure

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import com.itemli.mobile.BuildConfig

/**
 * Señales de integridad del dispositivo / instalación.
 *
 * Reglas:
 * - Son SEÑALES, no veredictos: no se bloquea la app por ellas solas.
 * - El veredicto fuerte es Play Integrity API validado en el backend.
 * - Nada de esto se loguea con datos personales.
 */
object DeviceIntegrity {

    /** Binarios típicos de root. Falso positivo posible en emuladores. */
    private val ROOT_BINARIES = listOf(
        "/system/bin/su", "/system/xbin/su", "/sbin/su",
        "/system/bin/.ext/.su", "/system/sd/xbin/su",
        "/vendor/bin/su", "/system/app/Superuser.apk",
        "/data/local/xbin/su", "/data/local/bin/su",
    )

    fun rootSignals(): List<String> = buildList {
        ROOT_BINARIES.filterTo(mutableListOf()) { path ->
            runCatching { java.io.File(path).exists() }.getOrDefault(false)
        }.forEach { add("root-binary:$it") }
        if (Build.TAGS?.contains("test-keys") == true) add("test-keys-build")
    }

    fun emulatorSignals(): List<String> = buildList {
        if (Build.FINGERPRINT.startsWith("generic")
            || Build.FINGERPRINT.contains("emulator", ignoreCase = true)
            || Build.MODEL.contains("Emulator")
            || Build.MODEL.contains("Android SDK built for x86")
        ) add("emulator-fingerprint")
    }

    fun debuggableBuild(): Boolean = BuildConfig.DEBUG

    /**
     * Hash SHA-256 del certificado con el que está firmado el APK.
     * En release, comparar contra el hash del certificado oficial para
     * detectar reempaquetado (el resultado se reporta, no se fuerza).
     */
    fun signingCertSha256(context: Context): String? = runCatching {
        val packageInfo = context.packageManager.getPackageInfo(
            context.packageName,
            PackageManager.GET_SIGNATURES,
        )
        val cert = packageInfo.signatures?.firstOrNull()?.toByteArray() ?: return null
        val digest = java.security.MessageDigest.getInstance("SHA-256").digest(cert)
        digest.joinToString("") { "%02x".format(it) }
    }.getOrNull()

    /** Resumen compacto para enviar al backend junto a telemetría opt-in. */
    fun summary(context: Context): Map<String, String> = mapOf(
        "root_signals" to rootSignals().joinToString(","),
        "emulator" to (emulatorSignals().isNotEmpty()).toString(),
        "debuggable" to debuggableBuild().toString(),
        "cert_sha256" to (signingCertSha256(context) ?: "unknown"),
    )
}
