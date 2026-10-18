# RPG Maker MV/MZ JSON Translation — Initial Android Scope

## What this vertical slice does

The Android app can open either one already-extracted RPG Maker JSON file or a selected Data folder. Supported files in the folder are combined into one `.trans`-shaped translation project. After editing, the user can export either one translated JSON file or a ZIP overlay of the translated JSON files at their relative paths. The ZIP is an overlay, not a complete game package.

The project stores the original JSON snapshot and a pointer map from each translation row to its original string. Only those known string pointers are patched during rebuild. Blank translation cells mean “not translated” and leave the original string unchanged.

## Currently covered inputs

- Database JSON arrays by filename: `Actors.json`, `Classes.json`, `Skills.json`, `Items.json`, `Weapons.json`, `Armors.json`, `Enemies.json`, `States.json`, `Troops.json`, and `MapInfos.json`.
- `System.json`: game title, currency name, selected label arrays, and the `terms` text fields.
- Map JSON objects with an `events` array: event text commands 401, scrolling text command 405, choice strings from command 102, and actor name/nickname/profile commands 320/324/325 (the text parameter only).
- `CommonEvents.json`: common-event dialogue, choices, and actor name/nickname/profile commands.
- `Troops.json`: troop names plus text and choices in troop event pages.

The row context is displayed where available, such as the database field or event/page/command where the text came from.

## Important limitations

- Batch import expects an already-extracted **Data folder**. It recursively scans up to depth 8, accepts up to 500 supported files and caps the total imported text at 24 Mi characters. It does not unpack game archives, decrypt encrypted MV/MZ assets, or process image/audio/binary resources.
- This does not yet reproduce the complete Windows Translator++ RPG Maker workflow, plugin-specific translation rules, nested plugin command text, or every special-case command.
- The JSON is re-serialized on export. JSON object ordering/whitespace may change, but unrelated values are retained.
- The `.trans` project includes the source JSON snapshot for each imported file and therefore can be much larger than the source data. Very large projects have not yet been memory/performance tested.
- Do not overwrite your original game files with this prototype. Export to a separate file and test the translated game copy.

## Tests

`RpgMakerJsonEngineTest.kt` covers database array entries, map/common-event dialogue and choices, troop-page dialogue, actor name/nickname/profile commands, System terms, preservation of unrelated fields, and rejection of unsupported input shapes. `RpgMakerBatchEngineTest.kt` covers two-file combination, translated ZIP output, preserving unedited data, and path traversal/absolute-path rejection.
