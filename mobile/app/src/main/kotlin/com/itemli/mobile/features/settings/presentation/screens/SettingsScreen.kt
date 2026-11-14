package com.itemli.mobile.features.settings.presentation.screens

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.itemli.mobile.features.settings.presentation.adaptive.SettingsAdaptiveLayout
import com.itemli.mobile.features.settings.presentation.viewmodels.SettingsViewModel
import com.itemli.mobile.features.reports.infrastructure.storage.ReportPdfStorage
import com.itemli.mobile.shared.ui.components.SecureScreen
import org.koin.androidx.compose.koinViewModel

/**
 * Pantalla de ajustes: servidor, proxy, bloqueo biométrico y carpeta de
 * descargas de PDF (SAF, permiso persistente).
 */
@Composable
fun SettingsScreen(
    windowSizeClass: WindowSizeClass? = null,
    onBack: () -> Unit,
) {
    SecureScreen()
    val viewModel: SettingsViewModel = koinViewModel()
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val pdfStorage = remember { ReportPdfStorage(context) }

    // Nombre visible de la carpeta elegida, para mostrarla en el formulario.
    var pdfDirName by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(state.pdfDirUri) {
        pdfDirName = pdfStorage.folderName(state.pdfDirUri)
    }

    val pickFolder = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) {
            // Permiso persistente: la app puede escribir en esta carpeta
            // después de reiniciar.
            runCatching {
                context.contentResolver.takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
                )
            }
            viewModel.onPdfDirPicked(uri.toString())
        }
    }

    LaunchedEffect(state.message) { /* log si hace falta */ }

    Box(Modifier.fillMaxSize()) {
        SettingsAdaptiveLayout(
            windowSizeClass = windowSizeClass,
            state = state,
            onBaseUrlChange = viewModel::onBaseUrlChange,
            onProxyChange = viewModel::onProxyChange,
            onAppLockChange = viewModel::onAppLockChange,
            onPickPdfDir = { pickFolder.launch(null) },
            onResetPdfDir = { viewModel.onPdfDirPicked(null) },
            onSave = { viewModel.save() },
            onTest = { viewModel.testConnection { ok, msg ->
                /* snackbar pendiente */
            } },
            pdfDirName = pdfDirName,
        )
    }
}
