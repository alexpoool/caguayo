package com.itemli.mobile.features.reports.infrastructure.repositories

import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.domain.entities.ReportPreview
import com.itemli.mobile.features.reports.domain.repositories.ReportsRepository
import com.itemli.mobile.features.reports.infrastructure.datasources.ReportsApi
import com.itemli.mobile.features.reports.infrastructure.mappers.ReportCatalog
import com.itemli.mobile.features.reports.infrastructure.mappers.toRows
import com.itemli.mobile.shared.domain.AppResult
import com.itemli.mobile.shared.infrastructure.ApiClient
import java.io.IOException

/**
 * Repositorio real de reportes. Conecta los 10 endpoints de preview del
 * backend (`reportes_router.py`) y el endpoint de descarga de PDF.
 */
class ReportsRepositoryImpl(
    private val apiClient: ApiClient,
) : ReportsRepository {

    override suspend fun catalog(): AppResult<List<ReportDefinition>> =
        AppResult.Success(ReportCatalog.all)

    override suspend fun preview(
        definition: ReportDefinition,
        filters: Map<String, String>,
    ): AppResult<ReportPreview> {
        val result = runCatching {
            when (definition.id) {
                ReportCatalog.existencias.id -> {
                    val dto = api().existenciasPreview(
                        dependenciaId = filters.requiredFilter("id_dependencia"),
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
                    )
                    ReportPreview(
                        rows = dto.toRows(definition),
                        totals = mapOf(
                            "total_items" to (dto.total_items ?: 0),
                            "total_entradas" to (dto.total_entradas ?: 0.0),
                            "total_salidas" to (dto.total_salidas ?: 0.0),
                        ),
                    )
                }
                ReportCatalog.clientes.id -> {
                    val dto = api().clientesPreview()
                    ReportPreview(
                        rows = dto.toRows(definition),
                        totals = mapOf("total_items" to (dto.total_items ?: 0)),
                    )
                }
                ReportCatalog.proyectos.id -> {
                    val dto = api().proyectosPreview(
                        fechaInicio = filters.optionalFilter("fecha_inicio"),
                        fechaFin = filters.optionalFilter("fecha_fin"),
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
                ReportCatalog.liquidaciones.id -> {
                    val dto = api().liquidacionesPreview(
                        fechaInicio = filters.optionalFilter("fecha_inicio"),
                        fechaFin = filters.optionalFilter("fecha_fin"),
                        clienteId = filters.optionalFilter("id_cliente"),
                        monedaId = filters.optionalFilter("id_moneda"),
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
        }
        return if (result.isSuccess) {
            AppResult.Success(result.getOrThrow())
        } else {
            AppResult.Failure(result.exceptionOrNull() ?: IOException("preview"))
        }
    }

    override suspend fun pdf(
        definition: ReportDefinition,
        filters: Map<String, String>,
    ): AppResult<ByteArray> {
        val result = runCatching {
            if (definition.pdfPath.isBlank()) throw IOException("PDF no disponible")
            val response = api().downloadPdf(definition.pdfPath, pdfQueries(filters))
            response.bytes()
        }
        return if (result.isSuccess) {
            AppResult.Success(result.getOrThrow())
        } else {
            AppResult.Failure(result.exceptionOrNull() ?: IOException("pdf"))
        }
    }

    private fun api(): ReportsApi = apiClient.createService(ReportsApi::class.java)
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
