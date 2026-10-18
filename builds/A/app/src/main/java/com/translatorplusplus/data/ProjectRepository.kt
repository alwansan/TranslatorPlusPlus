package com.translatorplusplus.data

import com.translatorplusplus.model.*
import com.translatorplusplus.service.EscapeService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.UUID

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

    init {
        initializeSampleData()
    }

    private fun initializeSampleData() {
        val rpgMakerRowsMap001 = listOf(
            TranslationRow(
                id = "row_1",
                fileId = "file_rpg_1",
                keyIndex = 1,
                context = "Map001.json/Event_1/Page_1:2",
                speaker = "Village Elder",
                originalText = "おお、\\c[1]勇者よ\\c[0]！ついに目覚めたのじゃな！",
                translatedText = "Oh, \\c[1]Hero\\c[0]! You have finally awakened!",
                status = RowStatus.APPROVED,
                tag = RowTag.GREEN,
                comment = "Intro dialogue. \\c[1] sets name color to blue.",
                candidates = mapOf(
                    "DeepL" to "Oh, Hero! You're finally awake!",
                    "Google" to "Oh, hero! You have finally awakened!",
                    "Gemini AI" to "Ah, valiant Hero! You have finally opened your eyes!"
                )
            ),
            TranslationRow(
                id = "row_2",
                fileId = "file_rpg_1",
                keyIndex = 2,
                context = "Map001.json/Event_1/Page_1:6",
                speaker = "Village Elder",
                originalText = "東の古城に潜む\\c[2]魔王\\c[0]の軍勢が、静寂の森を侵食しておる。",
                translatedText = "The forces of the \\c[2]Demon Lord\\c[0] lurking in the eastern fortress are encroaching upon the Silent Forest.",
                status = RowStatus.REVIEW,
                tag = RowTag.BLUE,
                comment = "Check fortress vs castle consistency.",
                candidates = mapOf(
                    "DeepL" to "The Demon Lord's army in the eastern ancient castle is invading the Forest of Silence.",
                    "Google" to "The army of the demon king lurking in the old castle to the east is encroaching on the quiet forest."
                )
            ),
            TranslationRow(
                id = "row_3",
                fileId = "file_rpg_1",
                keyIndex = 3,
                context = "Map001.json/Event_1/Page_1:12",
                speaker = "Village Elder",
                originalText = "これを受け取るがよい。旅の支度金として\\v[1]G入っておる。",
                translatedText = "Take this with you. Inside is \\v[1] Gold for your journey's preparations.",
                status = RowStatus.DRAFT,
                tag = RowTag.YELLOW,
                comment = "\\v[1] references variable 1 (starting gold amount).",
                candidates = mapOf(
                    "DeepL" to "Take this. It contains \\v[1]G to prepare for your journey.",
                    "Google" to "Take this. Contains \\v[1]G as travel allowance."
                )
            ),
            TranslationRow(
                id = "row_4",
                fileId = "file_rpg_1",
                keyIndex = 4,
                context = "Map001.json/Event_2/Page_1:3",
                speaker = "Merchant Garrick",
                originalText = "いらっしゃい！新鮮な\\c[4]回復薬\\c[0]はいかがかね？\\!旅の必需品だよ！",
                translatedText = "Welcome! Looking for some fresh \\c[4]Recovery Potions\\c[0]? \\!An absolute necessity for travelers!",
                status = RowStatus.APPROVED,
                tag = RowTag.NONE,
                comment = "\\! inserts a pause until player presses button."
            ),
            TranslationRow(
                id = "row_5",
                fileId = "file_rpg_1",
                keyIndex = 5,
                context = "Map001.json/Event_2/Page_1:8",
                speaker = "Merchant Garrick",
                originalText = "今日は特別に\\c[3]オークヘイブン\\c[0]名物のエーテルも半額にしておくよ！",
                translatedText = "",
                status = RowStatus.UNTRANSLATED,
                tag = RowTag.NONE,
                comment = "Mention of Oakhaven specialty.",
                candidates = mapOf(
                    "Glossary Match" to "Today I'll give you half off our Oakhaven specialty Ether as well!"
                )
            ),
            TranslationRow(
                id = "row_6",
                fileId = "file_rpg_1",
                keyIndex = 6,
                context = "Map001.json/Event_3/Choice:1",
                speaker = "System Choice",
                originalText = "「買い物をしますか？」\\n【はい】\\n【いいえ】",
                translatedText = "",
                status = RowStatus.UNTRANSLATED,
                tag = RowTag.NONE
            )
        )

        val rpgMakerRowsItems = listOf(
            TranslationRow(
                id = "row_item_1",
                fileId = "file_rpg_2",
                keyIndex = 1,
                context = "Items.json/Item_001/Name",
                speaker = "Item Name",
                originalText = "回復薬",
                translatedText = "Recovery Potion",
                status = RowStatus.APPROVED,
                tag = RowTag.GREEN
            ),
            TranslationRow(
                id = "row_item_2",
                fileId = "file_rpg_2",
                keyIndex = 2,
                context = "Items.json/Item_001/Description",
                speaker = "Item Description",
                originalText = "味方のHPを500回復する薬草の煎じ薬。苦味が強い。",
                translatedText = "A herbal brew that restores 500 HP to an ally. Has a strong bitter taste.",
                status = RowStatus.APPROVED,
                tag = RowTag.GREEN
            ),
            TranslationRow(
                id = "row_item_3",
                fileId = "file_rpg_2",
                keyIndex = 3,
                context = "Items.json/Item_002/Name",
                speaker = "Item Name",
                originalText = "エーテル",
                translatedText = "Ether",
                status = RowStatus.APPROVED,
                tag = RowTag.GREEN
            ),
            TranslationRow(
                id = "row_item_4",
                fileId = "file_rpg_2",
                keyIndex = 4,
                context = "Items.json/Item_002/Description",
                speaker = "Item Description",
                originalText = "精神力を高め、味方のMPを150回復する奇跡の霊水。",
                translatedText = "",
                status = RowStatus.UNTRANSLATED,
                tag = RowTag.NONE
            )
        )

        val renpyRows = listOf(
            TranslationRow(
                id = "row_rpy_1",
                fileId = "file_rpy_1",
                keyIndex = 1,
                context = "script_prologue.rpy:14",
                speaker = "Narrator",
                originalText = "放課後の教室には、西日のオレンジ色だけが残されていた。",
                translatedText = "Only the warm orange hue of the afternoon sun remained in the empty classroom after school.",
                status = RowStatus.APPROVED,
                tag = RowTag.GREEN
            ),
            TranslationRow(
                id = "row_rpy_2",
                fileId = "file_rpy_1",
                keyIndex = 2,
                context = "script_prologue.rpy:22",
                speaker = "Shiori",
                originalText = "「待たせてごめんね、[player_name]くん。図書室の片付けが長引いちゃって…」",
                translatedText = "\"Sorry to keep you waiting, [player_name]! Cleaning up the library took longer than expected...\"",
                status = RowStatus.REVIEW,
                tag = RowTag.PURPLE,
                comment = "[player_name] Ren'Py interpolation tag must be preserved!"
            ),
            TranslationRow(
                id = "row_rpy_3",
                fileId = "file_rpy_1",
                keyIndex = 3,
                context = "script_prologue.rpy:35",
                speaker = "Shiori",
                originalText = "「ねえ、昨日の{b}約束{/b}…本当に覚えてる？」",
                translatedText = "\"Hey... do you really remember our {b}promise{/b} from yesterday?\"",
                status = RowStatus.DRAFT,
                tag = RowTag.NONE
            ),
            TranslationRow(
                id = "row_rpy_4",
                fileId = "file_rpy_1",
                keyIndex = 4,
                context = "script_prologue.rpy:50",
                speaker = "Choice Menu",
                originalText = "menu:\\n    \"もちろん覚えている\":\\n    \"何の話だったっけ？\":",
                translatedText = "",
                status = RowStatus.UNTRANSLATED,
                tag = RowTag.NONE
            )
        )

        val project1 = GameProject(
            id = "proj_1",
            name = "Chrono Phantasma",
            engine = GameEngine.RPG_MAKER_MV_MZ,
            sourceLanguage = "Japanese (ja)",
            targetLanguage = "English (en)",
            description = "Fantasy JRPG localization with extensive dialogue, choices, and database entries.",
            files = listOf(
                TranslationFile("file_rpg_1", "proj_1", "Map001.json", "data/Map001.json", rpgMakerRowsMap001),
                TranslationFile("file_rpg_2", "proj_1", "Items.json", "data/Items.json", rpgMakerRowsItems)
            )
        )

        val project2 = GameProject(
            id = "proj_2",
            name = "Midnight Memories",
            engine = GameEngine.RENPY,
            sourceLanguage = "Japanese (ja)",
            targetLanguage = "English (en)",
            description = "High school mystery visual novel with branch logic and Ren'Py text tags.",
            files = listOf(
                TranslationFile("file_rpy_1", "proj_2", "prologue.rpy", "game/scripts/prologue.rpy", renpyRows)
            )
        )

        val project3 = GameProject(
            id = "proj_3",
            name = "Valiant Soul",
            engine = GameEngine.WOLF_RPG,
            sourceLanguage = "Japanese (ja)",
            targetLanguage = "English (en)",
            description = "Wolf RPG tactical game with string tables and combat log messages.",
            files = listOf(
                TranslationFile(
                    id = "file_wolf_1",
                    projectId = "proj_3",
                    name = "CommonEvents.dat",
                    relativePath = "Data/BasicData/CommonEvents.dat",
                    rows = listOf(
                        TranslationRow(
                            id = "row_wolf_1",
                            fileId = "file_wolf_1",
                            keyIndex = 1,
                            context = "CE_004:BattleWin",
                            speaker = "System",
                            originalText = "戦闘に勝利した！経験値\\c[2]120EXP\\c[0]を獲得！",
                            translatedText = "Victory achieved! Gained \\c[2]120 EXP\\c[0]!",
                            status = RowStatus.APPROVED,
                            tag = RowTag.GREEN
                        )
                    )
                )
            )
        )

        _projects.value = listOf(project1, project2, project3)
        _activeProjectId.value = "proj_1"
        _activeFileId.value = "file_rpg_1"

        _glossary.value = listOf(
            GlossaryEntry("glo_1", "勇者", "Hero", "Character", "Default title for protagonist"),
            GlossaryEntry("glo_2", "魔王", "Demon Lord", "Character", "Antagonist faction leader"),
            GlossaryEntry("glo_3", "回復薬", "Recovery Potion", "Item", "Standard consumable item"),
            GlossaryEntry("glo_4", "エーテル", "Ether", "Item", "MP restorative item"),
            GlossaryEntry("glo_5", "オークヘイブン", "Oakhaven", "Location", "Starting woodland town"),
            GlossaryEntry("glo_6", "静寂の森", "Silent Forest", "Location", "Surrounding dungeon map")
        )

        _engines.value = listOf(
            TranslationEngineConfig(
                id = "eng_deepl",
                name = "DeepL Translation API",
                providerType = "DeepL",
                isEnabled = true,
                description = "High nuance machine translation with glossary support.",
                delayMs = 250L,
                batchSize = 15
            ),
            TranslationEngineConfig(
                id = "eng_gemini",
                name = "Gemini AI Localizer",
                providerType = "Gemini LLM",
                isEnabled = true,
                description = "Context-aware LLM localization preserving subtext and humor.",
                delayMs = 400L,
                batchSize = 8
            ),
            TranslationEngineConfig(
                id = "eng_google",
                name = "Google Cloud Translate",
                providerType = "Google",
                isEnabled = true,
                description = "Fast neural translation engine covering 130+ languages.",
                delayMs = 150L,
                batchSize = 25
            ),
            TranslationEngineConfig(
                id = "eng_offline",
                name = "Offline TM / Sugoi",
                providerType = "Offline Neural",
                isEnabled = false,
                description = "Zero-cloud offline translation engine for private projects.",
                delayMs = 500L,
                batchSize = 5
            )
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
        return appliedCount
    }

    suspend fun runBatchTranslate(
        engineId: String,
        escapeAlgorithm: EscapeAlgorithmType,
        onlyUntranslated: Boolean = true
    ): Int {
        _isBatchTranslating.value = true
        _batchProgress.value = 0f

        val activeProj = _projects.value.find { it.id == _activeProjectId.value }
        val activeFile = activeProj?.files?.find { it.id == _activeFileId.value }
        if (activeFile == null) {
            _isBatchTranslating.value = false
            return 0
        }

        val rowsToTranslate = activeFile.rows.filter {
            if (onlyUntranslated) it.translatedText.isBlank() else true
        }

        if (rowsToTranslate.isEmpty()) {
            _isBatchTranslating.value = false
            return 0
        }

        val total = rowsToTranslate.size
        var completed = 0

        for (row in rowsToTranslate) {
            // 1. Mask code tokens
            val masked = EscapeService.maskTokens(row.originalText, escapeAlgorithm)
            
            // 2. Translate string (simulated MT based on glossary & dictionary context)
            val translatedContent = simulateTranslate(masked.maskedText)
            
            // 3. Unmask code tokens
            val finalRestored = EscapeService.unmaskTokens(translatedContent, masked.tokens)
            
            // 4. Update row
            updateRow(
                rowId = row.id,
                translatedText = finalRestored,
                status = RowStatus.DRAFT,
                tag = RowTag.BLUE
            )

            completed++
            _batchProgress.value = completed.toFloat() / total
            kotlinx.coroutines.delay(120L)
        }

        _isBatchTranslating.value = false
        return completed
    }

    private fun simulateTranslate(text: String): String {
        var result = text
        // Apply glossary replacements
        for (g in _glossary.value) {
            result = result.replace(g.term, g.translation)
        }
        // Common JRPG phrases translation table
        result = result
            .replace("戦闘に勝利した！", "Battle victory!")
            .replace("を獲得！", " gained!")
            .replace("おお、", "Oh, ")
            .replace("ついに目覚めたのじゃな！", "you have awakened at last!")
            .replace("旅の支度金として", "as traveling preparation allowance")
            .replace("いらっしゃい！", "Welcome! ")
            .replace("はい", "Yes")
            .replace("いいえ", "No")
            .replace("買い物をしますか？", "Would you like to shop?")
            .replace("今日は特別に", "Today especially, ")
            .replace("名物の", "specialty ")
            .replace("半額にしておくよ！", "is half off!")
            .replace("奇跡の霊水。", "Miraculous holy water.")
            .replace("精神力を高め、", "Boosts spirit and ")
            .replace("味方のMPを150回復する", "restores 150 MP to an ally. ")
            .replace("もちろん覚えている", "Of course I remember")
            .replace("何の話だったっけ？", "What was it about again?")

        return result
    }

    fun createProject(
        name: String,
        engine: GameEngine,
        sourceLang: String = "Japanese (ja)",
        targetLang: String = "English (en)",
        description: String = ""
    ): GameProject {
        val newProjId = "proj_" + UUID.randomUUID().toString().take(6)
        val defaultFile = TranslationFile(
            id = "file_" + UUID.randomUUID().toString().take(6),
            projectId = newProjId,
            name = when (engine) {
                GameEngine.RPG_MAKER_MV_MZ -> "Map001.json"
                GameEngine.RENPY -> "script.rpy"
                GameEngine.WOLF_RPG -> "SystemData.dat"
                else -> "strings.json"
            },
            relativePath = "data/strings.json",
            rows = listOf(
                TranslationRow(
                    id = "row_" + UUID.randomUUID().toString().take(6),
                    fileId = "new_file",
                    keyIndex = 1,
                    context = "Root/Intro",
                    speaker = "Narrator",
                    originalText = "新しい冒険がここから始まる…！",
                    translatedText = "A brand new adventure begins right here...!",
                    status = RowStatus.DRAFT,
                    tag = RowTag.GREEN
                )
            )
        )
        val newProject = GameProject(
            id = newProjId,
            name = name.ifBlank { "New Translation Project" },
            engine = engine,
            sourceLanguage = sourceLang,
            targetLanguage = targetLang,
            description = description,
            files = listOf(defaultFile)
        )
        _projects.update { listOf(newProject) + it }
        _activeProjectId.value = newProjId
        _activeFileId.value = defaultFile.id
        return newProject
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
        _netCollabStatus.update { status ->
            val nextState = !status.isServing
            status.copy(
                isServing = nextState,
                isConnected = nextState,
                lastSyncText = if (nextState) "Serving live session" else "Offline"
            )
        }
    }

    fun exportActiveProjectAsJson(): String {
        val activeProj = _projects.value.find { it.id == _activeProjectId.value } ?: return "{}"
        val sb = StringBuilder()
        sb.append("{\n")
        sb.append("  \"project\": \"${activeProj.name}\",\n")
        sb.append("  \"engine\": \"${activeProj.engine.displayName}\",\n")
        sb.append("  \"sourceLang\": \"${activeProj.sourceLanguage}\",\n")
        sb.append("  \"targetLang\": \"${activeProj.targetLanguage}\",\n")
        sb.append("  \"exportedAt\": ${System.currentTimeMillis()},\n")
        sb.append("  \"files\": [\n")

        activeProj.files.forEachIndexed { fIdx, file ->
            sb.append("    {\n")
            sb.append("      \"fileName\": \"${file.name}\",\n")
            sb.append("      \"path\": \"${file.relativePath}\",\n")
            sb.append("      \"translations\": [\n")

            file.rows.forEachIndexed { rIdx, row ->
                val orig = row.originalText.replace("\"", "\\\"").replace("\n", "\\n")
                val trans = row.translatedText.replace("\"", "\\\"").replace("\n", "\\n")
                val spk = row.speaker.replace("\"", "\\\"")
                val ctx = row.context.replace("\"", "\\\"")
                sb.append("        {\n")
                sb.append("          \"id\": ${row.keyIndex},\n")
                sb.append("          \"context\": \"$ctx\",\n")
                sb.append("          \"speaker\": \"$spk\",\n")
                sb.append("          \"original\": \"$orig\",\n")
                sb.append("          \"translated\": \"$trans\",\n")
                sb.append("          \"status\": \"${row.status.name}\"\n")
                sb.append("        }${if (rIdx < file.rows.size - 1) "," else ""}\n")
            }

            sb.append("      ]\n")
            sb.append("    }${if (fIdx < activeProj.files.size - 1) "," else ""}\n")
        }

        sb.append("  ]\n")
        sb.append("}")
        return sb.toString()
    }
}
