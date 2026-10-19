package com.translatorplusplus.model

import androidx.compose.ui.graphics.Color
import com.translatorplusplus.ui.theme.*

enum class GameEngine(val displayName: String, val badgeColor: Color) {
    RPG_MAKER_MV_MZ("RPG Maker MV/MZ", Color(0xFF2563EB)),
    RENPY("Ren'Py VN", Color(0xFFEA580C)),
    WOLF_RPG("Wolf RPG Editor", Color(0xFF10B981)),
    UNITY_XUNITY("Unity (XUnity)", Color(0xFF8B5CF6)),
    TYRANOSCRIPT("TyranoScript", Color(0xFF06B6D4)),
    KIRIKIRI("KiriKiri / KAG", Color(0xFFEC4899)),
    CUSTOM_JSON("Custom / Excel", Color(0xFF64748B))
}

enum class RowStatus(val label: String, val color: Color) {
    UNTRANSLATED("Untranslated", Color(0xFF94A3B8)),
    DRAFT("Draft", Color(0xFFF59E0B)),
    REVIEW("In Review", Color(0xFF3B82F6)),
    APPROVED("Approved", Color(0xFF10B981))
}

enum class RowTag(val label: String, val color: Color) {
    NONE("None", TagNone),
    RED("Priority Red", TagRed),
    ORANGE("Caution Orange", TagOrange),
    YELLOW("Check Term", TagYellow),
    GREEN("Verified Green", TagGreen),
    BLUE("Question Blue", TagBlue),
    PURPLE("Special Purple", TagPurple)
}

enum class EscapeAlgorithmType(val label: String, val patternDescription: String) {
    RPG_MAKER("RPG Maker (\\c[..], \\v[..], \\n, \\!)", "Shields \\c[n], \\v[n], \\n, \\., \\|, \\!, \\^ codes"),
    RENPY("Ren'Py ([var], {b}...{/b})", "Shields [variable] and {tag}...{/tag} elements"),
    UNITY_RICH_TEXT("Unity RichText (<color>, <b>)", "Shields <color=#...> and XML/HTML formatting tags"),
    NONE("Raw Text (No Escaping)", "Translates raw strings directly")
}

data class TranslationRow(
    val id: String,
    val fileId: String,
    val keyIndex: Int,
    val context: String,
    val speaker: String = "",
    val originalText: String,
    val translatedText: String = "",
    val status: RowStatus = if (translatedText.isBlank()) RowStatus.UNTRANSLATED else RowStatus.DRAFT,
    val tag: RowTag = RowTag.NONE,
    val comment: String = "",
    val candidates: Map<String, String> = emptyMap(),
    val isLineWrapWarning: Boolean = false
)

data class TranslationFile(
    val id: String,
    val projectId: String,
    val name: String,
    val relativePath: String,
    val rows: List<TranslationRow> = emptyList()
) {
    val totalCount: Int get() = rows.size
    val translatedCount: Int get() = rows.count { it.translatedText.isNotBlank() }
    val approvedCount: Int get() = rows.count { it.status == RowStatus.APPROVED }
    val progressPercent: Float get() = if (totalCount == 0) 0f else (translatedCount.toFloat() / totalCount)
}

data class GameProject(
    val id: String,
    val name: String,
    val engine: GameEngine,
    val sourceLanguage: String = "Japanese (ja)",
    val targetLanguage: String = "English (en)",
    val files: List<TranslationFile> = emptyList(),
    val lastModified: Long = System.currentTimeMillis(),
    val author: String = "Translator++ Local",
    val description: String = ""
) {
    val totalStrings: Int get() = files.sumOf { it.totalCount }
    val translatedStrings: Int get() = files.sumOf { it.translatedCount }
    val approvedStrings: Int get() = files.sumOf { it.approvedCount }
    val overallProgress: Float get() = if (totalStrings == 0) 0f else (translatedStrings.toFloat() / totalStrings)
}

data class GlossaryEntry(
    val id: String,
    val term: String,
    val translation: String,
    val category: String = "Character", // Character, Skill, Item, Location, System
    val notes: String = ""
)

data class TranslationEngineConfig(
    val id: String,
    val name: String,
    val providerType: String, // Google, DeepL, Gemini LLM, Offline TM
    val isEnabled: Boolean = true,
    val description: String = "",
    val delayMs: Long = 300L,
    val batchSize: Int = 10
)

data class NetCollabStatus(
    val isServing: Boolean = false,
    val isConnected: Boolean = false,
    val roomCode: String = "",
    val hostIp: String = "",
    val connectedCollaborators: List<String> = emptyList(),
    val activePeersCount: Int = 0,
    val lastSyncText: String = "Not connected"
)
