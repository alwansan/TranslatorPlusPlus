# WolfTL Parser

## Overview

The WolfTL parser is Translator++'s Wolf RPG import/export path built on top of the external `WolfTL.exe` dump/patch tool plus a set of JSON and CSV parsers implemented in `www/addons/wolfJs/`.

At a high level, the workflow is:

1. Extract packaged Wolf RPG data with `UberWolfCli.exe` when `.wolf` archives are present.
2. Run `WolfTL.exe create` to dump Wolf RPG resources into JSON files under `dump/`.
3. Parse those dump files into Translator++ translation data.
4. During export, write translated JSON and CSV back into `dump/`.
5. Run `WolfTL.exe patch` to rebuild the binary Wolf RPG files.
6. Copy patched output back into the target game's `Data` folder.

The main entry point is `www/addons/wolfJs/wolftl.js`.

## Main Components

### Integration layer

`www/addons/wolfJs/wolftl.js`

This file wires WolfTL into Translator++ through `AddonUtils`.

Responsibilities:

- registers the parser as:
  - `gameEngine = "wolfrpg"`
  - `parserName = "wolfTL"`
  - `parserVersion = "24.8.21"`
- enables file-level parallel processing with `workerNum = 8`
- always exports from staging with `alwaysExportFromStage = true`
- delegates binary dump/patch work to `WolfTL.exe`
- routes JSON parsing either to a worker thread or back to the main thread
- handles CSV import/export directly
- derives the project title from `dump/Game.json` or `Game.dat`

### Worker parser

`www/addons/wolfJs/wolfTlJsonParser.worker.js`

This Node worker performs CPU-heavy JSON parsing off the main thread.

Supported worker commands:

- `getTransData`: parse a WolfTL JSON dump and return Translator++ translation data
- `writeFile`: parse a WolfTL JSON dump, apply translations, and return the translated JSON string

The worker selects a parser class from the file group:

- `mps` -> `WolfTlMap`
- `common` -> `WolfTlCommon`
- `db` -> `WolfTlDb`, except `SysDatabase.json`
- everything else -> `JSONTranslate`

If the worker fails for any reason, `wolftl.js` falls back to parsing on the main thread.

### Title extraction helper

`www/addons/wolfJs/wolfGameTitle.js`

This helper extracts the game title used during project creation.

Lookup order:

1. `dump/Game.json`
2. `dump/game.json`
3. `Data/BasicData/Game.dat`
4. folder name fallback

Encoding rule for `Game.dat`:

- Wolf RPG 2.x -> `Windows-31j`
- Wolf RPG 3.x and later -> `utf8`

## Import Pipeline

### 1. Package extraction

`wolfTl.dump(baseDir)` begins by calling `thisAddon.extractWolf(baseDir)`.

That shared extractor uses `UberWolfCli.exe` to unpack `.wolf` archives before WolfTL runs. After each successful extraction, the original `.wolf` file is renamed to `.wolf.bak` so the unpacked `Data` directory takes precedence.

### 2. WolfTL dump generation

After archive extraction, `wolfTl.dump(baseDir)` runs:

```text
WolfTL.exe <game Data dir> <baseDir> create
```

This produces a `dump/` directory containing JSON files, typically grouped into folders such as:

- `dump/mps/`
- `dump/common/`
- `dump/db/`
- root JSON files such as `Game.json`

### 3. Source file collection

`wolfTl.prepareNewProject()` gathers:

- all `dump/**/*.json` files
- multilingual CSV files found in the game's `Data` directory

CSV files are copied into `dump/Data/` so staging can preserve them.

### 4. Translation data creation

`AddonUtils.createTransData()` processes files in parallel with `p-limit`, capped by `wolfTl.workerNum`, which is currently `8` for WolfTL.

For each file:

- `.json` files are parsed by `wolfTl.getTransData()`
- `.csv` files are parsed by `WolfTlCsv`

## Parser Classes

### WolfTlMap

File: `www/addons/wolfJs/wolfTlMap.js`

Purpose:

- parses map event dumps from `dump/mps/*.json`

Behavior:

- iterates `events[*].pages[*].list`
- delegates string registration to `registerCommandListStrings()`
- does not translate `event.name`
- returns JSON unchanged except for translated string arguments

### WolfTlCommon

File: `www/addons/wolfJs/wolfTlCommon.js`

Purpose:

- parses common event dumps from `dump/common/*.json`

Behavior:

- iterates `script.commands`
- delegates string registration to `registerCommandListStrings()`
- only registers string arguments that are known to be safe for translation

### Shared event command filter

File: `www/addons/wolfJs/wolfEventCommands.js`

This helper defines the whitelist of translatable command string arguments used by both `WolfTlMap` and `WolfTlCommon`.

Currently supported command rules:

