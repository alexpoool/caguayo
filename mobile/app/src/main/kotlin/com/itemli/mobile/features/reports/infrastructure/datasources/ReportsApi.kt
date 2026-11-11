package com.itemli.mobile.features.reports.infrastructure.datasources

import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Retrofit API de reportes. Expone los endpoints de preview del backend
 * (uno por reporte). Los PDF se descargan por [downloadPdf].
 */
interface ReportsApi {

    @GET("reportes/existencias/preview")
    suspend fun existenciasPreview(
        @Query("id_dependencia") dependenciaId: String,
    ): ExistenciasPreviewDto

    @GET("reportes/proveedores-dependencia/preview")
    suspend fun proveedoresPreview(
        @Query("id_dependencia") dependenciaId: String?,
        @Query("id_provincia") provinciaId: String?,
    ): ProveedoresPreviewDto

    @GET("reportes/movimientos-dependencia/preview")
    suspend fun movimientosDependenciaPreview(
        @Query("id_dependencia") dependenciaId: String,
        @Query("fecha_inicio") fechaInicio: String,
        @Query("fecha_fin") fechaFin: String,
    ): MovimientosDependenciaPreviewDto

    @GET("reportes/movimientos-producto/preview")
    suspend fun movimientosProductoPreview(
        @Query("id_dependencia") dependenciaId: String,
        @Query("id_producto") productoId: String,
        @Query("fecha_inicio") fechaInicio: String,
        @Query("fecha_fin") fechaFin: String,
    ): MovimientosProductoPreviewDto

    @GET("reportes/clientes/preview")
    suspend fun clientesPreview(): ClientesPreviewDto

    @GET("reportes/proyectos/preview")
    suspend fun proyectosPreview(
        @Query("fecha_inicio") fechaInicio: String?,
        @Query("fecha_fin") fechaFin: String?,
    ): ProyectosPreviewDto

    @GET("reportes/desempeno/preview")
    suspend fun desempenoPreview(
        @Query("fecha_inicio") fechaInicio: String?,
        @Query("fecha_fin") fechaFin: String?,
        @Query("id_persona") personaId: String?,
        @Query("estado") estado: String?,
    ): DesempenoPreviewDto

    @GET("reportes/onat/preview")
    suspend fun onatPreview(
        @Query("fecha_inicio") fechaInicio: String?,
        @Query("fecha_fin") fechaFin: String?,
        @Query("id_moneda") monedaId: String?,
        @Query("id_persona") personaId: String?,
    ): OnatPreviewDto

    @GET("reportes/mincult/preview")
    suspend fun mincultPreview(
        @Query("fecha_inicio") fechaInicio: String?,
        @Query("fecha_fin") fechaFin: String?,
    ): MincultPreviewDto

    @GET("reportes/liquidaciones/preview")
    suspend fun liquidacionesPreview(
        @Query("fecha_inicio") fechaInicio: String?,
        @Query("fecha_fin") fechaFin: String?,
        @Query("id_cliente") clienteId: String?,
        @Query("id_moneda") monedaId: String?,
    ): LiquidacionesPreviewDto

    /** Descarga el PDF de un reporte (`definition.pdfPath`). */
    @retrofit2.http.Streaming
    @GET
    suspend fun downloadPdf(
        @retrofit2.http.Url path: String,
        @retrofit2.http.QueryMap queries: Map<String, String>,
    ): okhttp3.ResponseBody
}

// ── Existencias ──────────────────────────────────────────────────────────────

@Serializable
data class ExistenciasPreviewDto(
    val items: List<ExistenciasRowDto> = emptyList(),
    val total_items: Int? = null,
    val total_cantidad: Double? = null,
)

@Serializable
data class ExistenciasRowDto(
    val codigo: String? = null,
    val nombre: String? = null,
    val cantidad: Double? = null,
    val dependencia: String? = null,
)

// ── Proveedores por dependencia ──────────────────────────────────────────────

@Serializable
data class ProveedoresPreviewDto(
    val items: List<ProveedoresRowDto> = emptyList(),
    val total_items: Int? = null,
)

@Serializable
data class ProveedoresRowDto(
    val codigo: String? = null,
    val nombre: String? = null,
    val direccion: String? = null,
    val provincia: String? = null,
    val municipio: String? = null,
    val tipo_persona: String? = null,
    val codigo_reup: String? = null,
    val nit: String? = null,
)

// ── Movimientos por dependencia ──────────────────────────────────────────────

@Serializable
data class MovimientosDependenciaPreviewDto(
    val items: List<MovimientoDependenciaRowDto> = emptyList(),
    val total_items: Int? = null,
    val total_saldo_inicial: Double? = null,
    val total_saldo_final: Double? = null,
    val total_entradas: Double? = null,
    val total_salidas: Double? = null,
)

