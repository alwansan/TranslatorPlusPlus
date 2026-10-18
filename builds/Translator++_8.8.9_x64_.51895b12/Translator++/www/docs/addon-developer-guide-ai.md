# Translator++ Addon Developer Guide (for AI agents)

This guide is written for an automated agent that needs to generate a working Translator++ add-on.

See also:

- [rawviewer-snippet-preview-ai.md](rawviewer-snippet-preview-ai.md)

## What an add-on is (runtime model)

- An add-on is a folder under `www/addons/<addonDir>/`.
- The folder **must contain** a `package.json`.
- Translator++ loads add-ons via the `Addon` / `AddonLoader` implementation in [www/js/addon.js](../js/addon.js).
- Scripts listed/loaded by the add-on are executed in an `AsyncFunction(...)` where **top-level `this` refers to the `Addon` instance**.

## Minimal recipe (create a new addon)

1. Create folder: `www/addons/<addonDir>/`
2. Add `package.json` with at least:
   - `name` (unique, stable)
   - `version`
   - `autoload` (usually `false`)
   - `load` (array of files to load)
3. Add your script file(s), e.g. `otherScript.js` (a minimal add-on script can just log, register events, etc.).

A typical minimal `load` looks like:

- `load: ["otherScript.js"]`

## How `package.json` is interpreted

### Required

- `name`: **critical**. The add-on’s persistent config is stored under `sys.config.addons.package[package.name]`. If you change `name` later, users will lose the old config.

### Common metadata (used by the add-on manager UI)

The add-on manager UI (Options window) reads and displays:

- `title` (fallback: `name`)
- `description`
- `author` (object with `name`/`email`)
- `version`
- `icon` (shown in the add-on list)
- `license` (shown if present)

Fields like `main` and `homepage` are common in existing add-ons; they are useful for humans even if not required by the loader.

### Loader control fields

- `autoload: true|false`
  - If `true`, the loader reads the add-on folder content and loads supported files it finds.
  - The exact recursion depth depends on `common.readDir(...)`.
- `load: string[]`
  - Additional explicit load list.
  - Local paths are resolved relative to the add-on folder.
  - Network/external scripts are allowed (details below).
- `disabled: true|false`
  - If `true`, the add-on is treated as disabled at package level and the loader exits early.

### Config fields

The loader initializes config with:

- `config.isDisabled` (default `false`)
- `config.isMandatory` (default `false`)

Then it merges in `package.config`:

- `package.config` is copied into the add-on config (defaults), and then persisted config in `sys.config.addons.package[package.name]` takes over.

Practical implication:

- Put **default values** in `package.config`, but always read the effective values via `this.getConfig(key)`.

### Supported file types in `autoload`/`load`

The loader checks file extension and loads:

- `.js` via `Addon.prototype.loadJS(...)`
- `.html` / `.htm` via `Addon.prototype.loadHTML(...)` (appended into the add-on’s DOM container)
- `.css` via `Addon.prototype.loadCss(...)` (appended into the add-on’s DOM container)
- `*.bin` (extension ends with `bin`) via `Addon.prototype.loadBin(...)`

All encountered files are tracked in `this.files` (even if skipped).

#### Skip rule

- Any file whose **basename starts with `!`** is recorded in `this.files` but **not loaded**.

### External and network scripts in `load`

The loader treats certain `load[]` entries specially:

- External scripts: protocol `ao://`
  - `Addon.isExternalScript(...)` returns true when the URL starts with `ao://`.
  - External scripts are evaluated from either:
    - local filesystem fallback (`ao:///...` path stripped), or
    - `localStorage[path]` if present.
- Network scripts: `http://` or `https://`
  - Network scripts wait for `autoload.until("completed")`.
  - Some add-ons (e.g. `translationProxy`) use a query param like `?l=/sub.js` to load a local fallback file first.
  - If `basicUtils.safeLoad`/`safeStore` exists, fetched code may be cached.

