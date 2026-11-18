package com.itemli.mobile.features.reports.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.itemli.mobile.features.reports.application.usecases.DownloadReportPdfUseCase
import com.itemli.mobile.features.reports.application.usecases.GetReportPreviewUseCase
import com.itemli.mobile.features.reports.application.usecases.GetReportsCatalogUseCase
import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.domain.entities.ReportPreview
import com.itemli.mobile.features.reports.infrastructure.storage.ReportPdfStorage
import com.itemli.mobile.features.reports.infrastructure.datasources.ReportFilterOptionsApi
import com.itemli.mobile.features.reports.infrastructure.datasources.ReportFilterOption
import com.itemli.mobile.shared.infrastructure.ApiClient
import com.itemli.mobile.shared.infrastructure.SessionManager
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
    val filterOptions: Map<String, List<ReportFilterOption>> = emptyMap(),
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
    private val apiClient: ApiClient,
    private val sessionManager: SessionManager,
    /** Carpeta externa elegida en Ajustes (tree URI) o null para la interna. */
    private val pdfDirProvider: suspend () -> String? = { null },
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
                        val today = java.time.LocalDate.now()
                        val defaults = buildMap {
                            definition.filters.forEach { filter ->
                                when (filter.id) {
                                    "fecha_inicio" -> put(filter.id, today.minusMonths(1).toString())
                                    "fecha_fin" -> put(filter.id, today.toString())
                                    "id_moneda" -> put(filter.id, "1")
                                    "id_producto", "id_cliente", "id_persona", "id_provincia", "id_municipio", "estado", "vigencia", "texto_busqueda" -> Unit
                                    else -> Unit
                                }
                            }
                        }.toMutableMap()
                        sessionManager.currentDependencyId()?.let { dependencyId ->
                            if (definition.filters.any { it.id == "id_dependencia" }) defaults["id_dependencia"] = dependencyId.toString()
                        }
                        _state.value = _state.value.copy(definition = definition, filters = defaults, error = null)
                        loadFilterOptions(definition)
                        refresh()
                    }
                }
                is AppResult.Failure -> _state.value = _state.value.copy(
                    error = "No se pudo cargar el catálogo: ${catalog.error.message ?: ""}",
                )
            }
        }
    }

    private fun loadFilterOptions(definition: ReportDefinition) {
        viewModelScope.launch {
            val api = runCatching { apiClient.createService(ReportFilterOptionsApi::class.java) }.getOrNull()
                ?: return@launch
            val options = mutableMapOf<String, List<ReportFilterOption>>()
            definition.filters.forEach { filter ->
                val values = runCatching {
                    when (filter.id) {
                        "id_dependencia" -> api.dependencies().map {
                            ReportFilterOption(it.id_dependencia.toString(), it.nombre)
                        }
                        "id_provincia" -> api.provinces().map {
                            ReportFilterOption(it.id_provincia.toString(), it.nombre)
                        }
                        "id_moneda" -> api.currencies().map {
                            ReportFilterOption(it.id_moneda.toString(), listOf(it.nombre, it.simbolo).filter(String::isNotBlank).joinToString(" · "))
                        }
                        "id_persona", "id_cliente" -> api.people().map {
                            ReportFilterOption(it.id_persona.toString(), it.nombre)
                        }
                        "id_producto" -> api.products().map {
                            ReportFilterOption(it.id_producto.toString(), listOf(it.codigo, it.nombre).filter(String::isNotBlank).joinToString(" · "))
                        }
                        "estado" -> listOf(
                            ReportFilterOption("pagada", "Pagada"),
                            ReportFilterOption("pendiente", "Pendiente"),
                        )
                        else -> emptyList()
                    }
                }.getOrDefault(emptyList())
                options[filter.id] = values
            }
            _state.value = _state.value.copy(filterOptions = options)
        }
    }

    fun onFilterChange(filterId: String, value: String) {
        _state.value = _state.value.copy(filters = if (value.isBlank()) _state.value.filters - filterId else _state.value.filters + (filterId to value))
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
                    preview = result.value.copy(rows = result.value.rows.filterNot { row -> row.keys.any { key -> key == "id" || key.startsWith("id_") } }.take(3)),
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
                    val fileName = "${definition.id}.pdf"
                    val uri = runCatching {
                        // Preferencia: la carpeta externa elegida en Ajustes.
                        // Si falla (permiso revocado, carpeta borrada), cae en
                        // la carpeta interna de la app.
                        val dirUri = runCatching { pdfDirProvider() }.getOrNull()
                        val external = dirUri
                            ?.takeIf { it.isNotBlank() }
                            ?.let { pdfStorage.saveExternal(result.value, fileName, android.net.Uri.parse(it)) }
                        external ?: pdfStorage.save(result.value, fileName)
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
