package com.itemli.mobile.app.di

import com.itemli.mobile.features.settings.application.usecases.GetAppLockUseCase
import com.itemli.mobile.features.settings.application.usecases.SetAppLockUseCase
import com.itemli.mobile.features.settings.domain.repositories.AppLockRepository
import com.itemli.mobile.shared.infrastructure.AppLockManager
import com.itemli.mobile.shared.infrastructure.EncryptedSecretStore
import org.koin.android.ext.koin.androidApplication
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * Módulo de seguridad. Vive aparte de [appModule] para poder evolucionar
 * (Play Integrity, verificación de firma) sin tocar el ensamblado principal.
 */
val securityModule: Module = module {

    single { EncryptedSecretStore(androidApplication()) }
    single<AppLockRepository> { AppLockManager(androidApplication(), get()) }

    factory { GetAppLockUseCase(get()) }
    factory { SetAppLockUseCase(get()) }
}
