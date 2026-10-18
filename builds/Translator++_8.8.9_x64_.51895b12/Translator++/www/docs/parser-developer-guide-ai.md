# Translator++ Parser Developer Guide (for AI agents)

This guide is for generating or modifying a Translator++ parser add-on.

A parser is the part of Translator++ that fetches text from game files, stores it in Translator++ translation data, and writes translated text back into the original file format.

## What a parser add-on does

Translator++ parsers are modular and usually shipped as an add-on.

A parser add-on typically has two layers:

1. **Parser script**
   - Usually a CommonJS module so it can run in a worker thread.
   - Reads raw files, extracts translatable text, and writes translated text back.
   - Should extend or follow the patterns in [www/js/ParserBase.js](../js/ParserBase.js).

2. **Implementation script**
   - Integrates the parser into the Translator++ workflow.
   - Uses utilities from [www/js/AddonUtils.js](../js/AddonUtils.js) for project creation, export, and injection.
   - Connects the parser to add-on menus, buttons, and engine handlers.

## Translator++ workflow

The usual flow is:

1. **Trans format generation**
   - Start a new project.
   - Scan files and build `transData`.

2. **Translation**
   - Users edit strings in Translator++.

3. **Export / inject**
   - Write translated text back into files.
   - Or inject translated materials into a target folder.

### Passing data between project creation and export/inject

Project creation and export/inject are detached phases.

If the parser or implementation script needs to remember configuration for later export or inject operations, store it in the trans object so it survives the project lifecycle.

You can place this data anywhere inside `trans.options`, but for consistency Translator++ add-ons usually store it in:

- `trans.project.options.init`

This is a good place for user-selected source information, such as:

- an entry point file chosen during project creation
- the original archive path
- parser-specific mode flags
- unpacker or export options that must be reused later

Example:

```js
trans.project.options.init.entryPoint = "C:\\Game\\Game.exe";
```

During export or inject, read the same value back from `trans.project.options.init` and use it to reconstruct the source layout or call external tools with the correct context.

## When to build a parser

Use a parser when the file format:

- contains translatable text in a structured form, or
- can be decoded from binary with a third-party library/tool, or
- needs custom logic to preserve formatting, headers, tags, or metadata.

Examples:

- Plain text formats: Ren'Py script, JSON-based game data, many RPG Maker files
- Binary formats: compiled resources, some engine-specific archives, font tables, proprietary containers

## Parser script responsibilities

The parser script should focus on file-level translation logic.

Typical duties:

- detect file type / encoding
- read and decode the file
- extract strings
- register strings with context and metadata
- apply translation lookup
- write translated data back
- preserve non-text structure and formatting

### Recommended parser shape

A parser script commonly exposes a class such as:

- `ParserBase` for shared parsing behavior
- a subclass such as `PoFile`, `RenpyFile`, or engine-specific parser classes

See [www/js/ParserBase.js](../js/ParserBase.js) for the base API.

## Implementation script responsibilities

The implementation script should connect the parser to Translator++.

Typical duties:

- declare the add-on metadata
- register the game engine name
- create projects from files or folders
- export translated files
- handle injection to a target directory
- provide UI integration if needed

For DRY code, reuse [www/js/AddonUtils.js](../js/AddonUtils.js).

Implementation script is loaded through add-on manager, so all Global variable available in Translator++ are 
exosed in the implementation level. See `.eslintrc.json` for the list of global level script.

## ParserBase concepts

`ParserBase` provides shared parsing helpers and data containers.

Important fields and methods:

- `this.script` - parsed file object or raw source
- `this.options` - parser options
- `this.translationPair` - translation lookup table
- `this.translationInfo` - translation metadata
- `this.transData` - extracted translation dataset
- `this.writableData` - buffer for output text
- `this.currentContext` - active context stack

Useful methods:

- `parse()` - parse the script asynchronously
- `registerString()` - register a translatable string
- `translate()` - find a translation from the pair
- `filterText()` / `unfilterText()` - customize text normalization
- `getText()` / `toString()` - produce final output
- `assignTranslationPair()` - connect translation data for export
- `importTransData()` - merge imported translation data

