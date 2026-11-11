package com.itemli.mobile.features.reports.infrastructure.mappers

import com.itemli.mobile.features.reports.domain.entities.ReportFilterType
import com.itemli.mobile.features.reports.domain.entities.ReportModule
import com.itemli.mobile.features.reports.infrastructure.datasources.ClientesPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.DesempenoPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.ExistenciasPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.ExistenciasRowDto
import com.itemli.mobile.features.reports.infrastructure.datasources.LiquidacionesPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.MincultPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.MovimientosDependenciaPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.MovimientosProductoPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.OnatPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.ProyectosPreviewDto
import com.itemli.mobile.features.reports.infrastructure.datasources.ProveedoresPreviewDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Tests espejo de [ReportMappers]: el catálogo cubre todos los endpoints de
 * preview del backend y cada DTO se mapea a filas genéricas.
 */
class ReportMappersTest {

    private val definition get() = ReportCatalog.existencias

    @Test
    fun `catálogo expone los 10 reportes del backend`() {
        val ids = ReportCatalog.all.map { it.id }
        assertEquals(
            listOf(
                "existencias",
                "movimientos-dependencia",
                "movimientos-producto",
                "proveedores-dependencia",
                "clientes",
                "liquidaciones",
                "proyectos",
                "desempeno",
                "onat",
                "mincult",
            ),
            ids,
        )
    }

    @Test
    fun `cada definición tiene previewPath y pdfPath consistentes`() {
        ReportCatalog.all.forEach { definition ->
            assertTrue("previewPath de ${definition.id}", definition.previewPath.endsWith("/preview"))
            assertEquals(
                "pdfPath de ${definition.id}",
                definition.previewPath.removeSuffix("/preview"),
                definition.pdfPath,
            )
        }
    }

    @Test
    fun `existencias mapea filas y valores nulos a vacíos`() {
        val dto = ExistenciasPreviewDto(
            items = listOf(
                ExistenciasRowDto(codigo = "P1", nombre = "Producto", cantidad = 3.0, dependencia = "Dep"),
                ExistenciasRowDto(),
            ),
            total_items = 2,
        )
        val rows = dto.toRows(ReportCatalog.existencias)
        assertEquals(2, rows.size)
        assertEquals("P1", rows[0]["codigo"])
        assertEquals(3.0, rows[0]["cantidad"])
        assertEquals("", rows[1]["codigo"])
        assertEquals(0, rows[1]["cantidad"])
    }

    @Test
    fun `movimientos-dependencia expone filtro obligatorio de fechas y dependencia`() {
        val filters = ReportCatalog.movimientosDependencia.filters
        assertEquals(listOf("id_dependencia", "fecha_inicio", "fecha_fin"), filters.map { it.id })
        assertTrue(filters.all { it.required })
        assertEquals(ReportFilterType.DATE, filters[1].type)
    }

    @Test
    fun `filtros opcionales van marcados como no requeridos`() {
        val optional = ReportCatalog.liquidaciones.filters.filter { !it.required }
        assertEquals(setOf("fecha_inicio", "fecha_fin", "id_cliente", "id_moneda"), optional.map { it.id }.toSet())
    }

    @Test
    fun `módulos del catálogo usan los valores del enum`() {
        assertEquals(ReportModule.Inventory, ReportCatalog.existencias.module)
        assertEquals(ReportModule.Buy, ReportCatalog.proveedoresDependencia.module)
        assertEquals(ReportModule.Store, ReportCatalog.clientes.module)
        assertEquals(ReportModule.Projects, ReportCatalog.proyectos.module)
        assertEquals(ReportModule.Ministries, ReportCatalog.onat.module)
        assertEquals(ReportModule.Ministries, ReportCatalog.mincult.module)
        assertEquals(ReportModule.Store, ReportCatalog.liquidaciones.module)
    }

    @Test
    fun `clientes y proyectos mapean filas con valores por defecto`() {
        val clientes = ClientesPreviewDto(items = listOf(com.itemli.mobile.features.reports.infrastructure.datasources.ClienteRowDto(nombre = "Ana")))
        assertEquals("Ana", clientes.toRows(ReportCatalog.clientes).single()["nombre"])
        assertEquals("", clientes.toRows(ReportCatalog.clientes).single()["provincia"])

        val proyectos = ProyectosPreviewDto(items = listOf(com.itemli.mobile.features.reports.infrastructure.datasources.ProyectoRowDto(codigo = "S1", valor = 10.5)))
        assertEquals(10.5, proyectos.toRows(ReportCatalog.proyectos).single()["valor"])
        assertEquals("", proyectos.toRows(ReportCatalog.proyectos).single()["moneda"])
    }

    @Test
    fun `desempeno onat mincult y liquidaciones mapean filas`() {
        val desempeno = DesempenoPreviewDto(
            items = listOf(
                com.itemli.mobile.features.reports.infrastructure.datasources.DesempenoRowDto(
                    persona_nombre = "Luis", cobro = 5.0, pagada = true,
                ),
            ),
            gran_total_cobro = 5.0,
        )
        assertEquals(true, desempeno.toRows(ReportCatalog.desempeno).single()["pagada"])

        val onat = OnatPreviewDto(items = listOf(com.itemli.mobile.features.reports.infrastructure.datasources.OnatRowDto(numero = "L-1", importe = 20.0)), totales = mapOf("total_importe" to 20.0))
        assertEquals(20.0, onat.toRows(ReportCatalog.onat).single()["importe"])

        val mincult = MincultPreviewDto(items = listOf(com.itemli.mobile.features.reports.infrastructure.datasources.MincultRowDto(bracket = "Hasta 100", cantidad = 3)))
        assertEquals(3, mincult.toRows(ReportCatalog.mincult).single()["cantidad"])

        val liquidaciones = LiquidacionesPreviewDto(
            items = listOf(com.itemli.mobile.features.reports.infrastructure.datasources.LiquidacionRowDto(codigo = "LQ1", neto_pagar = 7.0)),
            totales = mapOf("total_neto_pagar" to 7.0),
        )
        assertEquals("LQ1", liquidaciones.toRows(ReportCatalog.liquidaciones).single()["codigo"])
    }

    @Test
    fun `proveedores y movimientos mapean filas`() {
        val proveedores = ProveedoresPreviewDto(items = listOf(com.itemli.mobile.features.reports.infrastructure.datasources.ProveedoresRowDto(codigo = "PV1", nit = "NIT1")))
        assertEquals("NIT1", proveedores.toRows(ReportCatalog.proveedoresDependencia).single()["nit"])

        val movimientos = MovimientosDependenciaPreviewDto(
            items = listOf(com.itemli.mobile.features.reports.infrastructure.datasources.MovimientoDependenciaRowDto(codigo = "P1", saldo_final = 9.0)),
            total_salidas = 4.0,
        )
        assertEquals(9.0, movimientos.toRows(ReportCatalog.movimientosDependencia).single()["saldo_final"])

        val porProducto = MovimientosProductoPreviewDto(
            items = listOf(com.itemli.mobile.features.reports.infrastructure.datasources.MovimientoProductoRowDto(fecha = "2026-01-02", tipo = "Entrada", cantidad = 2.0)),
        )
        assertEquals("Entrada", porProducto.toRows(ReportCatalog.movimientosProducto).single()["tipo"])
    }
}
