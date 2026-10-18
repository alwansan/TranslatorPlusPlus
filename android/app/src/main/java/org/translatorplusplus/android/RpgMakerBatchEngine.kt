package org.translatorplusplus.android

import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * Combines per-file RPG Maker JSON projects into one translation table and exports a ZIP
 * containing translated JSON files at their relative paths. It does not package a full game.
 */
internal object RpgMakerBatchEngine {
    private const val META_KEY = "androidRpgMakerBatch"
    private const val VERSION = 1
    private const val MAX_FILES = 500
    private const val MAX_SOURCE_CHARS = 24 * 1024 * 1024

    internal data class SourceFile(val relativePath: String, val content: String)

    fun createBatchProject(files: List<SourceFile>, projectLabel: String): String? {
        val usable = files.mapNotNull { file ->
            val path = safeRelativePath(file.relativePath) ?: return@mapNotNull null
            if (!path.endsWith(".json", ignoreCase = true)) return@mapNotNull null
            SourceFile(path, file.content.removePrefix("\uFEFF"))
        }.distinctBy { it.relativePath }.sortedBy { it.relativePath }

        if (usable.isEmpty() || usable.size > MAX_FILES) return null
        if (usable.sumOf { it.content.length.toLong() } > MAX_SOURCE_CHARS.toLong()) return null

        var templateRoot: JSONObject? = null
        val combinedData = JSONArray()
        val filesMetadata = JSONArray()
        var supportedFiles = 0

        for (file in usable) {
            val singleProjectText = RpgMakerJsonEngine.createTranslationProject(file.content, file.relativePath)
                ?: continue
            val singleProject = JSONObject(singleProjectText)
            val singleData = singleProject.optJSONArray("data") ?: continue
            val sourceMetadata = singleProject.optJSONObject("androidRpgMaker") ?: continue
            val sourceEntries = sourceMetadata.optJSONArray("entries") ?: continue
            if (singleData.length() == 0) continue

            val rowOffset = combinedData.length()
            for (localIndex in 0 until singleData.length()) {
                val row = singleData.optJSONArray(localIndex) ?: continue
                val priorContext = if (row.length() > 2) row.optString(2) else ""
                while (row.length() < 3) row.put("")
                row.put(2, if (priorContext.isBlank()) file.relativePath else "${file.relativePath} • $priorContext")
                combinedData.put(JSONArray(row.toString()))
            }

            val fileMetadata = JSONObject()
                .put("relativePath", file.relativePath)
                .put("rowOffset", rowOffset)
                .put("rowCount", singleData.length())
                .put("originalJson", sourceMetadata.optString("originalJson"))
                .put("entries", JSONArray(sourceEntries.toString()))
            filesMetadata.put(fileMetadata)

            if (templateRoot == null) templateRoot = singleProject
            supportedFiles++
        }

        if (supportedFiles == 0 || combinedData.length() == 0) return null
        val output = JSONObject(templateRoot!!.toString())
        output.put("data", combinedData)
        output.put("selectedId", projectLabel)
        output.remove("androidRpgMaker")

        val project = output.optJSONObject("project") ?: JSONObject()
        project.put("gameTitle", projectLabel)
        project.put("gameEngine", "RPG Maker MV/MZ JSON batch")
        project.put("projectId", "android-rmmv-batch")
        project.put("indexOriginal", 0)
        project.put("indexTranslation", 1)
        output.put("project", project)

        output.put(
            META_KEY,
            JSONObject()
                .put("version", VERSION)
                .put("projectLabel", projectLabel)
                .put("files", filesMetadata)
        )
        return output.toString(2)
    }

    fun canRebuild(projectContent: String): Boolean {
        val project = runCatching { JSONObject(projectContent.removePrefix("\uFEFF")) }.getOrNull()
            ?: return false
        val metadata = project.optJSONObject(META_KEY) ?: return false
        val files = metadata.optJSONArray("files") ?: return false
        val targetIndex = project.optJSONObject("project")?.optInt("indexTranslation", -1) ?: -1
        return metadata.optInt("version", -1) == VERSION && files.length() > 0 &&
            project.optJSONArray("data") != null && targetIndex in 0..32
    }

    /**
     * Creates a ZIP overlay of the translated JSON files. The user can extract it into a copy
     * of the game's selected data directory. Original files are never overwritten by this method.
     */
    fun rebuildZip(projectContent: String): ByteArray? {
        val project = runCatching { JSONObject(projectContent.removePrefix("\uFEFF")) }.getOrNull()
            ?: return null
        val metadata = project.optJSONObject(META_KEY) ?: return null
        if (metadata.optInt("version", -1) != VERSION) return null

        val fileList = metadata.optJSONArray("files") ?: return null
        val combinedData = project.optJSONArray("data") ?: return null
        val projectConfig = project.optJSONObject("project") ?: return null
        val targetIndex = projectConfig.optInt("indexTranslation", -1)
        if (targetIndex < 0) return null

        return runCatching {
            val byteStream = ByteArrayOutputStream()
            ZipOutputStream(byteStream).use { zip ->
                val writtenPaths = mutableSetOf<String>()
                var exportedCount = 0

                for (fileIndex in 0 until fileList.length()) {
                    val item = fileList.optJSONObject(fileIndex) ?: continue
                    val relativePath = safeRelativePath(item.optString("relativePath")) ?: return null
                    if (!relativePath.endsWith(".json", ignoreCase = true) || !writtenPaths.add(relativePath)) {
                        return null
                    }

                    val rowOffset = item.optInt("rowOffset", -1)
                    val rowCount = item.optInt("rowCount", -1)
                    if (rowOffset < 0 || rowCount < 1 || rowOffset + rowCount > combinedData.length()) return null

                    val localData = JSONArray()
                    for (localIndex in 0 until rowCount) {
                        val row = combinedData.optJSONArray(rowOffset + localIndex) ?: return null
                        localData.put(JSONArray(row.toString()))
                    }

                    val sourceEntries = item.optJSONArray("entries") ?: return null
                    val singleProject = JSONObject()
                        .put("data", localData)
                        .put("columns", project.optJSONArray("columns") ?: JSONArray())
                        .put("colHeaders", project.optJSONArray("colHeaders") ?: JSONArray())
                        .put("project", JSONObject(projectConfig.toString()))
                        .put(
                            "androidRpgMaker",
                            JSONObject()
                                .put("version", 1)
                                .put("sourceFileName", relativePath)
                                .put("originalJson", item.optString("originalJson"))
                                .put("entries", JSONArray(sourceEntries.toString()))
                        )

                    val translatedJson = RpgMakerJsonEngine.rebuildTranslatedJson(singleProject.toString())
                        ?: return null
                    zip.putNextEntry(ZipEntry(relativePath))
                    zip.write(translatedJson.toByteArray(Charsets.UTF_8))
                    zip.closeEntry()
                    exportedCount++
                }

                if (exportedCount == 0) return null
            }
            byteStream.toByteArray()
        }.getOrNull()
    }

    private fun safeRelativePath(rawPath: String): String? {
        val normalized = rawPath.replace('\\', '/').trimStart('/')
        if (normalized.isBlank()) return null
        val segments = normalized.split('/')
        if (segments.any { it.isBlank() || it == "." || it == ".." }) return null
        return segments.joinToString("/")
    }
}
