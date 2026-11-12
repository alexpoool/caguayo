package com.itemli.mobile.features.settings.presentation.components

import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.material3.windowsizeclass.WindowHeightSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

/**
 * Previews del modal de ayuda del proxy: 360/700/1000dp.
 * Las WindowSizeClass se construyen a mano porque el Dialog no respeta
 * widthDp del preview directamente.
 */
private fun sizeClass(width: Int): WindowSizeClass = WindowSizeClass.calculateFromSize(
    androidx.compose.ui.size.Size(width.toFloat(), 800f),
)

@Preview(name = "Compact 360dp", widthDp = 360)
@Composable
private fun ProxyHelpDialogCompactPreview() {
    ProxyHelpDialog(windowSizeClass = sizeClass(360), onDismiss = {})
}

@Preview(name = "Medium 700dp", widthDp = 700)
@Composable
private fun ProxyHelpDialogMediumPreview() {
    ProxyHelpDialog(windowSizeClass = sizeClass(700), onDismiss = {})
}

@Preview(name = "Expanded 1000dp", widthDp = 1000)
@Composable
private fun ProxyHelpDialogExpandedPreview() {
    ProxyHelpDialog(windowSizeClass = sizeClass(1000), onDismiss = {})
}
