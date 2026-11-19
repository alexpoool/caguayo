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
    val isLoadingMore: Boolean = false,
    val hasMore: Boolean = false,
    val error: String? = null,
    /** true mientras se descarga el PDF. */
    val isPdfLoading: Boolean = false,
    /** content:// del PDF guardado, listo para abrir con ACTION_VIEW. */
    val pdfUri: String? = null,
    val pdfError: String? = null,
    val sharePdfUri: String? = null,
    val isShareLoading: Boolean = false,
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
    private var previewRequestVersion: Long = 0L

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
                        "id_municipio" -> api.municipalities().map {
                            ReportFilterOption(it.id_municipio.toString(), it.nombre)
                        }
                        "vigencia" -> listOf(
                            ReportFilterOption("activo", "Activo"),
                            ReportFilterOption("inactivo", "Inactivo"),
                        )
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
        val requestVersion = ++previewRequestVersion
        val definition = _state.value.definition ?: return
        val filters = _state.value.filters
        val missingFilter = definition.filters.firstOrNull { filter ->
            filter.required && filters[filter.id].isNullOrBlank()
        }
        if (missingFilter != null) {
            _state.value = _state.value.copy(error = "Falta un filtro obligatorio")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(
                isLoading = true,
                isLoadingMore = false,
                hasMore = false,
                preview = null,
                error = null,
            )
            when (val result = getPreviewUseCase(definition, filters, PAGE_SIZE, 0)) {
                is AppResult.Success -> {
                    if (requestVersion != previewRequestVersion) return@launch
                    val preview = result.value.copy(
                        rows = result.value.rows.filterNot { row ->
                            row.keys.any { key -> key == "id" || key.startsWith("id_") }
                        },
                    )
                    val total = preview.totalRows()
                    _state.value = _state.value.copy(
                        isLoading = false,
                        preview = preview,
                        hasMore = preview.rows.size < total,
                        error = null,
                    )
                }
                is AppResult.Failure -> {
                    if (requestVersion != previewRequestVersion) return@launch
                    _state.value = _state.value.copy(
                        isLoading = false,
                        preview = null,
                        error = result.error.message ?: "No se pudo cargar el reporte",
                    )
                }
            }
        }
    }

    /** Solicita la siguiente página cuando el usuario se acerca al final del scroll. */
    fun loadMore() {
        val current = _state.value
        val definition = current.definition ?: return
        val preview = current.preview ?: return
        if (current.isLoading || current.isLoadingMore || !current.hasMore) return
        val requestVersion = previewRequestVersion
        val offset = preview.rows.size
        val filters = current.filters
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoadingMore = true)
            when (val result = getPreviewUseCase(definition, filters, PAGE_SIZE, offset)) {
                is AppResult.Success -> {
                    if (requestVersion != previewRequestVersion) return@launch
                    val newRows = result.value.rows.filterNot { row ->
                        row.keys.any { key -> key == "id" || key.startsWith("id_") }
                    }
                    val combined = preview.rows + newRows
                    val updated = result.value.copy(rows = combined, fromCache = result.value.fromCache)
                    _state.value = _state.value.copy(
                        isLoadingMore = false,
                        preview = updated,
                        hasMore = newRows.isNotEmpty() && combined.size < updated.totalRows(),
                        error = null,
                    )
                }
                is AppResult.Failure -> {
                    if (requestVersion != previewRequestVersion) return@launch
                    _state.value = _state.value.copy(
                        isLoadingMore = false,
                        error = result.error.message ?: "No se pudieron cargar más registros",
                    )
                }
            }
        }
    }

    private fun com.itemli.mobile.features.reports.domain.entities.ReportPreview.totalRows(): Int {
        val value = totals["total_items"] ?: totals["total_brackets"] ?: rows.size
        return when (value) {
            is Number -> value.toInt()
            else -> value.toString().toIntOrNull() ?: rows.size
        }
    }

    private companion object {
        const val PAGE_SIZE = 10
    }

    /** Descarga el PDF con los filtros actuales y lo guarda en cacheDir/pdf. */
    fun downloadPdf() {
        val definition = _state.value.definition ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(isPdfLoading = true, pdfError = null)
            when (val result = downloadPdfUseCase(definition, _state.value.filters)) {
                is AppResult.Success -> {
                    val stamp = java.time.LocalDateTime.now()
                        .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"))
                    val fileName = "${definition.id}_${stamp}.pdf"
                    val uri = runCatching {
                        // Copia privada permanente: el Historial siempre podrá encontrarla.
                        val internal = pdfStorage.saveToHistory(result.value, fileName)
                        // Copia adicional en la carpeta externa configurada, si está disponible.
                        val dirUri = runCatching { pdfDirProvider() }.getOrNull()
                        dirUri?.takeIf { it.isNotBlank() }?.let {
                            pdfStorage.saveExternal(result.value, fileName, android.net.Uri.parse(it))
                        }
                        internal
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

    /** Genera el PDF completo con los filtros vigentes y prepara el archivo para compartir. */
    fun sharePdf() {
        val definition = _state.value.definition ?: return
        val filters = _state.value.filters.toMap()
        val missingFilter = definition.filters.firstOrNull { it.required && filters[it.id].isNullOrBlank() }
        if (missingFilter != null) {
            _state.value = _state.value.copy(pdfError = "Falta un filtro obligatorio")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(isShareLoading = true, pdfError = null, sharePdfUri = null)
            when (val result = downloadPdfUseCase(definition, filters)) {
                is AppResult.Success -> {
                    val stamp = java.time.LocalDateTime.now()
                        .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"))
                    val fileName = "${definition.id}_${stamp}.pdf"
                    val uri = runCatching {
                        val internal = pdfStorage.saveToHistory(result.value, fileName)
                        val dirUri = runCatching { pdfDirProvider() }.getOrNull()
                        dirUri?.takeIf { it.isNotBlank() }?.let {
                            pdfStorage.saveExternal(result.value, fileName, android.net.Uri.parse(it))
                        }
                        internal
                    }.getOrNull()
                    _state.value = _state.value.copy(
                        isShareLoading = false,
                        sharePdfUri = uri?.toString(),
                        pdfError = if (uri == null) "No se pudo guardar el PDF para compartir" else null,
                    )
                }
                is AppResult.Failure -> _state.value = _state.value.copy(
                    isShareLoading = false,
                    pdfError = result.error.message ?: "No se pudo generar el PDF",
                )
            }
        }
    }

    fun onPdfShared() { _state.value = _state.value.copy(sharePdfUri = null) }

    /** Llamar tras abrir el PDF para permitir descargarlo de nuevo. */
    fun onPdfOpened() {
        _state.value = _state.value.copy(pdfUri = null)
    }

    /** La descarga fue bien pero no se pudo abrir (p.ej. sin visor de PDF). */
    fun onPdfOpenFailed(message: String) {
        _state.value = _state.value.copy(pdfUri = null, pdfError = message)
    }
}
