package com.translatorplusplus.service

import com.translatorplusplus.model.EscapeAlgorithmType

object EscapeService {

    private val rpgMakerPattern = Regex("""\\[cCvViIgG]\[\d+]|\\[nN]|\\[\.\!\|\^\<\>\{\}\$]""")
    private val renpyPattern = Regex("""\[[a-zA-Z0-9_\.]+\]|\{[a-zA-Z0-9_=#]+}|\{/[a-zA-Z0-9_]+}""")
    private val unityRichTextPattern = Regex("""<[/]?[a-zA-Z0-9_]+(?:=[^>]+)?>""")

    data class EscapeResult(
        val maskedText: String,
        val tokens: Map<String, String>
    )

    fun maskTokens(input: String, algorithm: EscapeAlgorithmType): EscapeResult {
        if (algorithm == EscapeAlgorithmType.NONE) {
            return EscapeResult(input, emptyMap())
        }

        val pattern = when (algorithm) {
            EscapeAlgorithmType.RPG_MAKER -> rpgMakerPattern
            EscapeAlgorithmType.RENPY -> renpyPattern
            EscapeAlgorithmType.UNITY_RICH_TEXT -> unityRichTextPattern
            EscapeAlgorithmType.NONE -> return EscapeResult(input, emptyMap())
        }

        val tokens = mutableMapOf<String, String>()
        var counter = 0

        val masked = pattern.replace(input) { matchResult ->
            val tokenKey = "⟦T${counter++}⟧"
            tokens[tokenKey] = matchResult.value
            tokenKey
        }

        return EscapeResult(masked, tokens)
    }

    fun unmaskTokens(maskedText: String, tokens: Map<String, String>): String {
        var restored = maskedText
        for ((token, original) in tokens) {
            restored = restored.replace(token, original)
        }
        return restored
    }

    /**
     * Checks if dialogue exceeds standard game textbox limits:
     * Standard RPG Maker / VN dialog box:
     * - Max 4 lines
     * - Max ~48 characters per line
     */
    fun checkWordWrapOverflow(text: String, maxCharsPerLine: Int = 46, maxLines: Int = 4): Boolean {
        if (text.isBlank()) return false
        val lines = text.split("\n", "\\n")
        if (lines.size > maxLines) return true
        for (line in lines) {
            // Count CJK characters as 2 units, ASCII as 1 unit
            val width = line.sumOf { ch ->
                if (ch.code in 0x4E00..0x9FFF || ch.code in 0x3040..0x30FF || ch.code in 0xFF00..0xFFEF) 2 else 1
            }
            if (width > maxCharsPerLine) return true
        }
        return false
    }

    fun formatWithLineBreaks(text: String, maxCharsPerLine: Int = 42): String {
        val words = text.split(" ")
        val sb = StringBuilder()
        var currentLineLength = 0

        for (word in words) {
            if (currentLineLength + word.length + (if (currentLineLength > 0) 1 else 0) > maxCharsPerLine) {
                if (sb.isNotEmpty()) sb.append("\n")
                sb.append(word)
                currentLineLength = word.length
            } else {
                if (currentLineLength > 0) {
                    sb.append(" ")
                    currentLineLength++
                }
                sb.append(word)
                currentLineLength += word.length
            }
        }
        return sb.toString()
    }
}
