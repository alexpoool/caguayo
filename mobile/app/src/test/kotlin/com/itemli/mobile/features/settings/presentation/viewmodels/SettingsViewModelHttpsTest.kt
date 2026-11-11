package com.itemli.mobile.features.settings.presentation.viewmodels

import com.itemli.mobile.features.settings.application.usecases.LoadServerConfigUseCase
import com.itemli.mobile.features.settings.application.usecases.SaveServerConfigUseCase
import com.itemli.mobile.features.settings.domain.repositories.SettingsRepository
import com.itemli.mobile.shared.domain.AppConfig
import com.itemli.mobile.shared.domain.AppResult
import com.itemli.mobile.shared.infrastructure.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SettingsViewModelHttpsTest {

    private val dispatcher = StandardTestDispatcher()

    private class FakeSettingsRepository : SettingsRepository {
        override suspend fun load(): AppResult<AppConfig.ServerConfig> =
            AppResult.Success(AppConfig.ServerConfig())

        override suspend fun save(config: AppConfig.ServerConfig): AppResult<Unit> =
            AppResult.Success(Unit)
    }

    private val apiClient = ApiClient(
        configProvider = { AppConfig.ServerConfig() },
        tokenProvider = { null },
    )

    @Before
    fun setup() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun viewModel(requireHttps: Boolean) = SettingsViewModel(
        loadServerConfigUseCase = LoadServerConfigUseCase(FakeSettingsRepository()),
        saveServerConfigUseCase = SaveServerConfigUseCase(FakeSettingsRepository()),
        apiClient = apiClient,
        requireHttps = requireHttps,
    )

    @Test
    fun `en release rechaza URL http`() = runTest(dispatcher) {
        val vm = viewModel(requireHttps = true)
        vm.onBaseUrlChange("http://10.0.0.15:8000/api/v1/")
        vm.save()
        assertTrue(vm.state.value.message?.contains("HTTPS") == true)
    }

    @Test
    fun `en release acepta URL https`() = runTest(dispatcher) {
        val vm = viewModel(requireHttps = true)
        vm.onBaseUrlChange("https://10.0.0.15:8000/api/v1/")
        vm.save()
        assertTrue(vm.state.value.message == "Configuración guardada")
    }

    @Test
    fun `en debug acepta URL http`() = runTest(dispatcher) {
        val vm = viewModel(requireHttps = false)
        vm.onBaseUrlChange("http://10.0.0.15:8000/api/v1/")
        vm.save()
        assertTrue(vm.state.value.message == "Configuración guardada")
    }

    @Test
    fun `rechaza URL vacia`() = runTest(dispatcher) {
        val vm = viewModel(requireHttps = false)
        vm.onBaseUrlChange("")
        vm.save()
        assertTrue(vm.state.value.message?.contains("inválida") == true)
    }
}
