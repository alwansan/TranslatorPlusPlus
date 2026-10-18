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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.io.BufferedReader
import java.io.InputStreamReader

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    TranslatorPrototype(
                        resolver = contentResolver,
                        onExport = { text ->
                            exportLauncher.launch("translation.txt")
                        },
                        exportTextProvider = { pendingExport = it }
                    )
                }
            }
        }
    }

    private var pendingExport by mutableStateOf("")
    private val exportLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument("text/plain")
    ) { uri: Uri? ->
        if (uri != null) {
            contentResolver.openOutputStream(uri)?.bufferedWriter(Charsets.UTF_8)?.use {
                it.write(pendingExport)
            }
        }
    }
}

@Composable
private fun TranslatorPrototype(
    resolver: ContentResolver,
    onExport: (String) -> Unit,
    exportTextProvider: (String) -> Unit
) {
    var fileName by remember { mutableStateOf("لم يتم اختيار ملف") }
    var sourceText by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("نموذج أولي: استيراد وتحرير نصوص عادية فقط") }

    val openFile = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            runCatching {
                resolver.openInputStream(uri)?.use { input ->
                    BufferedReader(InputStreamReader(input, Charsets.UTF_8)).readText()
                } ?: error("تعذر فتح الملف")
            }.onSuccess { content ->
                sourceText = content
                fileName = uri.lastPathSegment ?: "ملف مستورد"
                status = "تم فتح الملف. راجع النص قبل التصدير."
            }.onFailure { error ->
                status = "فشل فتح الملف: ${error.message ?: "خطأ غير معروف"}"
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Translator++ Android", style = MaterialTheme.typography.headlineSmall)
        Text("ARM64 • واجهة تجريبية")
        Text(status, style = MaterialTheme.typography.bodyMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = {
                openFile.launch(arrayOf("text/*", "application/json", "application/xml"))
            }) { Text("فتح ملف نصي") }
            Button(onClick = {
                exportTextProvider(sourceText)
                onExport(sourceText)
            }, enabled = sourceText.isNotEmpty()) { Text("تصدير النص") }
        }
        Text("الملف: $fileName")
        OutlinedTextField(
            value = sourceText,
            onValueChange = { sourceText = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("النص القابل للتحرير") },
            minLines = 12
        )
        Text(
            "هذه ليست نسخة Translator++ الكاملة بعد. لا يوجد حالياً محللات ألعاب أو نظام مشاريع T++؛ هذا أساس Android أولي لاختبار اختيار الملفات والتحرير والتصدير."
        )
    }
}
