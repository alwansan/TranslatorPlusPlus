# Translator++ 8.8.9 Android Port — Source Inventory

Inspected distribution:
`builds/Translator++_8.8.9_x64_.51895b12/Translator++/`

## What is present

This is an unpacked Windows/NW.js distribution with significant application-side source available:
- `main.js` and `package.json` boot the NW.js/Node desktop application.
- `www/trans.html` contains the principal translation workspace UI and references the bundled jQuery, Handsontable, Bootstrap, JSON form, and other frontend modules.
- `www/js/` includes the project/table model, UI orchestration, translation engines, proofreader, context translation, logging, parser support, and system helpers.
- `www/addons/` contains engine-specific parsers and adapters.
- `data/template.trans` documents the core project/table shape: top-level `data` matrix, `colHeaders`, `columns`, and a `project` object with `indexOriginal` and `indexTranslation`. Individual projects also retain metadata, references, tags, and file mappings.
- `package.json` lists useful portable JS packages such as `iconv-lite`, `encoding-japanese`, `pako`, `jsonata`, `dexie`, `csv` helpers, `renpy-js`, and a customized Kaitai parser package.

## Measured footprint of the unpacked `www/` tree

The recursive Git tree contained 11,654 entries (including directories; not all are application source). File extension counts include bundled libraries and assets:
- 4,070 `.js` files and 186 `.mjs` files
- 146 `.css` and 40 `.html` files
- 396 `.json` files
- 1,056 `.php` files
- 25 `.exe`, 140 `.dll`, 17 `.bat`, and 7 `.ps1` files

There are 189 paths ending in `.exe`, `.dll`, `.bat`, or `.ps1` under `www/`. Some DLLs are .NET dependencies, but the inventory still shows why enabling every addon unchanged is not realistic.

## Desktop assumptions that block a direct Android build

- `main.js` uses `nw.App`, `nw.Window.open`, `nw.App.argv`, and desktop window life-cycle events.
- `www/js/sys.js` uses `nw.gui`, desktop clipboard access, Node filesystem APIs, application manifest settings, and Windows-style paths.
- `www/js/php.js` launches `php.exe` through `child_process.exec/spawn`; several project import/export paths therefore depend on a desktop executable.
- `www/js/ThirdParty.js` manages downloaded/configured third-party tools and uses filesystem/network streams and 7-Zip.
- The distribution includes Windows-specific runtimes and assets, including `Translator++.exe`, `node.dll`, NW.js DLLs, PHP/Ruby Windows runtimes, `7za.exe`, and engine helper executables/DLLs within parser add-ons.
- The root npm dependency set includes Windows integrations such as `windows-elevate`, `windows-shortcuts`, and `win-version-info`; those features cannot be reused as-is on Android.
- Parser folders include a mixture of JavaScript, PHP, and Windows executables. The fact that a parser's controller is JavaScript does not make its extraction/rebuild tool Android-compatible.

## Portability groups

1. **Promising to port/reuse after tests:** data model logic and format routines that are pure JavaScript; JSON and text processing; encoding helpers; browser-renderable UI pieces once Node/NW imports are removed or bundled.
2. **Needs Android adapters:** project open/save, SAF document URIs, preferences, clipboard, background tasks, logs, archives, file tree access, and any path-based I/O.
3. **Needs replacement or a supported Android runtime:** PHP scripts, external command execution, Windows path/registry/window APIs, .NET tools, and Windows-native binaries.
4. **Must be tested per format:** archive-based engines, binary extraction/repacking, and game-specific parsers. Do not enable a format just because its UI add-on exists.

## First vertical slice

The Android app now recognizes the JSON structure used by Translator++ `.trans` projects, displays original text beside the configured translation column, permits edits to that column, and exports the complete JSON project object. Other files remain in an explicit text-only fallback. This is a project-model/data round-trip milestone, not full engine parity.

## Next gates

- [x] Add JVM tests using a sanitized fixture model; verify source/target index mapping, preservation of unrelated metadata and columns, Unicode/Arabic round-trip, BOM handling, short rows, invalid project shapes, and non-array data rows.
- [x] Move parsing/model code out of the activity into a testable `TransProject` module.
- [ ] Confirm the latest CI test-and-build run passes before treating the new milestone as verified.
- Add robust CSV/TSV support and project creation/history.
- Port one engine end-to-end only after its parser and rebuild path have an Android-compatible implementation.
- Add format capability registry so unsupported Windows-only formats are disabled with a clear explanation.

## License

Translator++ identifies its main application code as GPL-3.0-or-later. Preserve the upstream license headers and audit the licenses for bundled dependencies and individual parser tools before redistribution.
