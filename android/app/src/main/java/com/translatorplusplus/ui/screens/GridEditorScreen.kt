package com.translatorplusplus.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.translatorplusplus.model.*
import com.translatorplusplus.service.EscapeService
import com.translatorplusplus.ui.MainViewModel
import com.translatorplusplus.ui.components.EngineBadge
import com.translatorplusplus.ui.components.HighlightedGameText
import com.translatorplusplus.ui.components.StatusBadge
import com.translatorplusplus.ui.components.TagDot
import com.translatorplusplus.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GridEditorScreen(
    viewModel: MainViewModel,
    onNavigateToSimulator: () -> Unit
) {
    val activeProject by viewModel.activeProject.collectAsState()
    val activeFile by viewModel.activeFile.collectAsState()
    val filteredRows by viewModel.filteredRows.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val filterStatus by viewModel.filterStatus.collectAsState()
    val filterTag by viewModel.filterTag.collectAsState()
    val isBatchTranslating by viewModel.isBatchTranslating.collectAsState()
    val batchProgress by viewModel.batchProgress.collectAsState()

    var showFileSelectorMenu by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
            ) {
                // Project & File Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = activeProject?.name ?: "No Project",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            if (activeProject != null) {
                                Spacer(modifier = Modifier.width(6.dp))
                                EngineBadge(engine = activeProject!!.engine)
                            }
                        }

                        // File Selector Dropdown Trigger
                        Box {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable { showFileSelectorMenu = true }
                                    .padding(vertical = 2.dp)
                            ) {
                                Icon(Icons.Default.InsertDriveFile, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = activeFile?.name ?: "Select File",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                            }

                            DropdownMenu(
                                expanded = showFileSelectorMenu,
                                onDismissRequest = { showFileSelectorMenu = false }
                            ) {
                                activeProject?.files?.forEach { file ->
                                    DropdownMenuItem(
                                        text = {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text(file.name)
                                                Text(
                                                    "${file.translatedCount}/${file.totalCount}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        },
                                        onClick = {
                                            viewModel.selectFile(file.id)
                                            showFileSelectorMenu = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // Progress Pill
                    activeFile?.let { file ->
                        Surface(
                            color = MaterialTheme.colorScheme.primaryContainer,
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(
                                text = "${file.translatedCount}/${file.totalCount} Strings (${(file.progressPercent * 100).toInt()}%)",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                // Translator++ CAT Action Ribbon
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 12.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    FilledTonalButton(
                        onClick = { viewModel.showBatchTranslateDialog.value = true },
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Icon(Icons.Default.Translate, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Batch Translate", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }

                    FilledTonalButton(
                        onClick = { viewModel.applyGlossary() },
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Icon(Icons.Default.MenuBook, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Apply Glossary", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }

                    FilledTonalButton(
                        onClick = onNavigateToSimulator,
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Icon(Icons.Default.Preview, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Game Preview", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }

                    FilledTonalButton(
                        onClick = { viewModel.showExportDialog.value = true },
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Export Patch", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                // Batch Progress Indicator
                AnimatedVisibility(visible = isBatchTranslating) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f))
                            .padding(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                "Running Machine Translation with Code Preservation...",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "${(batchProgress * 100).toInt()}%",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        LinearProgressIndicator(
                            progress = { batchProgress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(4.dp)
                                .clip(RoundedCornerShape(2.dp))
                        )
                    }
                }

                // Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { viewModel.searchQuery.value = it },
                    placeholder = { Text("Search original, translation, context, notes...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { viewModel.searchQuery.value = "" }) {
                                Icon(Icons.Default.Close, contentDescription = "Clear")
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 4.dp),
                    singleLine = true
                )

                // Filter Chips Row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 12.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    FilterChip(
                        selected = filterStatus == null,
                        onClick = { viewModel.filterStatus.value = null },
                        label = { Text("All (${activeFile?.totalCount ?: 0})", fontSize = 11.sp) }
                    )
                    RowStatus.values().forEach { st ->
                        FilterChip(
                            selected = filterStatus == st,
                            onClick = {
                                viewModel.filterStatus.value = if (filterStatus == st) null else st
                            },
                            label = { Text(st.label, fontSize = 11.sp) },
                            leadingIcon = {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(st.color)
                                )
                            }
                        )
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
            }
        }
    ) { innerPadding ->
        if (filteredRows.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.FilterList,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        "No strings match current filter or search",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(top = 10.dp, bottom = 60.dp)
            ) {
                items(filteredRows, key = { it.id }) { row ->
                    TranslationGridRowCard(
                        row = row,
                        onUpdate = { text, st, tag, comment ->
                            viewModel.updateRow(row.id, text, st, tag, comment)
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun TranslationGridRowCard(
    row: TranslationRow,
    onUpdate: (text: String?, status: RowStatus?, tag: RowTag?, comment: String?) -> Unit
) {
    var isEditing by remember { mutableStateOf(false) }
    var currentText by remember(row.translatedText) { mutableStateOf(row.translatedText) }
    var showTagMenu by remember { mutableStateOf(false) }
    var showCommentDialog by remember { mutableStateOf(false) }

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(10.dp),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (row.isLineWrapWarning) AccentAmber else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Header Bar: Row ID, Context, Speaker, Status, Tag
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "#${row.keyIndex}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    if (row.speaker.isNotBlank()) {
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = row.speaker,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                    Text(
                        text = row.context,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    TagDot(tag = row.tag)
                    Spacer(modifier = Modifier.width(6.dp))
                    StatusBadge(status = row.status)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Original Text Box with Syntax Highlight
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                shape = RoundedCornerShape(6.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(8.dp)) {
                    Text(
                        "Original:",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 10.sp
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    HighlightedGameText(text = row.originalText)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Translated Text Field
            OutlinedTextField(
                value = currentText,
                onValueChange = {
                    currentText = it
                    onUpdate(it, null, null, null)
                },
                placeholder = { Text("Enter translation...", fontSize = 13.sp) },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                )
            )

            // Word wrap warning alert
            if (row.isLineWrapWarning) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(6.dp))
                        .background(AccentAmber.copy(alpha = 0.15f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = AccentAmber, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        "Line wrap warning: may exceed dialogue window width",
                        style = MaterialTheme.typography.labelSmall,
                        color = AccentAmber,
                        modifier = Modifier.weight(1f)
                    )
                    TextButton(
                        onClick = {
                            val formatted = EscapeService.formatWithLineBreaks(currentText)
                            currentText = formatted
                            onUpdate(formatted, null, null, null)
                        },
                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text("Auto-wrap", fontSize = 11.sp, color = AccentAmber, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // MT Candidates Pills (DeepL, Google, Gemini AI)
            if (row.candidates.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Translation Suggestions (Tap to insert):",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 10.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(row.candidates.entries.toList()) { (engine, candidateText) ->
                        Surface(
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(6.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)),
                            modifier = Modifier.clickable {
                                currentText = candidateText
                                onUpdate(candidateText, RowStatus.DRAFT, null, null)
                            }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "$engine: ",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = candidateText,
                                    style = MaterialTheme.typography.bodySmall,
                                    maxLines = 1
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Bottom Action Bar: Quick Status, Tag picker, Note
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Status Toggle Buttons
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    listOf(RowStatus.DRAFT, RowStatus.REVIEW, RowStatus.APPROVED).forEach { st ->
                        Surface(
                            color = if (row.status == st) st.color.copy(alpha = 0.25f) else Color.Transparent,
                            shape = RoundedCornerShape(6.dp),
                            border = if (row.status == st) androidx.compose.foundation.BorderStroke(1.dp, st.color) else null,
                            modifier = Modifier.clickable { onUpdate(null, st, null, null) }
                        ) {
                            Text(
                                text = st.label,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (row.status == st) st.color else MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = if (row.status == st) FontWeight.Bold else FontWeight.Normal,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                            )
                        }
                    }
                }

                // Tags & Comment Buttons
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Tag Selector
                    Box {
                        IconButton(onClick = { showTagMenu = true }, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Default.Label, contentDescription = "Tag", tint = if (row.tag != RowTag.NONE) row.tag.color else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                        }
                        DropdownMenu(
                            expanded = showTagMenu,
                            onDismissRequest = { showTagMenu = false }
                        ) {
                            RowTag.values().forEach { t ->
                                DropdownMenuItem(
                                    text = {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Box(
                                                modifier = Modifier
                                                    .size(10.dp)
                                                    .clip(CircleShape)
                                                    .background(t.color)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(t.label)
                                        }
                                    },
                                    onClick = {
                                        onUpdate(null, null, t, null)
                                        showTagMenu = false
                                    }
                                )
                            }
                        }
                    }

                    // Comment Button
                    IconButton(onClick = { showCommentDialog = true }, modifier = Modifier.size(32.dp)) {
                        Icon(
                            Icons.Default.Comment,
                            contentDescription = "Notes",
                            tint = if (row.comment.isNotBlank()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            if (row.comment.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Note: ${row.comment}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 11.sp
                )
            }
        }
    }

    if (showCommentDialog) {
        var commentText by remember { mutableStateOf(row.comment) }
        AlertDialog(
            onDismissRequest = { showCommentDialog = false },
            title = { Text("Row Translator Note") },
            text = {
                OutlinedTextField(
                    value = commentText,
                    onValueChange = { commentText = it },
                    label = { Text("Notes / Comments for Reviewers") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 4
                )
            },
            confirmButton = {
                Button(onClick = {
                    onUpdate(null, null, null, commentText)
                    showCommentDialog = false
                }) {
                    Text("Save Note")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCommentDialog = false }) { Text("Cancel") }
            }
        )
    }
}
