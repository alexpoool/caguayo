package com.itemli.mobile.shared.infrastructure

import com.itemli.mobile.BuildConfig
import com.itemli.mobile.shared.domain.AppConfig
import kotlinx.serialization.json.Json
import okhttp3.Authenticator
import okhttp3.Credentials
import okhttp3.HttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Cliente HTTP central de la app.
 *
 * Reglas de seguridad:
 * - Logging HTTP solo en debug y solo `HEADERS` (nunca BODY: el login viaja ahí).
 * - Las URLs se redactan antes de loguear (el token va en query de algunos endpoints).
 * - Ante un 401 se invoca [onUnauthorized] para cerrar sesión limpiamente.
 */
class ApiClient(
    private val configProvider: suspend () -> AppConfig.ServerConfig,
    private val tokenProvider: suspend () -> String?,
    /** Callback global al recibir 401: cierra sesión y manda a Login. */
    var onUnauthorized: (() -> Unit)? = null,
) {
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    private var cachedRetrofit: Retrofit? = null
    private var cacheKey: String? = null

    fun okHttp(config: AppConfig.ServerConfig, token: String?): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)

        if (BuildConfig.DEBUG) {
            // Solo HEADERS: BODY contendría el password del login.
            val logging = HttpLoggingInterceptor { message -> android.util.Log.d(TAG, redact(message)) }
                .apply { level = HttpLoggingInterceptor.Level.HEADERS }
            builder.addInterceptor(logging)
        }

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

        // 401 → sesión expirada/inválida: avisa una sola vez por respuesta.
        builder.addInterceptor { chain ->
            val response = chain.proceed(chain.request())
            if (response.code == 401 && response.request.header(AUTH_BYPASS) == null) {
                onUnauthorized?.invoke()
            }
            response
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

    companion object {
        private const val TAG = "ItemliHttp"
        const val AUTH_BYPASS = "X-Itemli-No-Auth-Handler"

        /**
         * Quita valores sensibles de una línea de log HTTP:
         * Authorization, Proxy-Authorization y parámetros token/password.
         */
        fun redact(message: String): String = message
            .replace(Regex("(?i)(Authorization: Bearer)\\s+\\S+"), "$1 [REDACTED]")
            .replace(Regex("(?i)(Proxy-Authorization: Basic)\\s+\\S+"), "$1 [REDACTED]")
            .replace(Regex("(?i)(token|password|contrasenia)=([^&\\s]+)"), "$1=[REDACTED]")
    }
}

/** Redacta la URL completa para logs: sin query strings sensibles. */
fun HttpUrl.redacted(): String = buildUpon().query(null).build().toString()