- `101` -> translate `stringArgs[0]`
- `102` -> translate literal choices, but skip values starting with `\`
- `106` -> translate `stringArgs[0]`
- `122` -> translate `stringArgs[0]`
- `210` -> translate `stringArgs[1]`
- `250` -> translate `stringArgs[0]`, except file-path-like values and `x`
- `300` -> translate `stringArgs[1]`, `stringArgs[2]`, and `stringArgs[3]`

Anything not explicitly whitelisted is left untouched.

This is intentional. Wolf RPG event dumps contain many string slots that are not display text, such as:

- labels
- jump targets
- script references
- file paths
- comments used as control metadata
- database identifiers

The whitelist approach prevents those values from entering the translation table.

### WolfTlDb

File: `www/addons/wolfJs/wolfTlDb.js`

Purpose:

- parses database dumps such as `DataBase.json` and `CDataBase.json`

Translatable fields:

- `type.description`
- `record.name`
- `field.value`, only when it is a non-empty string and not file-path-like

Not translated:

- field labels in `field.name`
- path-like values such as `CharaChip/Hero.png` or `BGM/town.mid`

Special case:

- `SysDatabase.json` is skipped entirely by the WolfTL integration layer

### WolfTlCsv

File: `www/addons/wolfJs/wolfTlCsv.js`

Purpose:

- parses multilingual CSV files stored directly in the game's `Data` directory

Behavior:

- reads the CSV source as text
- strips a UTF-8 BOM if present
- preserves the original header row
- registers only the first column of each data row for translation
- preserves additional metadata columns
- writes output with CRLF line endings
- writes back to the original CSV filename

## Export Pipeline

Export uses `AddonUtils.exportToFolder()`, which also processes files in parallel with `p-limit` and the same `workerNum = 8` cap.

### 1. Pre-export staging

`wolfTl.beforeExportToFolder()`:

- creates `destinationDir/dump`
- copies staged source data into that dump folder
- moves `dump/Data` into `destinationDir/_staging/Data`

The `_staging/Data` directory is later used as the input for `WolfTL.exe patch`.

### 2. Per-file write phase

`wolfTl.writeFile()` handles each file type:

#### JSON files

- chooses parser options from Translator++ translation data
- calls `parseJsonWithWorkerFallback('writeFile', ...)`
- writes translated JSON into `destinationDir/dump/<file>`

#### CSV files

- parses the CSV through `WolfTlCsv`
- applies translations directly
- writes the translated CSV to `destinationDir/Data/<original filename>`

### 3. Binary patch phase

`wolfTl.afterExportToFolder()` runs:

```text
WolfTL.exe <destinationDir/_staging/Data> <destinationDir> patch
```

WolfTL generates rebuilt binary files into `destinationDir/patched/`.

### 4. Copy patched binaries to final output

`wolfTl.afterExportToFolder()` copies patched results into the final game `Data` structure:

- `mps` files -> `Data/MapData/*.mps`
- `common` files -> `Data/BasicData/CommonEvent.dat`
- database and other basic data -> `Data/BasicData/*.dat`
- related `.project` files are copied when present

If `Data.wolf` still exists in the output directory, the addon warns that the game may ignore the unpacked `Data` directory until the archive is renamed.

### 5. Cleanup

Temporary directories removed after export:

- `dump`
- `patched`
- `_staging`

## Concurrency Model

WolfTL now uses two levels of throughput control:

### File-level parallelism

Managed by `AddonUtils` with `p-limit`.

Current WolfTL cap:

- `8` files at a time

This applies to both:

- translation data creation
- export file writing

### CPU offload for JSON parsing

Managed by `worker_threads` inside `wolftl.js`.

This keeps JSON parse and serialization work off the main Node/UI thread while preserving a fallback path if the worker cannot be used.

## Error Handling and Fallbacks

### Worker failure fallback

If worker parsing fails:

- the error is logged with `console.warn`
- parsing is retried on the main thread

### Blank translation payload for skipped files

For `SysDatabase.json`, the parser returns an empty translation payload instead of treating it as a normal translatable file.

### Title extraction fallback

If neither dump metadata nor `Game.dat` can be read, the project title falls back to the base folder name.

## Key Files

- `www/addons/wolfJs/wolftl.js`
- `www/addons/wolfJs/wolfTlJsonParser.worker.js`
- `www/addons/wolfJs/wolfTlMap.js`
- `www/addons/wolfJs/wolfTlCommon.js`
- `www/addons/wolfJs/wolfTlDb.js`
- `www/addons/wolfJs/wolfTlCsv.js`
- `www/addons/wolfJs/wolfEventCommands.js`
- `www/addons/wolfJs/wolfGameTitle.js`
- `www/addons/wolfJs/wolfJs.js`

## Current Behavioral Summary

The current WolfTL integration is designed around a safety-first rule set:

- only known-safe event command string slots are translated
- file paths and other structural identifiers are preserved
- database system files are skipped when needed
- multilingual CSV support is preserved alongside JSON dump support
- JSON parsing can run in worker threads without breaking main-thread fallback behavior

This keeps project creation and export compatible with WolfTL while reducing the risk of corrupting non-translatable Wolf RPG data.
