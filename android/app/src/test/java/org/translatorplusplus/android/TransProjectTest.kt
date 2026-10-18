package org.translatorplusplus.android

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TransProjectTest {
    @Test
    fun usesConfiguredColumnsAndPreservesTheRestOfTheProject() {
        val project = TransProject.parse(fixture()) 
        assertNotNull(project)
        project!!

        assertEquals("こんにちは {player}", project.rows.single().source)
        assertEquals("مرحبا", project.rows.single().target)
        assertEquals("Original Text", project.sourceLabel)
        assertEquals("Better translation", project.targetLabel)

        val changedText = "أهلاً يا {player} 👋"
        project.updateTranslation(0, changedText)

        val saved = JSONObject(project.toJson())
        val row = saved.getJSONArray("data").getJSONArray(0)
        assertEquals("こんにちは {player}", row.getString(0))
        assertEquals("initial", row.getString(1))
        assertEquals("MT", row.getString(2))
        assertEquals(changedText, row.getString(3))
        assertEquals("best", row.getString(4))
        assertEquals("عنوان تجريبي", saved.getJSONObject("project").getString("gameTitle"))
        assertEquals("literal", saved.getJSONObject("project").getJSONArray("tags").getString(0))
        assertEquals(
            "Common Reference",
            saved.getJSONObject("project").getJSONObject("references").getJSONObject("ref").getString("name")
        )
        assertEquals("sentinel", saved.getJSONObject("options").getString("preserveMe"))
        assertEquals(changedText, project.rows.single().target)
    }

    @Test
    fun padsShortRowsWhenTargetColumnIsMissing() {
        val input = """
            {
              "data": [["Hello"]],
              "colHeaders": ["Original", "Machine", "Translation"],
              "project": {"indexOriginal": 0, "indexTranslation": 2, "gameTitle": "Short row"}
            }
        """.trimIndent()

        val project = TransProject.parse(input)
        assertNotNull(project)
        project!!.updateTranslation(0, "أهلاً")

        val row = JSONObject(project.toJson()).getJSONArray("data").getJSONArray(0)
        assertEquals(3, row.length())
        assertEquals("Hello", row.getString(0))
        assertTrue(row.isNull(1))
        assertEquals("أهلاً", row.getString(2))
    }

    @Test
    fun stripsUtf8BomBeforeParsing() {
        val project = TransProject.parse("\uFEFF" + fixture())
        assertNotNull(project)
        assertEquals("مرحبا", project!!.rows.single().target)
    }

    @Test
    fun rejectsInvalidOrAmbiguousProjectShapes() {
        assertNull(TransProject.parse("not json"))
        assertNull(TransProject.parse("""{"data": [], "project": {}}"""))
        val sameColumn = """
            {
              "data": [["x", "y"]],
              "colHeaders": ["A", "B"],
              "project": {"indexOriginal": 0, "indexTranslation": 0}
            }
        """.trimIndent()
        assertNull(TransProject.parse(sameColumn))
    }

    @Test
    fun ignoresRowsThatAreNotCellArraysWithoutLosingThemOnExport() {
        val input = """
            {
              "data": [["hello", "hi"], null, ["bye", "ciao"]],
              "colHeaders": ["Original", "Translation"],
              "project": {"indexOriginal": 0, "indexTranslation": 1}
            }
        """.trimIndent()
        val project = TransProject.parse(input)
        assertNotNull(project)
        project!!
        assertEquals(2, project.rows.size)

        project.updateTranslation(2, "مع السلامة")
        val saved = JSONObject(project.toJson())
        assertTrue(saved.getJSONArray("data").isNull(1))
        assertEquals("مع السلامة", saved.getJSONArray("data").getJSONArray(2).getString(1))
    }

    private fun fixture() = """
        {
          "data": [["こんにちは {player}", "initial", "MT", "مرحبا", "best"]],
          "columns": [
            {"readOnly": false},
            {"readOnly": false},
            {"readOnly": false},
            {"readOnly": false},
            {"readOnly": false}
          ],
          "colHeaders": ["Original Text", "Initial", "Machine translation", "Better translation", "Best translation"],
          "project": {
            "indexOriginal": 0,
            "indexTranslation": 3,
            "gameTitle": "عنوان تجريبي",
            "tags": ["literal"],
            "references": {
              "ref": {"name": "Common Reference", "data": [["レベル", "Level"]]}
            }
          },
          "options": {"preserveMe": "sentinel"}
        }
    """.trimIndent()
}
