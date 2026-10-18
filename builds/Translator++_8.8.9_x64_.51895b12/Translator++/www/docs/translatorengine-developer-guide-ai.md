# TranslatorEngine Developer Guide (for AI agents)

This guide is written for an automated agent that needs to generate a working **TranslatorEngine** implementation for Translator++.

TranslatorEngine is the abstraction that lets Translator++ perform **automated translation** using different services (Google, DeepL, OpenAI-compatible APIs, web-scrapers, local tools, etc.).

Samples in this repo:

- `www/addons/basicUtils/basicTranslators/trans.google.js` (classic non-addon translator)
- `www/addons/transGoogleWebscrap/src/trans.googleWebscrap.js` (translator defined inside an add-on, using add-on local node modules)

---

## Runtime model (how engines plug into Translator++)

- A TranslatorEngine is created with `new TranslatorEngine({...})`.
- It becomes **available to Translator++** only after calling `await engine.init()`.
- `init()` registers the engine in:
  - `TranslatorEngine.translators[engine.id] = engine`
  - `trans.translator.push(engine.id)` (legacy list)
  - No need to manually assign to `trans[translatorName]`
- Translator++ retrieves engines through `trans.getTranslatorEngine(id)` (see `www/js/trans.js`).
- The grid context menu (“Translate using …”) is populated from `TranslatorEngine.translators`.

Practical implication:

- If you forget to call `init()`, the engine will not show up in menus and won’t be selectable.

---

## Minimal recipe (create a new translator engine)

1. Create the engine:
   - `const engine = new TranslatorEngine({ id, name, languages, ... })`
2. Implement the actual translation request:
   - Override `engine.fetchTranslation = async (filteredTexts, sl, tl, codeEscape) => { ... }`
3. Initialize:
   - `$(document).ready(() => engine.init());`

That’s enough for a usable engine.

---

## Core fields you almost always set

These are the important identity/UX fields used across the app:

- `id` (string, **required**, unique)
- `name` (string, human-readable)
- `description` (string)
- `author` (string)
- `version` (string)
- `columnHeader` (string)

Behavior/performance fields:

- `maxRequestLength` (number; default 5000)
- `batchDelay` (ms; default 5000)
- `skipTranslatedOnBatch` (boolean)
- `rowLimitPerBatch` (number; default Infinity)

Text formatting fields:

- `delimiter` (string; defaults to `$DV.config.lineSeparator`)
- `lineSubstitute` (string; newline placeholder for rowByRow mode)
- `escapeAlgorithm` (string; see escape algorithms)

Language support:

- `languages` (object map)
  - This may be a simple bi-directional map (as used by classic engines).
- OR `sourceLanguages` and `targetLanguages`
  - If both exist, `engine.isSupported(sl, tl)` checks those instead.

---

## Required method to implement: `fetchTranslation(...)`

### What it is

`fetchTranslation(filteredTexts, sl, tl, codeEscape)` is the **engine-specific** method that must contact your translator service and return translated strings.

- The base implementation returns the input (no translation).
- Translator++’s higher-level translation path calls `fetchTranslation()` after pre-processing.

### Input

- `filteredTexts`: usually an array of strings *already escaped/masked*.
- `sl`: source language code
- `tl`: target language code
- `codeEscape`: the CodeEscape instance used (when applicable)

### Output contract

Return translations that align with input positions:

- If the calling code expects array output, return an array of the same length.
- Some engines return a single string joined by the delimiter, and the core pipeline splits it later.

If unsure, follow existing working samples in this repo (Google classic returns a joined string; the core pipeline then reconciles lines).

---

## Hooks you can optionally implement

### `finalizeTranslation(result, originalText, options)`

If defined, the core translation pipeline will call it after receiving translation results.

Use it to:

- Decode HTML entities
- Copy indentation
- Fix formatting quirks
- Post-process on a per-line basis

Example pattern (from `trans.googleWebscrap.js`):

- Map each translated line
- `common.copyIndentation(originalLine, translatedLine)`
- `common.htmlEntitiesDecode(translatedLine)`

### `onResponse(e)`

Some engines attach an `onResponse` callback for debugging/logging.

---

## Options and persistence (`update`, `getOptions`, `optionsForm`)

### Where engine options are stored

TranslatorEngine persists options in:

- `sys.config.translatorEngineOptions[engine.id]`

### Write option

