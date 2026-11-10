package com.itemli.mobile.features.auth.infrastructure.mappers

import com.itemli.mobile.features.auth.domain.entities.AuthSession
import com.itemli.mobile.features.auth.domain.entities.AuthUser
import com.itemli.mobile.features.auth.domain.entities.DependenciaRef
import com.itemli.mobile.features.auth.infrastructure.datasources.AuthLoginResponseDto
import com.itemli.mobile.features.auth.infrastructure.datasources.AuthUserDto
import com.itemli.mobile.features.auth.infrastructure.datasources.DependenciaDto

/** DTO → modelo de negocio de la feature auth. */
fun AuthLoginResponseDto.toDomain(): AuthSession = AuthSession(
    token = token,
    usuario = usuario.toDomain(),
    baseDatos = base_datos,
)

fun DependenciaDto.toDomain(): DependenciaRef = DependenciaRef(
    id = id_dependencia,
    nombre = nombre,
    baseDatos = base_datos,
)

private fun AuthUserDto.toDomain(): AuthUser = AuthUser(
    id = id_usuario,
    ci = ci,
    nombre = nombre,
    primerApellido = primer_apellido,
    segundoApellido = segundo_apellido,
    alias = alias,
    cargo = cargo,
    dependencia = dependencia?.toDomain(),
)
