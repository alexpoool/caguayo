package com.itemli.mobile.features.reports.presentation.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.reports.presentation.viewmodels.ReportDetailUiState

@Composable
fun ReportPdfButton(
    state: ReportDetailUiState,
    onDownload: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Button(
            onClick = onDownload,
            enabled = !state.isPdfLoading && state.definition != null,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            contentPadding = PaddingValues(horizontal = 22.dp, vertical = 17.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF0752D8),
                contentColor = Color.White,
                disabledContainerColor = Color(0xFF9BB7E8),
                disabledContentColor = Color.White,
            ),
            elevation = ButtonDefaults.buttonElevation(defaultElevation = 3.dp, pressedElevation = 1.dp),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (state.isPdfLoading) {
                    CircularProgressIndicator(Modifier.size(19.dp), color = Color.White, strokeWidth = 2.dp)
                    Text("Preparando documento…", fontWeight = FontWeight.SemiBold)
                } else {
                    Icon(Icons.Filled.PictureAsPdf, contentDescription = null, modifier = Modifier.size(21.dp))
                    Text("Descargar informe PDF", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                }
            }
        }
        state.pdfError?.let {
            Text(text = it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
    }
}
