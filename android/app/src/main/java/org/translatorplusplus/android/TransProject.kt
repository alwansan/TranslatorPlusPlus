package org.translatorplusplus.android

import org.json.JSONArray
import org.json.JSONObject

internal data class TransRow(
    val index: Int,
    val source: String,
    val target: String
)

/**
 * Small, loss-aware editor for the JSON project model used by Translator++ .trans files.
 *
 * The complete JSON root stays in memory; editing a translation only touches the configured
 * target cell, leaving source text, tags, references, extra columns and project metadata intact.
 */
internal class TransProject private constructor(
    private val root: JSONObject,
    rows: List<TransRow>,
    val sourceIndex: Int,
    val targetIndex: Int,
    val sourceLabel: String,
    val targetLabel: String
) {
    var rows: List<TransRow> = rows
        private set

    fun updateTranslation(rowIndex: Int, newValue: String): List<TransRow> {
        val data = root.optJSONArray("data") ?: return rows
        if (rowIndex !in 0 until data.length()) return rows

        val cells = data.optJSONArray(rowIndex) ?: return rows
        while (cells.length() <= targetIndex) {
            cells.put(JSONObject.NULL)
        }
        cells.put(targetIndex, newValue)

        rows = rows.map { row ->
            if (row.index == rowIndex) row.copy(target = newValue) else row
        }
        return rows
    }

    fun toJson(indent: Int = 2): String = root.toString(indent)

    companion object {
        fun parse(rawContent: String): TransProject? {
            return runCatching {
                val content = rawContent.removePrefix("\uFEFF")
                val root = JSONObject(content)
                val data = root.optJSONArray("data") ?: return null
                val project = root.optJSONObject("project") ?: return null
                val headers = root.optJSONArray("colHeaders") ?: return null

                val sourceIndex = project.optInt("indexOriginal", 0)
                val targetIndex = project.optInt("indexTranslation", 1)
                if (sourceIndex < 0 || targetIndex < 0 || sourceIndex == targetIndex) return null
                if (sourceIndex >= headers.length() || targetIndex >= headers.length()) return null

                val rows = buildList {
                    for (i in 0 until data.length()) {
                        val cells = data.optJSONArray(i) ?: continue
                        add(
                            TransRow(
                                index = i,
                                source = cellAsText(cells, sourceIndex),
                                target = cellAsText(cells, targetIndex)
                            )
                        )
                    }
                }

                TransProject(
                    root = root,
                    rows = rows,
                    sourceIndex = sourceIndex,
                    targetIndex = targetIndex,
                    sourceLabel = headers.optString(sourceIndex, "النص الأصلي"),
                    targetLabel = headers.optString(targetIndex, "الترجمة")
                )
            }.getOrNull()
        }

        private fun cellAsText(row: JSONArray, index: Int): String {
            if (index < 0 || index >= row.length() || row.isNull(index)) return ""
            val value = row.opt(index) ?: return ""
            return if (value == JSONObject.NULL) "" else value.toString()
        }
    }
}
