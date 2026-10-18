# Translator++ ParserBase Developer Guide (for AI agents)

This guide explains [www/js/ParserBase.js](../js/ParserBase.js) and how to use it when building a Translator++ parser.

A parser is the layer that:

1. reads game files,
2. extracts translatable text,
3. registers that text into Translator++ project data,
4. looks up translations, and
5. writes translated text back into the original file format.

Parser add-ons usually have two scripts:

- **Parser script**: the CommonJS parser module that does extraction and injection
- **Implementation script**: the add-on glue that connects the parser to the Translator++ workflow

See also:

- [www/docs/parser-developer-guide-ai.md](parser-developer-guide-ai.md)
- [www/docs/addon-developer-guide-ai.md](addon-developer-guide-ai.md)
- [www/docs/trans.md](trans.md)
- [www/addons/po/PO.js](../addons/po/PO.js)
- [www/addons/po/PoParser.js](../addons/po/PoParser.js)
- [www/addons/rmmv/rmmv.js](../addons/rmmv/rmmv.js)
- [www/addons/kagParser/libKAG.js](../addons/kagParser/libKAG.js)

---

## What `ParserBase` is

`ParserBase` is the shared base class for parser implementations.

It provides:

- translation data containers
- context handling
- translation lookup
- string filtering and unfiltering hooks
- helpers for registering translatable text
- helpers for importing and merging translation data
- helper methods for file metadata

`ParserFile` extends `ParserBase` and adds file reading and writing helpers.

---

## When to extend `ParserBase`

Extend `ParserBase` when your parser needs to:

- parse a raw script or decoded file structure
- build Translator++ trans data rows
- translate strings using existing translation pairs
- preserve formatting during export or injection
- keep file-specific logic isolated from Translator++ UI code

Typical usage:

- `ParserBase` or `ParserFile` becomes the parser class
- the implementation script creates projects and calls the parser
- the parser reads the source file, registers strings, and writes output

---

## Core constructor fields

The constructor signature is:

```js
new ParserBase(script, options)
```

Important fields set by the base class:

- `this.script` - the parsed source or raw script object
- `this.options` - parser options
- `this.readEncoding` - forced read encoding
- `this.writeEncoding` - forced write encoding
- `this.defaultEncoding` - fallback encoding, default `utf8`
- `this.translationPair` - translation lookup object
- `this.translationInfo` - metadata about translation behavior
- `this.contextSeparator` - context separator, default `/`
- `this.baseParameter` - base parameter object merged into each row
- `this.baseContext` - initial context stack
- `this.baseTags` - default tags for new rows
- `this.transData` - extracted translation dataset
- `this.translatableTexts` - collected text objects
- `this.writableData` - output buffer
- `this.currentContext` - active context stack
- `this.debugLevel` - logging level

If `baseContext` is provided, the constructor enters it immediately.

---

## `transData` shape used by `ParserBase`

`ParserBase` builds a translation dataset shaped like the Translator++ trans object.

Main fields:

- `data` - 2D array of text rows
- `context` - context chain for each row
- `tags` - optional row tags
- `parameters` - extra row metadata
- `indexIds` - text-to-row lookup table

This structure matches the project data format described in [www/docs/trans.md](trans.md).

A row registered by `registerString()` eventually becomes something like:

- source text in `data[row][0]`
- translated text in later columns
- context in `context[row]`
- actor/speaker or other metadata in `parameters[row]`

---

## Basic subclass pattern

A parser usually extends `ParserFile` when it needs file I/O.

```js
const { ParserFile } = require("www/js/ParserBase.js");

class MyParser extends ParserFile {
  constructor(file, options) {
    super(file, options);
  }

  async parse() {
    if (this.isParsed) return this;

    const raw = await this.readFile();
    this.contextEnter("myFile");

    // Example extraction
    const lines = raw.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) {
        this.register(line);
        continue;
      }

      const context = ["line", i];
      const parameters = { rowInfoText: `Line ${i + 1}` };
      const translated = this.registerString(line, context, parameters);

      // If needed, use translated value for reconstruction logic here
    }

    this.isParsed = true;
    return this;
  }
}
```

