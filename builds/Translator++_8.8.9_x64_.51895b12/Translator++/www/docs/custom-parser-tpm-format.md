# Translator++ Custom Parser TPM Format Guide

This guide documents the Translator++ Parser Model (`.tpm`) format used by the Custom Parser add-on.

A TPM file tells Translator++:

- which files should be parsed
- how text should be extracted
- how extracted text should be shown in the grid
- how translated text should be written back
- which per-file-group read and write options should be used

This document is based on the current behavior of:

- `www/addons/customParser/CustomParser.js`
- `www/addons/customParser/CustomParserLoader.js`
- `www/addons/customParser/modelEditor/modelEditor.js`
- `www/addons/customParser/libs/srt-lf.tpm`

## Overview

A TPM file is JSON. Its top-level structure is:

```json
{
  "files": [
    {
      "pattern": "*.txt",
      "rules": [],
      "options": {},
      "toGrid": "",
      "fromGrid": "",
      "beforeWrite": ""
    }
  ],
  "options": {
    "testData": ""
  }
}
```

There are two layers of data:

1. Root model data
2. File-group data inside `files[]`

Translator++ selects a file group by matching the file path against that group's `pattern`.

## Top-level model format

### `files`

`files` is required.

- Type: array
- Purpose: list of file groups
- Each file group defines matching patterns, extraction rules, hooks, and per-group options

If `files` is missing or is not an array, `CustomParser.isValidModel()` returns `false` and the model is rejected.

### `options`

`options` at the root level currently stores model-editor state rather than parser behavior.

Known root options:

- `testData`: sample text used by the model editor testing tab

Example:

```json
{
  "options": {
    "testData": "1\n00:00:01,000 --> 00:00:03,000\nHello\n"
  }
}
```

The parser runtime does not use root `options` directly during project creation or export.

## File groups

Each entry in `files[]` describes one parsing profile.

Example:

```json
{
  "pattern": "*.srt",
  "rules": [
    {
      "type": "regex",
      "pattern": "/.../g",
      "captureGroups": "1"
    }
  ],
  "options": {
    "writeEncoding": ""
  },
  "toGrid": "",
  "fromGrid": "",
  "beforeWrite": ""
}
```

Supported file-group fields are described below.

### `pattern`

- Type: string
- Required in practice
- Purpose: glob pattern used to decide which files belong to this file group

The loader splits this string on `;`, trims each segment, converts each pattern with `glob-to-regexp`, and picks the first file group that matches the file path.

Examples:

```json
"pattern": "*.srt"
```

```json
"pattern": "*.txt;*.ks;*.json"
```

Important behavior:

- Matching is done against the file's relative path.
- Backslashes are normalized to `/` before matching.
- File groups are checked in array order.
- The first matching file group wins.

### `rules`

- Type: array
- Required for actual parsing
- Purpose: extraction rules executed by `CustomParser.parse()`

Rules are processed in order. Each rule can be either:

- a `regex` rule
- a `function` rule

### `options`

- Type: object
- Purpose: per-file-group parsing and writing options

Currently important options include:

- `readEncoding`
- `writeEncoding`

These are consumed by `CustomParserLoader`, not directly by `CustomParser`.

Example:

```json
"options": {
  "readEncoding": "utf8 bom",
  "writeEncoding": "Shift_JIS"
}
```

### `toGrid`

- Type: string containing JavaScript source
- Purpose: custom `filterText()` logic before text is registered into Translator++

If present, the parser compiles it as:

```js
new Function('text', 'context', 'parameters', source)
```

Use this to normalize or simplify text before it appears in the translation grid.

Typical uses:

- replace engine-specific control codes
- normalize line endings
- remove wrappers that translators should not touch

### `fromGrid`

- Type: string containing JavaScript source
- Purpose: custom `unfilterText()` logic before translated text is written back

If present, the parser compiles it as:

```js
new Function('text', 'context', 'parameters', 'info', source)
```

Use this to rebuild exact output formatting after translation.

Typical uses:

- restore line endings
- restore tags removed by `toGrid`
- add delimiters or terminators expected by the original format

### `beforeWrite`

- Type: string containing async JavaScript source
- Purpose: final whole-file transformation just before writing the file

If present, the parser compiles it as:

```js
new AsyncFunction('text', source)
```

It receives the reconstructed file text and should return the final text to write.