- `engine.update(key, value)` (alias: `setOption`)
  - Sets `engine[key] = value`
  - Writes to `sys.config.translatorEngineOptions[engine.id][key]`
  - Triggers an `update` event on the engine
  - Saves config via a debounced save (`saveDebounced`)

### Read option

- `engine.getOptions(key)`
  - Reads from persisted config first
  - Falls back to `defaultConfig`, instance field, and finally schema default

### Build a settings UI

- Each engine can expose a JSONForm schema in `engine.optionsForm`.
- Default `TranslatorEngine` already provides an `optionsForm` template with:
  - `disableCustomEscape` (boolean)
  - `lineSubstitute` (string)

When you pass `optionsForm` inside the constructor object, it is merged using `mergeOptionsForm()`.

In practice, your form elements should call `engine.update(...)` on change, like in `trans.google.js`.

---

## Language mapping helper: `getLanguageCode(...)`

`engine.getLanguageCode(standardCode, langTable)` converts the “unified” Translator++ language code into the engine’s expected code.

- If you only use `languages`, calling `getLanguageCode(code)` returns `languages[code]` or the original.
- If you use `sourceLanguages` / `targetLanguages`, pass `langTable` as `"sl"` or `"tl"`.

---

## Supported languages check: `isSupported(sl, tl)`

- If `sourceLanguages` and `targetLanguages` exist:
  - Checks both tables
- Else:
  - Checks `languages[sl] && languages[tl]`

---

## Typical file placement patterns

### Pattern A: “built-in” translator (basicUtils)

- The script runs in the main window and assumes globals exist (`TranslatorEngine`, `$`, `$DV`, `trans`, `ui`, etc.).
- Example: `www/addons/basicUtils/basicTranslators/trans.google.js`

### Pattern B: Translator inside an add-on

- The translator is created from an add-on script (where top-level `this` is an Addon instance).
- You can derive metadata from `thisAddon.package`:
  - `id: thisAddon.package.name`
  - `name: thisAddon.package.title`
  - `version: thisAddon.package.version`
- If your add-on has local dependencies, load them via:
  - `const fetch = thisAddon.require("node-fetch-commonjs")`
- Example: `www/addons/transGoogleWebscrap/src/trans.googleWebscrap.js`

---

## Escape algorithms (code masking)

TranslatorEngine uses CodeEscape strategies to avoid breaking in-game tags.

- Algorithms are registered under `TranslatorEngine.escapeAlgorithms`.
- Common ones in this repo:
  - `hexPlaceholder`
  - `none`
  - `HTMLCloaking`

Your engine can:

- Select an algorithm using `engine.escapeAlgorithm`, and/or
- Offer an option in `optionsForm` to let the user choose.

---

## Minimal skeleton (AI-friendly)

```js
void async function() {
  const engine = new TranslatorEngine({
    id: "myEngine",
    name: "My Engine",
    author: "Me",
    version: "0.1",
    description: "Automated translation using My Service",

    // Required-ish UI/behavior
    columnHeader: "My Engine",
    maxRequestLength: 5000,
    batchDelay: 5000,
    lineSubstitute: "§",

    // Provide supported languages (minimal example)
    languages: { ja: "ja", en: "en" },

    // Optional settings UI
    optionsForm: {
      schema: {
        apiBaseUrl: {
          type: "string",
          title: "API Base URL",
          default: "https://example.com/api",
          required: true
        }
      },
      form: [
        {
          key: "apiBaseUrl",
          onChange: (evt) => engine.update("apiBaseUrl", $(evt.target).val())
        }
      ]
    }
  });

  // The only required integration point
  engine.fetchTranslation = async (filteredTexts = [], sl, tl) => {
    // TODO: call your service
    // Must return translated texts aligned with filteredTexts
    return filteredTexts;
  };

  $(document).ready(() => {
    engine.init();
  });
}();
```

---

## Debugging checklist

- Engine not visible in menus:
  - Ensure `engine.init()` is called.
  - Ensure `engine.id` is non-empty and unique.
- Options not persisting:
  - Use `engine.update(...)` to write values (not just `engine.key = ...`).
- Wrong language codes sent:
  - Use `engine.getLanguageCode(sl, "sl")` / `engine.getLanguageCode(tl, "tl")` if needed.
- Line mismatches / broken formatting:
  - Ensure your output preserves delimiters and line ordering.
  - Consider `finalizeTranslation()` to normalize results.
