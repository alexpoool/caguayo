package com.itemli.mobile

import android.app.Application
import android.util.Log
import com.itemli.mobile.app.di.appModule
import com.itemli.mobile.app.di.securityModule
import com.itemli.mobile.shared.infrastructure.ApiClient
import com.itemli.mobile.shared.infrastructure.DeviceIntegrity
import com.itemli.mobile.shared.infrastructure.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin
import org.koin.core.context.GlobalContext

/**
 * Punto de arranque global de la app, Koin inicializado antes que el Activity.
 */
class ItemliApplication : Application() {

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@ItemliApplication)
            modules(appModule, securityModule)
        }

        // Integridad del dispositivo: solo señal, no bloqueo.
        // El veredicto fuerte es Play Integrity validado en el backend.
        val integrity = DeviceIntegrity.summary(this)
        if (integrity["root_signals"]?.isNotEmpty() == true || integrity["debuggable"] == "true") {
            Log.w("ItemliSecurity", "Señales de integridad: $integrity")
        }
        // Seguridad: un 401 del backend cierra la sesión limpiamente (token,
        // cachés y vuelve al Login). El flujo lo observa AppRoot.
        val koin = GlobalContext.get()
        val apiClient = koin.get<ApiClient>()
        val sessionManager = koin.get<SessionManager>()
        apiClient.onUnauthorized = {
            appScope.launch { sessionManager.logout() }
        }
    }
}
