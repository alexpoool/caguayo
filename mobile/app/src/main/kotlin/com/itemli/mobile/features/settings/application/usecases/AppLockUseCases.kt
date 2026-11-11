package com.itemli.mobile.features.settings.application.usecases

import com.itemli.mobile.features.settings.domain.repositories.AppLockRepository

/**
 * Consulta si el bloqueo biométrico está activado.
 */
class GetAppLockUseCase(
    private val repository: AppLockRepository,
) {
    suspend operator fun invoke(): Boolean = repository.isEnabled()
}

/**
 * Activa o desactiva el bloqueo biométrico. La UI debe validar antes
 * (con [com.itemli.mobile.shared.infrastructure.AppLockManager.isSupported])
 * que el dispositivo tenga biometría disponible.
 */
class SetAppLockUseCase(
    private val repository: AppLockRepository,
) {
    suspend operator fun invoke(enabled: Boolean) = repository.setEnabled(enabled)
}
