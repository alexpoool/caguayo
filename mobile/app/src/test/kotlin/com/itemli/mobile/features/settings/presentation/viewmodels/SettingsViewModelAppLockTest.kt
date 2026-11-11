package com.itemli.mobile.features.settings.presentation.viewmodels

import com.itemli.mobile.features.settings.application.usecases.GetAppLockUseCase
import com.itemli.mobile.features.settings.application.usecases.LoadServerConfigUseCase
import com.itemli.mobile.features.settings.application.usecases.SaveServerConfigUseCase
import com.itemli.mobile.features.settings.application.usecases.SetAppLockUseCase
import com.itemli.mobile.features.settings.domain.repositories.AppLockRepository
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
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SettingsViewModelAppLockTest {

    private val dispatcher = StandardTestDispatcher()

    private class FakeSettingsRepository : SettingsRepository {
        override suspend fun load(): AppResult<AppConfig.ServerConfig> =
            AppResult.Success(AppConfig.ServerConfig())

        override suspend fun save(config: AppConfig.ServerConfig): AppResult<Unit> =
            AppResult.Success(Unit)
    }

    private class FakeAppLockRepository : AppLockRepository {
        var enabled = false
        override suspend fun isEnabled(): Boolean = enabled
        override suspend fun setEnabled(enabled: Boolean) {
            this.enabled = enabled
        }
    }

    private val apiClient = ApiClient(
        configProvider = { AppConfig.ServerConfig() },
        tokenProvider = { null },
    )
    private val appLockRepo = FakeAppLockRepository()

    private fun viewModel(biometrics: Boolean) = SettingsViewModel(
        loadServerConfigUseCase = LoadServerConfigUseCase(FakeSettingsRepository()),
        saveServerConfigUseCase = SaveServerConfigUseCase(FakeSettingsRepository()),
        apiClient = apiClient,
        getAppLockUseCase = GetAppLockUseCase(appLockRepo),
        setAppLockUseCase = SetAppLockUseCase(appLockRepo),
        requireHttps = false,
        biometricsSupported = biometrics,
    )

    @Before
    fun setup() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `activa el bloqueo si hay biometria`() = runTest(dispatcher) {
        val vm = viewModel(biometrics = true)
        vm.onAppLockChange(true)
        assertTrue(vm.state.value.appLockEnabled)
        assertTrue(appLockRepo.enabled)
    }

    @Test
    fun `rechaza activar el bloqueo sin biometria`() = runTest(dispatcher) {
        val vm = viewModel(biometrics = false)
        vm.onAppLockChange(true)
        assertFalse(vm.state.value.appLockEnabled)
        assertFalse(appLockRepo.enabled)
        assertTrue(vm.state.value.message?.contains("biometría") == true)
    }

    @Test
    fun `desactivar siempre funciona`() = runTest(dispatcher) {
        appLockRepo.enabled = true
        val vm = viewModel(biometrics = false)
        vm.onAppLockChange(false)
        assertFalse(vm.state.value.appLockEnabled)
        assertFalse(appLockRepo.enabled)
    }
}