Notes:

- Set `this.isParsed = true` when parsing completes
- Use `register()` for non-translatable content
- Use `registerString()` for translatable content
- Use `contextEnter()` / `contextEnd()` to manage nested scope

---

## `registerString()` is the main entry point

`registerString(string, localContext, parameters, options)` is the most important parser API.

It does all of the following:

1. validates that the input is a string
2. clones the current context
3. merges `localContext`
4. merges `baseParameter` into `parameters`
5. calls `filterText()`
6. stores row data in `translatableTexts` and `transData`
7. looks up a translation with `translate()`
8. pushes translated or original text into `writableData`

Return value:

- the translated string if a match is found
- otherwise the original filtered string

### Typical call

```js
const translated = this.registerString(
  item.msgid,
  ["i", i, "msgctxt", item.msgctxt || ""],
  {
    comments: item.comments,
    extractedComments: item.extractedComments,
    rowInfoText: item.msgctxt || ""
  },
  {
    defaultTranslation: item.msgstr?.[0] || ""
  }
);
```

### Why this matters

If your parser skips `registerString()` and only writes text directly, Translator++ will not know:

- what should be translated
- which context belongs to a row
- what metadata should appear in the project grid
- how to export the row back later

---

## Speaker / actor name support with `rowInfoText`

`rowInfoText` is a very important parameter when the text has a speaker, actor, or line owner.

Use it to tell Translator++ who is speaking.
This improves translator context and AI translation quality and helps avoid wrong pronouns or honorifics.

### How to pass it

Pass it in the `parameters` object of `registerString()`:

```js
this.registerString(
  dialogText,
  ["scene", sceneId, "line", lineIndex],
  {
    rowInfoText: speakerName,
    currentAddress: ["events", sceneId, lineIndex]
  }
);
```

### What Translator++ does with it

When the parser stores `rowInfoText` in `parameters[row]`, Translator++ can display it as row information and may also build an actor reference table.

This is especially useful for:

- RPG dialogue
- visual novel scripts
- KAG/Tyrano scripts
- event-based game text
- anything where one line belongs to a speaker

### Practical pattern

If the previous parsed command reveals an actor name, store it and attach it to the next line:

```js
let lastActorName = "";

if (token.type === "speaker") {
  lastActorName = token.text;
} else if (token.type === "dialog") {
  this.registerString(token.text, context, {
    rowInfoText: lastActorName,
    type: "dialog"
  });
  lastActorName = "";
}
```

See [www/addons/rmmv/rmmv.js](../addons/rmmv/rmmv.js) and [www/addons/kagParser/TyranoParser.js](../addons/kagParser/TyranoParser.js) for real examples.

---

## Context handling

Context is how Translator++ distinguishes the same text used in different places.

Example: the word `Start` may appear in a menu, a battle scene, and a tutorial. The context keeps them separate.

### Methods

- `contextEnter(...values)` - push one or more context values
- `contextEnd()` - pop the last context value
- `currentContext` - current stack array

### Best practice

Use context from general to specific:

- file name
- section name
- event index
- message type
- speaker name

Example:

```js
this.contextEnter(path.basename(this.file));

const context = ["events", eventIndex, "message"];
this.registerString(text, context, {
  rowInfoText: speakerName
});
```

### Context in translation lookup

`translate()` first checks exact context matches using:

- `context.join("/") + "\n" + text`

Then it may fall back to a grouped prefix if `translationInfo.groupLevel` is set.

This means your parser should keep context stable and predictable.

---

## Assigning translation pairs

`assignTranslationPair(path, translationDatas)` connects a parser instance to existing translation data.

This is used when exporting or injecting translated text back into a file.

### Behavior

The method:

1. checks the provided path
2. looks for `translationDatas.translationData[path]`
3. falls back to `"/" + path` if needed
4. loads:
   - `translationInfo`
   - `translationPair`

### Example

```js
parser.assignTranslationPair("data/Actors.json", options.translationDatas);
```

### When to use it

Use it when your parser needs to:

