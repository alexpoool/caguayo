package com.itemli.mobile.features.reports.infrastructure.repositories

import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.domain.entities.ReportPreview
import com.itemli.mobile.features.reports.infrastructure.local.ReportPreviewDao
import com.itemli.mobile.features.reports.infrastructure.local.ReportPreviewEntity
import com.itemli.mobile.features.reports.infrastructure.local.ReportPreviewJson
import com.itemli.mobile.shared.domain.AppResult
import com.itemli.mobile.shared.infrastructure.ApiClient
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Tests espejo de [ReportsRepositoryImpl] centrados en la lógica offline:
 * sin red se devuelve el preview cacheado en Room marcado con `fromCache`.
 * El ApiClient se construye con un configProvider que lanza, simulando
 * que no hay conexión disponible.
 */
class ReportsRepositoryImplTest {

    private class FakeDao : ReportPreviewDao {
        val store = mutableMapOf<String, ReportPreviewEntity>()
        var shouldFail = false

        override suspend fun get(cacheKey: String): ReportPreviewEntity? {
            if (shouldFail) throw IOException("dao roto")
            return store[cacheKey]
        }

        override suspend fun upsert(entity: ReportPreviewEntity) {
            store[entity.cacheKey] = entity
        }

        override suspend fun deleteByReport(reportId: String) {
            store.keys.filter { key ->
                store[key]?.reportId == reportId
            }.forEach(store::remove)
        }

        override suspend fun clear() = store.clear()
    }

    private fun offlineRepository(dao: FakeDao): ReportsRepositoryImpl = ReportsRepositoryImpl(
        apiClient = ApiClient(
            configProvider = { throw IOException("sin red") },
            tokenProvider = { null },
        ),
        previewDao = dao,
    )

    @Test
    fun `catálogo expone todos los reportes`() = runTest {
        val repository = offlineRepository(FakeDao())
        val result = repository.catalog()
        assertTrue(result is AppResult.Success)
        assertEquals(10, (result as AppResult.Success).value.size)
    }

    @Test
    fun `sin red y sin caché devuelve Failure`() = runTest {
        val repository = offlineRepository(FakeDao())
        val result = repository.preview(ReportCatalog.existencias, mapOf("id_dependencia" to "1"))
        assertTrue(result is AppResult.Failure)
    }

    @Test
    fun `sin red devuelve la caché marcada con fromCache`() = runTest {
        val dao = FakeDao()
        val key = previewCacheKey(ReportCatalog.existencias, mapOf("id_dependencia" to "1"))
        dao.store[key] = ReportPreviewEntity(
            cacheKey = key,
            reportId = "existencias",
            rowsJson = ReportPreviewJson.encodeRows(listOf(mapOf("codigo" to "P1", "cantidad" to 2))),
            totalsJson = ReportPreviewJson.encodeTotals(mapOf("total_items" to 1)),
            createdAt = 0L,
        )
        val repository = offlineRepository(dao)
        val result = repository.preview(ReportCatalog.existencias, mapOf("id_dependencia" to "1"))
        assertTrue(result is AppResult.Success)
        val preview = (result as AppResult.Success).value
        assertTrue(preview.fromCache)
        assertEquals("P1", preview.rows.single()["codigo"])
        assertEquals(1L, preview.totals["total_items"])
    }

    @Test
    fun `si la caché de Room falla se propaga el error de red`() = runTest {
        val dao = FakeDao().apply { shouldFail = true }
        val repository = offlineRepository(dao)
        val result = repository.preview(ReportCatalog.existencias, mapOf("id_dependencia" to "1"))
        assertTrue(result is AppResult.Failure)
        assertTrue(result.error is IOException)
    }

    @Test
    fun `la clave de caché incluye el reporte y los filtros ordenados`() {
        val key = previewCacheKey(
            ReportCatalog.movimientosProducto,
            mapOf("fecha_fin" to "2026-01-31", "id_dependencia" to "1", "fecha_inicio" to "2026-01-01", "id_producto" to "7"),
        )
        assertEquals(
            "movimientos-producto?fecha_fin=2026-01-31?id_dependencia=1?fecha_inicio=2026-01-01?id_producto=7",
            key,
        )
    }

    @Test
    fun `pdf sin path devuelve Failure`() = runTest {
        val repository = offlineRepository(FakeDao())
        val definition = ReportCatalog.clientes.copy(pdfPath = "")
        val result = repository.pdf(definition, emptyMap())
        assertTrue(result is AppResult.Failure)
    }

    @Test
    fun `queries de pdf ignoran filtros vacíos`() {
        val queries = pdfQueries(mapOf("id_dependencia" to "1", "notas" to "", "estado" to " "))
        assertEquals(mapOf("id_dependencia" to "1"), queries)
    }

    @Test
    fun `filtro obligatorio lanza si falta y el opcional devuelve null`() {
        val filters = mapOf("id_dependencia" to "  ")
        var thrown: Throwable? = null
        try {
            filters.requiredFilter("id_dependencia")
        } catch (e: IOException) {
            thrown = e
        }
        assertTrue(thrown != null)
        assertNull(filters.optionalFilter("id_dependencia"))
    }

    @Test
    fun `reporte desconocido devuelve Failure`() = runTest {
        val repository = offlineRepository(FakeDao())
        val definition = ReportCatalog.existencias.copy(id = "desconocido")
        val result = repository.preview(definition, emptyMap())
        assertFalse(result is AppResult.Success)
    }
}