@Serializable
data class MovimientoDependenciaRowDto(
    val codigo: String? = null,
    val nombre: String? = null,
    val saldo_inicial: Double? = null,
    val recepcion: Double? = null,
    val compra: Double? = null,
    val venta: Double? = null,
    val merma: Double? = null,
    val donacion: Double? = null,
    val devolucion: Double? = null,
    val ajustes: Double? = null,
    val saldo_final: Double? = null,
)

// ── Movimientos por producto ─────────────────────────────────────────────────

@Serializable
data class MovimientosProductoPreviewDto(
    val items: List<MovimientoProductoRowDto> = emptyList(),
    val total_items: Int? = null,
    val total_entradas: Double? = null,
    val total_salidas: Double? = null,
)

@Serializable
data class MovimientoProductoRowDto(
    val fecha: String? = null,
    val operacion: String? = null,
    val tipo: String? = null,
    val cantidad: Double? = null,
)

// ── Registro de clientes ─────────────────────────────────────────────────────

@Serializable
data class ClientesPreviewDto(
    val items: List<ClienteRowDto> = emptyList(),
    val total_items: Int? = null,
)

@Serializable
data class ClienteRowDto(
    val nombre: String? = null,
    val reeup: String? = null,
    val nit: String? = null,
    val direccion: String? = null,
    val provincia: String? = null,
    val municipio: String? = null,
)

// ── Registro de proyectos / contratos ────────────────────────────────────────

@Serializable
data class ProyectosPreviewDto(
    val items: List<ProyectoRowDto> = emptyList(),
    val total_items: Int? = null,
)

@Serializable
data class ProyectoRowDto(
    val codigo: String? = null,
    val nombre: String? = null,
    val contrato: String? = null,
    val cliente: String? = null,
    val fecha: String? = null,
    val valor: Double? = null,
    val moneda: String? = null,
)

// ── Informe de desempeño ─────────────────────────────────────────────────────

@Serializable
data class DesempenoPreviewDto(
    val items: List<DesempenoRowDto> = emptyList(),
    val total_items: Int? = null,
    val gran_total_cobro: Double? = null,
    val gran_total_valor: Double? = null,
)

@Serializable
data class DesempenoRowDto(
    val persona_nombre: String? = null,
    val persona_codigo: String? = null,
    val codigo_proyecto: String? = null,
    val proyecto_descripcion: String? = null,
    val nombre_etapa: String? = null,
    val numero_etapa: Int? = null,
    val etapa_valor: Double? = null,
    val cobro: Double? = null,
    val por_cobrar: Double? = null,
    val moneda: String? = null,
    val fecha_pago: String? = null,
    val pagada: Boolean? = null,
    val fecha_solicitud: String? = null,
)

// ── Ingresos y retenciones (ONAT) ────────────────────────────────────────────

@Serializable
data class OnatPreviewDto(
    val items: List<OnatRowDto> = emptyList(),
    val total_items: Int? = null,
    val totales: Map<String, Double> = emptyMap(),
)

@Serializable
data class OnatRowDto(
    val numero: String? = null,
    val fecha_emision: String? = null,
    val fecha_liquidacion: String? = null,
    val persona_nombre: String? = null,
    val nit: String? = null,
    val moneda: String? = null,
    val importe: Double? = null,
    val devengado: Double? = null,
    val importe_agencia: Double? = null,
    val tributario_monto: Double? = null,
    val comision_bancaria: Double? = null,
    val gasto_empresa: Double? = null,
    val neto_pagar: Double? = null,
    val tipo_pago: String? = null,
)

// ── Retribución por escala (MINCULT) ─────────────────────────────────────────

@Serializable
data class MincultPreviewDto(
    val items: List<MincultRowDto> = emptyList(),
    val total_brackets: Int? = null,
    val total_liquidaciones: Int? = null,
    val total_devengado_general: Double? = null,
)

@Serializable
data class MincultRowDto(
    val bracket: String? = null,
    val desde: Double? = null,
    val hasta: Double? = null,
    val cantidad: Int? = null,
    val total_devengado: Double? = null,
    val cantidad_artistas: Int? = null,
)

// ── Resumen de liquidaciones ─────────────────────────────────────────────────

@Serializable
data class LiquidacionesPreviewDto(
    val items: List<LiquidacionRowDto> = emptyList(),
    val total_items: Int? = null,
    val totales: Map<String, Double> = emptyMap(),
)

@Serializable
data class LiquidacionRowDto(
    val codigo: String? = null,
    val fecha_emision: String? = null,
    val fecha_liquidacion: String? = null,
    val cliente_nombre: String? = null,
    val moneda: String? = null,
    val devengado: Double? = null,
    val tributario: Double? = null,
    val importe: Double? = null,
    val neto_pagar: Double? = null,
    val tipo_pago: String? = null,
    val liquidada: Boolean? = null,
    val productos: List<LiquidacionProductoDto> = emptyList(),
)

@Serializable
data class LiquidacionProductoDto(
    val codigo: String? = null,
    val nombre: String? = null,
    val cantidad: Double? = null,
    val precio: Double? = null,
)
