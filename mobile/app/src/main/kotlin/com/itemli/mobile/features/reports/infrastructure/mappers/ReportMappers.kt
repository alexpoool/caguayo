package com.itemli.mobile.features.reports.infrastructure.mappers

import com.itemli.mobile.features.reports.domain.entities.ReportColumn
import com.itemli.mobile.features.reports.domain.entities.ReportColumnAlign
import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.domain.entities.ReportFilter
import com.itemli.mobile.features.reports.domain.entities.ReportFilterType
import com.itemli.mobile.features.reports.domain.entities.ReportModule
import com.itemli.mobile.features.reports.infrastructure.datasources.ClientesPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.DesempenoPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.ExistenciasPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.LiquidacionesPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.MincultPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.MovimientosDependenciaPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.MovimientosProductoPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.OnatPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.ProyectosPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.ProveedoresPreviewDto

/**
 * Mappers de los DTO de preview al modelo genérico de filas.
 * La UI no conoce el contrato específico del backend.
 */
fun ExistenciasPreviewDto.toRows(definition: ReportDefinition): List<Map<String, Any?>> =
    items.map { item -> mapOf(
        "codigo" to (item.codigo ?: ""),
        "nombre" to (item.nombre ?: ""),
        "cantidad" to (item.cantidad ?: 0),
        "dependencia" to (item.dependencia ?: ""),
    ) }

fun ProveedoresPreviewDto.toRows(definition: ReportDefinition): List<Map<String, Any?>> =
    items.map { item -> mapOf(
        "codigo" to (item.codigo ?: ""),
        "nombre" to (item.nombre ?: ""),
        "direccion" to (item.direccion ?: ""),
        "provincia" to (item.provincia ?: ""),
        "municipio" to (item.municipio ?: ""),
        "tipo_persona" to (item.tipo_persona ?: ""),
        "nit" to (item.nit ?: ""),
    ) }

fun MovimientosDependenciaPreviewDto.toRows(definition: ReportDefinition): List<Map<String, Any?>> =
    items.map { item -> mapOf(
        "codigo" to (item.codigo ?: ""),
        "nombre" to (item.nombre ?: ""),
        "saldo_inicial" to (item.saldo_inicial ?: 0),
        "recepcion" to (item.recepcion ?: 0),
        "compra" to (item.compra ?: 0),
        "venta" to (item.venta ?: 0),
        "merma" to (item.merma ?: 0),
        "donacion" to (item.donacion ?: 0),
        "devolucion" to (item.devolucion ?: 0),
        "ajustes" to (item.ajustes ?: 0),
        "saldo_final" to (item.saldo_final ?: 0),
    ) }

fun MovimientosProductoPreviewDto.toRows(definition: ReportDefinition): List<Map<String, Any?>> =
    items.map { item -> mapOf(
        "fecha" to (item.fecha ?: ""),
        "operacion" to (item.operacion ?: ""),
        "tipo" to (item.tipo ?: ""),
        "cantidad" to (item.cantidad ?: 0),
    ) }

fun ClientesPreviewDto.toRows(definition: ReportDefinition): List<Map<String, Any?>> =
    items.map { item -> mapOf(
        "nombre" to (item.nombre ?: ""),
        "reeup" to (item.reeup ?: ""),
        "nit" to (item.nit ?: ""),
        "direccion" to (item.direccion ?: ""),
        "provincia" to (item.provincia ?: ""),
        "municipio" to (item.municipio ?: ""),
    ) }

fun ProyectosPreviewDto.toRows(definition: ReportDefinition): List<Map<String, Any?>> =
    items.map { item -> mapOf(
        "codigo" to (item.codigo ?: ""),
        "nombre" to (item.nombre ?: ""),
        "contrato" to (item.contrato ?: ""),
        "cliente" to (item.cliente ?: ""),
        "fecha" to (item.fecha ?: ""),
        "valor" to (item.valor ?: 0),
        "moneda" to (item.moneda ?: ""),
    ) }

fun DesempenoPreviewDto.toRows(definition: ReportDefinition): List<Map<String, Any?>> =
    items.map { item -> mapOf(
        "persona_nombre" to (item.persona_nombre ?: ""),
        "codigo_proyecto" to (item.codigo_proyecto ?: ""),
        "nombre_etapa" to (item.nombre_etapa ?: ""),
        "etapa_valor" to (item.etapa_valor ?: 0),
        "cobro" to (item.cobro ?: 0),
        "por_cobrar" to (item.por_cobrar ?: 0),
        "moneda" to (item.moneda ?: ""),
        "fecha_pago" to (item.fecha_pago ?: ""),
        "pagada" to (item.pagada ?: false),
    ) }

