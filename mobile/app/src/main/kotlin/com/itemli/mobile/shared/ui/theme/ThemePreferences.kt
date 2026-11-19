package com.itemli.mobile.shared.ui.theme

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

enum class AppThemeMode(val storageValue: String) {
    SYSTEM("system"),
    LIGHT("light"),
    DARK("dark");

    companion object {
        fun fromStorage(value: String?): AppThemeMode =
            entries.firstOrNull { it.storageValue == value } ?: SYSTEM
    }
}

/** Preferencia de apariencia persistida entre sesiones. */
class ThemePreferences(private val context: Context) {
    val mode: Flow<AppThemeMode> = context.themeDataStore.data.map { preferences ->
        AppThemeMode.fromStorage(preferences[KEY_THEME_MODE])
    }

    suspend fun setMode(mode: AppThemeMode) {
        context.themeDataStore.edit { preferences ->
            preferences[KEY_THEME_MODE] = mode.storageValue
        }
    }

    private companion object {
        val KEY_THEME_MODE = stringPreferencesKey("theme_mode")
    }
}

private val Context.themeDataStore by preferencesDataStore(name = "appearance_preferences")
