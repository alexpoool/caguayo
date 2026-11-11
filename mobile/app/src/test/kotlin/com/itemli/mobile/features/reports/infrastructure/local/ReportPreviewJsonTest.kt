package com.itemli.mobile.features.reports.infrastructure.local

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Tests espejo de [ReportPreviewJson]: roundtrip de filas y totales genéricos.
 */
class ReportPreviewJsonTest {

    @Test
    fun `roundtrip de filas con tipos mixtos`() {
        val rows = listOf(
            mapOf(
                "codigo" to "P1",
                "cantidad" to 3L,
                "importe" to 12.5,
                "pagada" to true,
                "nota" to null,
            ),
            mapOf("codigo" to "P2"),
        )
        val decoded = ReportPreviewJson.decodeRows(ReportPreviewJson.encodeRows(rows))
        assertEquals(rows, decoded)
    }

    @Test
    fun `roundtrip de totales`() {
        val totals = mapOf(
            "total_items" to 10L,
            "total_cantidad" to 3.5,
            "gran_total_cobro" to 0L,
            "totales" to "no-anidado",
        )
        val decoded = ReportPreviewJson.decodeTotals(ReportPreviewJson.encodeTotals(totals))
        assertEquals(totals, decoded)
    }

    @Test
    fun `json inválido devuelve vacío sin lanzar`() {
        assertTrue(ReportPreviewJson.decodeRows("no-es-json").isEmpty())
        assertTrue(ReportPreviewJson.decodeTotals("{roto").isEmpty())
    }

    @Test
    fun `valores no primitivos se serializan como String`() {
        val rows = listOf(mapOf("objeto" to listOf(1, 2)))
        val decoded = ReportPreviewJson.decodeRows(ReportPreviewJson.encodeRows(rows))
        assertEquals(listOf(1, 2).toString(), decoded.single()["objeto"])
    }

    @Test
    fun `nulos se preservan`() {
        val decoded = ReportPreviewJson.decodeRows("""[{"a":null}]""")
        assertEquals(1, decoded.size)
        assertNull(decoded.single()["a"])
    }
}
