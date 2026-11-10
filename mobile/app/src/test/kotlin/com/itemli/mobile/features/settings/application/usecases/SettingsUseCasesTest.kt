package com.itemli.mobile.features.settings.application.usecases

import com.itemli.mobile.features.settings.domain.repositories.SettingsRepository
import com.itemli.mobile.shared.domain.AppConfig
import com.itemli.mobile.shared.domain.AppResult
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SettingsUseCasesTest {

    private class FakeRepository : SettingsRepository {
        private var saved: AppConfig.ServerConfig? = null
        override suspend fun load(): AppResult<AppConfig.ServerConfig> =
            AppResult.Success(saved ?: AppConfig.ServerConfig(baseUrl = "http://localhost:8000/api/v1/"))

        override suspend fun save(config: AppConfig.ServerConfig): AppResult<Unit> {
            saved = config
            return AppResult.Success(Unit)
        }
    }

    @Test
    fun `load devuelve la configuración por defecto`() = runTest {
        val useCase = LoadServerConfigUseCase(FakeRepository())
        val result = useCase()
        assertTrue(result is AppResult.Success)
        assertEquals("http://localhost:8000/api/v1/", (result as AppResult.Success).value.baseUrl)
    }

    @Test
    fun `save persiste el nuevo valor`() = runTest {
        val repo = FakeRepository()
        val useCase = SaveServerConfigUseCase(repo)
        val nuevo = AppConfig.ServerConfig(baseUrl = "http://10.0.0.15:8000/api/v1/")
        useCase(nuevo)
        assertEquals(nuevo.baseUrl, (repo.load() as AppResult.Success).value.baseUrl)
    }
}
