package com.itemli.mobile.shared.infrastructure

import com.itemli.mobile.shared.domain.AppConfig
import kotlinx.serialization.json.Json
import okhttp3.Authenticator
import okhttp3.Credentials
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Cliente HTTP central de la app.
 *
 * Diseñado para trabajar con servidores on-premise: la URL base y el proxy de red
 * corporativa se leen dinámicamente, y `reset()` invalida la caché para que la
 * siguiente llamada use la configuración recién guardada.
 */
class ApiClient(
    private val configProvider: suspend () -> AppConfig.ServerConfig,
    private val tokenProvider: suspend () -> String?,
) {
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    private var cachedRetrofit: Retrofit? = null
    private var cacheKey: String? = null

    fun okHttp(config: AppConfig.ServerConfig, token: String?): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)

        config.proxy?.let { proxy ->
            val sockAddr = java.net.InetSocketAddress(proxy.host, proxy.port)
            builder.proxy(java.net.Proxy(java.net.Proxy.Type.HTTP, sockAddr))
            proxy.user?.let { user ->
                builder.proxyAuthenticator(object : Authenticator {
                    override fun authenticate(route: Route?, response: Response): Request? {
                        val credential = Credentials.basic(user, proxy.password ?: "")
                        return response.request.newBuilder()
                            .header("Proxy-Authorization", credential)
                            .build()
                    }
                })
            }
        }

        token?.let {
            builder.addInterceptor { chain ->
                val req = chain.request().newBuilder()
                    .header("Authorization", "Bearer $it")
                    .build()
                chain.proceed(req)
            }
        }
        return builder.build()
    }

    /** Invalida la caché; se usa cuando cambian URL base o proxy desde settings. */
    fun reset() {
        cachedRetrofit = null
        cacheKey = null
    }

    suspend fun retrofit(): Retrofit {
        val config = configProvider()
        val token = tokenProvider()
        val key = "${config.baseUrl}|${config.proxy?.let { "${it.host}:${it.port}:${it.user == null}" }}|${token == null}"
        if (cachedRetrofit == null || cacheKey != key) {
            cachedRetrofit = Retrofit.Builder()
                .baseUrl(config.baseUrl)
                .client(okHttp(config, token))
                .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
                .build()
            cacheKey = key
        }
        return cachedRetrofit!!
    }

    suspend fun <T> createService(clazz: Class<T>): T = retrofit().create(clazz)

    suspend inline fun <reified T : Any> create(): T = createService(T::class.java)

    /** Ping simple al servidor. Devuelve Failure si el host/proxy es inválido. */
    suspend fun ping(): Result<Unit> = runCatching {
        val config = configProvider()
        val token = tokenProvider()
        val request = Request.Builder().url(config.baseUrl).build()
        okHttp(config, token).newCall(request).execute().use { resp ->
            require(resp.isSuccessful) { "HTTP ${resp.code}" }
            Unit
        }
    }
}
