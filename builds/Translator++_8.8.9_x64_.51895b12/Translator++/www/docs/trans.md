# Basic structure of the trans project data
The translation project data can be accessed by running `trans.project`.

The structure of `trans.project` is as follow:
```js
{
    "indexOriginal": 0,
    "indexTranslation": 1,
    "skipElement": [
        "note",
        "Comment",
        "Script"
    ],
    "gameEngine": "rmmv", // the engine of the game
    "gameTitle": "Project1",
    "projectId": "RWmSgf4Ppb", // unique ID generated automatically upon project creation
    "cache": {
        "cacheID": "RWmSgf4Ppb",
        "cachePath": "data\\staging\\RWmSgf4Ppb"
    },
    "buildOn": "2025-11-19 01:57:53",
    "appVersion": "0.9",
    "loc": "Location/to/the/Project1",
    "files": { // Holds the information of the projects
        "data/Actors.json": { // the file object. Can get the value by trans.getObjectById("data/Actors.json")
            "data": [ // two dimensional array of strings that hold the information on the handsontable grid. Data has array of rows. Each rows has array of cells (column)
                [
                    "Actor1", // the first index is the original string
                    ""  // the values in the next indexes are the translation. The last non empty string will have the priority.
                ],
                [
                    "Therese",
                    ""
                ],
                [
                    "Marsha",
                    ""
                ],
                [
                    "Lucius",
                    ""
                ]
            ],
            "context": [ //  context is two dimensional array. Hold the unique information of the rows with the same index. For example context[9] hold the information of data[9], etc.
                [
                    "Actors/1/name"
                ],
                [
                    "Actors/2/name"
                ],
                [
                    "Actors/3/name"
                ],
                [
                    "Actors/4/name"
                ]
            ],
            "tags": [ // tags is two dimensional array. Hold the color tags information of the rows with the same index. For example tags[2] hold the tag information of data[9]
                [
                    "red"
                ],
                [
                    "red"
                ]
            ],
            "parameters": [ // parameters hold more information regarding context. It is two dimensional array that in align with context. Hold the additional parameter of the row with the same index. For example parameters[1] hold the information of data[1].
                [
                    {
                        "rowInfoText": "Actor1", // rowInfoText hold the information of actor information of the row / Who is talking in the current row.
                        "contextStr": "Actors/1/name", // relation to the context
                        "translation": "俳優1", // Translation that will be applied specifically to the current context. (Translation by context or context translation)
                        "rowInfoTranslated": "俳優1"
                    }
                ]
            ],
            "indexIds": {
                "Actor1": 0,
                "Therese": 1,
                "Marsha": 2,
                "Lucius": 3
            },
            "comments":[ // if exists, holds the comment string of each cells. Comments is two dimensional array of row and cells.
                null, // empty comments
                null,
                [null, "comment on row 2 column 1"]
            ],
            "extension": "json",
            "dataType": "actors",
            "filename": "Actors",
            "basename": "Actors.json",
            "path": "data/Actors.json",
            "relPath": "data/Actors.json",
            "dirname": "/data",
            "originalFormat": "RPG MAKER MV RAW DATA",
            "lineBreak": "\n",
            "type": "",
            "indexIsBuilt": false,
            "progress": {
                "translated": 0,
                "length": 4,
                "percent": 0
            }
        },

        // Common Reference is special file object that is generated upon project creation. This hold the table of the frequently used words and their translations 
        "Common Reference": {
            "dirname": "*",
            "basename": "Common Reference",
            "extension": "",
            "filename": "Common Reference",
            "path": "Common Reference",
            "data": [
                [
                    "レベル",
                    "Level",
                    null
                ],
            ],
            "type": "reference",
            "context": [],
            "lineBreak": "\r\n",
            "parameters": [],
            "originalFormat": "TRANSLATOR++ GENERATED TABLE",
            "relPath": "Common Reference",
            "progress": {
                "translated": 14,
                "length": 14,
                "percent": 100
            },
            "indexIds": {
                "レベル": 0,
            },
            "indexIsBuilt": true,
            "cacheResetOnChange": {},
            "tags": [],
            "cellInfo": [ // cell meta information, stores information such as visited (proofread automatic marking). Two dimensional array representing row and columns.
                [
                    null,
                    {
                        "v": 1 // visited
                    },
                    {
                        "t": "HU", // translator: HUman
                        "v": 1
                    }
                ]
            ],
            "lastSelectedCell": [
                9,
                0
            ]
        },

        // Actor Reference is the special file object that hold the reference of the actors / characters. It also automatically translates the actor name (rowInfoText) to be displayed into the row header
        "Actor Reference": {
            "originalFormat": "TRANSLATOR++ GENERATED TABLE",
            "type": "reference",
            "dirname": "*",
            "basename": "Actor Reference",
            "filename": "Actor Reference",
            "path": "Actor Reference",
            "relPath": "Actor Reference",
            "data": [
                []
            ],
            "context": [],
            "tags": [],
            "extension": "",
            "progress": {
                "translated": 0,
                "length": 0,
                "percent": 100
            },
            "indexIds": {},
            "indexIsBuilt": true,
            "cacheResetOnChange": {},
            "cellInfo": [],
            "parameters": []
        }
    },
    "isDuplicatesRemoved": true,
    "references": {
		"Actor Reference": {
			// The same of trans.project.files["Actor Reference"]
		},
		"Common Reference": {
			// The same of trans.project.files["Common Reference"]
		}
    },
    "selectedId": "Actor Reference",
    "trash": {},
    "options": {
        "init": {},
        "gridInfo": {
            "isRuleActive": true,
            "enableTrail": true,
            "viewTrail": false,
            "viewOrganicCellMarker": true,
            "rowHeaderInfo": false
        }
    },
    "parser": "rmmvjs",
    "parserVersion": "2.10",
    "attachments": {
        "scriptCommand/17635174727319504.js": {
            "type": "text/javascript",
            "data": "var name=\"my name\""
        },
    },
    "editorVersion": "7.11.12",
    "editorName": "Translator++"
}
```