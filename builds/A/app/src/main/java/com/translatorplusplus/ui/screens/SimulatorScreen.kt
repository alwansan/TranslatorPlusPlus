package com.translatorplusplus.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.translatorplusplus.model.TranslationRow
import com.translatorplusplus.service.EscapeService
import com.translatorplusplus.ui.MainViewModel
import com.translatorplusplus.ui.components.HighlightedGameText
import com.translatorplusplus.ui.theme.*

@Composable
fun SimulatorScreen(
    viewModel: MainViewModel
) {
    val activeFile by viewModel.activeFile.collectAsState()
    val rows = activeFile?.rows ?: emptyList()

    var selectedRowIndex by remember { mutableStateOf(0) }
    val currentRow: TranslationRow? = rows.getOrNull(selectedRowIndex)

    var simulatedSpeaker by remember(currentRow) { mutableStateOf(currentRow?.speaker ?: "Character") }
    var simulatedText by remember(currentRow) { mutableStateOf(currentRow?.translatedText?.ifBlank { currentRow.originalText } ?: "") }
    var windowStyle by remember { mutableStateOf("JRPG Classic") } // JRPG Classic, Visual Novel Dark, Minimalist

    val isOverflowing = remember(simulatedText) {
        EscapeService.checkWordWrapOverflow(simulatedText, maxCharsPerLine = 44, maxLines = 4)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text(
            "In-Game Dialogue Box Simulator",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )
        Text(
            "Preview in-game text rendering and verify dialogue box line wrapping before export.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        // Row Selector Pills
        if (rows.isNotEmpty()) {
            Text("Select String from ${activeFile?.name}:", style = MaterialTheme.typography.labelSmall)
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(rows.indices.toList()) { idx ->
                    val r = rows[idx]
                    FilterChip(
                        selected = selectedRowIndex == idx,
                        onClick = { selectedRowIndex = idx },
                        label = { Text("#${r.keyIndex} ${r.speaker.take(8)}") }
                    )
                }
            }
        }

        // Style Selector
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Window Theme:", style = MaterialTheme.typography.labelSmall)
            listOf("JRPG Classic", "Visual Novel", "Modern Dark").forEach { style ->
                FilterChip(
                    selected = windowStyle == style,
                    onClick = { windowStyle = style },
                    label = { Text(style, fontSize = 11.sp) }
                )
            }
        }

        // The In-Game Dialogue Box Canvas!
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(
                    when (windowStyle) {
                        "JRPG Classic" -> Brush.verticalGradient(listOf(Color(0xFF03153A), Color(0xFF0A0F1D)))
                        "Visual Novel" -> Brush.verticalGradient(listOf(Color(0xFF18181B), Color(0xFF09090B)))
                        else -> Brush.verticalGradient(listOf(Color(0xFF1E293B), Color(0xFF0F172A)))
                    }
                )
                .border(
                    3.dp,
                    when (windowStyle) {
                        "JRPG Classic" -> Color(0xFFD4AF37) // Gold border
                        "Visual Novel" -> Color(0xFF3B82F6) // Neon blue border
                        else -> Color(0xFF64748B)
                    },
                    RoundedCornerShape(12.dp)
                )
                .padding(16.dp)
        ) {
            Column {
                // Speaker Nameplate
                if (simulatedSpeaker.isNotBlank()) {
                    Surface(
                        color = when (windowStyle) {
                            "JRPG Classic" -> Color(0xFFD4AF37).copy(alpha = 0.25f)
                            else -> Color(0xFF3B82F6).copy(alpha = 0.25f)
                        },
                        shape = RoundedCornerShape(6.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (windowStyle == "JRPG Classic") Color(0xFFD4AF37) else Color(0xFF3B82F6)
                        )
                    ) {
                        Text(
                            text = simulatedSpeaker,
                            color = Color.White,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                }

                // Dialogue Content Area
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Top
                ) {
                    // Character Avatar Placeholder
                    Surface(
                        color = Color(0xFF1E293B),
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF475569)),
                        modifier = Modifier.size(60.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.Person,
                                contentDescription = null,
                                tint = Color(0xFF94A3B8),
                                modifier = Modifier.size(36.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    // Dialog text
                    Column(modifier = Modifier.weight(1f)) {
                        HighlightedGameText(
                            text = simulatedText,
                            textColor = Color(0xFFF8FAFC)
                        )
                    }
                }
            }
        }

        // Overflow Warning Alert
        if (isOverflowing) {
            Surface(
                color = AccentAmber.copy(alpha = 0.15f),
                shape = RoundedCornerShape(8.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, AccentAmber.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = AccentAmber, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Text Overflows Game Textbox!",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = AccentAmber
                        )
                        Text(
                            "String exceeds 4 lines or 44 chars/line. Players will experience clipped dialogue.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Button(
                        onClick = {
                            val wrapped = EscapeService.formatWithLineBreaks(simulatedText, maxCharsPerLine = 40)
                            simulatedText = wrapped
                            currentRow?.let { row ->
                                viewModel.updateRow(row.id, translatedText = wrapped)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = AccentAmber),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text("Auto-wrap", fontSize = 11.sp, color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            Surface(
                color = AccentGreen.copy(alpha = 0.15f),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = AccentGreen, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Word wrap verified: Text fits cleanly within standard game textbox parameters.",
                        style = MaterialTheme.typography.bodySmall,
                        color = AccentGreen
                    )
                }
            }
        }

        // Live Dialogue Text Editor
        OutlinedTextField(
            value = simulatedText,
            onValueChange = {
                simulatedText = it
                currentRow?.let { row ->
                    viewModel.updateRow(row.id, translatedText = it)
                }
            },
            label = { Text("Edit Dialogue") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3
        )
    }
}
