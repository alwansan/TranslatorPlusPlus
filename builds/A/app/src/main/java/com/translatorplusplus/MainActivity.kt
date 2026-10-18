package com.translatorplusplus

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.translatorplusplus.ui.MainViewModel
import com.translatorplusplus.ui.components.*
import com.translatorplusplus.ui.screens.*
import com.translatorplusplus.ui.theme.TranslatorPlusPlusTheme

enum class AppDestination(val label: String, val icon: ImageVector) {
    PROJECTS("Projects", Icons.Default.Folder),
    GRID("CAT Grid", Icons.Default.GridOn),
    GLOSSARY("Glossary", Icons.Default.MenuBook),
    ENGINES("Engines", Icons.Default.Translate),
    SIMULATOR("Preview", Icons.Default.Preview)
}

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            TranslatorPlusPlusTheme {
                MainAppScreen(viewModel = viewModel)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppScreen(viewModel: MainViewModel) {
    var currentDestination by remember { mutableStateOf(AppDestination.PROJECTS) }

    val showNewProjectDialog by viewModel.showNewProjectDialog.collectAsState()
    val showBatchTranslateDialog by viewModel.showBatchTranslateDialog.collectAsState()
    val showExportDialog by viewModel.showExportDialog.collectAsState()
    val showAddGlossaryDialog by viewModel.showAddGlossaryDialog.collectAsState()
    val showNetCollabSheet by viewModel.showNetCollabSheet.collectAsState()
    val snackbarMessage by viewModel.snackbarMessage.collectAsState()
    val netCollabStatus by viewModel.netCollabStatus.collectAsState()
    val engines by viewModel.engines.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.dismissSnackbar()
        }
    }

    // Handle system back navigation
    if (currentDestination != AppDestination.PROJECTS) {
        BackHandler {
            currentDestination = AppDestination.PROJECTS
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Image(
                            painter = painterResource(id = R.drawable.ic_logo),
                            contentDescription = "Translator++ Logo",
                            modifier = Modifier.size(30.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            "Translator++",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }
                },
                actions = {
                    IconButton(
                        onClick = { viewModel.showNetCollabSheet.value = true },
                        modifier = Modifier.testTag("netcollab_button")
                    ) {
                        Badge(
                            containerColor = if (netCollabStatus.isServing) Color(0xFF10B981) else Color.Transparent
                        ) {
                            Icon(
                                Icons.Default.Group,
                                contentDescription = "NetCollab Multiplayer",
                                tint = if (netCollabStatus.isServing) Color(0xFF10B981) else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 4.dp
            ) {
                AppDestination.values().forEach { dest ->
                    NavigationBarItem(
                        selected = currentDestination == dest,
                        onClick = { currentDestination = dest },
                        icon = { Icon(dest.icon, contentDescription = dest.label) },
                        label = { Text(dest.label, fontSize = 11.sp, fontWeight = if (currentDestination == dest) FontWeight.Bold else FontWeight.Normal) },
                        modifier = Modifier.testTag("nav_${dest.name.lowercase()}")
                    )
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (currentDestination) {
                AppDestination.PROJECTS -> ProjectsScreen(
                    viewModel = viewModel,
                    onNavigateToEditor = { currentDestination = AppDestination.GRID }
                )
                AppDestination.GRID -> GridEditorScreen(
                    viewModel = viewModel,
                    onNavigateToSimulator = { currentDestination = AppDestination.SIMULATOR }
                )
                AppDestination.GLOSSARY -> GlossaryScreen(
                    viewModel = viewModel
                )
                AppDestination.ENGINES -> EnginesScreen(
                    viewModel = viewModel
                )
                AppDestination.SIMULATOR -> SimulatorScreen(
                    viewModel = viewModel
                )
            }
        }
    }

    // Dialogs
    if (showNewProjectDialog) {
        NewProjectDialog(
            onDismiss = { viewModel.showNewProjectDialog.value = false },
            onCreate = { name, engine, src, tgt, desc ->
                viewModel.createProject(name, engine, src, tgt, desc)
                currentDestination = AppDestination.GRID
            }
        )
    }

    if (showBatchTranslateDialog) {
        BatchTranslateDialog(
            engines = engines,
            onDismiss = { viewModel.showBatchTranslateDialog.value = false },
            onStart = { engId, escAlg, onlyUntrans ->
                viewModel.runBatchTranslate(engId, escAlg, onlyUntrans)
            }
        )
    }

    if (showExportDialog) {
        ExportDialog(
            jsonPatch = viewModel.exportPatch(),
            onDismiss = { viewModel.showExportDialog.value = false }
        )
    }

    if (showAddGlossaryDialog) {
        AddGlossaryDialog(
            onDismiss = { viewModel.showAddGlossaryDialog.value = false },
            onAdd = { term, trans, cat, notes ->
                viewModel.addGlossaryEntry(term, trans, cat, notes)
            }
        )
    }

    if (showNetCollabSheet) {
        NetCollabSheet(
            status = netCollabStatus,
            onToggleServe = { viewModel.toggleNetCollab() },
            onDismiss = { viewModel.showNetCollabSheet.value = false }
        )
    }
}