- apply previously translated values
- export a file with translation lookup enabled
- inject translation from an imported project

### Notes

If `translationPair` is missing or empty, `translate()` will return the original text.

---

## `translate()` lookup rules

`translate(text, context)` performs translation lookup in order.

### Lookup order

1. exact context match
2. grouped context match if `translationInfo.groupLevel > 0`
3. direct text match
4. original text fallback

### Exact context example

For context `scene/menu/start` and text `Play`, the lookup key is effectively:

```js
"scene/menu/start\nPlay"
```

### Group level example

If `translationInfo.groupLevel = 2`, the context is truncated to the first 2 segments before lookup.

This is useful when a file has many repeated lines under a larger shared section.

### Practical advice

Use exact context when the same text can mean different things.
Use group-level matching when the file structure is repetitive and the source text should be shared across a section.

---

## `filterText()` and `unfilterText()`

These two methods are the key customization points for parser-specific text shaping.

### `filterText(text, context, parameters)`

Called before the text is registered and translated.

Use it to:

- normalize line breaks
- remove markup that should not be translated
- convert engine-specific tags into a safer display form
- prepare speaker lines or attribute values for Translator++

### `unfilterText(text, context, parameters)`

Called after translation is found, before the text is written back.

Use it to:

- restore engine tags
- restore line breaks
- rebuild escaped quotes
- undo placeholder masking

### Important rule

`filterText()` and `unfilterText()` should be inverse operations as much as possible.

If you replace something during filtering, restore it during unfiltering.

### Example: preserve visual line breaks

```js
MyParser.prototype.filterText = function(text, context, parameters = {}) {
  return text.replace(/\r/g, "").replace(/\n/g, " ");
};

MyParser.prototype.unfilterText = function(text, context, parameters = {}) {
  return text.replace(/ /g, "\n");
};
```

A real parser should be more careful than this and preserve exact formatting rules for the target file format.

See [www/addons/kagParser/libKAG.js](../addons/kagParser/libKAG.js) for a richer example.

---

## `register()` and `editLastWritableData()`

### `register(string)`

Adds a raw string chunk to `writableData` without translation lookup.

Use this for:

- separators
- comments
- binary-safe chunks
- unchanged punctuation
- untranslatable tokens

### `editLastWritableData(string)`

Replaces the last output chunk.

Use this when:

- output is built incrementally
- you need to revise the last emitted token
- you want to modify a previously written delimiter or terminator

---

## `addTransData()` and `importTransData()`

### `addTransData(translatableObj)`

Internal helper used by `registerString()`.
It stores a row in `this.transData`.

The object usually contains:

- `text`
- `rawText`
- `context`
- `parameters`
- `tags`
- `address`
- `defaultTranslation`

### `importTransData(exportedObj)`

Merges exported translation data from another parsed instance into the current parser.

This is helpful when:

- loading imported project data
- combining translation sets
- applying translated content from a previous export

Internally it uses `ParserBase.appendTransData(...)`.

---

## `getText()` and `toString()`

### `getText()`

Returns `this.writableData.join("")`.

### `toString()`

Also returns the concatenated writable output.

They are equivalent in the current implementation.

Use them when you need the final exported file text after parsing and translation.

---

## `processThispath()`

`processThispath(relPath)` is a simple file filter.

If `options.files` exists, only files in that list are processed.

If `options.files` is missing or empty, all files are accepted.

Use this when the parser must respect a file whitelist from the project or add-on workflow.

---

## File metadata helpers

### `generateFileInfo(relativePath)`

Creates a file info object with fields like:

- `extension`
- `filename`
- `basename`
- `path`
- `relPath`
- `dirname`

This is useful when your parser needs to attach file metadata to a row.

### Instance version

`this.generateFileInfo(relativePath)` stores the info in `this.fileInfo`.

---

## `ParserFile` helper class

`ParserFile` extends `ParserBase` and adds file operations.

Use it when the parser works with actual files on disk.

### Main methods

- `readFile(file, readEncoding)`
- `readTextFromFile(file, readEncoding)`
- `write(file, encoding, bom)`

### Typical flow

