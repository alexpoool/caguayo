package com.itemli.mobile.shared.infrastructure

import com.itemli.mobile.shared.domain.AppConfig
import com.itemli.mobile.shared.domain.TokenStorage
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

/**
 * Único punto donde vive el token y el usuario logueado en la app.
 *
 * Reglas de seguridad:
 * - El token solo vive aquí y en [TokenStorage] (cifrado).
 * - [logout] borra el token y avisa por [sessionCleared] para limpiar
 *   cachés (Room, PDFs) y volver al Login.
 * - Nadie más debe exponer el token (ni logs, ni intents, ni backstack).
 */
class SessionManager(
    private val tokenStorage: TokenStorage,
    private val configProvider: suspend () -> AppConfig.ServerConfig,
) {
    var token: String? = null
        private set

    private val _sessionCleared = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionCleared: SharedFlow<Unit> = _sessionCleared

    private val onLogoutActions = mutableListOf<suspend () -> Unit>()

    /** Limpiezas extra al cerrar sesión (cachés de datos de negocio). */
    fun addOnLogoutListener(action: suspend () -> Unit) {
        onLogoutActions += action
    }

    suspend fun currentToken(): String? = token ?: tokenStorage.token()

    suspend fun login(newToken: String) {
        token = newToken
        tokenStorage.setToken(newToken)
    }

    suspend fun logout() {
        token = null
        tokenStorage.clear()
        onLogoutActions.forEach { action ->
            runCatching { action() }
        }
        _sessionCleared.tryEmit(Unit)
    }

    suspend fun config(): AppConfig.ServerConfig = configProvider()
}
