package com.itemli.mobile.shared.infrastructure

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Almacén cifrado para secretos pequeños (credenciales del proxy, flags de app-lock).
 *
 * Reglas de seguridad:
 * - Nunca guardar secretos en DataStore/SharedPreferences en claro.
 * - La clave maestra vive en Android Keystore (TEE/StrongBox si está disponible).
 * - Solo esta clase puede leer/escribir estos valores.
 */
class EncryptedSecretStore(context: Context) {

    private val prefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "itemli_secrets",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    fun get(key: String): String? = prefs.getString(key, null)

    fun set(key: String, value: String?) {
        prefs.edit().apply {
            if (value == null) remove(key) else putString(key, value)
        }.apply()
    }

    companion object {
        const val KEY_PROXY_USER = "proxy_user"
        const val KEY_PROXY_PASSWORD = "proxy_password"
        const val KEY_APP_LOCK = "app_lock_enabled"
    }
}
