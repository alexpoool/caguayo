package com.itemli.mobile.shared.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.text.style.TextOverflow
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
    leadingActions: @Composable RowScope.() -> Unit = {},
    titleMaxLines: Int = 1,
) {
    Row(
        modifier = Modifier.fillMaxWidth().height(if (titleMaxLines > 1) 68.dp else 52.dp)
            .drawBehind {
                val bleed = 20.dp.toPx()
                drawRect(color = HeaderNavy, topLeft = Offset(-bleed, 0f), size = Size(size.width + bleed * 2, size.height))
            }.padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (onBack != null) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver",
                tint = Color.White, modifier = Modifier.size(22.dp).clickable(onClick = onBack))
            Spacer(Modifier.width(16.dp))
        }
        Text(
            title,
            modifier = Modifier.weight(1f),
            color = Color.White,
            style = MaterialTheme.typography.titleMedium,
            maxLines = titleMaxLines,
            overflow = TextOverflow.Clip,
        )
        Spacer(Modifier.width(8.dp))
        leadingActions()
        if (actionIcon != null) {
            val iconModifier = if (onAction != null) Modifier.clickable(onClick = onAction) else Modifier
            Icon(actionIcon, contentDescription = actionDescription,
                tint = Color.White, modifier = iconModifier.size(23.dp))
        }
    }
}
