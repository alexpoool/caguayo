package com.itemli.mobile.features.auth.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.itemli.mobile.features.auth.application.usecases.LoginUseCase
import com.itemli.mobile.features.auth.application.usecases.SearchAliasUseCase
import com.itemli.mobile.features.auth.domain.entities.DependenciaRef
import com.itemli.mobile.shared.domain.AppResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Estado del formulario de login. UX en 3 pasos:
 * escribir alias → revisar dependencias encontradas → entrar.
 */
data class LoginUiState(
    val alias: String = "",
    val password: String = "",
    val bases: List<DependenciaRef> = emptyList(),
    val selectedBase: DependenciaRef? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
)

class LoginViewModel(
    private val searchAliasUseCase: SearchAliasUseCase,
    private val loginUseCase: LoginUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state

    fun onAliasChanged(alias: String) {
        _state.value = _state.value.copy(alias = alias, error = null)
    }

    fun onPasswordChanged(password: String) {
        _state.value = _state.value.copy(password = password, error = null)
    }

    fun onBaseSelected(base: DependenciaRef?) {
        _state.value = _state.value.copy(selectedBase = base)
    }

    /** Consulta al backend en qué bases de datos existe el alias. */
    fun searchBases() {
        viewModelScope.launch {
            val result = searchAliasUseCase(_state.value.alias.trim())
            _state.value = when (result) {
                is AppResult.Success -> _state.value.copy(bases = result.value)
                is AppResult.Failure -> _state.value.copy(
                    bases = emptyList(),
                    error = result.error.message ?: "Error al buscar el alias",
                )
            }
        }
    }

    fun submit(onLogged: () -> Unit) {
        val base = _state.value.selectedBase ?: run {
            _state.value = _state.value.copy(error = "Selecciona una dependencia")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            when (val result = loginUseCase(_state.value.alias.trim(), _state.value.password, base.baseDatos)) {
                is AppResult.Success -> onLogged()
                is AppResult.Failure -> _state.value = _state.value.copy(
                    isLoading = false,
                    error = result.error.message ?: "Error al iniciar sesión",
                )
            }
        }
    }
}
