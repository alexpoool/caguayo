package com.itemli.mobile.features.settings.application.usecases

import com.itemli.mobile.features.settings.domain.repositories.SettingsRepository
import com.itemli.mobile.shared.domain.AppResult
import com.itemli.mobile.shared.domain.AppConfig.ServerConfig

/**
 * Recupera la configuración del servidor desde el repositorio.
 */
class LoadServerConfigUseCase(
    private val repository: SettingsRepository,
) {
    suspend operator fun invoke(): AppResult<ServerConfig> = repository.load()
}

/**
 * Guarda la nueva configuración del servidor. Al guardar se llama a `reset()`
 * para que la próxima llamada HTTP use el nuevo proxy/URL.
 *
 * La URL se normaliza: recorta espacios, añade esquema si falta, elimina un
 * sufijo de red accidental ("10.0.0.1/24" → "10.0.0.1") y asegura la barra
 * final que Retrofit exige.
 */
class SaveServerConfigUseCase(
    private val repository: SettingsRepository,
    private val onConfigChanged: () -> Unit = {},
) {
    suspend operator fun invoke(config: ServerConfig): AppResult<Unit> {
        val normalized = config.copy(baseUrl = normalizeBaseUrl(config.baseUrl))
        val result = repository.save(normalized)
        if (result is AppResult.Success) onConfigChanged()
        return result
    }

    internal companion object {
        internal fun normalizeBaseUrl(raw: String): String {
            var url = raw.trim()
            if (url.isEmpty()) return url
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "http://" + url
            }
            // "http://10.0.0.1/24:8000/x" → "http://10.0.0.1:8000/x"
            url = url.replaceFirst(Regex("^(https?://[^/]+)/24(?=[/:]|$)"), "$1")
            if (!url.endsWith("/")) url += "/"
            return url
        }
    }
}
