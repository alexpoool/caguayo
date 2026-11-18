package com.itemli.mobile.features.auth.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.itemli.mobile.features.auth.application.usecases.ListDatabaseConnectionsUseCase
import com.itemli.mobile.features.auth.application.usecases.TestDatabaseConnectionUseCase
import com.itemli.mobile.features.auth.application.usecases.LoginUseCase
import com.itemli.mobile.features.auth.domain.entities.DependenciaRef
import com.itemli.mobile.shared.domain.AppResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

enum class DatabaseConnectionStatus { IDLE, TESTING, CONNECTED, ERROR }

data class LoginUiState(
    val alias: String = "",
    val password: String = "",
    val bases: List<DependenciaRef> = emptyList(),
    val selectedBase: DependenciaRef? = null,
    val connectionStatus: DatabaseConnectionStatus = DatabaseConnectionStatus.IDLE,
    val isLoadingBases: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
)

class LoginViewModel(
    private val listDatabaseConnections: ListDatabaseConnectionsUseCase,
    private val testDatabaseConnection: TestDatabaseConnectionUseCase,
    private val loginUseCase: LoginUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state

    init { loadDatabases() }

    fun loadDatabases() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoadingBases = true, error = null)
            when (val result = listDatabaseConnections()) {
                is AppResult.Success -> _state.value = _state.value.copy(
                    isLoadingBases = false,
                    bases = result.value,
                    selectedBase = null,
                    connectionStatus = DatabaseConnectionStatus.IDLE,
                    error = if (result.value.isEmpty()) "No hay bases de datos disponibles en este servidor" else null,
                )
                is AppResult.Failure -> _state.value = _state.value.copy(
                    isLoadingBases = false,
                    error = "No se pudieron cargar las bases de datos. Comprueba la conexión e inténtalo de nuevo.",
                )
            }
        }
    }

    fun onAliasChanged(alias: String) {
        _state.value = _state.value.copy(alias = alias, error = null)
    }

    fun onPasswordChanged(password: String) {
        _state.value = _state.value.copy(password = password, error = null)
    }

    fun onBaseSelected(base: DependenciaRef?) {
        _state.value = _state.value.copy(
            selectedBase = base,
            connectionStatus = if (base == null) DatabaseConnectionStatus.IDLE else DatabaseConnectionStatus.TESTING,
            error = null,
        )
        if (base != null) {
            viewModelScope.launch {
                when (val result = testDatabaseConnection(base)) {
                    is AppResult.Success -> _state.value = _state.value.copy(
                        connectionStatus = if (result.value) DatabaseConnectionStatus.CONNECTED else DatabaseConnectionStatus.ERROR,
                        error = if (result.value) null else "No se pudo conectar a la base de datos",
                    )
                    is AppResult.Failure -> _state.value = _state.value.copy(
                        connectionStatus = DatabaseConnectionStatus.ERROR,
                        error = "No se pudo comprobar la base de datos. Inténtalo de nuevo.",
                    )
                }
            }
        }
    }

    fun submit(onLogged: () -> Unit) {
        val current = _state.value
        val base = current.selectedBase
        if (base == null) {
            _state.value = current.copy(error = "Selecciona una base de datos")
            return
        }
        if (current.connectionStatus != DatabaseConnectionStatus.CONNECTED) {
            _state.value = current.copy(error = "Comprueba la conexión con la base de datos antes de continuar")
            return
        }
        if (current.alias.isBlank() || current.password.isBlank()) {
            _state.value = current.copy(error = "Introduce tu alias y contraseña")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            when (val result = loginUseCase(current.alias.trim(), current.password, base.baseDatos)) {
                is AppResult.Success -> onLogged()
                is AppResult.Failure -> _state.value = _state.value.copy(
                    isLoading = false,
                    error = "No se pudo iniciar sesión. Verifica tus datos e inténtalo de nuevo.",
                )
            }
        }
    }
}
