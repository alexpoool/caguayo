package com.itemli.mobile.shared.ui.theme

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/** Escala de texto elegida por el usuario, persistida entre sesiones. */
class FontSizePreferences(private val context: Context) {
    val scale: Flow<Float> = context.fontSizeDataStore.data.map { preferences ->
        (preferences[KEY_FONT_SCALE] ?: DEFAULT_SCALE).coerceIn(MIN_SCALE, MAX_SCALE)
    }

    suspend fun setScale(scale: Float) {
        context.fontSizeDataStore.edit { preferences ->
            preferences[KEY_FONT_SCALE] = scale.coerceIn(MIN_SCALE, MAX_SCALE)
        }
    }

    companion object {
        const val DEFAULT_SCALE = 1.0f
        const val MIN_SCALE = 0.85f
        const val MAX_SCALE = 1.30f
        val PRESETS = listOf(0.85f, 1.0f, 1.15f, 1.30f)
    }

    private companion object Keys {
        val KEY_FONT_SCALE = floatPreferencesKey("font_scale")
    }
}

private val Context.fontSizeDataStore by preferencesDataStore(name = "font_size_preferences")
