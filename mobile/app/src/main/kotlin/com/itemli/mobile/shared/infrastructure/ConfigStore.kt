package com.itemli.mobile.shared.infrastructure

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.itemli.mobile.shared.domain.AppConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/**
 * Configuración global (URL base, proxy). Persistida en DataStore.
 *
 * La app debe adoptar una configuración distinta según el despliegue:
 * la URL base es editada desde la pantalla de Ajustes.
 */
class ConfigStore(private val context: Context) {

    suspend fun current(): AppConfig.ServerConfig {
        val prefs = context.configStore.data.first()
        val proxyHost = prefs[KEY_PROXY_HOST]
        val proxyPort = prefs[KEY_PROXY_PORT]
        val proxy = proxyHost?.let {
            AppConfig.ProxyConfig(
                host = it,
                port = proxyPort ?: 0,
                user = prefs[KEY_PROXY_USER],
                password = prefs[KEY_PROXY_PASS],
            )
        }
        return AppConfig.ServerConfig(
            baseUrl = prefs[KEY_BASE_URL] ?: AppConfig.ServerConfig().baseUrl,
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
                prefs.remove(KEY_PROXY_USER)
                prefs.remove(KEY_PROXY_PASS)
            } else {
                prefs[KEY_PROXY_HOST] = proxy.host
                prefs[KEY_PROXY_PORT] = proxy.port
                prefs[KEY_PROXY_USER] = proxy.user
                prefs[KEY_PROXY_PASS] = proxy.password
            }
        }
    }

    companion object {
        const val DEFAULT_BASE_URL = "http://10.0.0.15:8000/api/v1/"
        private val KEY_BASE_URL = stringPreferencesKey("base_url")
        private val KEY_PROXY_HOST = stringPreferencesKey("proxy_host")
        private val KEY_PROXY_PORT = intPreferencesKey("proxy_port")
        private val KEY_PROXY_USER = stringPreferencesKey("proxy_user")
        private val KEY_PROXY_PASS = stringPreferencesKey("proxy_pass")
    }
}

private val Context.configStore by preferencesDataStore(name = "server_config")
