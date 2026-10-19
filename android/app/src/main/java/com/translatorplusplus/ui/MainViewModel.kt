package com.translatorplusplus.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.translatorplusplus.data.ProjectRepository
import com.translatorplusplus.model.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class MainViewModel(
    val repository: ProjectRepository = ProjectRepository()
) : ViewModel() {

    val projects = repository.projects
    val activeProjectId = repository.activeProjectId
    val activeFileId = repository.activeFileId
    val glossary = repository.glossary
    val engines = repository.engines
    val netCollabStatus = repository.netCollabStatus
    val isBatchTranslating = repository.isBatchTranslating
    val batchProgress = repository.batchProgress

    val activeProject: StateFlow<GameProject?> = combine(projects, activeProjectId) { projs, id ->
        projs.find { it.id == id } ?: projs.firstOrNull()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val activeFile: StateFlow<TranslationFile?> = combine(activeProject, activeFileId) { proj, fileId ->
        proj?.files?.find { it.id == fileId } ?: proj?.files?.firstOrNull()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val searchQuery = MutableStateFlow("")
    val filterStatus = MutableStateFlow<RowStatus?>(null)
    val filterTag = MutableStateFlow<RowTag?>(null)
    val selectedRowId = MutableStateFlow<String?>(null)

    val filteredRows: StateFlow<List<TranslationRow>> = combine(
        activeFile,
        searchQuery,
        filterStatus,
        filterTag
    ) { file, query, status, tag ->
        val list = file?.rows ?: emptyList()
        list.filter { row ->
            val matchQuery = query.isBlank() ||
                    row.originalText.contains(query, ignoreCase = true) ||
                    row.translatedText.contains(query, ignoreCase = true) ||
                    row.speaker.contains(query, ignoreCase = true) ||
                    row.context.contains(query, ignoreCase = true) ||
                    row.comment.contains(query, ignoreCase = true)

            val matchStatus = status == null || row.status == status
            val matchTag = tag == null || row.tag == tag

            matchQuery && matchStatus && matchTag
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val selectedRow: StateFlow<TranslationRow?> = combine(activeFile, selectedRowId) { file, rowId ->
        file?.rows?.find { it.id == rowId } ?: file?.rows?.firstOrNull()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    // UI Dialog States
    val showNewProjectDialog = MutableStateFlow(false)
    val showBatchTranslateDialog = MutableStateFlow(false)
    val showExportDialog = MutableStateFlow(false)
    val showAddGlossaryDialog = MutableStateFlow(false)
    val showNetCollabSheet = MutableStateFlow(false)
    val showRowEditorSheet = MutableStateFlow(false)
    val snackbarMessage = MutableStateFlow<String?>(null)

    fun selectProject(projectId: String) {
        repository.selectProject(projectId)
    }

    fun selectFile(fileId: String) {
        repository.selectFile(fileId)
    }

    fun selectRow(rowId: String) {
        selectedRowId.value = rowId
        showRowEditorSheet.value = true
    }

    fun updateRow(
        rowId: String,
        translatedText: String? = null,
        status: RowStatus? = null,
        tag: RowTag? = null,
        comment: String? = null
    ) {
        repository.updateRow(rowId, translatedText, status, tag, comment)
    }

    fun applyGlossary() {
        val count = repository.applyGlossaryToCurrentFile()
        snackbarMessage.value = if (count > 0) "Applied glossary terms to $count row(s)!" else "No matching untranslated terms found."
    }

    fun runBatchTranslate(engineId: String, escapeAlgorithm: EscapeAlgorithmType, onlyUntranslated: Boolean) {
        snackbarMessage.value = "الترجمة الآلية غير متصلة بمزوّد فعلي حالياً؛ لم يتم تغيير أي صف."
        showBatchTranslateDialog.value = false
    }


    fun createProject(name: String, engine: GameEngine, source: String, target: String, desc: String) {
        val proj = repository.createProject(name, engine, source, target, desc)
        snackbarMessage.value = "Created project \"${proj.name}\""
        showNewProjectDialog.value = false
    }

    fun addGlossaryEntry(term: String, translation: String, category: String, notes: String) {
        repository.addGlossaryEntry(term, translation, category, notes)
        snackbarMessage.value = "Added \"$term\" to terminology glossary."
        showAddGlossaryDialog.value = false
    }

    fun removeGlossaryEntry(id: String) {
        repository.removeGlossaryEntry(id)
        snackbarMessage.value = "Glossary entry removed."
    }

    fun toggleNetCollab() {
        snackbarMessage.value = "التعاون عبر الشبكة غير منفّذ بعد في نسخة أندرويد."
    }

    fun importTranslationProject(projectContent: String, displayName: String) {
        val imported = repository.importTranslationProject(projectContent, displayName)
        snackbarMessage.value = if (imported) {
            "تم استيراد $displayName. التعديلات محفوظة في جلسة التطبيق الحالية."
        } else {
            "لم أتعرف على الملف كمشروع .trans أو ملف RPG Maker JSON مدعوم."
        }
    }

    fun notifyUser(message: String) { snackbarMessage.value = message }
    fun exportActiveTransProject(): Pair<String, String>? = repository.exportActiveTransProject()
    fun exportActiveRpgMakerJson(): Pair<String, String>? = repository.exportActiveRpgMakerJson()
    fun exportActiveRpgMakerZip(): Pair<String, ByteArray>? = repository.exportActiveRpgMakerZip()

    fun dismissSnackbar() {
        snackbarMessage.value = null
    }

    fun exportPatch(): String {
        return repository.exportActiveProjectAsJson()
    }
}
