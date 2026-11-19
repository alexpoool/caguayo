package com.itemli.mobile.features.reports.presentation.screens

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import com.itemli.mobile.features.reports.infrastructure.storage.DownloadedReport
import com.itemli.mobile.features.reports.infrastructure.storage.ReportPdfStorage
import com.itemli.mobile.shared.ui.components.InteriorHeader
import java.text.DateFormat
import java.util.Date
import kotlinx.coroutines.launch
import org.koin.core.context.GlobalContext

@Composable
fun HistoryScreen(onBack: () -> Unit = {}) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val storage = remember { GlobalContext.get().get<ReportPdfStorage>() }
    val scope = rememberCoroutineScope()
    var downloads by remember { mutableStateOf<List<DownloadedReport>>(emptyList()) }
    var pendingDelete by remember { mutableStateOf<DownloadedReport?>(null) }

    fun reload() {
        scope.launch { downloads = storage.listDownloads() }
    }
    LaunchedEffect(Unit) { reload() }
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) reload()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    Column(
        Modifier.fillMaxSize().background(Color(0xFFF3F6FF)).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        InteriorHeader(
            title = "Historial",
            onBack = onBack,
            actionIcon = Icons.Filled.History,
            actionDescription = "Actualizar historial",
            onAction = ::reload,
        )
        if (downloads.isEmpty()) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = Color.White,
                shape = RoundedCornerShape(20.dp),
                shadowElevation = 1.dp,
            ) {
                Column(
                    Modifier.fillMaxSize().padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Surface(color = Color(0xFFEAF1FF), shape = RoundedCornerShape(18.dp)) {
                        Icon(Icons.Filled.Description, null, tint = Color(0xFF0752D8), modifier = Modifier.padding(18.dp).size(36.dp))
                    }
                    Text("Aún no hay reportes descargados", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 16.dp))
                    Text("Los PDF que descargues aparecerán aquí.", style = MaterialTheme.typography.bodyMedium, color = Color(0xFF53658C), modifier = Modifier.padding(top = 6.dp))
                }
            }
        } else {
            Text("${downloads.size} archivos descargados", style = MaterialTheme.typography.labelLarge, color = Color(0xFF53658C))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(downloads, key = { it.fileName }) { item ->
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        shadowElevation = 1.dp,
                        modifier = Modifier.fillMaxWidth().clickable {
                            runCatching {
                                val intent = Intent(Intent.ACTION_VIEW).apply {
                                    setDataAndType(item.uri, "application/pdf")
                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                }
                                context.startActivity(intent)
                            }
                        },
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Surface(color = Color(0xFFEAF1FF), shape = RoundedCornerShape(12.dp)) {
                                Icon(Icons.Filled.PictureAsPdf, null, tint = Color(0xFF0752D8), modifier = Modifier.padding(12.dp).size(25.dp))
                            }
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                Text(item.displayName, style = MaterialTheme.typography.titleSmall, color = Color(0xFF173C78))
                                Text(
                                    DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(item.downloadedAt)) +
                                        " · " + android.text.format.Formatter.formatShortFileSize(context, item.sizeBytes),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF667085),
                                )
                                Text("Tocar para abrir PDF", style = MaterialTheme.typography.labelSmall, color = Color(0xFF0752D8))
                            }
                            IconButton(onClick = {
                                runCatching {
                                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                        type = "application/pdf"
                                        putExtra(Intent.EXTRA_STREAM, item.uri)
                                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                    }
                                    context.startActivity(Intent.createChooser(shareIntent, "Compartir informe PDF"))
                                }
                            }) {
                                Icon(Icons.Filled.Share, contentDescription = "Compartir PDF", tint = Color(0xFF0752D8))
                            }
                            IconButton(onClick = { pendingDelete = item }) {
                                Icon(Icons.Filled.DeleteOutline, contentDescription = "Eliminar descarga", tint = Color(0xFF7B8798))
                            }
                        }
                    }
                }
            }
        }
    }

    pendingDelete?.let { item ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Eliminar descarga") },
            text = { Text("¿Quieres eliminar ${item.displayName} del historial?") },
            confirmButton = {
                TextButton(onClick = {
                    scope.launch {
                        storage.delete(item.fileName)
                        downloads = storage.listDownloads()
                        pendingDelete = null
                    }
                }) { Text("Eliminar", color = Color(0xFFB42318)) }
            },
            dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text("Cancelar") } },
            containerColor = Color.White,
        )
    }
}
