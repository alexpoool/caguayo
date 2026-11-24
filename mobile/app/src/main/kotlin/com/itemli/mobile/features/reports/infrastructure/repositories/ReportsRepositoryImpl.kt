package com.itemli.mobile.features.reports.infrastructure.repositories

import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.domain.entities.ReportPreview
import com.itemli.mobile.features.reports.domain.repositories.ReportsRepository
import com.itemli.mobile.features.reports.infrastructure.datasources.ReportsApi
import com.itemli.mobile.features.reports.infrastructure.local.ReportPreviewDao
import com.itemli.mobile.features.reports.infrastructure.local.ReportPreviewEntity
import com.itemli.mobile.features.reports.infrastructure.local.ReportPreviewJson
import com.itemli.mobile.features.reports.infrastructure.mappers.ReportCatalog
import com.itemli.mobile.features.reports.infrastructure.mappers.toRows
import com.itemli.mobile.shared.domain.AppResult
import com.itemli.mobile.shared.infrastructure.ApiClient
import com.itemli.mobile.shared.infrastructure.SessionManager
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.IOException

/**
 * Repositorio real de reportes. Conecta los 10 endpoints de preview del
 * backend (`reportes_router.py`) y el endpoint de descarga de PDF.
 * Los previews se cachean en Room: sin red se devuelve la última copia.
 */
