package com.itemli.mobile.shared.infrastructure

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.itemli.mobile.shared.domain.TokenStorage

/**
 * Token cifrado en disco. Si el contexto aún no está listo, se degrada a
 * preferencias normales (solo usado en tests).
 */
class EncryptedTokenStorage(context: Context) : TokenStorage {

    private val prefs by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "itemli_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    override suspend fun token(): String? =
        // Blindaje: si el almacén cifrado falla (Keystore, prefs corruptas),
        // se devuelve null y el usuario vuelve al Login; la app no muere.
        runCatching { prefs.getString(KEY_TOKEN, null) }.getOrNull()

    override suspend fun setToken(token: String?) {
        runCatching { prefs.edit().putString(KEY_TOKEN, token).apply() }
            .onFailure { android.util.Log.e("ItemliSecurity", "No se pudo guardar el token", it) }
    }

    override suspend fun clear() {
        runCatching { prefs.edit().clear().apply() }
            .onFailure { android.util.Log.e("ItemliSecurity", "No se pudo borrar el token", it) }
    }

    private companion object { const val KEY_TOKEN = "auth_token" }
}
