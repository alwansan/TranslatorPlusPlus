package com.translatorplusplus

import android.os.Bundle
import android.net.Uri
import androidx.activity.result.contract.ActivityResultContracts
import androidx.documentfile.provider.DocumentFile
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import org.translatorplusplus.android.TransProject
import org.translatorplusplus.android.RpgMakerJsonEngine
import org.translatorplusplus.android.RpgMakerBatchEngine
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
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
    private var pendingTrans by mutableStateOf("")
    private var pendingJson by mutableStateOf("")
    private var pendingZip by mutableStateOf<ByteArray?>(null)

    private val openFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) importSingleFile(uri)
    }
    private val openFolder = registerForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) importDataFolder(uri)
    }
    private val saveTrans = registerForActivityResult(ActivityResultContracts.CreateDocument("text/plain")) { uri ->
        if (uri == null) viewModel.notifyUser("تم إلغاء حفظ المشروع.") else writeText(uri, pendingTrans, "تم تصدير مشروع .trans.")
    }
    private val saveJson = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri == null) viewModel.notifyUser("تم إلغاء تصدير JSON.") else writeText(uri, pendingJson, "تم تصدير JSON.")
    }
    private val saveZip = registerForActivityResult(ActivityResultContracts.CreateDocument("application/zip")) { uri ->
        val bytes = pendingZip
        if (uri == null) viewModel.notifyUser("تم إلغاء تصدير ZIP.")
        else if (bytes == null) viewModel.notifyUser("لا توجد بيانات ZIP جاهزة.")
        else runCatching {
            val out = contentResolver.openOutputStream(uri) ?: error("تعذر فتح الملف")
            out.use { it.write(bytes) }
        }.onSuccess { viewModel.notifyUser("تم تصدير ZIP؛ فكّه داخل نسخة تجريبية من مجلد Data.") }
         .onFailure { viewModel.notifyUser("فشل التصدير: ${it.message ?: "خطأ غير معروف"}") }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TranslatorPlusPlusTheme {
                MainAppScreen(
                    viewModel = viewModel,
                    onImportFile = { openFile.launch(arrayOf("*/*")) },
                    onImportFolder = { openFolder.launch(null) },
                    onExportTrans = { exportTrans() },
                    onExportJson = { exportJson() },
                    onExportZip = { exportZip() }
                )
            }
        }
    }

    private fun importSingleFile(uri: Uri) {
        lifecycleScope.launch {
            val result = runCatching {
                withContext(Dispatchers.IO) {
                    val name = DocumentFile.fromSingleUri(this@MainActivity, uri)?.name
                        ?: uri.lastPathSegment?.substringAfterLast('/')?.substringAfterLast(':')
                        ?: "Imported.trans"
                    val raw = contentResolver.openInputStream(uri)?.use {
                        BufferedReader(InputStreamReader(it, Charsets.UTF_8)).readText()
                    } ?: error("تعذر قراءة الملف")
                    val content = raw.removePrefix("\uFEFF")
                    val projectContent = if (TransProject.parse(content) != null) content
                        else RpgMakerJsonEngine.createTranslationProject(content, name)
                    if (projectContent == null) null else name to projectContent
                }
            }.getOrNull()
            if (result == null) viewModel.notifyUser("الملف غير مدعوم؛ جرّب .trans أو RPG Maker JSON مستخرج.")
            else viewModel.importTranslationProject(result.second, result.first)
        }
    }

    private fun importDataFolder(uri: Uri) {
        lifecycleScope.launch {
            viewModel.notifyUser("يجري فحص مجلد Data...")
            val result = withContext(Dispatchers.IO) { scanData(uri) }
            val scanned = result
            if (scanned == null) {
                viewModel.notifyUser("لم أجد ملفات JSON مدعومة أو تجاوز المجلد حدود الفحص.")
            } else {
                val projectContent = scanned.second
                if (projectContent.isNullOrBlank()) {
                    viewModel.notifyUser("لم أجد ملفات JSON مدعومة أو تجاوز المجلد حدود الفحص.")
                } else {
                    viewModel.importTranslationProject(projectContent, "${scanned.first}-translated.trans")
                }
            }
        }
    }

    private fun scanData(uri: Uri): Pair<String, String?>? {
        val root = DocumentFile.fromTreeUri(this, uri) ?: return null
        val label = root.name?.takeIf { it.isNotBlank() } ?: "RPG Maker"
        val files = mutableListOf<RpgMakerBatchEngine.SourceFile>()
        var totalChars = 0L
        var overLimit = false
        val maxChars = 24L * 1024 * 1024
        val names = setOf("actors.json","classes.json","skills.json","items.json","weapons.json","armors.json",
            "enemies.json","states.json","troops.json","commonevents.json","mapinfos.json","system.json")
        fun accepted(name: String): Boolean {
            val n = name.lowercase()
            return n in names || Regex("map\\d+\\.json").matches(n)
        }
        fun visit(dir: DocumentFile, prefix: String, depth: Int) {
            if (overLimit || depth > 8) return
            val children = runCatching { dir.listFiles().sortedBy { it.name ?: "" } }.getOrDefault(emptyList())
            for (child in children) {
                if (overLimit) return
                val name = child.name ?: continue
                if (child.isDirectory) visit(child, if (prefix.isBlank()) name else "$prefix/$name", depth + 1)
                else if (child.isFile && accepted(name)) {
                    if (files.size >= 500 || child.length() > maxChars) { overLimit = true; return }
                    val text = runCatching {
                        contentResolver.openInputStream(child.uri)?.use { BufferedReader(InputStreamReader(it, Charsets.UTF_8)).readText() }
                    }.getOrNull() ?: continue
                    totalChars += text.length.toLong()
                    if (totalChars > maxChars) { overLimit = true; return }
                    files += RpgMakerBatchEngine.SourceFile(if (prefix.isBlank()) name else "$prefix/$name", text)
                }
            }
        }
        visit(root, "", 0)
        return if (overLimit) label to null else label to RpgMakerBatchEngine.createBatchProject(files, label)
    }

    private fun exportTrans() {
        val data = viewModel.exportActiveTransProject()
        if (data == null) viewModel.notifyUser("استورد مشروع ترجمة أولاً.")
        else { pendingTrans = data.second; saveTrans.launch(data.first) }
    }
    private fun exportJson() {
        val data = viewModel.exportActiveRpgMakerJson()
        if (data == null) viewModel.notifyUser("هذا الخيار يتطلب مشروع JSON مفرداً من RPG Maker.")
        else { pendingJson = data.second; saveJson.launch(data.first) }
    }
    private fun exportZip() {
        val data = viewModel.exportActiveRpgMakerZip()
        if (data == null) viewModel.notifyUser("استورد مجلد Data أولاً.")
        else { pendingZip = data.second; saveZip.launch(data.first) }
    }
    private fun writeText(uri: Uri, text: String, message: String) {
        runCatching {
            val out = contentResolver.openOutputStream(uri) ?: error("تعذر فتح الملف")
            out.bufferedWriter(Charsets.UTF_8).use { it.write(text) }
        }.onSuccess { viewModel.notifyUser(message) }
         .onFailure { viewModel.notifyUser("فشل الحفظ: ${it.message ?: "خطأ غير معروف"}") }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppScreen(
    viewModel: MainViewModel,
    onImportFile: () -> Unit,
    onImportFolder: () -> Unit,
    onExportTrans: () -> Unit,
    onExportJson: () -> Unit,
    onExportZip: () -> Unit
) {
    var currentDestination by remember { mutableStateOf(AppDestination.PROJECTS) }
    var showFileMenu by remember { mutableStateOf(false) }

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
                        Icon(
                            imageVector = Icons.Default.Translate,
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
                    IconButton(onClick = { showFileMenu = true }, modifier = Modifier.testTag("file_actions_menu")) {
                        Icon(Icons.Default.MoreVert, contentDescription = "Import and export")
                    }
                    DropdownMenu(expanded = showFileMenu, onDismissRequest = { showFileMenu = false }) {
                        DropdownMenuItem(text = { Text("Import .trans / RPG Maker JSON") }, leadingIcon = { Icon(Icons.Default.FileOpen, contentDescription = null) }, onClick = { showFileMenu = false; onImportFile() })
                        DropdownMenuItem(text = { Text("Import RPG Maker Data folder") }, leadingIcon = { Icon(Icons.Default.FolderOpen, contentDescription = null) }, onClick = { showFileMenu = false; onImportFolder() })
                        HorizontalDivider()
                        DropdownMenuItem(text = { Text("Save translation project (.trans)") }, leadingIcon = { Icon(Icons.Default.Save, contentDescription = null) }, onClick = { showFileMenu = false; onExportTrans() })
                        DropdownMenuItem(text = { Text("Export translated JSON") }, leadingIcon = { Icon(Icons.Default.Code, contentDescription = null) }, onClick = { showFileMenu = false; onExportJson() })
                        DropdownMenuItem(text = { Text("Export translated JSON ZIP overlay") }, leadingIcon = { Icon(Icons.Default.Archive, contentDescription = null) }, onClick = { showFileMenu = false; onExportZip() })
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