class ReportsRepositoryImpl(
    private val apiClient: ApiClient,
    private val previewDao: ReportPreviewDao,
    private val sessionManager: SessionManager? = null,
    private val now: () -> Long = System::currentTimeMillis,
    private val refreshScope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
) : ReportsRepository {

    private val refreshLock = Any()
    private val refreshJobs = mutableMapOf<String, Job>()

    init {
        sessionManager?.addOnLogoutListener {
            synchronized(refreshLock) {
                refreshJobs.values.forEach { it.cancel() }
                refreshJobs.clear()
            }
            previewDao.clear()
        }
    }

    override suspend fun catalog(): AppResult<List<ReportDefinition>> =
        AppResult.Success(ReportCatalog.all)

    override suspend fun preview(
        definition: ReportDefinition,
        filters: Map<String, String>,
        limit: Int,
        offset: Int,
    ): AppResult<ReportPreview> {
        val sessionKey = sessionScope()
        val cacheKey = scopedPreviewCacheKey(sessionKey, definition, filters, limit, offset)
        val cachedEntity = runCatching { previewDao.get(cacheKey) }.getOrNull()
        val cached = cachedEntity?.let(::fromEntity)
        val isFresh = cachedEntity != null && now() - cachedEntity.createdAt in 0..PREVIEW_CACHE_TTL_MS

        // La caché fresca se sirve sin red. Si está caducada, se muestra
        // inmediatamente y se actualiza en segundo plano (stale-while-revalidate).
        if (cached != null) {
            if (!isFresh) refreshPreviewInBackground(
                cacheKey = cacheKey,
                sessionKey = sessionKey,
                definition = definition,
                filters = filters,
                limit = limit,
                offset = offset,
            )
            return AppResult.Success(cached.copy(fromCache = true))
        }

        // Solo la primera carga necesita esperar al servidor. Si falla no hay
        // una copia local que mostrar.
        return runCatching { fetchPreview(definition, filters, limit, offset) }
            .fold(
                onSuccess = { preview ->
                    runCatching { saveToCache(cacheKey, definition.id, preview) }
                    AppResult.Success(preview.copy(fromCache = false))
                },
                onFailure = { AppResult.Failure(it) },
            )
    }

    override suspend fun pdf(
        definition: ReportDefinition,
        filters: Map<String, String>,
    ): AppResult<ByteArray> {
        val result = runCatching {
            if (definition.pdfPath.isBlank()) throw IOException("PDF no disponible")
            val response = api().downloadPdf(definition.pdfPath, pdfQueries(filters))
            // El cuerpo de un ResponseBody se lee de red bajo demanda: si se
            // lee en el hilo principal (el ViewModel corre en Main) lanza
            // NetworkOnMainThreadException y el cuerpo queda filtrado.
            withContext(Dispatchers.IO) { response.use { it.bytes() } }
        }
        return if (result.isSuccess) {
            AppResult.Success(result.getOrThrow())
        } else {
            AppResult.Failure(result.exceptionOrNull() ?: IOException("pdf"))
        }
    }

    private suspend fun fetchPreview(
        definition: ReportDefinition,
        filters: Map<String, String>,
        limit: Int,
        offset: Int,
    ): ReportPreview = when (definition.id) {
        ReportCatalog.existencias.id -> {
            val dto = api().existenciasPreview(
                dependenciaId = filters.requiredFilter("id_dependencia"),
                limit = limit,
                offset = offset
            )
            ReportPreview(
                rows = dto.toRows(definition),
                totals = mapOf(
                    "total_items" to (dto.total_items ?: 0),
                    "total_cantidad" to (dto.total_cantidad ?: 0.0),
                ),
            )
        }
        ReportCatalog.proveedoresDependencia.id -> {
            val dto = api().proveedoresPreview(
                dependenciaId = filters.optionalFilter("id_dependencia"),
                provinciaId = filters.optionalFilter("id_provincia"),
                limit = limit,
                offset = offset
            )
            ReportPreview(
                rows = dto.toRows(definition),
                totals = mapOf("total_items" to (dto.total_items ?: 0)),
            )
        }
        ReportCatalog.movimientosDependencia.id -> {
            val dto = api().movimientosDependenciaPreview(
                dependenciaId = filters.requiredFilter("id_dependencia"),
                fechaInicio = filters.requiredFilter("fecha_inicio"),
                fechaFin = filters.requiredFilter("fecha_fin"),
                limit = limit,
                offset = offset
            )
            ReportPreview(
                rows = dto.toRows(definition),
                totals = mapOf(
                    "total_items" to (dto.total_items ?: 0),
                    "total_saldo_inicial" to (dto.total_saldo_inicial ?: 0.0),
                    "total_saldo_final" to (dto.total_saldo_final ?: 0.0),
                    "total_entradas" to (dto.total_entradas ?: 0.0),
                    "total_salidas" to (dto.total_salidas ?: 0.0),
                ),
            )
        }
        ReportCatalog.movimientosProducto.id -> {
            val dto = api().movimientosProductoPreview(
                dependenciaId = filters.requiredFilter("id_dependencia"),
                productoId = filters.requiredFilter("id_producto"),
                fechaInicio = filters.requiredFilter("fecha_inicio"),
                fechaFin = filters.requiredFilter("fecha_fin"),
                limit = limit,
                offset = offset
            )
            ReportPreview(
                rows = dto.toRows(definition),
                totals = mapOf("total_items" to (dto.total_items ?: 0)),
            )
        }
        ReportCatalog.clientes.id -> {
            val dto = api().clientesPreview(limit = limit, offset = offset)
            ReportPreview(
                rows = dto.toRows(definition),
                totals = mapOf("total_items" to (dto.total_items ?: 0)),
            )
        }
        ReportCatalog.proyectos.id -> {
            val dto = api().proyectosPreview(
                fechaInicio = filters.optionalFilter("fecha_inicio"),
                fechaFin = filters.optionalFilter("fecha_fin"),
                limit = limit,
                offset = offset
            )
            ReportPreview(
                rows = dto.toRows(definition),
                totals = mapOf("total_items" to (dto.total_items ?: 0)),
            )
        }
        ReportCatalog.desempeno.id -> {
            val dto = api().desempenoPreview(
                fechaInicio = filters.optionalFilter("fecha_inicio"),
                fechaFin = filters.optionalFilter("fecha_fin"),
                personaId = filters.optionalFilter("id_persona"),
                estado = filters.optionalFilter("estado"),
                limit = limit,
                offset = offset
            )
            ReportPreview(
                rows = dto.toRows(definition),
                totals = mapOf(
                    "total_items" to (dto.total_items ?: 0),
                    "gran_total_cobro" to (dto.gran_total_cobro ?: 0.0),
                    "gran_total_valor" to (dto.gran_total_valor ?: 0.0),
                ),
            )
        }
        ReportCatalog.onat.id -> {
            val dto = api().onatPreview(
                fechaInicio = filters.optionalFilter("fecha_inicio"),
                fechaFin = filters.optionalFilter("fecha_fin"),
                monedaId = filters.optionalFilter("id_moneda"),
                personaId = filters.optionalFilter("id_persona"),
                limit = limit,
                offset = offset
            )
            ReportPreview(
                rows = dto.toRows(definition),
                totals = mapOf(
                    "total_items" to (dto.total_items ?: 0),
                    "totales" to dto.totales,
                ),
            )
        }
        ReportCatalog.mincult.id -> {
            val dto = api().mincultPreview(
                fechaInicio = filters.optionalFilter("fecha_inicio"),
                fechaFin = filters.optionalFilter("fecha_fin"),
                limit = limit,
                offset = offset
            )
            ReportPreview(
                rows = dto.toRows(definition),
                totals = mapOf(
                    "total_brackets" to (dto.total_brackets ?: 0),
                    "total_liquidaciones" to (dto.total_liquidaciones ?: 0),
                    "total_devengado_general" to (dto.total_devengado_general ?: 0.0),
                ),
            )
        }
        ReportCatalog.realizadores.id -> {
            val dto = api().realizadoresPreview(
                provinciaId = filters.optionalFilter("id_provincia"),
                municipioId = filters.optionalFilter("id_municipio"),
                vigencia = filters.optionalFilter("vigencia"),
                textoBusqueda = filters.optionalFilter("texto_busqueda"),
                limit = limit,
                offset = offset
            )
            ReportPreview(
                rows = dto.toRows(definition),
                totals = mapOf("total_items" to (dto.total_items ?: 0)),
            )
        }
        ReportCatalog.liquidaciones.id -> {
            val dto = api().liquidacionesPreview(
                fechaInicio = filters.optionalFilter("fecha_inicio"),
                fechaFin = filters.optionalFilter("fecha_fin"),
                clienteId = filters.optionalFilter("id_cliente"),
                monedaId = filters.optionalFilter("id_moneda"),
                limit = limit,
                offset = offset
            )
            ReportPreview(
                rows = dto.toRows(definition),
                totals = mapOf(
                    "total_items" to (dto.total_items ?: 0),
                    "totales" to dto.totales,
                ),
            )
        }
        else -> throw NotImplementedError("Reporte ${definition.id} sin endpoint conectado")
    }

    private suspend fun sessionScope(): String {
        val alias = sessionManager?.currentAlias()?.trim()?.lowercase().orEmpty()
        val dependencyId = sessionManager?.currentDependencyId()?.toString().orEmpty()
        return "${alias.ifBlank { "anonymous" }}#$dependencyId"
    }

    private fun refreshPreviewInBackground(
        cacheKey: String,
        sessionKey: String,
        definition: ReportDefinition,
        filters: Map<String, String>,
        limit: Int,
        offset: Int,
    ) {
        synchronized(refreshLock) {
            if (refreshJobs[cacheKey]?.isActive == true) return
            val job = refreshScope.launch(start = kotlinx.coroutines.CoroutineStart.LAZY) {
                try {
                    val fresh = fetchPreview(definition, filters, limit, offset)
                    // No permitir que una petición iniciada por una sesión
                    // repueble Room después de cerrar sesión o cambiar de usuario.
                    if (sessionScope() == sessionKey) {
                        saveToCache(cacheKey, definition.id, fresh)
                    }
                } catch (cancelled: CancellationException) {
                    throw cancelled
                } catch (_: Exception) {
                    // La copia caducada sigue disponible si el servidor falla.
                } finally {
                    synchronized(refreshLock) { refreshJobs.remove(cacheKey) }
                }
            }
            refreshJobs[cacheKey] = job
            job.start()
        }
    }

    private suspend fun saveToCache(cacheKey: String, reportId: String, preview: ReportPreview) {
        previewDao.upsert(
            ReportPreviewEntity(
                cacheKey = cacheKey,
                reportId = reportId,
                rowsJson = ReportPreviewJson.encodeRows(preview.rows),
                totalsJson = ReportPreviewJson.encodeTotals(preview.totals),
                createdAt = now(),
            ),
        )
    }

    private fun fromEntity(entity: ReportPreviewEntity): ReportPreview = ReportPreview(
        rows = ReportPreviewJson.decodeRows(entity.rowsJson),
        totals = ReportPreviewJson.decodeTotals(entity.totalsJson),
    )

    private suspend fun api(): ReportsApi = apiClient.createService(ReportsApi::class.java)
}

