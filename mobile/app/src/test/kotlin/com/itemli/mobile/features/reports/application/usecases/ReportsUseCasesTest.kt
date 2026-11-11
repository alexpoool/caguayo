package com.itemli.mobile.features.reports.application.usecases

import com.itemli.mobile.features.reports.domain.entities.ReportDefinition
import com.itemli.mobile.features.reports.domain.entities.ReportPreview
import com.itemli.mobile.features.reports.domain.repositories.ReportsRepository
import com.itemli.mobile.shared.domain.AppResult
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReportsUseCasesTest {

    private class FakeRepository : ReportsRepository {
        override suspend fun catalog(): AppResult<List<ReportDefinition>> =
            AppResult.Success(emptyList())

        override suspend fun preview(
            definition: ReportDefinition,
            filters: Map<String, String>,
        ): AppResult<ReportPreview> = AppResult.Failure(NotImplementedError())

        override suspend fun pdf(
            definition: ReportDefinition,
            filters: Map<String, String>,
        ): AppResult<ByteArray> = AppResult.Failure(NotImplementedError())
    }

    @Test
    fun `catálogo delega en el repositorio`() = runTest {
        val useCase = GetReportsCatalogUseCase(FakeRepository())
        val result = useCase()
        assertTrue(result is AppResult.Success)
        assertEquals(0, (result as AppResult.Success).value.size)
    }

    @Test
    fun `descarga de PDF delega en el repositorio`() = runTest {
        val useCase = DownloadReportPdfUseCase(FakeRepository())
        val result = useCase(ReportDefinition(
            id = "existencias", title = "", description = "",
            module = com.itemli.mobile.features.reports.domain.entities.ReportModule.Inventory,
            filters = emptyList(), columns = emptyList(),
            previewPath = "", pdfPath = "",
        ), emptyMap())
        assertTrue(result is AppResult.Failure)
    }
}