Use this for file-wide output cleanup that is easier after all replacements are complete.

Typical uses:

- convert line endings for the entire file
- strip temporary characters
- apply final normalization across the whole file

## Rule format

Each rule object lives inside a file group's `rules` array.

## Regex rules

Regex rules have:

```json
{
  "type": "regex",
  "pattern": "/.../g",
  "captureGroups": "1",
  "captureRowInfo": "2",
  "contextTemplate": "speaker/${GROUP[2]}",
  "action": "captureMask",
  "innerRule": {
    "type": "regex",
    "pattern": "/.../g",
    "captureGroups": "1"
  }
}
```

### `type`

For regex rules, set:

```json
"type": "regex"
```

### `pattern`

- Type: JavaScript regex literal stored as a string
- Required for regex rules

Example:

```json
"pattern": "/\\d+[\\r\\n]+.../g"
```

This is not plain regex text. It is expected to be a string that can be evaluated into a JavaScript `RegExp`, usually in `/pattern/flags` form.

Important behavior:

- If the regex has the `g` flag, all matches are processed.
- Without `g`, only one match is processed.
- The parser relies on regex match indices, provided by `regexp-match-indices/auto`.

### `captureGroups`

- Type: string or array
- Purpose: tells the parser which capture groups should be registered as translatable text

Examples:

```json
"captureGroups": "1"
```

```json
"captureGroups": "1,2,3"
```

```json
"captureGroups": [1, 2]
```

Notes:

- Strings are split on commas after whitespace is removed.
- Non-string values fall back to `[0]` in `parseCaptureGroup()`.
- Group `0` means the whole match.

### `captureRowInfo`

- Type: string or number-like value
- Purpose: copy one capture group's value into `rowInfoText`

If set, the parser uses the chosen capture group as row metadata:

```js
infoObj.rowInfoText = matches[groupIdx]
```

This is useful for speaker names and other labels that should appear in Translator++ row info.

Example:

```json
"captureRowInfo": "2"
```

### `contextTemplate`

- Type: string
- Purpose: append extra context text derived from the match

The parser starts each regex capture with a context array like:

```js
["start", offsetStart, "end", offsetEnd]
```

If `contextTemplate` is present, the compiled string is appended as one more context segment.

Supported substitutions currently documented in code:

- `${GROUP[n]}`

Example:

```json
"contextTemplate": "speaker/${GROUP[2]}"
```

Resulting context shape example:

```js
["start", 120, "end", 145, "speaker/Alice"]
```

### `action`

- Type: string
- Purpose: modifies how a regex match is handled

Observed actions:

- `mask`
- `captureMask`
- `innerRule` in the editor UI

Runtime behavior:

#### `mask`

The matched capture range is replaced with spaces in the internal working string and is not registered as translatable text.

Use this to block later regex rules from re-matching the same region.

#### `captureMask`

The capture is registered as translatable text and then its source range is masked in the internal working string.

Use this when you want to extract text once and also prevent overlapping later matches.

#### Any other action or no action

The capture is registered normally and the working string is left unchanged.

### `innerRule`

- Type: nested rule object
- Purpose: parse inside a previously matched capture range

Important runtime detail:

- If `innerRule` is present, the parser processes the nested rule relative to the current capture start.
- In that case, the outer capture itself is not registered.
- This behavior is driven by the presence of `innerRule`, not by `action` alone.

This is useful when the outer regex isolates a broad block and the nested rule extracts the real text from inside it.

## Function rules

Function rules have this shape:

```json
{
  "type": "function",
  "function": "return [{ start: 10, end: 25, context: ['line', 1] }];"
}
```

### `type`

For function rules, set:

```json
"type": "function"
```

### `function`

- Type: string containing async JavaScript source
- Required for function rules

The parser compiles it as:

```js
new AsyncFunction("text", "thisModel", source)
```

The function is called with:

- `text`: the current full script text
- `thisModel`: the rule object itself

Its `this` value is the `CustomParser` instance.

The function should return either:

- one offset object, or
- an array of offset objects

Each offset object must have:

- `start`
- `end`

Optional fields:

- `context`: array appended to the default `['start', start, 'end', end]`
- any other metadata fields such as `rowInfoText`

Example:

```json
{
  "type": "function",
  "function": "return [\n  {\n    start: 0,\n    end: 5,\n    context: ['header'],\n    rowInfoText: 'Title'\n  }\n];"
}
```

