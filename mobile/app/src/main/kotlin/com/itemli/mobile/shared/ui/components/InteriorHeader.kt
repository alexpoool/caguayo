package com.itemli.mobile.shared.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

private val HeaderNavy = Color(0xFF082D66)

/** Cabecera horizontal común para pantallas interiores. */
@Composable
fun InteriorHeader(
    title: String,
    onBack: (() -> Unit)? = null,
    actionIcon: ImageVector? = null,
    actionDescription: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier.fillMaxWidth().height(58.dp).background(HeaderNavy)
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (onBack != null) {
            Icon(Icons.Filled.ArrowBack, contentDescription = "Volver",
                tint = Color.White, modifier = Modifier.size(24.dp).clickable(onClick = onBack))
            Spacer(Modifier.width(16.dp))
        }
        Text(title, color = Color.White, style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.weight(1f))
        if (actionIcon != null && onAction != null) {
            Icon(actionIcon, contentDescription = actionDescription,
                tint = Color.White, modifier = Modifier.size(25.dp).clickable(onClick = onAction))
        }
    }
}
