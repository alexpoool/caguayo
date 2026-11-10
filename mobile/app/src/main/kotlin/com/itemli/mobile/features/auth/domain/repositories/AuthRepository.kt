package com.itemli.mobile.features.auth.domain.repositories

import com.itemli.mobile.features.auth.domain.entities.AuthSession
import com.itemli.mobile.features.auth.domain.entities.DependenciaRef
import com.itemli.mobile.shared.domain.AppResult

/**
 * Interfaz de repositorio de autenticación; la app solo conoce esto.
 */
interface AuthRepository {
    suspend fun login(
        alias: String,
        password: String,
        baseDatos: String,
    ): AppResult<AuthSession>

    suspend fun basesByAlias(alias: String): AppResult<List<DependenciaRef>>
}