/** TTL de la caché local de previews: cinco minutos. */
internal const val PREVIEW_CACHE_TTL_MS = 5 * 60 * 1000L

internal fun scopedPreviewCacheKey(
    sessionScope: String,
    definition: ReportDefinition,
    filters: Map<String, String>,
    limit: Int,
    offset: Int,
): String = sessionScope + "|" + previewCacheKey(definition, filters) + "#" + limit + ":" + offset

/** Clave de caché: id del reporte + filtros ordenados. */
internal fun previewCacheKey(definition: ReportDefinition, filters: Map<String, String>): String =
    buildString {
        append(definition.id)
        filters.toSortedMap().forEach { (key, value) ->
            if (value.isNotBlank()) append('?').append(key).append('=').append(value)
        }
    }

/** Valor obligatorio; lanza si falta para no pedir al backend sin datos. */
internal fun Map<String, String>.requiredFilter(key: String): String =
    this[key]?.takeIf { it.isNotBlank() }
        ?: throw IOException("Falta el filtro obligatorio: $key")

/** Valor opcional; null si está vacío (Retrofit omite el query param). */
internal fun Map<String, String>.optionalFilter(key: String): String? =
    this[key]?.takeIf { it.isNotBlank() }

/**
 * Queries del PDF: los filtros con valor + el backend se encarga del resto
 * (aprobado_por/notas usan su default vacío).
 */
internal fun pdfQueries(filters: Map<String, String>): Map<String, String> =
    filters.filterValues { it.isNotBlank() }
