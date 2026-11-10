package com.itemli.mobile.features.auth.application.usecases

import com.itemli.mobile.features.auth.domain.entities.AuthSession
import com.itemli.mobile.features.auth.domain.entities.AuthUser
import com.itemli.mobile.features.auth.domain.repositories.AuthRepository
import com.itemli.mobile.shared.domain.AppResult
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthUseCasesTest {

    private val repository = object : AuthRepository {
        override suspend fun login(
            alias: String,
            password: String,
            baseDatos: String,
        ): AppResult<AuthSession> = if (password == "ok") {
            AppResult.Success(
                AuthSession(
                    token = "TOKEN",
                    usuario = AuthUser(1, "123", "Juan", "Perez", alias = alias),
                    baseDatos = baseDatos,
                ),
            )
        } else {
            AppResult.Failure(RuntimeException("credenciales inválidas"))
        }

        override suspend fun basesByAlias(alias: String): AppResult<List<com.itemli.mobile.features.auth.domain.entities.DependenciaRef>> =
            AppResult.Success(emptyList())
    }

    @Test
    fun `login correcto genera sesión`() = runTest {
        val useCase = LoginUseCase(repository)
        val result = useCase("jperez", "ok", "caguayo_sa")
        assertTrue(result is AppResult.Success)
        val session = (result as AppResult.Success).value
        assertEquals("TOKEN", session.token)
        assertEquals("caguayo_sa", session.baseDatos)
    }

    @Test
    fun `login incorrecto devuelve failure`() = runTest {
        val useCase = LoginUseCase(repository)
        val result = useCase("jperez", "mal", "caguayo_sa")
        assertTrue(result is AppResult.Failure)
    }

    @Test
    fun `bases por alias devuelve lista vacía si no hay dependencias`() = runTest {
        val useCase = SearchAliasUseCase(repository)
        val result = useCase("jperez")
        assertTrue(result is AppResult.Success)
        assertEquals(0, (result as AppResult.Success).value.size)
    }
}