## Execution context in add-on scripts

When a `.js` file is loaded:

- It is executed with `this` bound to the `Addon` instance.
- The function is `async`, so top-level `await` is valid.
- The loader calls the script with one argument: `this.param`.

Useful instance APIs:

- Events:
  - `this.on("loaded", fn)` (recommended)
  - `this.on("onLoaded", fn)` (deprecated event name, still triggered)
  - `this.onReady(fn)` (calls immediately if already ready)
- Config:
  - `this.getConfig(key)`
  - `this.setConfig(key, value)` (persists via `sys.saveConfig()`)
- Paths:
  - `this.getPathRelativeToRoot(file="")` (backslashes)
  - `this.getRelativePath(file="")` (forward slashes)
  - `this.getLocation()` (filesystem absolute location)
  - `this.getWebLocation()` (web location relative to current page)
- Files:
  - `this.getFile("/relative/path")` returns an entry from `this.files`

### Useful instance fields (runtime state)

These are commonly useful when writing an add-on script:

- `this.path`: directory name of the addon (e.g. `"transChatGPT"`)
- `this.id`: basename of `this.path` (usually same as `this.path`)
- `this.fullPath`: add-on root relative path (based on `nw.App.manifest.localConfig.addons`)
- `this.package`: parsed `package.json`
- `this.config`: effective config object (persisted in `sys.config.addons.package[this.package.name]`)
- `this.param`: object passed as the only argument to loaded scripts
- `this.files`: map of discovered/registered files within the add-on (keys are `\something` paths)
- `this.html`: the add-on container element appended under `#addons` (created by `createElement()`)
- `this.isReady`: boolean set true after scripts/assets load completes

### Useful helper methods (beyond config)

- DOM container:
  - `this.createElement()` creates/refreshes the add-on root DOM node.
- Resource loading helpers (rarely called manually, but useful to know):
  - `this.loadCss(path, parentObj)`
  - `this.loadHTML(path, parentObj)`
  - `this.loadJS(path, parentObj)`
  - `this.loadBin(path, parentObj)`
- Background page (iframe) utilities:
  - `await this.loadBackgroundPage(urlOrPath)` adds an iframe tagged with `data-bgpage`.
  - `await this.unloadBackgroundPage(urlOrPath)` removes it.
- Path helpers:
  - `this.resolvePath("/file")` resolves a leading-slash path from the add-on root.
  - `this.getRootDocPath(path)` converts a full path into a document-relative path.

### Local node modules inside an add-on

If the add-on has `www/addons/<addonDir>/node_modules`, you can use:

- `this.globalizeNodeModules()` to add the add-on’s `node_modules` to the global module resolution.
- `this.require("some-package")` to require from the add-on’s own `node_modules`.

## Add-on Manager UI (options UI) and `optionsForm`

The Options window (`www/js/options.js`) renders an add-on settings tab if:

- the add-on is loaded, and
- `addon.config.isDisabled` is NOT true.

To expose settings, set `this.optionsForm` in your script:

- Either an object (JSONForm schema), or
- A function `(options) => ({ schema, form })`.

Important behaviors:

- If you only provide a “mini” schema (no `form` array), the UI will auto-generate a form.
- The UI assigns defaults from `this.getConfig(key)` if present.
- `schema[key].HOOK` can be used:
  - If missing, it defaults to `thisAddon.config['<key>']`.
  - If a string, it is `eval(...)`’d by the options UI to read/write values.
  - If a function, it is called on the addon instance to compute default.

Also supported:

- `schema[key].attr` (object) adds DOM attributes to the generated field.
- Mini-schema conveniences:
  - `type: "array"` becomes checkboxes
  - `type: "radio"|"radios"` becomes radio selection

## Load ordering / dependencies

