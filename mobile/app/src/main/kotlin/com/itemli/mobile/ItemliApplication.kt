package com.itemli.mobile

import android.app.Application
import com.itemli.mobile.app.di.appModule
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin

/**
 * Punto de arranque global de la app, Koin inicializado antes que el Activity.
 */
class ItemliApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@ItemliApplication)
            modules(appModule)
        }
    }
}
