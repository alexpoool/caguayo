package com.itemli.mobile.features.reports.application.usecases

import com.itemli.mobile.shared.domain.AppResult
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertTrue
import org.junit.Test

class ReportsUseCasesTest {

    @Test
    fun `catálogo expone al menos un reporte`() = runTest {
        val useCase = GetReportsCatalogUseCase()
        val result = useCase()
        assertTrue(result is AppResult.Success)
        assertTrue((result as AppResult.Success).value.isNotEmpty())
    }
}