For function rules, the parser registers:

- source text: `text.substring(start, end)`
- context: `['start', start, 'end', end, ...context]`
- parameters: a clone of the returned offset object

## How extraction works

At parse time, `CustomParser.parse()` does this:

1. Loads file-group hooks (`toGrid`, `fromGrid`, `beforeWrite`)
2. Iterates through `rules[]` in order
3. Registers matched text with `registerString()`
4. Stores the matched ranges in `parsedData`
5. Uses `toString()` later to rebuild the file with translated content

For regex rules, registered items are tracked as:

```js
{
  translation: this.registerString(...),
  start: offsetStart,
  end: offsetEnd
}
```

For function rules, the same structure is built from returned offsets.

## How context is generated

Context is important because Translator++ uses it to distinguish identical source strings used in different places.

### Regex rule context

Base regex context is always:

```js
["start", offsetStart, "end", offsetEnd]
```

If `contextTemplate` exists, one more segment is appended.

### Function rule context

Base function context is:

```js
["start", start, "end", end]
```

If the returned object includes `context`, it is appended.

## How row info is generated

Translator++ can display row info such as a speaker name.

TPM supports this in two ways:

### Regex rules

Use `captureRowInfo` to copy a regex capture into `rowInfoText`.

### Function rules

Return `rowInfoText` directly in the offset object.

Because the returned offset object is cloned into the registration parameters, metadata like this is preserved.

## How text is written back

When exporting or injecting, the loader parses the original file again, applies translation pairs, and reconstructs the file.

Write-back flow:

1. `CustomParserLoader.writeFile()` calls `parseFile()`
2. `parseFile()` re-parses the source file using the matched file group
3. Translation data is attached with `assignTranslationPair()`
4. `CustomParser.toString()` rebuilds the source text from recorded offsets
5. `beforeWrite()` runs if defined
6. The file is written using the resolved write encoding

### Replacement order

`toString()` sorts parsed regions by descending `start` offset before replacing text.

That prevents earlier replacements from shifting the offsets of later replacements.

### `fromGrid` and `beforeWrite`

These are not the same:

- `fromGrid` is per-string and runs as part of `unfilterText()` behavior
- `beforeWrite` is per-file and runs after the final output string has been built

## Encodings

Encodings are resolved through `CustomParserLoader`.

### Read encoding

When reading a file, the loader uses:

1. `options.custom.readEncoding` from the project or export task
2. `fileGroup.options.readEncoding`
3. the loader's encoding parser fallback behavior

### Write encoding

When writing a file, the loader uses:

1. `options.custom.writeEncoding` or export override
2. `fileGroup.options.writeEncoding`
3. the original detected file encoding

The file BOM written is chosen from:

1. the parsed file's original BOM
2. the BOM implied by the chosen write encoding
3. `false`

## How Translator++ uses a TPM file

## Project creation

When the user creates a Custom Parser project:

1. The add-on reads the selected `.tpm` file
2. The model JSON is stored in `init.parserModel`
3. The source folder path is stored in `init.dirpath` and `init.entryPoint`
4. Custom options such as encoding are stored in `init.custom`
5. `resolveProjectFiles()` scans the source folder and collects files matched by each file group's `pattern`
6. `AddonUtils.createProject()` builds Translator++ trans data

Each file is parsed by:

- finding the matching file group
- reading with the resolved encoding
- calling `CustomParser.parse()`
- returning `transData`

## Export and injection

For export and injection, the add-on now uses `AddonUtils.applyCommonHandlers()`.

That means the Custom Parser add-on participates in the standard Translator++ flow for:

- export to folder
- export to zip
- inject to directory
- update project from source

## Update Project from Source

Custom Parser now supports automatic project refresh through `prepareNewProject(info)`.

The saved init data includes:

- `dirpath`
- `entryPoint`
- `tpmFile`
- `parserModel`
- `custom`
- `projectTitle`

On refresh, Translator++ can rebuild the project from the same TPM definition and then re-import existing translations.

## What the model editor writes

The model editor writes JSON with this shape:

```json
{
  "files": [
    {
      "pattern": "*.srt",
      "rules": [],
      "options": {},
      "toGrid": "",
      "fromGrid": "",
      "beforeWrite": ""
    }
  ],
  "options": {
    "testData": "sample text"
  }
}
```

