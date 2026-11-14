package com.itemli.mobile.features.reports.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.itemli.mobile.features.reports.application.usecases.DownloadReportPdfUseCase
import com.itemli.mobile.features.reports.application.usecases.GetReportPreviewUseCase
import com.itemli.mobile.features.reports.application.usecases.GetReportsCatalogUseCase
import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.domain.entities.ReportPreview
import com.itemli.mobile.features.reports.infrastructure.storage.ReportPdfStorage
import com.itemli.mobile.shared.domain.AppResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Estado de la pantalla de detalle de un reporte.
 */
data class ReportDetailUiState(
    val definition: ReportDefinition? = null,
    val filters: Map<String, String> = emptyMap(),
    val preview: ReportPreview? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    /** true mientras se descarga el PDF. */
    val isPdfLoading: Boolean = false,
    /** content:// del PDF guardado, listo para abrir con ACTION_VIEW. */
    val pdfUri: String? = null,
    val pdfError: String? = null,
)

/**
 * ViewModel de un reporte: carga su definición, pide el preview con los filtros
 * y gestiona la descarga del PDF.
 */
class ReportDetailViewModel(
    private val getPreviewUseCase: GetReportPreviewUseCase,
    private val getCatalogUseCase: GetReportsCatalogUseCase,
    private val downloadPdfUseCase: DownloadReportPdfUseCase,
    private val pdfStorage: ReportPdfStorage,
) : ViewModel() {

    private val _state = MutableStateFlow(ReportDetailUiState())
    val state: StateFlow<ReportDetailUiState> = _state

    /** Carga la definición del reporte a partir del catálogo. */
    fun loadById(reportId: String) {
        viewModelScope.launch {
            when (val catalog = getCatalogUseCase()) {
                is AppResult.Success -> {
                    val definition = catalog.value.firstOrNull { it.id == reportId }
                    if (definition == null) {
                        _state.value = _state.value.copy(
                            error = "Reporte no encontrado: $reportId",
                        )
                    } else {
                        _state.value = _state.value.copy(definition = definition, error = null)
                        refresh()
                    }
                }
                is AppResult.Failure -> _state.value = _state.value.copy(
                    error = "No se pudo cargar el catálogo: ${catalog.error.message ?: ""}",
                )
            }
        }
    }

    fun onFilterChange(filterId: String, value: String) {
        _state.value = _state.value.copy(filters = _state.value.filters + (filterId to value))
    }

    fun refresh() {
        val definition = _state.value.definition ?: return
        val missingFilter = definition.filters.firstOrNull { filter ->
            filter.required && _state.value.filters[filter.id].isNullOrBlank()
        }
        if (missingFilter != null) {
            _state.value = _state.value.copy(error = "Falta un filtro obligatorio")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            when (val result = getPreviewUseCase(definition, _state.value.filters)) {
                is AppResult.Success -> _state.value = _state.value.copy(
                    isLoading = false,
                    preview = result.value,
                    error = null,
                )
                is AppResult.Failure -> _state.value = _state.value.copy(
                    isLoading = false,
                    preview = null,
                    error = result.error.message ?: "No se pudo cargar el reporte",
                )
            }
        }
    }

    /** Descarga el PDF con los filtros actuales y lo guarda en cacheDir/pdf. */
    fun downloadPdf() {
        val definition = _state.value.definition ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(isPdfLoading = true, pdfError = null)
            when (val result = downloadPdfUseCase(definition, _state.value.filters)) {
                is AppResult.Success -> {
                    val uri = runCatching {
                        pdfStorage.openUri(pdfStorage.save(result.value, "${definition.id}.pdf"))
                    }.getOrNull()
                    _state.value = if (uri == null) {
                        _state.value.copy(isPdfLoading = false, pdfError = "No se pudo guardar el PDF")
                    } else {
                        _state.value.copy(isPdfLoading = false, pdfUri = uri.toString())
                    }
                }
                is AppResult.Failure -> _state.value = _state.value.copy(
                    isPdfLoading = false,
                    pdfError = result.error.message ?: "No se pudo descargar el PDF",
                )
            }
        }
    }

    /** Llamar tras abrir el PDF para permitir descargarlo de nuevo. */
    fun onPdfOpened() {
        _state.value = _state.value.copy(pdfUri = null)
    }

    /** La descarga fue bien pero no se pudo abrir (p.ej. sin visor de PDF). */
    fun onPdfOpenFailed(message: String) {
        _state.value = _state.value.copy(pdfUri = null, pdfError = message)
    }
}
