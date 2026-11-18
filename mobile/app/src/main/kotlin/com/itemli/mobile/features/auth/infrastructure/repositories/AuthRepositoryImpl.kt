package com.itemli.mobile.features.auth.infrastructure.repositories

import com.itemli.mobile.features.auth.domain.entities.AuthSession
import com.itemli.mobile.features.auth.domain.entities.DependenciaRef
import com.itemli.mobile.features.auth.domain.repositories.AuthRepository
import com.itemli.mobile.features.auth.infrastructure.datasources.AuthApi
import com.itemli.mobile.features.auth.infrastructure.datasources.TestConnectionRequestDto
import com.itemli.mobile.features.auth.infrastructure.datasources.AuthLoginRequestDto
import com.itemli.mobile.features.auth.infrastructure.mappers.toDomain
import com.itemli.mobile.shared.domain.AppResult
import com.itemli.mobile.shared.infrastructure.ApiClient
import com.itemli.mobile.shared.infrastructure.SessionManager
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

/**
 * Implementación real de [AuthRepository] contra el backend.
 */
class AuthRepositoryImpl(
    private val apiClient: ApiClient,
    private val sessionManager: SessionManager,
) : AuthRepository {

    override suspend fun login(
        alias: String,
        password: String,
        baseDatos: String,
    ): AppResult<AuthSession> {
        val result = runCatching {
            val api = apiClient.createService(AuthApi::class.java)
            val response = api.login(
                AuthLoginRequestDto(
                    alias = alias,
                    contrasenia = password,
                    base_datos = baseDatos,
                ),
            )
            val session = response.toDomain()
            sessionManager.login(session.token, session.usuario.alias.ifBlank { alias }, session.usuario.dependencia?.id)
            session
        }
        return when {
            result.isSuccess -> AppResult.Success(result.getOrThrow())
            else -> AppResult.Failure(result.exceptionOrNull()?.toAppError() ?: IllegalStateException())
        }
    }

    override suspend fun listConnections(): AppResult<List<DependenciaRef>> = runCatching {
        apiClient.createService(AuthApi::class.java).listConnections().map { it.toDomain() }
    }.fold({ AppResult.Success(it) }, { AppResult.Failure(it) })

    override suspend fun testConnection(base: DependenciaRef): AppResult<Boolean> = runCatching {
        apiClient.createService(AuthApi::class.java).testConnection(
            TestConnectionRequestDto(base.baseDatos, base.host, base.puerto),
        ).success
    }.fold({ AppResult.Success(it) }, { AppResult.Failure(it) })

    override suspend fun basesByAlias(alias: String): AppResult<List<DependenciaRef>> {
        val result = runCatching {
            val api = apiClient.createService(AuthApi::class.java)
            api.basesByAlias(alias).map { it.toDomain() }
        }
        return when {
            result.isSuccess -> AppResult.Success(result.getOrThrow())
            else -> AppResult.Failure(result.exceptionOrNull() ?: java.io.IOException("basesByAlias"))
        }
    }
}

private fun Throwable.toAppError(): Throwable = when (this) {
    is UnknownHostException -> IOException("Servidor no encontrado")
    is ConnectException -> IOException("No se pudo conectar al servidor")
    is SocketTimeoutException -> IOException("Tiempo de espera agotado")
    else -> this
}
