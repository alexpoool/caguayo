package com.itemli.mobile.features.reports.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.itemli.mobile.features.reports.application.usecases.GetReportsCatalogUseCase
import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.shared.domain.AppResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Estado del catálogo de reportes. Es la Home adaptativa del módulo.
 */
data class ReportsListUiState(
    val definitions: List<ReportDefinition> = emptyList(),
    val isLoading: Boolean = false,
)

class ReportsCatalogViewModel(
    private val useCase: GetReportsCatalogUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(ReportsListUiState())
    val state: StateFlow<ReportsListUiState> = _state

    init { load() }

    private fun load() {
        _state.value = _state.value.copy(isLoading = true)
        viewModelScope.launch {
            when (val result = useCase()) {
                is AppResult.Success -> _state.value = _state.value.copy(
                    definitions = result.value,
                    isLoading = false,
                )
                is AppResult.Failure -> _state.value = _state.value.copy(isLoading = false)
            }
        }
    }
}
