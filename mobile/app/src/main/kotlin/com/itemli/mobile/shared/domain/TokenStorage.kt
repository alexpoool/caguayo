package com.itemli.mobile.shared.domain

/**
 * Almacén del token de sesión. La implementación real usa cifrado,
 * pero la app trabaja con esta interfaz para no acoplarse a Android.
 */
data class SavedLoginCredentials(val alias: String, val password: String, val database: String)

interface TokenStorage {
    suspend fun token(): String?
    suspend fun setToken(token: String?)
    suspend fun savedCredentials(): SavedLoginCredentials? = null
    suspend fun saveCredentials(credentials: SavedLoginCredentials?) {}
    suspend fun userAlias(): String? = null
    suspend fun setUserAlias(alias: String?) {}
    suspend fun dependencyId(): Long? = null
    suspend fun setDependencyId(id: Long?) {}
    suspend fun clear()
}
