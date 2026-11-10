package com.itemli.mobile.features.auth.infrastructure.datasources

import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Retrofit API de autenticación. Solo expone endpoints reales del backend.
 */
interface AuthApi {

    @POST("auth/login")
    suspend fun login(
        @Body body: AuthLoginRequestDto,
    ): AuthLoginResponseDto

    @GET("auth/buscar-alias/{alias}")
    suspend fun basesByAlias(
        @Path("alias") alias: String,
    ): List<DependenciaDto>
}

@Serializable
data class AuthLoginRequestDto(
    val alias: String,
    val contrasenia: String,
    val base_datos: String,
)

@Serializable
data class AuthLoginResponseDto(
    val token: String,
    val usuario: AuthUserDto,
    val base_datos: String,
)

@Serializable
data class AuthUserDto(
    val id_usuario: Long = 0,
    val ci: String = "",
    val nombre: String = "",
    val primer_apellido: String = "",
    val segundo_apellido: String? = null,
    val alias: String = "",
    val cargo: String? = null,
    val dependencia: DependenciaDto? = null,
)

@Serializable
data class DependenciaDto(
    val id_dependencia: Long = 0,
    val nombre: String = "",
    val base_datos: String = "",
)
