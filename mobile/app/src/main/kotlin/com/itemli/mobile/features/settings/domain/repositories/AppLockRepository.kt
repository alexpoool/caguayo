package com.itemli.mobile.features.settings.domain.repositories

/**
 * Bloqueo biométrico de la app (opcional, configurable desde Ajustes).
 */
interface AppLockRepository {
    suspend fun isEnabled(): Boolean
    suspend fun setEnabled(enabled: Boolean)
}