### `transData` structure

A parser usually fills `transData` with:

- `data` - rows of source / translated text
- `context` - context chain for each row
- `tags` - optional tags
- `parameters` - optional metadata
- `indexIds` - lookup table for deduplication

Keep the structure stable so Translator++ can reuse it for translation, export, and injection.

## Parsing best practices

### 1) Preserve file structure

Only modify translatable text. Keep:

- spacing
- quoting style
- line breaks
- comments
- headers
- encoding details
- binary container structure when applicable

### 2) Use context

Context prevents collisions when the same text appears in different places.

Example context may include:

- file section
- item index
- key name
- speaker name
- message type

### 3) Register metadata

Use parameters or tags when the translation needs extra information.

Good metadata includes:

- comment text
- extracted comments
- node name
- line number
- message id / key path

### 4) Support encoding carefully

Some files require explicit encoding handling.

If the format is text-based:

- detect encoding when reading
- preserve BOM when needed
- write with the original encoding when possible

### 5) Handle binary formats through helpers

For binary formats, the parser may need to:

- unpack the binary structure
- extract text through a third-party library
- rebuild the binary after translation

Keep the parser API the same even if the file is binary.

## Implementation best practices

### Use AddonUtils where possible

`AddonUtils` already provides common project and export logic:

- `createProject()`
- `createTransData()`
- `exportToFolder()`
- `exportAsZip()`
- `handleExport()`
- `injectCopyMaterials()`
- `injectDone()`
- `updateProject()` — rebuilds the project from source and re-imports existing translations

Prefer these helpers instead of rewriting the same workflow in each add-on.

### Calling `applyCommonHandlers()`

`AddonUtils.applyCommonHandlers()` is best treated as the final wiring step for an add-on.

Recommended findings from the SRPG Studio add-on work:

- define any custom overrides first, then call `applyCommonHandlers()` once at the end
- use it to register the standard engine/add-on behaviors without replacing your custom workflow hooks
- keep custom logic in explicit methods like `prepareNewProject()`, `injectGetTargetExportDir()`, `afterInject()`, or `afterExportToFolder()`

In practice, `applyCommonHandlers()` is useful when the add-on still wants Translator++ defaults for common flows, while the add-on keeps control over special archive handling.

Handlers registered by `applyCommonHandlers()`:

| Handler | Trigger |
|---|---|
| `exportHandler` | Export toolbar button |
| `onOpenInjectDialog` | Inject dialog open |
| `injectHandler` | Inject toolbar button |
| `updateProjectHandler` | Update Project toolbar button |

### Update Project from Source

Translator++ includes a toolbar button (**Update Project from Source**) that rebuilds a project from its original source material and re-imports all existing translations automatically.

The button checks `engines.hasHandler('updateProjectHandler')` for the current engine:
- **Handler found** — runs the automated workflow.
- **No handler** — shows a fallback alert instructing the user to update manually.

`AddonUtils.applyCommonHandlers()` registers `updateProjectHandler` for every engine in its `supportedEngines` list, so any add-on that calls `applyCommonHandlers()` gets the button for free — as long as it also defines `prepareNewProject`.

#### The automated update flow

1. **Save** — the current `.trans` file is saved if `trans.currentFile` is set.
2. **Snapshot** — `trans.getSaveData()` and `trans.project.options.init` are captured before the project is replaced.
3. **Recreate** — `thisAddon.prepareNewProject(initOptions)` is called with the stored init options, creating a fresh project without opening the project creation dialog.
4. **Import** — `trans.importCompleteRowData(oldTransData, {...})` transfers all translations, tags, notes, context translations, and cell info into the new project.
5. **Notify** — the user is prompted to save as a new file to preserve the previous version.

#### Implementing `prepareNewProject(info)`

For `updateProject()` to work, the add-on **must** define a `prepareNewProject(info = {})` method.

- `info` is a deep clone of `trans.project.options.init` — the same object stored during project creation.
- The method must recreate the project programmatically without showing a dialog.
- It should resolve `files` and `basePath` from `info`, then call `this.createProject(files, basePath, {init: info})`.

