package com.itemli.mobile.features.settings.infrastructure

import com.itemli.mobile.features.settings.domain.repositories.SettingsRepository
import com.itemli.mobile.shared.domain.AppConfig
import com.itemli.mobile.shared.domain.AppResult
import com.itemli.mobile.shared.infrastructure.ApiClient
import com.itemli.mobile.shared.infrastructure.ConfigStore

/**
 * Implementación real de [SettingsRepository] sobre el [ConfigStore].
 */
class SettingsRepositoryImpl(
    private val configStore: ConfigStore,
    private val apiClient: ApiClient? = null,
) : SettingsRepository {

    override suspend fun load(): AppResult<AppConfig.ServerConfig> {
        return runCatching { configStore.current() }
            .let { current ->
                if (current.isSuccess) {
                    AppResult.Success(current.getOrThrow())
                } else {
                    AppResult.Failure(current.exceptionOrNull()?.let { Exception(it) } ?: IllegalStateException())
                }
            }
    }

    override suspend fun save(config: AppConfig.ServerConfig): AppResult<Unit> {
        return runCatching {
            configStore.save(config)
            apiClient?.reset()
        }.let { result ->
            if (result.isSuccess) {
                AppResult.Success(Unit)
            } else {
                AppResult.Failure(result.exceptionOrNull()?.let { Exception(it) } ?: IllegalStateException())
            }
        }
    }
}
