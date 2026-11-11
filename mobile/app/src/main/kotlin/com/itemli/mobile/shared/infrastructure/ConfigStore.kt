package com.itemli.mobile.shared.infrastructure

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.itemli.mobile.shared.domain.AppConfig
import kotlinx.coroutines.flow.first

/**
 * Configuración global (URL base, proxy). Persistida en DataStore.
 *
 * Reglas de seguridad:
 * - La URL base NO es secreta y va en DataStore (solo la app la lee).
 * - El usuario/password del proxy SÍ son secretos: se guardan cifrados en
 *   [EncryptedSecretStore], nunca en DataStore.
 */
class ConfigStore(
    private val context: Context,
    private val secretStore: EncryptedSecretStore? = null,
) {

    suspend fun current(): AppConfig.ServerConfig {
        val prefs = context.configStore.data.first()
        val proxyHost = prefs[KEY_PROXY_HOST] ?: return AppConfig.ServerConfig(
            baseUrl = prefs[KEY_BASE_URL] ?: DEFAULT_BASE_URL,
            proxy = null,
        )
        val proxy = AppConfig.ProxyConfig(
            host = proxyHost,
            port = prefs[KEY_PROXY_PORT] ?: 0,
            user = secretStore?.get(EncryptedSecretStore.KEY_PROXY_USER),
            password = secretStore?.get(EncryptedSecretStore.KEY_PROXY_PASSWORD),
        )
        return AppConfig.ServerConfig(
            baseUrl = prefs[KEY_BASE_URL] ?: DEFAULT_BASE_URL,
            proxy = proxy,
        )
    }

    suspend fun save(config: AppConfig.ServerConfig) {
        context.configStore.edit { prefs ->
            prefs[KEY_BASE_URL] = config.baseUrl
            val proxy = config.proxy
            if (proxy == null) {
                prefs.remove(KEY_PROXY_HOST)
                prefs.remove(KEY_PROXY_PORT)
                secretStore?.set(EncryptedSecretStore.KEY_PROXY_USER, null)
                secretStore?.set(EncryptedSecretStore.KEY_PROXY_PASSWORD, null)
            } else {
                prefs[KEY_PROXY_HOST] = proxy.host
                prefs[KEY_PROXY_PORT] = proxy.port
                secretStore?.set(EncryptedSecretStore.KEY_PROXY_USER, proxy.user)
                secretStore?.set(EncryptedSecretStore.KEY_PROXY_PASSWORD, proxy.password)
            }
        }
    }

    companion object {
        const val DEFAULT_BASE_URL = "http://10.0.0.15:8000/api/v1/"
        private val KEY_BASE_URL = stringPreferencesKey("base_url")
        private val KEY_PROXY_HOST = stringPreferencesKey("proxy_host")
        private val KEY_PROXY_PORT = intPreferencesKey("proxy_port")
    }
}

private val Context.configStore by preferencesDataStore(name = "server_config")
