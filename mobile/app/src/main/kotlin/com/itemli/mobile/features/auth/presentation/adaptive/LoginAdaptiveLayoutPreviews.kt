package com.itemli.mobile.features.auth.presentation.adaptive

import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.material3.windowsizeclass.WindowHeightSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.itemli.mobile.features.auth.domain.entities.DependenciaRef
import com.itemli.mobile.features.auth.presentation.viewmodels.LoginUiState

/**
 * Previews obligatorias por breakpoint (360/700/1000dp) para el layout adaptativo.
 */
private fun dummyState() = LoginUiState(
    alias = "jperez",
    bases = listOf(
        DependenciaRef(id = 1, nombre = "Casa matriz", baseDatos = "caguayo_sa"),
        DependenciaRef(id = 2, nombre = "Sucursal centro", baseDatos = "caguayo_centro"),
    ),
    selectedBase = null,
)

@Preview(name = "Compact 360dp", widthDp = 360)
@Preview(name = "Medium 700dp", widthDp = 700)
@Preview(name = "Expanded 1000dp", widthDp = 1000)
@Composable
private fun LoginAdaptiveLayoutPreview() {
    LoginAdaptiveLayout(
        windowSizeClass = null, // En device real viene de MainActivity
        state = dummyState(),
        onAliasChange = {},
        onPasswordChange = {},
        onBaseChange = {},
        onSearchBases = {},
        onSubmit = {},
    )
}
