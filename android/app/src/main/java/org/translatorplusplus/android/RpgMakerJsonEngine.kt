package org.translatorplusplus.android

import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener

/**
 * First mobile adapter for extracted RPG Maker MV/MZ JSON files.
 * This covers known database strings and common event text commands; it does not
 * decrypt game archives or replace Windows-only parsers for encrypted/binary assets.
 */
internal object RpgMakerJsonEngine {
    private const val META_KEY = "androidRpgMaker"
    private const val FORMAT_VERSION = 1

    internal data class Entry(val pointer: String, val source: String, val context: String)

    /** Create a self-contained .trans project containing a source JSON snapshot and stable JSON pointers. */
    fun createTranslationProject(rawContent: String, sourceFileName: String): String? {
        val content = rawContent.removePrefix("\uFEFF")
        val root = parseJson(content) ?: return null
        val entries = extractEntries(root, sourceFileName)
        if (entries.isEmpty()) return null

        val rows = JSONArray()
        val manifestEntries = JSONArray()
        entries.forEachIndexed { index, entry ->
            rows.put(JSONArray().put(entry.source).put("").put(entry.context))
            manifestEntries.put(
                JSONObject()
                    .put("rowIndex", index)
                    .put("pointer", entry.pointer)
                    .put("source", entry.source)
            )
        }

        val columns = JSONArray()
            .put(JSONObject().put("readOnly", true).put("wordWrap", true).put("width", 320))
            .put(JSONObject().put("readOnly", false).put("wordWrap", true).put("width", 320))
            .put(JSONObject().put("readOnly", true).put("wordWrap", true).put("width", 240))

        val project = JSONObject()
            .put("indexOriginal", 0)
            .put("indexTranslation", 1)
            .put("gameEngine", "RPG Maker MV/MZ JSON")
            .put("gameTitle", sourceFileName.substringBeforeLast('.', sourceFileName))
            .put("projectId", "android-rmmv-json")
            .put("isDuplicatesRemoved", false)

        val metadata = JSONObject()
            .put("version", FORMAT_VERSION)
            .put("sourceFileName", sourceFileName)
            .put("originalJson", content)
            .put("entries", manifestEntries)

        return JSONObject()
            .put("data", rows)
            .put("columns", columns)
            .put("colHeaders", JSONArray().put("Original Text").put("Better translation").put("File / Location"))
            .put("project", project)
            .put("selectedId", sourceFileName)
            .put("trash", JSONObject())
            .put("options", JSONObject())
            .put("fileListLoaded", true)
            .put(META_KEY, metadata)
            .toString(2)
    }

    fun canRebuild(transProjectContent: String): Boolean {
        val project = runCatching { JSONObject(transProjectContent.removePrefix("\uFEFF")) }.getOrNull()
            ?: return false
        val metadata = project.optJSONObject(META_KEY) ?: return false
        return metadata.optInt("version", -1) == FORMAT_VERSION &&
            metadata.optString("originalJson").isNotBlank() &&
            metadata.optJSONArray("entries") != null
    }

    /**
     * Empty target cells mean "not translated" and leave the source unchanged.
     * Only known string pointers are changed; unrelated JSON remains intact.
     */
    fun rebuildTranslatedJson(transProjectContent: String): String? {
        val project = runCatching { JSONObject(transProjectContent.removePrefix("\uFEFF")) }.getOrNull()
            ?: return null
        val metadata = project.optJSONObject(META_KEY) ?: return null
        if (metadata.optInt("version", -1) != FORMAT_VERSION) return null

        val originalRoot = parseJson(metadata.optString("originalJson")) ?: return null
        val manifest = metadata.optJSONArray("entries") ?: return null
        val rows = project.optJSONArray("data") ?: return null
        val targetIndex = project.optJSONObject("project")?.optInt("indexTranslation", 1) ?: return null
        if (targetIndex < 0) return null

        for (i in 0 until manifest.length()) {
            val mapping = manifest.optJSONObject(i) ?: continue
            val rowIndex = mapping.optInt("rowIndex", -1)
            val pointer = mapping.optString("pointer")
            if (rowIndex !in 0 until rows.length() || pointer.isBlank()) continue
            val row = rows.optJSONArray(rowIndex) ?: continue
            val translated = cellText(row, targetIndex)
            if (translated.isBlank()) continue
            if (!setStringAtPointer(originalRoot, pointer, translated)) return null
        }

        return when (originalRoot) {
            is JSONObject -> originalRoot.toString(2)
            is JSONArray -> originalRoot.toString(2)
            else -> null
        }
    }

    internal fun extractEntriesForTest(rawContent: String, sourceFileName: String): List<Entry> {
        val root = parseJson(rawContent.removePrefix("\uFEFF")) ?: return emptyList()
        return extractEntries(root, sourceFileName)
    }

    private fun parseJson(content: String): Any? {
        if (content.isBlank()) return null
        return runCatching {
            when (val value = JSONTokener(content).nextValue()) {
                is JSONObject, is JSONArray -> value
                else -> null
            }
        }.getOrNull()
    }

    private fun extractEntries(root: Any, fileName: String): List<Entry> {
        val lowerName = fileName.substringAfterLast('/').lowercase()
        val entries = mutableListOf<Entry>()

        if (root is JSONObject && root.optJSONArray("events") != null) {
            extractMapEventText(root, entries)
        } else if (root is JSONObject && lowerName == "system.json") {
            extractSystemText(root, entries)
        } else if (root is JSONArray) {
            extractDatabaseArray(root, lowerName, entries)
        }

        return entries.filter { it.source.isNotBlank() }.distinctBy { it.pointer }
    }

