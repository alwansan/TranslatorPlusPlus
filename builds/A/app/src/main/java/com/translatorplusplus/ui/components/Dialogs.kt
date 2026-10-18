package com.translatorplusplus.ui.components

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.translatorplusplus.model.*
import com.translatorplusplus.service.EscapeService
import com.translatorplusplus.ui.MainViewModel

@Composable
fun NewProjectDialog(
    onDismiss: () -> Unit,
    onCreate: (name: String, engine: GameEngine, source: String, target: String, desc: String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var selectedEngine by remember { mutableStateOf(GameEngine.RPG_MAKER_MV_MZ) }
    var sourceLang by remember { mutableStateOf("Japanese (ja)") }
    var targetLang by remember { mutableStateOf("English (en)") }
    var description by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New Game Project", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Game Title") },
                    placeholder = { Text("e.g. Echoes of Eldoria") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Text("Game Engine / Format", style = MaterialTheme.typography.labelMedium)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    GameEngine.values().take(4).forEach { engine ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { selectedEngine = engine }
                                .padding(vertical = 4.dp, horizontal = 6.dp)
                        ) {
                            RadioButton(
                                selected = selectedEngine == engine,
                                onClick = { selectedEngine = engine }
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(engine.displayName, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = sourceLang,
                        onValueChange = { sourceLang = it },
                        label = { Text("Source") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = targetLang,
                        onValueChange = { targetLang = it },
                        label = { Text("Target") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Project Notes (Optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onCreate(name, selectedEngine, sourceLang, targetLang, description) },
                enabled = name.isNotBlank()
            ) {
                Text("Create Project")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
fun BatchTranslateDialog(
    engines: List<TranslationEngineConfig>,
    onDismiss: () -> Unit,
    onStart: (engineId: String, escapeAlgorithm: EscapeAlgorithmType, onlyUntranslated: Boolean) -> Unit
) {
    var selectedEngineId by remember { mutableStateOf(engines.firstOrNull()?.id ?: "") }
    var selectedEscape by remember { mutableStateOf(EscapeAlgorithmType.RPG_MAKER) }
    var onlyUntranslated by remember { mutableStateOf(true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Translate, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Batch Machine Translation", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text("Select Translation Engine:", style = MaterialTheme.typography.labelMedium)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    engines.forEach { eng ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { selectedEngineId = eng.id }
                                .padding(vertical = 4.dp, horizontal = 4.dp)
                        ) {
                            RadioButton(
                                selected = selectedEngineId == eng.id,
                                onClick = { selectedEngineId = eng.id }
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Column {
                                Text(eng.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                Text(eng.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }

                HorizontalDivider()

                Text("Syntax Escaping Algorithm:", style = MaterialTheme.typography.labelMedium)
                EscapeAlgorithmType.values().forEach { esc ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { selectedEscape = esc }
                            .padding(vertical = 4.dp, horizontal = 4.dp)
                    ) {
                        RadioButton(
                            selected = selectedEscape == esc,
                            onClick = { selectedEscape = esc }
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Column {
                            Text(esc.label, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                            Text(esc.patternDescription, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }

                HorizontalDivider()

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = onlyUntranslated,
                        onCheckedChange = { onlyUntranslated = it }
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Translate untranslated rows only", style = MaterialTheme.typography.bodyMedium)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onStart(selectedEngineId, selectedEscape, onlyUntranslated) }
            ) {
                Text("Run Batch Translate")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
fun ExportDialog(
    jsonPatch: String,
    onDismiss: () -> Unit
) {
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Download, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Export Translation Patch", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    "Generated engine-ready patch for game distribution and injection.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 240.dp)
                ) {
                    Text(
                        text = jsonPatch,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 11.sp,
                        modifier = Modifier
                            .padding(10.dp)
                            .verticalScroll(rememberScrollState())
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    clipboardManager.setText(AnnotatedString(jsonPatch))
                    Toast.makeText(context, "Translation patch copied to clipboard!", Toast.LENGTH_SHORT).show()
                    onDismiss()
                }
            ) {
                Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Copy Patch JSON")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Close") }
        }
    )
}

@Composable
fun AddGlossaryDialog(
    onDismiss: () -> Unit,
    onAdd: (term: String, translation: String, category: String, notes: String) -> Unit
) {
    var term by remember { mutableStateOf("") }
    var translation by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Character") }
    var notes by remember { mutableStateOf("") }

    val categories = listOf("Character", "Item", "Skill", "Location", "System", "Dialogue")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Term to Glossary", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = term,
                    onValueChange = { term = it },
                    label = { Text("Original Term (e.g. 勇者)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedTextField(
                    value = translation,
                    onValueChange = { translation = it },
                    label = { Text("Official Translation (e.g. Hero)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Text("Category:", style = MaterialTheme.typography.labelMedium)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    categories.take(3).forEach { cat ->
                        FilterChip(
                            selected = category == cat,
                            onClick = { category = cat },
                            label = { Text(cat, fontSize = 11.sp) }
                        )
                    }
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    categories.drop(3).forEach { cat ->
                        FilterChip(
                            selected = category == cat,
                            onClick = { category = cat },
                            label = { Text(cat, fontSize = 11.sp) }
                        )
                    }
                }
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Context Notes (Optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onAdd(term, translation, category, notes) },
                enabled = term.isNotBlank() && translation.isNotBlank()
            ) {
                Text("Save Term")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NetCollabSheet(
    status: NetCollabStatus,
    onToggleServe: () -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    Icons.Default.Group,
                    contentDescription = null,
                    tint = if (status.isServing) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        "NetCollab Multiplayer CAT",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        if (status.isServing) "Hosting active translation session" else "Decentralized team translation server is idle",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Session Room Code:", style = MaterialTheme.typography.bodyMedium)
                        Text(status.roomCode, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Direct Host IP:", style = MaterialTheme.typography.bodyMedium)
                        Text(status.hostIp, fontWeight = FontWeight.SemiBold, fontFamily = FontFamily.Monospace)
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Active Collaborators:", style = MaterialTheme.typography.bodyMedium)
                        Text("${status.activePeersCount} users connected", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Text("Team Members in Session:", style = MaterialTheme.typography.labelMedium)
            status.connectedCollaborators.forEach { user ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF10B981))
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(user, style = MaterialTheme.typography.bodyMedium)
                }
            }

            Button(
                onClick = onToggleServe,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (status.isServing) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    if (status.isServing) Icons.Default.Stop else Icons.Default.PlayArrow,
                    contentDescription = null
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(if (status.isServing) "Stop Serving Session" else "Start Serving Session")
            }

            Spacer(modifier = Modifier.height(10.dp))
        }
    }
}
