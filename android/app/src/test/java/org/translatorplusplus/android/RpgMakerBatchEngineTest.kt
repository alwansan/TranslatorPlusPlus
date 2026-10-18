package org.translatorplusplus.android

import java.io.ByteArrayInputStream
import java.util.zip.ZipInputStream
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RpgMakerBatchEngineTest {
    @Test
    fun combinesFilesAndExportsOnlyTranslatedJsonOverlay() {
        val actors = """
            [
              null,
              {"id":1,"name":"Hero","nickname":"Brave","profile":"A good person","classId":1}
            ]
        """.trimIndent()
        val map = """
            {
              "displayName":"Map 1",
              "events":[
                null,
                {"id":1,"name":"Guard","pages":[{"list":[
                  {"code":401,"indent":0,"parameters":["Welcome!"]},
                  {"code":108,"indent":0,"parameters":["keep this comment"]}
                ]}]}
              ],
              "width":8,
              "height":8
            }
        """.trimIndent()

        val batchText = RpgMakerBatchEngine.createBatchProject(
            listOf(
                RpgMakerBatchEngine.SourceFile("Actors.json", actors),
                RpgMakerBatchEngine.SourceFile("Map001.json", map)
            ),
            "TestGame data"
        )
        assertNotNull(batchText)
        assertTrue(RpgMakerBatchEngine.canRebuild(batchText!!))

        val project = TransProject.parse(batchText)
        assertNotNull(project)
        project!!

        val heroRow = project.rows.first { it.source == "Hero" }
        assertTrue(heroRow.context.contains("Actors.json"))
        val welcomeRow = project.rows.first { it.source == "Welcome!" }
        assertTrue(welcomeRow.context.contains("Map001.json"))

        project.updateTranslation(heroRow.index, "البطل")
        project.updateTranslation(welcomeRow.index, "أهلاً")

        val zipBytes = RpgMakerBatchEngine.rebuildZip(project.toJson())
        assertNotNull(zipBytes)
        val outputFiles = mutableMapOf<String, String>()
        ZipInputStream(ByteArrayInputStream(zipBytes!!)).use { zip ->
            while (true) {
                val entry = zip.nextEntry ?: break
                outputFiles[entry.name] = zip.readBytes().toString(Charsets.UTF_8)
                zip.closeEntry()
            }
        }

        assertEquals(setOf("Actors.json", "Map001.json"), outputFiles.keys)
        val rebuiltActors = JSONArray(outputFiles.getValue("Actors.json"))
        assertEquals("البطل", rebuiltActors.getJSONObject(1).getString("name"))
        assertEquals("Brave", rebuiltActors.getJSONObject(1).getString("nickname"))
        assertEquals("A good person", rebuiltActors.getJSONObject(1).getString("profile"))
        assertEquals(1, rebuiltActors.getJSONObject(1).getInt("classId"))

        val rebuiltMap = JSONObject(outputFiles.getValue("Map001.json"))
        val commands = rebuiltMap.getJSONArray("events").getJSONObject(1)
            .getJSONArray("pages").getJSONObject(0).getJSONArray("list")
        assertEquals("أهلاً", commands.getJSONObject(0).getJSONArray("parameters").getString(0))
        assertEquals("keep this comment", commands.getJSONObject(1).getJSONArray("parameters").getString(0))
        assertEquals("Map 1", rebuiltMap.getString("displayName"))
        assertEquals(8, rebuiltMap.getInt("width"))
    }

    @Test
    fun skipsUnsupportedFilesAndRejectsUnsafePaths() {
        assertNull(
            RpgMakerBatchEngine.createBatchProject(
                listOf(RpgMakerBatchEngine.SourceFile("notes.json", """{"hello":"world"}""")),
                "Unsupported"
            )
        )
        assertNull(
            RpgMakerBatchEngine.createBatchProject(
                listOf(RpgMakerBatchEngine.SourceFile("../Actors.json", """[null,{"id":1,"name":"Hero"}]""")),
                "Unsafe"
            )
        )
        assertNull(
            RpgMakerBatchEngine.createBatchProject(
                listOf(RpgMakerBatchEngine.SourceFile("/Actors.json", """[null,{"id":1,"name":"Hero"}]""")),
                "Absolute path"
            )
        )
        assertNull(
            RpgMakerBatchEngine.createBatchProject(
                listOf(RpgMakerBatchEngine.SourceFile("C:/Actors.json", """[null,{"id":1,"name":"Hero"}]""")),
                "Windows drive path"
            )
        )
    }
}
