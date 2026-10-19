package com.translatorplusplus.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.translatorplusplus.model.EscapeAlgorithmType
import com.translatorplusplus.model.TranslationEngineConfig
import com.translatorplusplus.service.EscapeService
import com.translatorplusplus.ui.MainViewModel

@Composable
fun EnginesScreen(
    viewModel: MainViewModel
) {
    val engines by viewModel.engines.collectAsState()

    var testInput by remember { mutableStateOf("\\c[1]勇者\\c[0]よ、旅の支度金として\\v[1]Gを授けよう。\\n大切に使うのじゃ！") }
    var selectedAlgorithm by remember { mutableStateOf(EscapeAlgorithmType.RPG_MAKER) }

    val maskResult = remember(testInput, selectedAlgorithm) {
        EscapeService.maskTokens(testInput, selectedAlgorithm)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(top = 12.dp, bottom = 80.dp)
    ) {
        item {
            Text(
                "Translation Engines & Automation",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                "Configure cloud APIs, offline neural models, and syntax escaping shields.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        // Translation Engines List
        items(engines, key = { it.id }) { engine ->
            EngineConfigCard(engine = engine)
        }

        item {
            Spacer(modifier = Modifier.height(6.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                "Game Syntax Escaping Playground",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                "Test how Translator++ masks and shields proprietary game control codes from MT corruption.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Select Preset Algorithm:", style = MaterialTheme.typography.labelMedium)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf(
                            EscapeAlgorithmType.RPG_MAKER to "RPG Maker",
                            EscapeAlgorithmType.RENPY to "Ren'Py",
                            EscapeAlgorithmType.UNITY_RICH_TEXT to "Unity"
                        ).forEach { (alg, label) ->
                            FilterChip(
                                selected = selectedAlgorithm == alg,
                                onClick = { selectedAlgorithm = alg },
                                label = { Text(label, fontSize = 11.sp) }
                            )
                        }
                    }

                    OutlinedTextField(
                        value = testInput,
                        onValueChange = { testInput = it },
                        label = { Text("Game String with Control Codes") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2
                    )

                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("Masked String (Sent to MT):", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = maskResult.maskedText,
                                fontFamily = FontFamily.Monospace,
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.primary
                            )

                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Shielded Tokens:", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            if (maskResult.tokens.isEmpty()) {
                                Text("None detected", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            } else {
                                maskResult.tokens.forEach { (tok, original) ->
                                    Text(
                                        "$tok  ➔  $original",
                                        fontFamily = FontFamily.Monospace,
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.secondary
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun EngineConfigCard(engine: TranslationEngineConfig) {
    var isEnabled by remember { mutableStateOf(engine.isEnabled) }
    var delayValue by remember { mutableStateOf(engine.delayMs.toFloat()) }

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(10.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(engine.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(engine.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Switch(
                    checked = isEnabled,
                    onCheckedChange = { isEnabled = it }
                )
            }

            if (isEnabled) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Request Delay: ${delayValue.toInt()} ms", style = MaterialTheme.typography.bodySmall)
                    Text("Batch Size: ${engine.batchSize} items", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Slider(
                    value = delayValue,
                    onValueChange = { delayValue = it },
                    valueRange = 50f..1000f,
                    steps = 18
                )
            }
        }
    }
}
