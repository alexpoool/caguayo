package com.itemli.mobile.shared.infrastructure

import android.content.Context
import androidx.biometric.BiometricManager
import com.itemli.mobile.features.settings.domain.repositories.AppLockRepository

/**
 * Implementación del bloqueo biométrico. El flag vive cifrado en
 * [EncryptedSecretStore]; la biometría en sí la pide la UI con BiometricPrompt.
 */
class AppLockManager(
    private val context: Context,
    private val secretStore: EncryptedSecretStore,
) : AppLockRepository {

    /** ¿El dispositivo tiene biometría (huella/rostro clase 2+) usable? */
    fun isSupported(): Boolean =
        BiometricManager.from(context)
            .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) ==
            BiometricManager.BIOMETRIC_SUCCESS

    override suspend fun isEnabled(): Boolean =
        secretStore.get(EncryptedSecretStore.KEY_APP_LOCK) == "1"

    override suspend fun setEnabled(enabled: Boolean) {
        if (enabled && !isSupported()) {
            throw IllegalStateException("El dispositivo no tiene biometría disponible")
        }
        secretStore.set(EncryptedSecretStore.KEY_APP_LOCK, if (enabled) "1" else null)
    }
}
