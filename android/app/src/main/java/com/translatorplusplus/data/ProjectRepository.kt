package com.translatorplusplus.data

import com.translatorplusplus.model.*
import com.translatorplusplus.service.EscapeService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject
import org.translatorplusplus.android.TransProject
import org.translatorplusplus.android.RpgMakerJsonEngine
import org.translatorplusplus.android.RpgMakerBatchEngine

class ProjectRepository {

    private val _projects = MutableStateFlow<List<GameProject>>(emptyList())
    val projects: StateFlow<List<GameProject>> = _projects.asStateFlow()

    private val _activeProjectId = MutableStateFlow<String>("")
    val activeProjectId: StateFlow<String> = _activeProjectId.asStateFlow()

    private val _activeFileId = MutableStateFlow<String>("")
    val activeFileId: StateFlow<String> = _activeFileId.asStateFlow()

    private val _glossary = MutableStateFlow<List<GlossaryEntry>>(emptyList())
    val glossary: StateFlow<List<GlossaryEntry>> = _glossary.asStateFlow()

    private val _engines = MutableStateFlow<List<TranslationEngineConfig>>(emptyList())
    val engines: StateFlow<List<TranslationEngineConfig>> = _engines.asStateFlow()

    private val _netCollabStatus = MutableStateFlow(NetCollabStatus())
    val netCollabStatus: StateFlow<NetCollabStatus> = _netCollabStatus.asStateFlow()

    private val _isBatchTranslating = MutableStateFlow(false)
    val isBatchTranslating: StateFlow<Boolean> = _isBatchTranslating.asStateFlow()

    private val _batchProgress = MutableStateFlow(0f)
    val batchProgress: StateFlow<Float> = _batchProgress.asStateFlow()

    private val importedTransProjects = mutableMapOf<String, TransProject>()

    init {
        initializeEngineCatalog()
    }

    private fun initializeEngineCatalog() {
        _engines.value = listOf(
            TranslationEngineConfig("eng_deepl", "DeepL Translation API", "DeepL", isEnabled = false, description = "Provider not connected yet."),
            TranslationEngineConfig("eng_gemini", "Gemini AI Localizer", "Gemini LLM", isEnabled = false, description = "Provider not connected yet."),
            TranslationEngineConfig("eng_google", "Google Cloud Translate", "Google", isEnabled = false, description = "Provider not connected yet."),
            TranslationEngineConfig("eng_offline", "Offline Translation Memory", "Offline TM", isEnabled = false, description = "No offline model bundled yet.")
        )
    }

    fun selectProject(projectId: String) {
        _activeProjectId.value = projectId
        val project = _projects.value.find { it.id == projectId }
        if (project != null && project.files.isNotEmpty()) {
            _activeFileId.value = project.files.first().id
        }
    }

    fun selectFile(fileId: String) {
        _activeFileId.value = fileId
    }

    fun updateRow(
        rowId: String,
        translatedText: String? = null,
        status: RowStatus? = null,
        tag: RowTag? = null,
        comment: String? = null
    ) {
        if (translatedText != null) {
            val sourceRow = _projects.value.asSequence()
                .flatMap { it.files.asSequence() }
                .flatMap { it.rows.asSequence() }
                .firstOrNull { it.id == rowId }
            sourceRow?.let { importedTransProjects[it.fileId]?.updateTranslation(it.keyIndex, translatedText) }
        }
        _projects.update { projectList ->
            projectList.map { project ->
                project.copy(
                    files = project.files.map { file ->
                        file.copy(
                            rows = file.rows.map { row ->
                                if (row.id == rowId) {
                                    val newText = translatedText ?: row.translatedText
                                    val newStatus = status ?: if (newText.isNotBlank() && row.status == RowStatus.UNTRANSLATED) RowStatus.DRAFT else row.status
                                    val newTag = tag ?: row.tag
                                    val newComment = comment ?: row.comment
                                    val overflow = EscapeService.checkWordWrapOverflow(newText)
                                    row.copy(
                                        translatedText = newText,
                                        status = newStatus,
                                        tag = newTag,
                                        comment = newComment,
                                        isLineWrapWarning = overflow
                                    )
                                } else row
                            }
                        )
                    }
                )
            }
        }
    }

