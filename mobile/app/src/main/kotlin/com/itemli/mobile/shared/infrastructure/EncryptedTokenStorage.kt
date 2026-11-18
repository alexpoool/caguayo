package com.itemli.mobile.shared.infrastructure

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.itemli.mobile.shared.domain.TokenStorage

/**
 * Token y credenciales recordadas cifrados en disco. Si el contexto aún no está listo, se degrada a
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

    override suspend fun savedCredentials(): com.itemli.mobile.shared.domain.SavedLoginCredentials? =
        runCatching {
            val alias = prefs.getString(KEY_SAVED_ALIAS, null)
            val password = prefs.getString(KEY_SAVED_PASSWORD, null)
            val database = prefs.getString(KEY_SAVED_DATABASE, null)
            if (alias != null && password != null && database != null) {
                com.itemli.mobile.shared.domain.SavedLoginCredentials(alias, password, database)
            } else null
        }.getOrNull()

    override suspend fun saveCredentials(credentials: com.itemli.mobile.shared.domain.SavedLoginCredentials?) {
        runCatching {
            val editor = prefs.edit()
            if (credentials == null) {
                editor.remove(KEY_SAVED_ALIAS).remove(KEY_SAVED_PASSWORD).remove(KEY_SAVED_DATABASE)
            } else {
                editor.putString(KEY_SAVED_ALIAS, credentials.alias)
                    .putString(KEY_SAVED_PASSWORD, credentials.password)
                    .putString(KEY_SAVED_DATABASE, credentials.database)
            }
            editor.apply()
        }.onFailure { android.util.Log.e("ItemliSecurity", "No se pudieron guardar las credenciales", it) }
    }

    override suspend fun userAlias(): String? = runCatching { prefs.getString(KEY_USER_ALIAS, null) }.getOrNull()

    override suspend fun setUserAlias(alias: String?) {
        runCatching { prefs.edit().putString(KEY_USER_ALIAS, alias).apply() }
    }

    override suspend fun dependencyId(): Long? = runCatching {
        if (prefs.contains(KEY_DEPENDENCY_ID)) prefs.getLong(KEY_DEPENDENCY_ID, 0L) else null
    }.getOrNull()

    override suspend fun setDependencyId(id: Long?) {
        runCatching {
            val editor = prefs.edit()
            if (id == null) editor.remove(KEY_DEPENDENCY_ID) else editor.putLong(KEY_DEPENDENCY_ID, id)
            editor.apply()
        }
    }

    override suspend fun clear() {
        runCatching { prefs.edit().clear().apply() }
            .onFailure { android.util.Log.e("ItemliSecurity", "No se pudo borrar el token", it) }
    }

    private companion object {
        const val KEY_TOKEN = "auth_token"
        const val KEY_SAVED_ALIAS = "saved_alias"
        const val KEY_SAVED_PASSWORD = "saved_password"
        const val KEY_SAVED_DATABASE = "saved_database"
        const val KEY_USER_ALIAS = "user_alias"
        const val KEY_DEPENDENCY_ID = "user_dependency_id"
    }
}
