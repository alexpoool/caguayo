package com.itemli.mobile.shared.infrastructure

import com.itemli.mobile.shared.domain.AppConfig
import com.itemli.mobile.shared.domain.TokenStorage

/**
 * Único punto donde vive el token y el usuario logueado en la app.
 * La sesión se pierde si se reinicia el proceso (esperado).
 */
class SessionManager(
    private val tokenStorage: TokenStorage,
    private val configProvider: () -> AppConfig.ServerConfig,
) {
    var token: String? = null
        private set

    suspend fun currentToken(): String? = token ?: tokenStorage.token()

    suspend fun login(newToken: String) {
        token = newToken
        tokenStorage.setToken(newToken)
    }

    suspend fun logout() {
        token = null
        tokenStorage.clear()
    }

    suspend fun config(): AppConfig.ServerConfig = configProvider()
}