- Add-ons are loaded from the add-ons directory.
- If an add-on folder contains a `.priority` file, it loads earlier than non-priority add-ons.
- To depend on another add-on:
  - `await addonLoader.waitFor("otherAddonDir")` (wait by directory name)
  - `addonLoader.getAddonByName("packageName")` (wait by package `name`)
  - `await addonLoader.untilCompleted()` if you need “all addons finished loading”.

## Access another add-on (practical patterns)

From inside any add-on script, you can access other add-ons through the global `addonLoader`.

### 1) Wait for a specific add-on directory (recommended)

```js
const basicUtils = await addonLoader.waitFor("basicUtils");
// safe to use basicUtils after this
```

### 2) Get by directory name (only if you know it is already loaded)

```js
const maybeOther = addonLoader.getAddon("basicUtils");
if (maybeOther?.isReady) {
  // use it
}
```

### 3) Get by `package.json` name (case-insensitive)

```js
// Note: this does NOT wait; combine with untilCompleted() or waitFor() if needed.
await addonLoader.untilCompleted();
const other = addonLoader.getAddonByName("translationProxy");
```

If you need a function exported by another add-on, the simplest convention is to attach it on that add-on instance (e.g. `this.safeLoad = async (...) => { ... }`) and then call it via the retrieved instance.

## Implementation guidance for AI agents

When generating an add-on:

- Prefer `autoload: false` and an explicit `load` list (deterministic load order).
- Use `this.on("loaded", ...)` or `this.onReady(...)` before touching UI/DOM that depends on other systems.
- Persist settings via `this.setConfig(...)`, not `localStorage`, unless you specifically need per-URL cache.
- Keep `package.name` stable across versions.

## Minimal script example (like `otherScript.js`)

A very small add-on script can be as simple as:

```js
// In Translator++ addon scripts, top-level `this` is the Addon instance.
this.on("loaded", () => {
  console.log("Addon loaded:", this.package?.name || this.id);
});
```

## Engine Detection And New-Project Handoff

The `basicUtils` add-on exposes `window.engineDetectionRegistry` for parser
add-ons that can recognize an installed game from its executable or entry
point. A detector must inspect files only; it must never run the selected game.

Register a detector after the parser's own new-project wizard is available:

```js
window.engineDetectionRegistry.register({
  id: "my-parser",
  addonId: thisAddon.id,
  engineIds: ["my-engine"],
  displayName: "My Engine",
  priority: 100,
  detect: async ({ entryPoint }) => {
    const gameRoot = nwPath.dirname(entryPoint);
    if (!await hasMyEngineSignature(gameRoot)) return { matches: [] };

    return {
      matches: [{
        engineId: "my-engine",
        confidence: 1,
        evidence: ["Found My Engine runtime files."],
        entryPoint,
        gameRoot,
        preferredInput: "entryPoint"
      }]
    };
  },
  openProjectWizard: async (candidate, launchContext) => {
    ui.newProjectDialog.gotoSlide("my-parser-slide", "engineDetectResult");
    // Populate parser-owned fields after the target slide's active handler runs.
    $("#dialogNewProject [data-slideid='my-parser-slide'] .myEntryPoint")
      .val(launchContext.entryPoint)
      .trigger("change");
  }
});
```

`detect()` may return multiple matches. Each match should use a confidence from
`0` through `1`, specific user-readable evidence, and a `preferredInput` value
of `entryPoint`, `gameRoot`, or `both`. The registry supplies the selected
parser with a frozen `launchContext` containing `selectedPath`,
`selectedDirectory`, `entryPoint`, `gameRoot`, `engineId`, and evidence.

The registry deliberately does not standardize field IDs or input types. In
`openProjectWizard()`, each parser owns the mapping to its existing wizard:

- File-only parsers map `launchContext.entryPoint` to their executable input.
- Directory-only parsers map `launchContext.gameRoot` to their directory input.
- Parsers requiring both map each value to their own controls.

Always navigate before setting values because existing `active` handlers often
rebuild or clear form controls. Do not start project creation automatically;
leave the existing parser page open for the user to review options.
