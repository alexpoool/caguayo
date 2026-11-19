package com.itemli.mobile.shared.ui.theme

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class FontScalePreferences(private val context: Context) {
    val scale: Flow<Float> = context.fontScaleDataStore.data.map { preferences ->
        (preferences[FONT_SCALE] ?: 1f).coerceIn(0.85f, 1.30f)
    }

    suspend fun setScale(value: Float) {
        context.fontScaleDataStore.edit { preferences ->
            preferences[FONT_SCALE] = value.coerceIn(0.85f, 1.30f)
        }
    }

    private companion object {
        val FONT_SCALE = floatPreferencesKey("font_scale")
    }
}

private val Context.fontScaleDataStore by preferencesDataStore(name = "font_scale_preferences")
