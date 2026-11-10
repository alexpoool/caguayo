package com.itemli.mobile.features.settings.application.usecases

import com.itemli.mobile.features.settings.domain.repositories.SettingsRepository
import com.itemli.mobile.shared.domain.AppResult
import com.itemli.mobile.shared.domain.AppConfig.ServerConfig

/**
 * Recupera la configuración del servidor desde el repositorio.
 */
class LoadServerConfigUseCase(
    private val repository: SettingsRepository,
) {
    suspend operator fun invoke(): AppResult<ServerConfig> = repository.load()
}

/**
 * Guarda la nueva configuración del servidor. Al guardar se llama a `reset()`
 * para que la próxima llamada HTTP use el nuevo proxy/URL.
 */
class SaveServerConfigUseCase(
    private val repository: SettingsRepository,
    private val onConfigChanged: () -> Unit = {},
) {
    suspend operator fun invoke(config: ServerConfig): AppResult<Unit> {
        val result = repository.save(config)
        if (result is AppResult.Success) onConfigChanged()
        return result
    }
}