fun OnatPreviewDto.toRows(definition: ReportDefinition): List<Map<String, Any?>> =
    items.map { item -> mapOf(
        "numero" to (item.numero ?: ""),
        "fecha_emision" to (item.fecha_emision ?: ""),
        "persona_nombre" to (item.persona_nombre ?: ""),
        "nit" to (item.nit ?: ""),
        "moneda" to (item.moneda ?: ""),
        "importe" to (item.importe ?: 0),
        "devengado" to (item.devengado ?: 0),
        "importe_agencia" to (item.importe_agencia ?: 0),
        "tributario_monto" to (item.tributario_monto ?: 0),
        "comision_bancaria" to (item.comision_bancaria ?: 0),
        "gasto_empresa" to (item.gasto_empresa ?: 0),
        "neto_pagar" to (item.neto_pagar ?: 0),
        "tipo_pago" to (item.tipo_pago ?: ""),
    ) }

fun MincultPreviewDto.toRows(definition: ReportDefinition): List<Map<String, Any?>> =
    items.map { item -> mapOf(
        "bracket" to (item.bracket ?: ""),
        "desde" to (item.desde ?: 0),
        "hasta" to (item.hasta ?: ""),
        "cantidad" to (item.cantidad ?: 0),
        "total_devengado" to (item.total_devengado ?: 0),
        "cantidad_artistas" to (item.cantidad_artistas ?: 0),
    ) }

fun LiquidacionesPreviewDto.toRows(definition: ReportDefinition): List<Map<String, Any?>> =
    items.map { item -> mapOf(
        "codigo" to (item.codigo ?: ""),
        "fecha_emision" to (item.fecha_emision ?: ""),
        "cliente_nombre" to (item.cliente_nombre ?: ""),
        "moneda" to (item.moneda ?: ""),
        "devengado" to (item.devengado ?: 0),
        "importe" to (item.importe ?: 0),
        "neto_pagar" to (item.neto_pagar ?: 0),
        "tipo_pago" to (item.tipo_pago ?: ""),
        "liquidada" to (item.liquidada ?: false),
    ) }

/**
 * Catálogo de reportes. Conforme a los endpoints reales del backend
 * (`backend/src/routes/reportes_router.py`).
 */
@Suppress("unused")
object ReportCatalog {
    val existencias = ReportDefinition(
        id = "existencias",
        title = "Existencias",
        description = "Stock de productos por dependencia",
        module = ReportModule.Inventory,
        filters = listOf(
            ReportFilter(id = "id_dependencia", label = "Dependencia", type = ReportFilterType.NUMBER),
        ),
        columns = listOf(
            ReportColumn("codigo", "Código"),
            ReportColumn("nombre", "Nombre"),
            ReportColumn("cantidad", "Cantidad", align = ReportColumnAlign.Right),
            ReportColumn("dependencia", "Dependencia"),
        ),
        previewPath = "reportes/existencias/preview",
        pdfPath = "reportes/existencias",
    )

    val proveedoresDependencia = ReportDefinition(
        id = "proveedores-dependencia",
        title = "Proveedores por dependencia",
        description = "Proveedores filtrados por dependencia y provincia",
        module = ReportModule.Buy,
        filters = listOf(
            ReportFilter(id = "id_dependencia", label = "Dependencia", type = ReportFilterType.NUMBER, required = false),
            ReportFilter(id = "id_provincia", label = "Provincia", type = ReportFilterType.NUMBER, required = false),
        ),
        columns = listOf(
            ReportColumn("codigo", "Código"),
            ReportColumn("nombre", "Nombre"),
            ReportColumn("direccion", "Dirección"),
            ReportColumn("provincia", "Provincia"),
            ReportColumn("municipio", "Municipio"),
            ReportColumn("tipo_persona", "Tipo"),
            ReportColumn("nit", "NIT"),
        ),
        previewPath = "reportes/proveedores-dependencia/preview",
        pdfPath = "reportes/proveedores-dependencia",
    )

    val movimientosDependencia = ReportDefinition(
        id = "movimientos-dependencia",
        title = "Movimientos por dependencia",
        description = "Movimientos de inventario agrupados por producto con saldo inicial y final",
        module = ReportModule.Inventory,
        filters = listOf(
            ReportFilter(id = "id_dependencia", label = "Dependencia", type = ReportFilterType.NUMBER),
            ReportFilter(id = "fecha_inicio", label = "Fecha inicio", type = ReportFilterType.DATE),
            ReportFilter(id = "fecha_fin", label = "Fecha fin", type = ReportFilterType.DATE),
        ),
        columns = listOf(
            ReportColumn("codigo", "Código"),
            ReportColumn("nombre", "Nombre"),
            ReportColumn("saldo_inicial", "Saldo inicial", align = ReportColumnAlign.Right),
            ReportColumn("recepcion", "Recepción", align = ReportColumnAlign.Right),
            ReportColumn("compra", "Compra", align = ReportColumnAlign.Right),
            ReportColumn("venta", "Venta", align = ReportColumnAlign.Right),
            ReportColumn("merma", "Merma", align = ReportColumnAlign.Right),
            ReportColumn("donacion", "Donación", align = ReportColumnAlign.Right),
            ReportColumn("devolucion", "Devolución", align = ReportColumnAlign.Right),
            ReportColumn("ajustes", "Ajustes", align = ReportColumnAlign.Right),
            ReportColumn("saldo_final", "Saldo final", align = ReportColumnAlign.Right),
        ),
        previewPath = "reportes/movimientos-dependencia/preview",
        pdfPath = "reportes/movimientos-dependencia",
    )