    private fun extractDatabaseArray(root: JSONArray, fileName: String, out: MutableList<Entry>) {
        val fields = when (fileName) {
            "actors.json" -> listOf("name", "nickname", "profile")
            "classes.json" -> listOf("name")
            "skills.json" -> listOf("name", "description", "message1", "message2")
            "items.json" -> listOf("name", "description")
            "weapons.json", "armors.json" -> listOf("name", "description")
            "enemies.json", "troops.json" -> listOf("name")
            "states.json" -> listOf("name", "message1", "message2", "message3", "message4")
            "mapinfos.json" -> listOf("name")
            else -> emptyList()
        }
        if (fields.isEmpty()) return

        for (i in 0 until root.length()) {
            val obj = root.optJSONObject(i) ?: continue
            for (field in fields) {
                addIfString(
                    root = root,
                    pointer = "/$i/$field",
                    context = "${fileName.substringBeforeLast('.', fileName)} #${obj.optInt("id", i)} • $field",
                    out = out
                )
            }
        }
    }

    private fun extractSystemText(root: JSONObject, out: MutableList<Entry>) {
        addIfString(root, "/gameTitle", "System • gameTitle", out)
        addIfString(root, "/currencyUnit", "System • currencyUnit", out)

        for (field in listOf("elements", "skillTypes", "weaponTypes", "armorTypes", "equipTypes")) {
            val array = root.optJSONArray(field) ?: continue
            for (i in 0 until array.length()) {
                addIfString(root, "/$field/$i", "System • $field[$i]", out)
            }
        }

        val terms = root.optJSONObject("terms") ?: return
        for (field in listOf("basic", "params", "commands")) {
            val array = terms.optJSONArray(field) ?: continue
            for (i in 0 until array.length()) {
                addIfString(root, "/terms/$field/$i", "System • terms/$field[$i]", out)
            }
        }
        val messages = terms.optJSONObject("messages") ?: return
        val keys = messages.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            addIfString(root, "/terms/messages/$key", "System • terms/messages/$key", out)
        }
    }

    private fun extractMapEventText(root: JSONObject, out: MutableList<Entry>) {
        val events = root.optJSONArray("events") ?: return
        for (eventIndex in 0 until events.length()) {
            val event = events.optJSONObject(eventIndex) ?: continue
            val eventId = event.optInt("id", eventIndex)
            val eventName = event.optString("name").takeIf { it.isNotBlank() } ?: "Event"
            val pages = event.optJSONArray("pages") ?: continue
            for (pageIndex in 0 until pages.length()) {
                val page = pages.optJSONObject(pageIndex) ?: continue
                val commands = page.optJSONArray("list") ?: continue
                for (commandIndex in 0 until commands.length()) {
                    val command = commands.optJSONObject(commandIndex) ?: continue
                    val code = command.optInt("code", -1)
                    val parameters = command.optJSONArray("parameters") ?: continue
                    val context = "Event $eventId ($eventName) • page ${pageIndex + 1} • command $code"
                    when (code) {
                        401, 405, 320, 324, 325 -> addIfString(
                            root = root,
                            pointer = "/events/$eventIndex/pages/$pageIndex/list/$commandIndex/parameters/0",
                            context = context,
                            out = out
                        )
                        102 -> {
                            val choices = parameters.optJSONArray(0) ?: continue
                            for (choiceIndex in 0 until choices.length()) {
                                addIfString(
                                    root = root,
                                    pointer = "/events/$eventIndex/pages/$pageIndex/list/$commandIndex/parameters/0/$choiceIndex",
                                    context = "$context • choice ${choiceIndex + 1}",
                                    out = out
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    private fun addIfString(root: Any, pointer: String, context: String, out: MutableList<Entry>) {
        val value = getAtPointer(root, pointer) as? String ?: return
        if (value.isNotBlank()) out += Entry(pointer, value, context)
    }

    private fun getAtPointer(root: Any, pointer: String): Any? {
        if (!pointer.startsWith("/")) return null
        var current: Any? = root
        for (token in pointer.removePrefix("/").split("/").map(::decodeToken)) {
            current = when (val node = current) {
                is JSONObject -> node.opt(token)
                is JSONArray -> token.toIntOrNull()?.takeIf { it in 0 until node.length() }?.let(node::opt)
                else -> null
            } ?: return null
        }
        return current
    }

    private fun setStringAtPointer(root: Any, pointer: String, value: String): Boolean {
        if (!pointer.startsWith("/")) return false
        val tokens = pointer.removePrefix("/").split("/").map(::decodeToken)
        if (tokens.isEmpty()) return false
        var parent: Any = root

        for (token in tokens.dropLast(1)) {
            parent = when (val node = parent) {
                is JSONObject -> node.opt(token) ?: return false
                is JSONArray -> token.toIntOrNull()
                    ?.takeIf { it in 0 until node.length() }
                    ?.let(node::opt) ?: return false
                else -> return false
            }
        }

        val finalToken = tokens.last()
        return runCatching {
            when (val node = parent) {
                is JSONObject -> if (node.has(finalToken) && node.opt(finalToken) is String) {
                    node.put(finalToken, value)
                    true
                } else false
                is JSONArray -> {
                    val index = finalToken.toIntOrNull() ?: return false
                    if (index !in 0 until node.length() || node.opt(index) !is String) false
                    else {
                        node.put(index, value)
                        true
                    }
                }
                else -> false
            }
        }.getOrDefault(false)
    }

    private fun decodeToken(value: String): String = value.replace("~1", "/").replace("~0", "~")

    private fun cellText(row: JSONArray, index: Int): String {
        if (index < 0 || index >= row.length() || row.isNull(index)) return ""
        return row.opt(index)?.toString()?.takeUnless { it == "null" } ?: ""
    }
}
