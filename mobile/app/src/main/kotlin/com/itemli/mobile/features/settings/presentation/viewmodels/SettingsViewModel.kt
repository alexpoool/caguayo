package com.itemli.mobile.features.settings.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.itemli.mobile.BuildConfig
import com.itemli.mobile.features.settings.application.usecases.LoadServerConfigUseCase
import com.itemli.mobile.features.settings.application.usecases.SaveServerConfigUseCase
import com.itemli.mobile.features.settings.application.usecases.GetAppLockUseCase
import com.itemli.mobile.features.settings.application.usecases.SetAppLockUseCase
import com.itemli.mobile.shared.domain.AppConfig
import com.itemli.mobile.shared.domain.AppResult
import com.itemli.mobile.shared.infrastructure.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Estado de la pantalla de ajustes.
 */
data class SettingsUiState(
    val baseUrl: String = "",
    val proxyHost: String = "",
    val proxyPort: String = "",
    val proxyUser: String = "",
    val proxyPassword: String = "",
    val useProxy: Boolean = false,
    val isLoading: Boolean = false,
    val message: String? = null,
    val isTesting: Boolean = false,
    val appLockEnabled: Boolean = false,
    val appLockSupported: Boolean = false,
)

/**
 * ViewModel de la pantalla de ajustes. Guarda y prueba la configuración.
 */
class SettingsViewModel(
    private val loadServerConfigUseCase: LoadServerConfigUseCase,
    private val saveServerConfigUseCase: SaveServerConfigUseCase,
    private val apiClient: ApiClient,
    private val getAppLockUseCase: GetAppLockUseCase,
    private val setAppLockUseCase: SetAppLockUseCase,
    /** En release se exige HTTPS (network_security_config lo bloquea igual, esto da feedback claro). */
    private val requireHttps: Boolean = !BuildConfig.DEBUG,
    /** Disponibilidad de biometría, inyectado para poder testear sin Android. */
    private val biometricsSupported: Boolean = true,
) : ViewModel() {

    private val _state = MutableStateFlow(SettingsUiState())
    val state: StateFlow<SettingsUiState> = _state

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            when (val config = loadServerConfigUseCase()) {
                is AppResult.Success -> _state.value = _state.value.copy(
                    isLoading = false,
                    baseUrl = config.value.baseUrl,
                    proxyHost = config.value.proxy?.host ?: "",
                    proxyPort = config.value.proxy?.port?.toString() ?: "",
                    proxyUser = config.value.proxy?.user ?: "",
                    proxyPassword = config.value.proxy?.password ?: "",
                    useProxy = config.value.proxy != null,
                    appLockEnabled = getAppLockUseCase(),
                    appLockSupported = biometricsSupported,
                    message = null,
                )
                is AppResult.Failure -> _state.value = _state.value.copy(
                    isLoading = false,
                    message = config.error.message ?: "No se pudo leer la configuración",
                )
            }
        }
    }

    fun onBaseUrlChange(value: String) {
        _state.value = _state.value.copy(baseUrl = value, message = null)
    }

    fun onProxyChange(
        useProxy: Boolean,
        host: String,
        port: String,
        user: String,
        password: String,
    ) {
        _state.value = _state.value.copy(
            useProxy = useProxy,
            proxyHost = host,
            proxyPort = port,
            proxyUser = user,
            proxyPassword = password,
            message = null,
        )
    }

    /** Activa/desactiva el bloqueo biométrico. */
    fun onAppLockChange(enabled: Boolean) {
        viewModelScope.launch {
            if (enabled && !biometricsSupported) {
                _state.value = _state.value.copy(
                    message = "El dispositivo no tiene biometría disponible",
                    appLockEnabled = false,
                )
                return@launch
            }
            runCatching { setAppLockUseCase(enabled) }
                .onSuccess {
                    _state.value = _state.value.copy(
                        appLockEnabled = enabled,
                        message = if (enabled) "Bloqueo biométrico activado" else null,
                    )
                }
                .onFailure { error ->
                    _state.value = _state.value.copy(
                        appLockEnabled = false,
                        message = error.message ?: "No se pudo cambiar el bloqueo",
                    )
                }
        }
    }

    /** Guarda y pide al cliente HTTP invalidar la caché de configuraciones. */
    fun save(onSaved: () -> Unit = {}) {
        val port = _state.value.proxyPort.toIntOrNull() ?: 0
        if (_state.value.useProxy && (_state.value.proxyHost.isBlank() || port == 0)) {
            _state.value = _state.value.copy(message = "Proxy inválido: host y puerto son obligatorios")
            return
        }
        val url = _state.value.baseUrl.trim()
        if (url.isBlank() || !url.startsWith("http")) {
            _state.value = _state.value.copy(message = "URL base inválida")
            return
        }
        if (requireHttps && !url.startsWith("https://")) {
            _state.value = _state.value.copy(
                message = "En producción se exige HTTPS. Configura la URL del servidor con https://",
            )
            return
        }

        viewModelScope.launch {
            val proxy = if (_state.value.useProxy) {
                AppConfig.ProxyConfig(
                    host = _state.value.proxyHost.trim(),
                    port = port,
                    user = _state.value.proxyUser.takeIf { it.isNotBlank() },
                    password = _state.value.proxyPassword.takeIf { it.isNotBlank() },
                )
            } else {
                null
            }
            val result = saveServerConfigUseCase(
                AppConfig.ServerConfig(
                    baseUrl = url,
                    proxy = proxy,
                ),
            )
            when (result) {
                is AppResult.Success -> {
                    apiClient.reset()
                    _state.value = _state.value.copy(message = "Configuración guardada")
                    onSaved()
                }
                is AppResult.Failure -> _state.value = _state.value.copy(
                    message = result.error.message ?: "No se pudo guardar",
                )
            }
        }
    }

    /** Ping al backend con la configuración actual para feedback inmediato. */
    fun testConnection(onResult: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isTesting = true)
            val result = apiClient.ping()
            _state.value = _state.value.copy(isTesting = false)
            onResult(result.isSuccess, result.exceptionOrNull()?.message ?: "OK")
        }
    }
}