Example for a folder-based add-on:

```js
thistAddon.prepareNewProject = async function(info = {}) {
    ui.showLoading();
    ui.loadingProgress("Processing", "Rebuilding project...", {consoleOnly: false, mode: "consoleOutput"});

    const files = await common.glob(info.filter || "**/*.po", {cwd: info.dirpath});
    if (!files?.length) {
        await ui.logError("No files found.");
        ui.loadingEnd();
        return;
    }

    await this.createProject(files, info.dirpath, {init: info});
    ui.log.progress("Done", "Done");
    ui.log.end();
};
```

If an add-on does not define `prepareNewProject`, `updateProject()` shows a graceful error instead of crashing.

For add-ons that do **not** call `applyCommonHandlers()`, register the handler manually inside `init()`:

```js
engines.addHandler(supportedEngines, 'updateProjectHandler', async function() {
    await thisAddon.updateProject();
    return common.halt();
});
```

### Piggybacking compilation in `afterExportToFolder()`

For engines that require a second-stage rebuild after export, `afterExportToFolder()` can be used as a post-export hook.

Use it when:

- export has already produced the intermediate files you need
- the engine must compile, pack, or rebuild an archive after translation output is written
- the extra step should happen automatically as part of export, not as a separate manual tool action

This is a good fit for workflows like SRPG Studio, where the add-on may export translated JSON first and then repack or rebuild the playable archive if needed.

If the workflow is primarily injection-driven, prefer `injectGetTargetExportDir()` and `afterInject()` for the same kind of staging and rebuild behavior.

### Worker thread usage

If parsing is expensive, run parser work in a worker thread.

This is useful for:

- large files
- batch scanning
- binary decoding
- formats with heavy parsing logic

Keep worker code isolated and CommonJS-friendly.

## Recommended add-on structure

A typical parser add-on looks like this:

- `www/addons/<addonName>/package.json`
- parser module, for example `PO.js`
- implementation module, for example `PoParser.js`
- optional worker module, for example `worker.js`
- optional icon, UI files, or helper modules

See [www/docs/addon-developer-guide-ai.md](addon-developer-guide-ai.md) for add-on packaging and loader behavior.

## Example: PO parser

The PO add-on in [www/addons/po](../addons/po) is a good reference.

- [www/addons/po/PO.js](../addons/po/PO.js) is the parser script
- [www/addons/po/PoParser.js](../addons/po/PoParser.js) is the implementation script
- [www/addons/po/worker.js](../addons/po/worker.js) shows worker-thread usage

What it demonstrates:

- parsing `.po` and `.mo` files
- converting binary MO to parseable data
- registering message strings with context
- writing translations back to the original file format
- integrating with the project creation and export pipeline

## Minimal development checklist

Before shipping a parser add-on, verify that it can:

- create a new project from source files
- extract strings correctly
- preserve context and metadata
- translate strings through Translator++
- export translated files successfully
- inject translated output into a target directory
- handle encoding and line breaks correctly
- fail gracefully on unsupported or malformed files
- support project update from source by defining `prepareNewProject(info)`

## AI agent guidance

When generating or modifying a parser:

- infer the file format first
- decide whether the format is text or binary
- separate parsing logic from UI / workflow glue
- keep the parser deterministic and side-effect free where possible
- preserve source formatting exactly when writing back
- use `ParserBase` for shared behavior and `AddonUtils` for workflow integration
- keep the add-on name stable so user config is preserved

## Good default patterns

- Parse raw content into an internal object model first
- Translate only after extraction is complete
- Store original text, translated text, context, and metadata separately
- Rebuild the final file from the parsed model, not by naive string replacement
- Use worker threads for heavy parsing and export jobs

## Related files

- [www/js/ParserBase.js](../js/ParserBase.js)
- [www/js/AddonUtils.js](../js/AddonUtils.js)
- [www/docs/addon-developer-guide-ai.md](addon-developer-guide-ai.md)
- [www/addons/po/PO.js](../addons/po/PO.js)
- [www/addons/po/PoParser.js](../addons/po/PoParser.js)
- [www/addons/po/worker.js](../addons/po/worker.js)