```js
const parser = new MyParser(filePath, options);
await parser.parse();
const output = parser.getText();
await parser.write(targetPath, "utf8", true);
```

### Notes

- `readFile()` uses `fs.readFile()` and `iconv-lite` decoding
- `readTextFromFile()` uses `common.fileGetContents()` and stores encoding metadata
- `write()` delegates to `common.filePutContents()`

---

## How to handle actor / speaker names correctly

This is one of the most useful parser features for translation quality.

### Recommended approach

1. detect the speaker or actor name from the file structure
2. save it in a local variable or parser state
3. attach it to the next translatable line via `parameters.rowInfoText`
4. use a context that includes the speaker location if necessary

### Example

```js
let speakerName = "";

if (entry.type === "speaker") {
  speakerName = entry.text;
  this.register(entry.text);
  return;
}

if (entry.type === "dialog") {
  this.registerString(entry.text, ["scene", sceneId, "dialog", entry.index], {
    rowInfoText: speakerName,
    currentAddress: ["scene", sceneId, entry.index]
  });
  speakerName = "";
}
```

### Why it matters

Without speaker context, translators and AI systems may misread:

- pronouns
- honorifics
- gendered speech
- character-specific terminology
- dialogue tone

For visual novels and RPGs, this often makes a large quality difference.

---

## Real-world examples in this repo

### PO parser

[www/addons/po/PO.js](../addons/po/PO.js) shows a clean `registerString()` flow:

- reads PO or MO data
- extracts `msgid`
- uses extracted comments and comments as parameters
- passes `defaultTranslation` from `msgstr[0]`

### RPG Maker parser

[www/addons/rmmv/rmmv.js](../addons/rmmv/rmmv.js) shows:

- JSON parsing
- event text extraction
- setting `rowInfoText` for actor names
- context-rich row registration

### KAG / Tyrano parser

[www/addons/kagParser/libKAG.js](../addons/kagParser/libKAG.js) shows:

- custom `filterText()` and `unfilterText()`
- handling attribute values differently from dialogue text
- preserving line breaks and engine markup

[www/addons/kagParser/TyranoParser.js](../addons/kagParser/TyranoParser.js) shows how actor names are attached to row metadata.

---

## Minimal checklist for a good parser

Before shipping a parser based on `ParserBase`, verify that it can:

- read the source file correctly
- detect and preserve encoding
- extract translatable strings
- attach useful context
- attach `rowInfoText` for speakers when available
- use `registerString()` for every translatable row
- preserve formatting using `filterText()` and `unfilterText()`
- look up translations with `assignTranslationPair()` and `translate()`
- write valid output back to the original format
- set `this.isParsed = true` when parsing is done

---

## Good default patterns

- Parse raw content into an internal object model first
- Register strings only after extraction is complete
- Store source text, translated text, context, and metadata separately
- Rebuild the final file from the parsed model, not by naive string replacement
- Use `ParserFile` for file-based formats
- Use `ParserBase` directly only when file I/O is handled elsewhere

---

## Implementation guidance for AI agents

When generating a parser:

- decide whether the file is plain text or binary
- decide whether `ParserFile` or `ParserBase` is the better base
- keep `filterText()` and `unfilterText()` symmetrical
- include actor / speaker names in `parameters.rowInfoText` whenever possible
- keep context stable and specific enough to avoid collisions
- use `defaultTranslation` when importing existing translated rows
- keep output formatting deterministic
- preserve existing file structure and encoding details

---

## Related source files

- [www/js/ParserBase.js](../js/ParserBase.js)
- [www/js/AddonUtils.js](../js/AddonUtils.js)
- [www/docs/trans.md](trans.md)
- [www/docs/parser-developer-guide-ai.md](parser-developer-guide-ai.md)
- [www/addons/po/PO.js](../addons/po/PO.js)
- [www/addons/rmmv/rmmv.js](../addons/rmmv/rmmv.js)
- [www/addons/kagParser/libKAG.js](../addons/kagParser/libKAG.js)
- [www/addons/kagParser/TyranoParser.js](../addons/kagParser/TyranoParser.js)