    fun applyGlossaryToCurrentFile(): Int {
        val currentFileId = _activeFileId.value
        val glossaryList = _glossary.value
        var appliedCount = 0

        _projects.update { projectList ->
            projectList.map { project ->
                project.copy(
                    files = project.files.map { file ->
                        if (file.id == currentFileId) {
                            file.copy(
                                rows = file.rows.map { row ->
                                    if (row.translatedText.isBlank()) {
                                        var draft = row.originalText
                                        var matched = false
                                        for (term in glossaryList) {
                                            if (draft.contains(term.term)) {
                                                draft = draft.replace(term.term, term.translation)
                                                matched = true
                                            }
                                        }
                                        if (matched) {
                                            appliedCount++
                                            row.copy(
                                                translatedText = draft,
                                                status = RowStatus.DRAFT,
                                                tag = RowTag.YELLOW,
                                                comment = "Auto-filled with Glossary match"
                                            )
                                        } else row
                                    } else row
                                }
                            )
                        } else file
                    }
                )
            }
        }
        val imported = importedTransProjects[currentFileId]
        _projects.value.asSequence()
            .flatMap { it.files.asSequence() }
            .firstOrNull { it.id == currentFileId }
            ?.rows
            ?.forEach { row -> imported?.updateTranslation(row.keyIndex, row.translatedText) }
        return appliedCount
    }

    suspend fun runBatchTranslate(
        engineId: String,
        escapeAlgorithm: EscapeAlgorithmType,
        onlyUntranslated: Boolean = true
    ): Int {
        _isBatchTranslating.value = false
        _batchProgress.value = 0f
        return 0
    }

    fun createProject(
        name: String,
        engine: GameEngine,
        sourceLang: String = "Japanese (ja)",
        targetLang: String = "English (en)",
        description: String = ""
    ): GameProject {
        val projectId = "proj_" + UUID.randomUUID().toString().take(8)
        val fileId = "file_" + UUID.randomUUID().toString().take(8)
        val fileName = when (engine) {
            GameEngine.RPG_MAKER_MV_MZ -> "Map001.json"
            GameEngine.RENPY -> "script.rpy"
            GameEngine.WOLF_RPG -> "SystemData.dat"
            else -> "strings.json"
        }
        val file = TranslationFile(id = fileId, projectId = projectId, name = fileName, relativePath = "data/$fileName", rows = emptyList())
        val project = GameProject(
            id = projectId,
            name = name.ifBlank { "New Translation Project" },
            engine = engine,
            sourceLanguage = sourceLang,
            targetLanguage = targetLang,
            description = description,
            files = listOf(file)
        )
        _projects.update { listOf(project) + it }
        _activeProjectId.value = projectId
        _activeFileId.value = fileId
        return project
    }

    fun importTranslationProject(projectContent: String, displayName: String): Boolean {
        val parsed = TransProject.parse(projectContent) ?: return false
        if (parsed.rows.isEmpty()) return false
        val safeName = displayName.substringAfterLast('/').ifBlank { "Imported Translation" }
        val projectId = "proj_" + UUID.randomUUID().toString().take(8)
        val fileId = "file_" + UUID.randomUUID().toString().take(8)
        val isRpgMaker = RpgMakerBatchEngine.canRebuild(projectContent) || RpgMakerJsonEngine.canRebuild(projectContent)
        val engine = if (isRpgMaker) GameEngine.RPG_MAKER_MV_MZ else GameEngine.CUSTOM_JSON
        val rows = parsed.rows.map { sourceRow ->
            TranslationRow(
                id = "$fileId-row-${sourceRow.index}",
                fileId = fileId,
                keyIndex = sourceRow.index,
                context = sourceRow.context.ifBlank { "$safeName • row ${sourceRow.index + 1}" },
                originalText = sourceRow.source,
                translatedText = sourceRow.target,
                status = if (sourceRow.target.isBlank()) RowStatus.UNTRANSLATED else RowStatus.DRAFT,
                tag = RowTag.NONE
            )
        }
        val file = TranslationFile(id = fileId, projectId = projectId, name = safeName, relativePath = safeName, rows = rows)
        val project = GameProject(
            id = projectId,
            name = safeName.substringBeforeLast('.', safeName),
            engine = engine,
            description = if (isRpgMaker) "Imported RPG Maker JSON translation project." else "Imported Translator++ project.",
            files = listOf(file)
        )
        importedTransProjects[fileId] = parsed
        _projects.update { listOf(project) + it }
        _activeProjectId.value = projectId
        _activeFileId.value = fileId
        return true
    }

