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
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader

private data class TransRow(
    val index: Int,
    val source: String,
    val target: String
)

private data class ParsedTransProject(
    val root: JSONObject,
    val rows: List<TransRow>,
    val sourceIndex: Int,
    val targetIndex: Int,
    val sourceLabel: String,
    val targetLabel: String
)

private fun jsonCell(row: JSONArray, index: Int): String {
    if (index < 0 || index >= row.length() || row.isNull(index)) return ""
    val value = row.opt(index) ?: return ""
    return if (value == JSONObject.NULL) "" else value.toString()
}

/**
 * Recognizes the JSON project structure used by Translator++ .trans files.
 * The entire original object is retained so project metadata and other columns
 * survive an edit/export round trip.
 */
private fun parseTransProject(content: String): ParsedTransProject? {
    return try {
        val root = JSONObject(content)
        val data = root.optJSONArray("data") ?: return null
        val project = root.optJSONObject("project") ?: return null
        val headers = root.optJSONArray("colHeaders") ?: return null
        val sourceIndex = project.optInt("indexOriginal", 0).coerceAtLeast(0)
        val targetIndex = project.optInt("indexTranslation", 1).coerceAtLeast(0)
        if (sourceIndex == targetIndex) return null

        val rows = buildList {
            for (i in 0 until data.length()) {
                val cells = data.optJSONArray(i) ?: continue
                add(
                    TransRow(
                        index = i,
                        source = jsonCell(cells, sourceIndex),
                        target = jsonCell(cells, targetIndex)
                    )
                )
            }
        }
        ParsedTransProject(
            root = root,
            rows = rows,
            sourceIndex = sourceIndex,
            targetIndex = targetIndex,
            sourceLabel = headers.optString(sourceIndex, "النص الأصلي"),
            targetLabel = headers.optString(targetIndex, "الترجمة")
        )
    } catch (_: Exception) {
        null
    }
}

class MainActivity : ComponentActivity() {
    private var pendingExport by mutableStateOf("")
    private var exportStatus by mutableStateOf("")

    private val exportLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument("text/plain")
    ) { uri: Uri? ->
        if (uri == null) {
            exportStatus = "تم إلغاء الحفظ."
        } else {
            runCatching {
                val output = contentResolver.openOutputStream(uri)
                    ?: error("تعذر فتح الملف للكتابة")
                output.bufferedWriter(Charsets.UTF_8).use { it.write(pendingExport) }
            }.onSuccess {
                exportStatus = "تم حفظ الملف بنجاح."
            }.onFailure { error ->
                exportStatus = "فشل الحفظ: ${error.message ?: "خطأ غير معروف"}"
            }
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
                            exportStatus = "اختر مكان حفظ الملف."
                            exportLauncher.launch(name)
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
    onExport: (String, String) -> Unit
) {
    var fileName by remember { mutableStateOf("لم يتم اختيار ملف") }
    var sourceText by remember { mutableStateOf("") }
    var parsedProject by remember { mutableStateOf<ParsedTransProject?>(null) }
    var projectRows by remember { mutableStateOf<List<TransRow>>(emptyList()) }
    var isFileLoaded by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf("نموذج Android أولي: افتح ملفاً لتبدأ") }

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
                val project = parseTransProject(content.removePrefix("\uFEFF"))
                if (project != null) {
                    parsedProject = project
                    projectRows = project.rows
                    sourceText = ""
                    status = "تم التعرف على مشروع Translator++: ${project.rows.size} صفاً قابلاً للتحرير."
                } else {
                    parsedProject = null
                    projectRows = emptyList()
                    sourceText = content
                    status = "تم فتح ملف نصي. هذا الوضع لا يحلل ملفات الألعاب."
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

    fun updateTarget(rowIndex: Int, newValue: String) {
        val project = parsedProject ?: return
        val data = project.root.optJSONArray("data") ?: return
        val cells = data.optJSONArray(rowIndex) ?: return
        while (cells.length() <= project.targetIndex) cells.put(JSONObject.NULL)
        cells.put(project.targetIndex, newValue)
        projectRows = projectRows.map { row ->
            if (row.index == rowIndex) row.copy(target = newValue) else row
        }
    }

    val project = parsedProject
    val defaultExportName = if (project != null) {
        "${fileName.substringBeforeLast('.', fileName)}-translated.trans"
    } else {
        "${fileName.substringBeforeLast('.', fileName)}-translated.txt"
    }

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
                    val output = parsedProject?.root?.toString(2) ?: sourceText
                    onExport(defaultExportName, output)
                }
            ) {
                Text("حفظ نسخة")
            }
        }
        Text("الملف: $fileName", style = MaterialTheme.typography.bodySmall)
        Text(status, style = MaterialTheme.typography.bodyMedium)
        if (exportStatus.isNotBlank()) {
            Text(exportStatus, style = MaterialTheme.typography.bodySmall)
        }

        if (project != null) {
            Text(
                "مشروع Translator++ • ${project.rows.size} صف • عمود الترجمة: ${project.targetLabel}",
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
                                onValueChange = { updateTarget(row.index, it) },
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("الترجمة") },
                                minLines = 2
                            )
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
                "الملفات التي لا تطابق بنية .trans تُفتح كنص عادي. لا توجد بعد أدوات استخراج وإعادة بناء ملفات الألعاب.",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
