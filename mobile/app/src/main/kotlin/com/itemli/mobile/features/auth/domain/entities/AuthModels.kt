package com.itemli.mobile.features.auth.domain.entities

/**
 * Modelo de negocio del login. No sabe nada sobre Android ni HTTP.
 */
data class AuthUser(
    val id: Long,
    val ci: String,
    val nombre: String,
    val primerApellido: String,
    val segundoApellido: String? = null,
    val alias: String,
    val cargo: String? = null,
    val dependencia: DependenciaRef? = null,
)

/**
 * Referencia a la dependencia seleccionada en login.
 */
data class DependenciaRef(
    val id: Long,
    val nombre: String,
    val baseDatos: String,
)

data class AuthSession(
    val token: String,
    val usuario: AuthUser,
    val baseDatos: String,
)

/**
 * Entrada de usuario para el formulario de login.
 */
data class LoginInput(
    val alias: String,
    val password: String,
    val baseDatos: String,
)
