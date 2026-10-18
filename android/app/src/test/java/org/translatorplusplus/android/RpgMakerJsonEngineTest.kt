package org.translatorplusplus.android

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RpgMakerJsonEngineTest {
    @Test
    fun extractsAndRebuildsDatabaseArrayWithoutTouchingOtherFields() {
        val source = """
            [
              null,
              {"id":1,"name":"Harold","nickname":"Hero","profile":"A brave warrior","classId":1},
              {"id":2,"name":"Therese","nickname":"Cleric","profile":"A healer","classId":2}
            ]
        """.trimIndent()

        val entries = RpgMakerJsonEngine.extractEntriesForTest(source, "Actors.json")
        assertEquals(listOf("Harold", "Hero", "A brave warrior", "Therese", "Cleric", "A healer"), entries.map { it.source })

        val projectText = RpgMakerJsonEngine.createTranslationProject(source, "Actors.json")
        assertNotNull(projectText)
        assertTrue(RpgMakerJsonEngine.canRebuild(projectText!!))

        val project = JSONObject(projectText)
        project.getJSONArray("data").getJSONArray(0).put(1, "هارولد")
        project.getJSONArray("data").getJSONArray(1).put(1, "البطل")
        val output = RpgMakerJsonEngine.rebuildTranslatedJson(project.toString())
        assertNotNull(output)

        val rebuilt = JSONArray(output!!)
        assertTrue(rebuilt.isNull(0))
        assertEquals("هارولد", rebuilt.getJSONObject(1).getString("name"))
        assertEquals("البطل", rebuilt.getJSONObject(1).getString("nickname"))
        assertEquals("A brave warrior", rebuilt.getJSONObject(1).getString("profile"))
        assertEquals(1, rebuilt.getJSONObject(1).getInt("classId"))
        assertEquals("Therese", rebuilt.getJSONObject(2).getString("name"))
    }

    @Test
    fun extractsMapDialogueAndChoicesButLeavesCommentsAlone() {
        val source = """
            {
              "displayName":"Map 1",
              "events":[
                null,
                {
                  "id":1,
                  "name":"Guard",
                  "pages":[
                    {
                      "list":[
                        {"code":401,"indent":0,"parameters":["Welcome!"]},
                        {"code":102,"indent":0,"parameters":[["Yes","No"],0,0,2,0]},
                        {"code":108,"indent":0,"parameters":["designer note"]},
                        {"code":405,"indent":0,"parameters":["Scrolling text"]}
                      ]
                    }
                  ]
                }
              ],
              "width":10,
              "height":10
            }
        """.trimIndent()

        val entries = RpgMakerJsonEngine.extractEntriesForTest(source, "Map001.json")
        assertEquals(listOf("Welcome!", "Yes", "No", "Scrolling text"), entries.map { it.source })

        val projectText = RpgMakerJsonEngine.createTranslationProject(source, "Map001.json")
        assertNotNull(projectText)
        val project = JSONObject(projectText!!)
        val rows = project.getJSONArray("data")
        for (i in 0 until rows.length()) {
            val row = rows.getJSONArray(i)
            when (row.getString(0)) {
                "Welcome!" -> row.put(1, "أهلاً")
                "Yes" -> row.put(1, "نعم")
                "Scrolling text" -> row.put(1, "نص متحرك")
            }
        }

        val rebuiltText = RpgMakerJsonEngine.rebuildTranslatedJson(project.toString())
        assertNotNull(rebuiltText)
        val rebuilt = JSONObject(rebuiltText!!)
        val list = rebuilt.getJSONArray("events").getJSONObject(1)
            .getJSONArray("pages").getJSONObject(0).getJSONArray("list")

        assertEquals("أهلاً", list.getJSONObject(0).getJSONArray("parameters").getString(0))
        val choices = list.getJSONObject(1).getJSONArray("parameters").getJSONArray(0)
        assertEquals("نعم", choices.getString(0))
        assertEquals("No", choices.getString(1))
        assertEquals("designer note", list.getJSONObject(2).getJSONArray("parameters").getString(0))
        assertEquals("نص متحرك", list.getJSONObject(3).getJSONArray("parameters").getString(0))
        assertEquals("Map 1", rebuilt.getString("displayName"))
        assertEquals(10, rebuilt.getInt("width"))
    }

    @Test
    fun extractsSystemTermsAndUpdatesOnlyMappedStrings() {
        val source = """
            {
              "gameTitle":"My Game",
              "currencyUnit":"Gold",
              "elements":["","Fire"],
              "terms":{
                "basic":["Level","Level"],
                "params":["Max HP"],
                "commands":["Fight"],
                "messages":{"actionFailure":"It failed.","counterAttack":"Counterattack!"}
              },
              "partyMembers":[1,2,3]
            }
        """.trimIndent()

        val entries = RpgMakerJsonEngine.extractEntriesForTest(source, "System.json")
        assertTrue(entries.any { it.pointer == "/gameTitle" && it.source == "My Game" })
        assertTrue(entries.any { it.pointer == "/terms/messages/actionFailure" && it.source == "It failed." })
        assertFalse(entries.any { it.source.isBlank() })
        assertFalse(entries.any { it.source == "partyMembers" })

        val projectText = RpgMakerJsonEngine.createTranslationProject(source, "System.json")
        assertNotNull(projectText)
        val project = JSONObject(projectText!!)
        val rows = project.getJSONArray("data")
        for (i in 0 until rows.length()) {
            val row = rows.getJSONArray(i)
            if (row.getString(0) == "My Game") row.put(1, "لعبتي")
            if (row.getString(0) == "It failed.") row.put(1, "فشلت العملية.")
        }

        val output = RpgMakerJsonEngine.rebuildTranslatedJson(project.toString())
        assertNotNull(output)
        val rebuilt = JSONObject(output!!)
        assertEquals("لعبتي", rebuilt.getString("gameTitle"))
        assertEquals("Gold", rebuilt.getString("currencyUnit"))
        assertEquals("فشلت العملية.", rebuilt.getJSONObject("terms").getJSONObject("messages").getString("actionFailure"))
        assertEquals(3, rebuilt.getJSONArray("partyMembers").length())
    }

    @Test
    fun rejectsUnknownFilesAndInvalidTranslationProjects() {
        assertNull(RpgMakerJsonEngine.createTranslationProject("not json", "Actors.json"))
        assertNull(RpgMakerJsonEngine.createTranslationProject("""{"foo":"bar"}""", "unsupported.json"))
        assertFalse(RpgMakerJsonEngine.canRebuild("""{"data":[]}"""))
        assertNull(RpgMakerJsonEngine.rebuildTranslatedJson("""{"data":[]}"""))
    }
}
