package com.itemli.mobile.shared.domain

/**
 * Configuración global de la app: URL del backend y proxy corporativo opcional.
 * La capa settings solo edita este objeto; la red solo lo consume.
 */
object AppConfig {

    data class ServerConfig(
        val baseUrl: String = "http://10.0.0.15:8000/api/v1/",
        val proxy: ProxyConfig? = null,
    )

    data class ProxyConfig(
        val host: String,
        val port: Int,
        val user: String? = null,
        val password: String? = null,
    )
}
