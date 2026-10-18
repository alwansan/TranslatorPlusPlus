package org.translatorplusplus.android

import android.content.ContentResolver
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.documentfile.provider.DocumentFile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader

class MainActivity : ComponentActivity() {
    private var pendingExport by mutableStateOf("")
    private var pendingJsonExport by mutableStateOf("")
    private var pendingZipExport by mutableStateOf<ByteArray?>(null)
    private var exportStatus by mutableStateOf("")

    private val exportLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument("text/plain")
    ) { uri: Uri? ->
        if (uri == null) {
            exportStatus = "تم إلغاء الحفظ."
        } else {
            writeDocument(uri, pendingExport, "تم حفظ الملف بنجاح.")
        }
    }

    private val jsonExportLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument("application/json")
    ) { uri: Uri? ->
        if (uri == null) {
            exportStatus = "تم إلغاء تصدير JSON."
        } else {
            writeDocument(uri, pendingJsonExport, "تم تصدير ملف JSON بنجاح.")
        }
    }

    private val zipExportLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument("application/zip")
    ) { uri: Uri? ->
        val bytes = pendingZipExport
        if (uri == null) {
            exportStatus = "تم إلغاء تصدير ZIP."
        } else if (bytes == null) {
            exportStatus = "لا توجد بيانات ZIP جاهزة للتصدير."
        } else {
            writeBinaryDocument(uri, bytes, "تم تصدير ملفات JSON إلى ZIP بنجاح.")
        }
    }

    private fun writeDocument(uri: Uri, content: String, successMessage: String) {
        runCatching {
            val output = contentResolver.openOutputStream(uri)
                ?: error("تعذر فتح الملف للكتابة")
            output.bufferedWriter(Charsets.UTF_8).use { it.write(content) }
        }.onSuccess {
            exportStatus = successMessage
        }.onFailure { error ->
            exportStatus = "فشل الحفظ: ${error.message ?: "خطأ غير معروف"}"
        }
    }

    private fun writeBinaryDocument(uri: Uri, content: ByteArray, successMessage: String) {
        runCatching {
            val output = contentResolver.openOutputStream(uri)
                ?: error("تعذر فتح الملف للكتابة")
            output.use { it.write(content) }
        }.onSuccess {
            exportStatus = successMessage
        }.onFailure { error ->
            exportStatus = "فشل الحفظ: ${error.message ?: "خطأ غير معروف"}"
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    TranslatorPrototype(
                        resolver = contentResolver,
                        exportStatus = exportStatus,
                        onExport = { name, text ->
                            pendingExport = text
                            exportStatus = "اختر مكان حفظ مشروع الترجمة."
                            exportLauncher.launch(name)
                        },
                        onExportJson = { name, text ->
                            pendingJsonExport = text
                            exportStatus = "اختر مكان حفظ نسخة JSON المترجمة."
                            jsonExportLauncher.launch(name)
                        },
                        onExportZip = { name, bytes ->
                            pendingZipExport = bytes
                            exportStatus = "اختر مكان حفظ أرشيف JSON المترجم."
                            zipExportLauncher.launch(name)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun TranslatorPrototype(
    resolver: ContentResolver,
    exportStatus: String,
    onExport: (String, String) -> Unit,
    onExportJson: (String, String) -> Unit,
    onExportZip: (String, ByteArray) -> Unit
) {
    var fileName by remember { mutableStateOf("لم يتم اختيار ملف") }
    var sourceText by remember { mutableStateOf("") }
    var parsedProject by remember { mutableStateOf<TransProject?>(null) }
    var projectRows by remember { mutableStateOf<List<TransRow>>(emptyList()) }
    var isFileLoaded by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf("افتح ملفاً أو مجلد Data للبدء") }
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current

    val openFile = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            runCatching {
                resolver.openInputStream(uri)?.use { input ->
                    BufferedReader(InputStreamReader(input, Charsets.UTF_8)).readText()
                } ?: error("تعذر فتح الملف")
            }.onSuccess { content ->
                fileName = uri.lastPathSegment
                    ?.substringAfterLast('/')
                    ?.substringAfterLast(':')
                    ?.takeIf { it.isNotBlank() } ?: "ملف مستورد"

                val existingProject = TransProject.parse(content.removePrefix("\uFEFF"))
                val project = if (existingProject != null) {
                    existingProject
                } else {
                    val generatedProject = RpgMakerJsonEngine.createTranslationProject(content, fileName)
                    generatedProject?.let { TransProject.parse(it) }
                }

                if (project != null) {
                    parsedProject = project
                    projectRows = project.rows
                    sourceText = ""
                    status = when {
                        RpgMakerBatchEngine.canRebuild(project.toJson()) ->
                            "تم فتح مشروع RPG Maker متعدد الملفات. ترجم النصوص ثم صدّر ZIP."
                        RpgMakerJsonEngine.canRebuild(project.toJson()) ->
                            "تم فتح مشروع ترجمة RPG Maker. عدّل النصوص ثم صدّر مشروع .trans أو ملف JSON."
                        existingProject != null ->
                            "تم فتح مشروع Translator++: ${project.rows.size} صفاً قابلاً للتحرير."
                        else ->
                            "تم تحليل ملف RPG Maker JSON: ${project.rows.size} نصاً قابلاً للترجمة."
                    }
                } else {
                    parsedProject = null
                    projectRows = emptyList()
                    sourceText = content.removePrefix("\uFEFF")
                    status = "تم فتح ملف نصي. لم تُكتشف بنية مشروع .trans أو ملف RPG Maker مدعوم."
                }
                isFileLoaded = true
            }.onFailure { error ->
                parsedProject = null
                projectRows = emptyList()
                isFileLoaded = false
                status = "فشل فتح الملف: ${error.message ?: "خطأ غير معروف"}"
            }
        }
    }

    val openFolder = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocumentTree()
    ) { treeUri ->
        if (treeUri != null) {
            coroutineScope.launch {
                status = "يجري فحص مجلد البيانات..."
                val folderResult = withContext(Dispatchers.IO) {
                    val root = DocumentFile.fromTreeUri(context, treeUri)
                        ?: return@withContext null
                    val files = mutableListOf<RpgMakerBatchEngine.SourceFile>()
                    var totalChars = 0L
                    var limitReached = false
                    val acceptedNames = setOf(
                        "actors.json", "classes.json", "skills.json", "items.json",
                        "weapons.json", "armors.json", "enemies.json", "states.json",
                        "troops.json", "commonevents.json", "mapinfos.json", "system.json"
                    )

                    fun isSupportedName(name: String): Boolean {
                        val lower = name.lowercase()
                        return lower in acceptedNames || Regex("map\\d+\\.json").matches(lower)
                    }

                    fun visit(directory: DocumentFile, prefix: String, depth: Int) {
                        if (limitReached || depth > 8) return
                        val children = runCatching {
                            directory.listFiles().sortedBy { it.name ?: "" }
                        }.getOrDefault(emptyList())

                        for (child in children) {
                            if (limitReached) return
                            val childName = child.name ?: continue
                            if (child.isDirectory) {
                                val nextPrefix = if (prefix.isBlank()) childName else "$prefix/$childName"
                                visit(child, nextPrefix, depth + 1)
                            } else if (child.isFile && isSupportedName(childName)) {
                                if (files.size >= 500) {
                                    limitReached = true
                                    return
                                }
                                val relativePath = if (prefix.isBlank()) childName else "$prefix/$childName"
                                val text = runCatching {
                                    resolver.openInputStream(child.uri)?.use { input ->
                                        BufferedReader(InputStreamReader(input, Charsets.UTF_8)).readText()
                                    }
                                }.getOrNull() ?: continue

                                totalChars += text.length.toLong()
                                if (totalChars > 24L * 1024 * 1024) {
                                    limitReached = true
                                    return
                                }
                                files += RpgMakerBatchEngine.SourceFile(relativePath, text)
                            }
                        }
                    }

                    visit(root, "", 0)
                    val label = root.name?.takeIf { it.isNotBlank() } ?: "RPG Maker"
                    val batchText = if (limitReached) null else RpgMakerBatchEngine.createBatchProject(files, label)
                    Pair(label, batchText)
                }

                val batchText = folderResult?.second
                val batchProject = batchText?.let { TransProject.parse(it) }
                if (folderResult != null && batchProject != null) {
                    parsedProject = batchProject
                    projectRows = batchProject.rows
                    sourceText = ""
                    fileName = "${folderResult.first}-translated.trans"
                    isFileLoaded = true
                    status = "تم تحليل المجلد: ${batchProject.rows.size} نصاً من ملفات RPG Maker المدعومة. صدّر ZIP بعد الترجمة."
                } else {
                    status = "لم أجد ملفات RPG Maker JSON مدعومة، أو تجاوز المجلد حد الحجم التجريبي."
                }
            }
        }
    }

    val project = parsedProject
    // Metadata does not change while typing, so don't serialize/parse the full original JSON on every keystroke.
    val canExportGameJson = remember(project) {
        project?.let { RpgMakerJsonEngine.canRebuild(it.toJson()) } == true
    }
    val canExportBatchZip = remember(project) {
        project?.let { RpgMakerBatchEngine.canRebuild(it.toJson()) } == true
    }
    val fileBase = fileName.substringBeforeLast('.', fileName)
    val cleanBase = fileBase
        .removeSuffix("-translated")
        .removeSuffix("-edited")
    val defaultExportName = when {
        project == null -> "$fileBase-translated.txt"
        fileName.endsWith(".trans", ignoreCase = true) -> "$cleanBase-edited.trans"
        else -> "$fileBase-translated.trans"
    }
    val defaultJsonName = "$cleanBase-translated.json"
    val defaultZipName = "$cleanBase-translated-json.zip"

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text("Translator++ Android", style = MaterialTheme.typography.headlineSmall)
        Text("ARM64 • مرحلة نقل أولية")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { openFile.launch(arrayOf("*/*")) }) {
                Text("فتح ملف")
            }
            Button(
                enabled = isFileLoaded,
                onClick = {
                    val output = project?.toJson() ?: sourceText
                    onExport(defaultExportName, output)
                }
            ) {
                Text(if (project == null) "حفظ نسخة نصية" else "حفظ مشروع")
            }
        }
        Button(
            modifier = Modifier.fillMaxWidth(),
            onClick = { openFolder.launch(null) }
        ) {
            Text("فتح مجلد Data لـ RPG Maker")
        }
        if (canExportBatchZip && project != null) {
            Button(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    val zip = RpgMakerBatchEngine.rebuildZip(project.toJson())
                    if (zip == null) {
                        status = "تعذر إنشاء ZIP: تحقق من بيانات المشروع ومسارات الملفات."
                    } else {
                        onExportZip(defaultZipName, zip)
                    }
                }
            ) {
                Text("تصدير ملفات اللعبة المترجمة إلى ZIP")
            }
        }
        if (canExportGameJson && project != null) {
            Button(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    val rebuilt = RpgMakerJsonEngine.rebuildTranslatedJson(project.toJson())
                    if (rebuilt == null) {
                        status = "تعذر إعادة بناء JSON: فشل التحقق من بيانات المشروع أو مسارات النصوص."
                    } else {
                        onExportJson(defaultJsonName, rebuilt)
                    }
                }
            ) {
                Text("تصدير JSON اللعبة المترجم")
            }
        }
        Text("الملف: $fileName", style = MaterialTheme.typography.bodySmall)
        Text(status, style = MaterialTheme.typography.bodyMedium)
        if (exportStatus.isNotBlank()) {
            Text(exportStatus, style = MaterialTheme.typography.bodySmall)
        }

        if (project != null) {
            Text(
                "المشروع • ${project.rows.size} صف • عمود الترجمة: ${project.targetLabel}",
                style = MaterialTheme.typography.titleSmall
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                Text(project.sourceLabel, modifier = Modifier.weight(1f), style = MaterialTheme.typography.labelLarge)
                Text(project.targetLabel, modifier = Modifier.weight(1f), style = MaterialTheme.typography.labelLarge)
            }
            LazyColumn(
                modifier = Modifier.fillMaxWidth().weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(projectRows, key = { it.index }) { row ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(10.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text("الأصل", style = MaterialTheme.typography.labelMedium)
                            Text(
                                text = row.source.ifBlank { "—" },
                                style = MaterialTheme.typography.bodyMedium
                            )
                            OutlinedTextField(
                                value = row.target,
                                onValueChange = { newValue ->
                                    project.updateTranslation(row.index, newValue)
                                    projectRows = project.rows
                                },
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("الترجمة") },
                                minLines = 2
                            )
                            if (row.context.isNotBlank()) {
                                Text(row.context, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
        } else {
            OutlinedTextField(
                value = sourceText,
                onValueChange = { sourceText = it },
                modifier = Modifier.fillMaxWidth().weight(1f),
                label = { Text("محتوى الملف") },
                minLines = 8
            )
            Text(
                "يدعم الملفات ومجلد Data المستخرج بصيغة JSON فقط. لا يفك حزم اللعبة أو الأصول الثنائية المشفّرة.",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