    val movimientosProducto = ReportDefinition(
        id = "movimientos-producto",
        title = "Movimientos por producto",
        description = "Movimientos confirmados de un producto en un rango de fechas",
        module = ReportModule.Inventory,
        filters = listOf(
            ReportFilter(id = "id_dependencia", label = "Dependencia", type = ReportFilterType.NUMBER),
            ReportFilter(id = "id_producto", label = "Producto", type = ReportFilterType.NUMBER),
            ReportFilter(id = "fecha_inicio", label = "Fecha inicio", type = ReportFilterType.DATE),
            ReportFilter(id = "fecha_fin", label = "Fecha fin", type = ReportFilterType.DATE),
        ),
        columns = listOf(
            ReportColumn("fecha", "Fecha"),
            ReportColumn("operacion", "Operación"),
            ReportColumn("tipo", "Tipo"),
            ReportColumn("cantidad", "Cantidad", align = ReportColumnAlign.Right),
        ),
        previewPath = "reportes/movimientos-producto/preview",
        pdfPath = "reportes/movimientos-producto",
    )

    val clientes = ReportDefinition(
        id = "clientes",
        title = "Registro de clientes",
        description = "Todos los clientes registrados con sus datos de contacto",
        module = ReportModule.Store,
        filters = emptyList(),
        columns = listOf(
            ReportColumn("nombre", "Nombre"),
            ReportColumn("reeup", "REEUP"),
            ReportColumn("nit", "NIT"),
            ReportColumn("direccion", "Dirección"),
            ReportColumn("provincia", "Provincia"),
            ReportColumn("municipio", "Municipio"),
        ),
        previewPath = "reportes/clientes/preview",
        pdfPath = "reportes/clientes",
    )

    val proyectos = ReportDefinition(
        id = "proyectos",
        title = "Registro de proyectos",
        description = "Solicitudes de servicio con cliente, contrato y moneda",
        module = ReportModule.Projects,
        filters = listOf(
            ReportFilter(id = "fecha_inicio", label = "Fecha inicio", type = ReportFilterType.DATE, required = false),
            ReportFilter(id = "fecha_fin", label = "Fecha fin", type = ReportFilterType.DATE, required = false),
        ),
        columns = listOf(
            ReportColumn("codigo", "Código"),
            ReportColumn("nombre", "Nombre"),
            ReportColumn("contrato", "Contrato"),
            ReportColumn("cliente", "Cliente"),
            ReportColumn("fecha", "Fecha"),
            ReportColumn("valor", "Valor", align = ReportColumnAlign.Right),
            ReportColumn("moneda", "Moneda"),
        ),
        previewPath = "reportes/proyectos/preview",
        pdfPath = "reportes/proyectos",
    )

    val desempeno = ReportDefinition(
        id = "desempeno",
        title = "Informe de desempeño",
        description = "Desempeño de creadores por proyecto y etapa",
        module = ReportModule.Projects,
        filters = listOf(
            ReportFilter(id = "fecha_inicio", label = "Fecha inicio", type = ReportFilterType.DATE, required = false),
            ReportFilter(id = "fecha_fin", label = "Fecha fin", type = ReportFilterType.DATE, required = false),
            ReportFilter(id = "id_persona", label = "Creador", type = ReportFilterType.NUMBER, required = false),
            ReportFilter(id = "estado", label = "Estado (pagada/pendiente)", type = ReportFilterType.TEXT, required = false),
        ),
        columns = listOf(
            ReportColumn("persona_nombre", "Persona"),
            ReportColumn("codigo_proyecto", "Proyecto"),
            ReportColumn("nombre_etapa", "Etapa"),
            ReportColumn("etapa_valor", "Valor etapa", align = ReportColumnAlign.Right),
            ReportColumn("cobro", "Cobro", align = ReportColumnAlign.Right),
            ReportColumn("por_cobrar", "Por cobrar", align = ReportColumnAlign.Right),
            ReportColumn("moneda", "Moneda"),
            ReportColumn("fecha_pago", "Fecha pago"),
            ReportColumn("pagada", "Pagada"),
        ),
        previewPath = "reportes/desempeno/preview",
        pdfPath = "reportes/desempeno",
    )

