package com.itemli.mobile.app.di

import com.itemli.mobile.features.auth.application.usecases.LoginUseCase
import com.itemli.mobile.features.auth.application.usecases.SearchAliasUseCase
import com.itemli.mobile.features.auth.domain.repositories.AuthRepository
import com.itemli.mobile.features.auth.infrastructure.repositories.AuthRepositoryImpl
import com.itemli.mobile.features.reports.application.usecases.DownloadReportPdfUseCase
import com.itemli.mobile.features.reports.application.usecases.GetReportsCatalogUseCase
import com.itemli.mobile.features.reports.application.usecases.GetReportPreviewUseCase
import com.itemli.mobile.features.reports.domain.repositories.ReportsRepository
import com.itemli.mobile.features.reports.infrastructure.local.ItemliDatabase
import com.itemli.mobile.features.reports.infrastructure.local.ReportPreviewDao
import com.itemli.mobile.features.reports.infrastructure.repositories.ReportsRepositoryImpl
import com.itemli.mobile.features.reports.infrastructure.storage.ReportPdfStorage
import com.itemli.mobile.features.settings.application.usecases.LoadServerConfigUseCase
import com.itemli.mobile.features.settings.application.usecases.SaveServerConfigUseCase
import com.itemli.mobile.features.settings.domain.repositories.SettingsRepository
import com.itemli.mobile.features.settings.infrastructure.SettingsRepositoryImpl
import com.itemli.mobile.features.auth.presentation.viewmodels.LoginViewModel
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportsCatalogViewModel
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportDetailViewModel
import com.itemli.mobile.features.settings.presentation.viewmodels.SettingsViewModel
import com.itemli.mobile.shared.domain.TokenStorage
import com.itemli.mobile.shared.infrastructure.ApiClient
import com.itemli.mobile.shared.infrastructure.ConfigStore
import com.itemli.mobile.shared.infrastructure.EncryptedTokenStorage
import com.itemli.mobile.shared.infrastructure.SessionManager
import org.koin.android.ext.koin.androidApplication
import org.koin.androidx.viewmodel.dsl.viewModel
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * Punto de ensamblado único de dependencias. La app en sí es la única capa
 * que conoce Koin; las features solo reciben interfaces.
 */
val appModule: Module = module {

    single<TokenStorage> { EncryptedTokenStorage(androidApplication()) }
    single { ConfigStore(androidApplication(), get()) }

    single {
        ApiClient(
            configProvider = { get<ConfigStore>().current() },
            tokenProvider = { get<SessionManager>().currentToken() },
        )
    }

    single {
        SessionManager(
            tokenStorage = get(),
            configProvider = { get<ConfigStore>().current() },
        )
    }

    single<AuthRepository> {
        AuthRepositoryImpl(
            apiClient = get(),
            sessionManager = get(),
        )
    }

    single<ReportsRepository> {
        ReportsRepositoryImpl(
            apiClient = get(),
            previewDao = get(),
        )
    }

    single {
        androidx.room.Room.databaseBuilder(
            androidApplication(),
            ItemliDatabase::class.java,
            ItemliDatabase.NAME,
        ).fallbackToDestructiveMigration().build()
    }
    single<ReportPreviewDao> { get<ItemliDatabase>().reportPreviewDao() }

    single<SettingsRepository> {
        SettingsRepositoryImpl(configStore = get())
    }

    factory { SearchAliasUseCase(get()) }
    factory { LoginUseCase(get()) }
    factory { LoadServerConfigUseCase(get()) }
    factory {
        SaveServerConfigUseCase(
            repository = get(),
            onConfigChanged = { get<ApiClient>().reset() },
        )
    }
    factory { GetReportsCatalogUseCase(get()) }
    factory { GetReportPreviewUseCase(get()) }
    factory { DownloadReportPdfUseCase(get()) }

    single { ReportPdfStorage(androidApplication()) }

    viewModel { LoginViewModel(searchAliasUseCase = get(), loginUseCase = get()) }
    viewModel { ReportsCatalogViewModel(get()) }
    viewModel { ReportDetailViewModel(get(), get(), get(), get()) }
    viewModel { SettingsViewModel(get(), get(), get(), get(), get()) }
}
