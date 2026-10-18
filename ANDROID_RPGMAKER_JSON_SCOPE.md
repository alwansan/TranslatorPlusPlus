# RPG Maker MV/MZ JSON Translation — Initial Android Scope

## What this vertical slice does

The Android app can take one already-extracted RPG Maker JSON file, turn eligible text fields into a `.trans`-shaped project, let the user edit translations, and export a translated copy of that original JSON file.

The project stores the original JSON snapshot and a pointer map from each translation row to its original string. Only those known string pointers are patched during rebuild. Blank translation cells mean “not translated” and leave the original string unchanged.

## Currently covered inputs

- Database JSON arrays by filename: `Actors.json`, `Classes.json`, `Skills.json`, `Items.json`, `Weapons.json`, `Armors.json`, `Enemies.json`, `States.json`, `Troops.json`, and `MapInfos.json`.
- `System.json`: game title, currency name, selected label arrays, and the `terms` text fields.
- Map JSON objects with an `events` array: event text commands 401, scrolling text command 405, and choice strings from command 102.

The row context is displayed where available, such as the database field or event/page/command where the text came from.

## Important limitations

- This is for individual **already-extracted JSON data files**. It does not open an RPG Maker game directory as a batch, unpack game archives, decrypt encrypted MV/MZ assets, or process image/audio/binary resources.
- This does not yet reproduce the complete Windows Translator++ RPG Maker workflow, plugin-specific translation rules, nested plugin command text, or every special-case command.
- The JSON is re-serialized on export. JSON object ordering/whitespace may change, but unrelated values are retained.
- The `.trans` project includes the source JSON snapshot and therefore can be larger than the source JSON. Avoid using it with very large map files until large-file/memory testing is complete.
- Do not overwrite your original game files with this prototype. Export to a separate file and test the translated game copy.

## Tests

`RpgMakerJsonEngineTest.kt` covers database array entries, event dialogue and choices, scrolling text, System terms, preservation of unrelated fields, and rejection of unsupported input shapes.