    private fun activeImportedSource(): Pair<TranslationFile, TransProject>? {
        val fileId = _activeFileId.value
        val file = _projects.value.asSequence().flatMap { it.files.asSequence() }.firstOrNull { it.id == fileId } ?: return null
        val source = importedTransProjects[fileId] ?: return null
        return file to source
    }

    private fun exportBaseName(file: TranslationFile): String =
        file.name.substringBeforeLast('.', file.name).removeSuffix("-translated").removeSuffix("-edited").ifBlank { "translation" }

    fun exportActiveTransProject(): Pair<String, String>? {
        val (file, source) = activeImportedSource() ?: return null
        return "${exportBaseName(file)}-translated.trans" to source.toJson()
    }

    fun exportActiveRpgMakerJson(): Pair<String, String>? {
        val (file, source) = activeImportedSource() ?: return null
        val content = source.toJson()
        if (!RpgMakerJsonEngine.canRebuild(content)) return null
        val translated = RpgMakerJsonEngine.rebuildTranslatedJson(content) ?: return null
        return "${exportBaseName(file)}-translated.json" to translated
    }

    fun exportActiveRpgMakerZip(): Pair<String, ByteArray>? {
        val (file, source) = activeImportedSource() ?: return null
        val content = source.toJson()
        if (!RpgMakerBatchEngine.canRebuild(content)) return null
        val zip = RpgMakerBatchEngine.rebuildZip(content) ?: return null
        return "${exportBaseName(file)}-translated-json.zip" to zip
    }

    fun addGlossaryEntry(term: String, translation: String, category: String, notes: String) {
        val entry = GlossaryEntry(
            id = "glo_" + UUID.randomUUID().toString().take(6),
            term = term.trim(),
            translation = translation.trim(),
            category = category,
            notes = notes.trim()
        )
        _glossary.update { listOf(entry) + it }
    }

    fun removeGlossaryEntry(id: String) {
        _glossary.update { list -> list.filterNot { it.id == id } }
    }

    fun toggleNetCollabServer() {
        _netCollabStatus.value = NetCollabStatus(
            isServing = false,
            isConnected = false,
            connectedCollaborators = emptyList(),
            activePeersCount = 0,
            lastSyncText = "Networking not connected"
        )
    }

    fun exportActiveProjectAsJson(): String {
        val activeProject = _projects.value.find { it.id == _activeProjectId.value } ?: return JSONObject().toString(2)
        val files = JSONArray()
        activeProject.files.forEach { file ->
            val rows = JSONArray()
            file.rows.forEach { row ->
                rows.put(JSONObject()
                    .put("id", row.keyIndex)
                    .put("context", row.context)
                    .put("speaker", row.speaker)
                    .put("original", row.originalText)
                    .put("translated", row.translatedText)
                    .put("status", row.status.name)
                    .put("tag", row.tag.name)
                    .put("comment", row.comment))
            }
            files.put(JSONObject().put("fileName", file.name).put("path", file.relativePath).put("translations", rows))
        }
        return JSONObject()
            .put("project", activeProject.name)
            .put("engine", activeProject.engine.displayName)
            .put("sourceLang", activeProject.sourceLanguage)
            .put("targetLang", activeProject.targetLanguage)
            .put("exportedAt", System.currentTimeMillis())
            .put("files", files)
            .toString(2)
    }
}