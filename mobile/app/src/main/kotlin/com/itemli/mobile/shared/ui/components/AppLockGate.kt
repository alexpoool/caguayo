package com.itemli.mobile.shared.ui.components

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.itemli.mobile.features.settings.domain.repositories.AppLockRepository
import com.itemli.mobile.shared.infrastructure.AppLockManager
import org.koin.core.context.GlobalContext

/**
 * Compuerta de bloqueo biométrico: si el usuario activó el app-lock, pide
 * huella/rostro antes de mostrar la app. Si falla, se cierra el Activity.
 */
@Composable
fun AppLockGate(
    content: @Composable () -> Unit,
) {
    val activity = LocalContext.current.findFragmentActivity()
    var locked by remember { mutableStateOf<Boolean?>(null) }

    LaunchedEffect(Unit) {
        val manager = GlobalContext.get().get<AppLockManager>()
        locked = manager.isEnabled() && manager.isSupported()
    }

    when (val isLocked = locked) {
        null -> Unit // resolviendo: no pinta nada (evita flash de contenido)
        false -> content()
        else -> {
            content() // se pinta detrás pero cubierto por el prompt
            LaunchedEffect(isLocked) {
                val prompt = BiometricPrompt(
                    activity,
                    ContextCompat.getMainExecutor(activity),
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                            locked = false
                        }

                        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                            activity.finish()
                        }
                    },
                )
                val info = BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Itemli bloqueada")
                    .setSubtitle("Autentícate para continuar")
                    .setNegativeButtonText("Salir")
                    .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK)
                    .build()
                prompt.authenticate(info)
            }
        }
    }
}

private tailrec fun android.content.Context.findFragmentActivity(): FragmentActivity = when (this) {
    is FragmentActivity -> this
    is android.content.ContextWrapper -> baseContext.findFragmentActivity()
    else -> error("AppLockGate requiere un FragmentActivity")
}
