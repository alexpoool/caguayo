package com.itemli.mobile.shared.domain

/**
 * Almacén del token de sesión. La implementación real usa cifrado,
 * pero la app trabaja con esta interfaz para no acoplarse a Android.
 */
interface TokenStorage {
    suspend fun token(): String?
    suspend fun setToken(token: String?)
    suspend fun clear()
}