    val onat = ReportDefinition(
        id = "onat",
        title = "Ingresos y retenciones (ONAT)",
        description = "Ingresos y retenciones de artistas para la ONAT",
        module = ReportModule.Ministries,
        filters = listOf(
            ReportFilter(id = "fecha_inicio", label = "Fecha inicio", type = ReportFilterType.DATE, required = false),
            ReportFilter(id = "fecha_fin", label = "Fecha fin", type = ReportFilterType.DATE, required = false),
            ReportFilter(id = "id_moneda", label = "Moneda", type = ReportFilterType.NUMBER, required = false),
            ReportFilter(id = "id_persona", label = "Creador", type = ReportFilterType.NUMBER, required = false),
        ),
        columns = listOf(
            ReportColumn("numero", "Número"),
            ReportColumn("fecha_emision", "Fecha emisión"),
            ReportColumn("persona_nombre", "Persona"),
            ReportColumn("nit", "NIT"),
            ReportColumn("moneda", "Moneda"),
            ReportColumn("importe", "Importe", align = ReportColumnAlign.Right),
            ReportColumn("devengado", "Devengado", align = ReportColumnAlign.Right),
            ReportColumn("importe_agencia", "Importe agencia", align = ReportColumnAlign.Right),
            ReportColumn("tributario_monto", "Tributario", align = ReportColumnAlign.Right),
            ReportColumn("comision_bancaria", "Comisión bancaria", align = ReportColumnAlign.Right),
            ReportColumn("gasto_empresa", "Gasto empresa", align = ReportColumnAlign.Right),
            ReportColumn("neto_pagar", "Neto a pagar", align = ReportColumnAlign.Right),
            ReportColumn("tipo_pago", "Tipo de pago"),
        ),
        previewPath = "reportes/onat/preview",
        pdfPath = "reportes/onat",
    )

    val mincult = ReportDefinition(
        id = "mincult",
        title = "Retribución por escala (MINCULT)",
        description = "Distribución de artistas por escalas de ingresos",
        module = ReportModule.Ministries,
        filters = listOf(
            ReportFilter(id = "fecha_inicio", label = "Fecha inicio", type = ReportFilterType.DATE, required = false),
            ReportFilter(id = "fecha_fin", label = "Fecha fin", type = ReportFilterType.DATE, required = false),
        ),
        columns = listOf(
            ReportColumn("bracket", "Escala"),
            ReportColumn("desde", "Desde", align = ReportColumnAlign.Right),
            ReportColumn("hasta", "Hasta", align = ReportColumnAlign.Right),
            ReportColumn("cantidad", "Liquidaciones", align = ReportColumnAlign.Right),
            ReportColumn("total_devengado", "Devengado", align = ReportColumnAlign.Right),
            ReportColumn("cantidad_artistas", "Artistas", align = ReportColumnAlign.Right),
        ),
        previewPath = "reportes/mincult/preview",
        pdfPath = "reportes/mincult",
    )

    val liquidaciones = ReportDefinition(
        id = "liquidaciones",
        title = "Resumen de liquidaciones",
        description = "Liquidaciones con cliente, moneda y totales",
        module = ReportModule.Store,
        filters = listOf(
            ReportFilter(id = "fecha_inicio", label = "Fecha inicio", type = ReportFilterType.DATE, required = false),
            ReportFilter(id = "fecha_fin", label = "Fecha fin", type = ReportFilterType.DATE, required = false),
            ReportFilter(id = "id_cliente", label = "Cliente", type = ReportFilterType.NUMBER, required = false),
            ReportFilter(id = "id_moneda", label = "Moneda", type = ReportFilterType.NUMBER, required = false),
        ),
        columns = listOf(
            ReportColumn("codigo", "Código"),
            ReportColumn("fecha_emision", "Fecha emisión"),
            ReportColumn("cliente_nombre", "Cliente"),
            ReportColumn("moneda", "Moneda"),
            ReportColumn("devengado", "Devengado", align = ReportColumnAlign.Right),
            ReportColumn("importe", "Importe", align = ReportColumnAlign.Right),
            ReportColumn("neto_pagar", "Neto a pagar", align = ReportColumnAlign.Right),
            ReportColumn("tipo_pago", "Tipo de pago"),
            ReportColumn("liquidada", "Liquidada"),
        ),
        previewPath = "reportes/liquidaciones/preview",
        pdfPath = "reportes/liquidaciones",
    )

    /** Catálogo completo en el orden de presentación. */
    val all: List<ReportDefinition> = listOf(
        existencias,
        movimientosDependencia,
        movimientosProducto,
        proveedoresDependencia,
        clientes,
        liquidaciones,
        proyectos,
        desempeno,
        onat,
        mincult,
    )
}