### Editor tabs and saved fields

The model editor stores data across three main areas:

#### Rule editor

Per rule, it edits fields such as:

- `type`
- `pattern`
- `captureGroups`
- `captureRowInfo`
- `contextTemplate`
- `action`
- `function`
- `innerRule`

#### Hooks tab

Per file group, it saves source code fields such as:

- `toGrid`
- `fromGrid`
- `beforeWrite`

#### Options tab

Per file group, it saves nested values under:

- `options.*`

This is how values like `options.writeEncoding` are created.

#### Testing tab

At root level, it stores sample text as:

- `options.testData`

## Sample TPM: `srt-lf.tpm`

Sample file:

```json
{
  "files": [
    {
      "pattern": "*.srt",
      "rules": [
        {
          "type": "regex",
          "pattern": "/\\d+[\\r\\n]+\\d+:\\d+:\\d+,\\d+ --> \\d+:\\d+:\\d+,\\d+[\\r\\n]+((.+\\r?\\n)+(?=(\\r?\\n)?))/g",
          "captureGroups": "1"
        }
      ],
      "options": {
        "writeEncoding": ""
      },
      "toGrid": "",
      "beforeWrite": "text = text.replaceAll(\"\\r\", \"\");\nreturn text;",
      "fromGrid": "let thisText = text.trimEnd();\nreturn thisText+\"\\r\\n\""
    }
  ],
  "options": {
    "testData": ""
  }
}
```

How it works:

- `pattern: "*.srt"` limits the file group to SRT files
- the regex finds subtitle text blocks after the timestamp line
- `captureGroups: "1"` registers the subtitle body as translatable text
- `fromGrid` ensures each translated block ends with `\r\n`
- `beforeWrite` strips all `\r` characters from the final file, producing LF line endings

This sample is a good reminder that `fromGrid` and `beforeWrite` can be combined:

- one to shape individual extracted strings
- one to normalize the complete file output

## Practical recommendations

### Prefer stable patterns

Keep `pattern` specific enough that one file matches the intended file group only once.

### Use `captureMask` for overlapping regexes

If later rules could re-match the same extracted text, use `captureMask` on the earlier rule.

### Use `innerRule` for block parsing

If you first need to isolate a block and then parse inside it, use an outer rule with `innerRule`.

### Keep `toGrid` and `fromGrid` symmetrical

If `toGrid` removes or transforms formatting, `fromGrid` should restore it.

### Keep `beforeWrite` file-wide

Use `beforeWrite` only for whole-file cleanup, not for individual-string transformations.

### Provide row info when possible

If your format contains speaker names or labels, use `captureRowInfo` or function-rule metadata so translators see better context.

## Limitations and behavior notes

### Root `options` are mostly editor metadata

At the moment, root `options` are mainly used by the model editor. Runtime behavior is driven mostly by each file group's fields.

### Exact context is offset-based by default

If you do not define `contextTemplate` or custom function-rule context, the default context is based on offsets. That is stable for a fixed source file, but it may change if the source file structure changes.

### `innerRule` takes precedence over outer capture registration

If `innerRule` exists, the outer capture is not registered directly.

### Function rules must return valid offsets

For function rules, every returned object must include `start` and `end`.

### Invalid JavaScript hooks fail quietly

If a hook such as `toGrid`, `fromGrid`, or `beforeWrite` cannot be compiled, the parser currently catches the error and continues without applying that hook.

## Minimal TPM template

Use this as a starting point:

```json
{
  "files": [
    {
      "pattern": "*.txt",
      "rules": [
        {
          "type": "regex",
          "pattern": "/(.+)/g",
          "captureGroups": "1"
        }
      ],
      "options": {
        "readEncoding": "utf8",
        "writeEncoding": "utf8"
      },
      "toGrid": "return text;",
      "fromGrid": "return text;",
      "beforeWrite": "return text;"
    }
  ],
  "options": {
    "testData": ""
  }
}
```

## Related files

- `www/addons/customParser/CustomParser.js`
- `www/addons/customParser/CustomParserLoader.js`
- `www/addons/customParser/modelEditor/modelEditor.js`
- `www/addons/customParser/libs/srt-lf.tpm`
- `www/docs/parser-developer-guide-ai.md`
- `www/docs/parser-base-developer-guide-ai.md`