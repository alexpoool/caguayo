package com.itemli.mobile.features.settings.domain.repositories

import com.itemli.mobile.shared.domain.AppConfig.ServerConfig
import com.itemli.mobile.shared.domain.AppResult

/**
 * Repositorio de la configuración del servidor (URL base + proxy).
 */
interface SettingsRepository {
    suspend fun load(): AppResult<ServerConfig>
    suspend fun save(config: ServerConfig): AppResult<Unit>
}
