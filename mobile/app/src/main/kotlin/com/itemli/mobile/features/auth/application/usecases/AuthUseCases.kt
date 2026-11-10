package com.itemli.mobile.features.auth.application.usecases

import com.itemli.mobile.features.auth.domain.entities.AuthSession
import com.itemli.mobile.features.auth.domain.entities.DependenciaRef
import com.itemli.mobile.features.auth.domain.repositories.AuthRepository
import com.itemli.mobile.shared.domain.AppResult

/**
 * Caso de uso que inicia sesión en la dependencia seleccionada.
 */
class LoginUseCase(
    private val repository: AuthRepository,
) {
    suspend operator fun invoke(
        alias: String,
        password: String,
        baseDatos: String,
    ): AppResult<AuthSession> = repository.login(alias, password, baseDatos)
}

/**
 * Caso de uso que consulta en qué bases de datos existe el alias indicado.
 */
class SearchAliasUseCase(
    private val repository: AuthRepository,
) {
    suspend operator fun invoke(alias: String): AppResult<List<DependenciaRef>> =
        repository.basesByAlias(alias)
}
