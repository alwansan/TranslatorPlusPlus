# RawViewer Snippet Preview Guide (for AI agents)

This guide explains how to show **code / raw text snippets** in Translator++ using the **RawViewer** tab.

RawViewer is driven by an engine event:

- `engines.handler('onLoadSnippet')` is called automatically when the user selects a cell while the **Raw data** tab is active.
- Your engine/add-on should provide an `onLoadSnippet` handler that resolves the backing file and provides offsets for highlighting.

## Where RawViewer calls you

RawViewer triggers snippet loading here:

- [www/js/RawViewer.js](../js/RawViewer.js)
  - `onAfterSelectCell.RawViewer` → `engines.handler('onLoadSnippet').call(that, selectionInfo)`
  - `that` is the **RawViewer instance** (so inside your handler, `this` is RawViewer).

## Minimum data requirements for snippet preview

RawViewer’s built-in helper expects these fields in the selected file object (`obj = trans.getSelectedObject()`):

- `obj.path`: project-relative file path (used to resolve a real file on disk)
- `obj.extension`: used to pick syntax highlighting language (e.g. `"json"`, `"js"`)
- `obj.context[row]`: must exist and be a non-empty array for the row
- `obj.parameters[row]` (optional but recommended): offset data to highlight a string

Important behavioral detail:

- `RawViewer.prototype.commonHandleFile(...)` currently skips offsets where `start` is `0` because it uses a truthy check (`if (!thisParam.start) continue;`).
  - If you may produce `start: 0`, either avoid it (shift offsets) or patch RawViewer to check `typeof start === 'number'`.

## Offsets: how highlighting works

RawViewer can highlight a string when you provide offsets:

- `offsetList`: an array of `{ start: number, end: number }`
- Offsets are **character offsets** into the **decoded file text** returned by `RawViewer.openFile(...)`.

RawViewer will:

- Load the file,
- Extract a small snippet around `[start,end)`,
- Wrap the range with a boundary marker,
- Syntax highlight with Prism.

## Recommended approach

### 1) Store offsets during parsing (best UX)

If your parser knows exact offsets while extracting strings (common for JS parsers), store them in:

- `obj.parameters[row] = [{ start, end, ...optionalMetadata }]`

Then your `onLoadSnippet` handler can simply call:

- `return this.commonHandleFile(selectedCell, language, offsetList, activePath)`

### 2) Compute offsets lazily during preview (fallback)

If your parser does not store offsets (common for JSON-based extractors), compute them on demand in `onLoadSnippet` by searching the file content.

Good candidate patterns to search:

- Raw text (exact match)
- JSON-escaped string: `JSON.stringify(text)`
- JSON string content without quotes: `JSON.stringify(text).slice(1,-1)`
- For JS, also consider single-quoted and double-quoted escape variants

## File path resolution patterns

RawViewer’s default `commonHandleFile` uses:

- `trans.project.loc + obj.path`, then
- `trans.getStagingDataPath() + obj.path`

Some engines need additional fallbacks. For example SRPG Studio projects may store unpacked sources under:

- `<project>/_srpgstudio_cache/unpacked/<obj.path>`

A robust resolver order is:

1. `path.join(trans.project.loc, obj.path)`
2. `trans.getStagingFile(obj)` (preferred if available)
3. `path.join(trans.project.loc, "_srpgstudio_cache", "unpacked", obj.path)`

## Example: implement `onLoadSnippet` in an engine/add-on

Typical location: inside `ui.onReady(...)` in your add-on script.

```js
ui.onReady(function () {
  engines.addHandler(["yourEngineId"], "onLoadSnippet", async function (selectedCell) {
    const obj = trans.getSelectedObject();
    if (!obj) return;

    // Guard: only handle supported formats
    const ext = String(obj.extension || "").replace(".", "").toLowerCase();
    if (!['json', 'js'].includes(ext)) return;

    // Guard: RawViewer requires non-empty context row
    if (!Array.isArray(obj.context?.[selectedCell.fromRow]) || obj.context[selectedCell.fromRow].length === 0) return;

    // Resolve file path
    let activePath = nwPath.join(trans.project.loc || "", obj.path || "");
    if (!await common.isFileAsync(activePath)) activePath = trans.getStagingFile(obj);

    // Provide offsets (preferred: stored during parsing)
    let offsetList = obj.parameters?.[selectedCell.fromRow];

    // Optional fallback: compute offsets if missing
    if (!Array.isArray(offsetList) || offsetList.length === 0) {
      const fileContent = await this.openFile(activePath);
      const keyText = obj.data?.[selectedCell.fromRow]?.[trans.keyColumn];
      if (typeof keyText === 'string' && keyText.length) {
        const pos = fileContent.indexOf(keyText);
        if (pos >= 0) offsetList = [{ start: pos, end: pos + keyText.length }];
      }
    }

    if (Array.isArray(offsetList) && offsetList.length) {
      return this.commonHandleFile(selectedCell, ext, offsetList, activePath);
    }

    // Last resort: render a non-highlighted snippet
    this.clear();
    const fallbackContent = await this.openFile(activePath);
    await this.addTextPreviewFromTextOffset(fallbackContent, 0, 0, { language: ext, data: { path: activePath } });
  });
});
```

## Engine-side parsing: what to store during project creation

To make RawViewer work well, aim to populate for each extracted string row:

- `obj.data[row][trans.keyColumn]`: the source/original text
- `obj.context[row]`: include a stable identifier; recommended to include the backing file path
  - Example: `obj.context[row] = ["Script/constants/constants-stringtable.js", "some/semantic/context"]`
- `obj.parameters[row]`: offsets for highlighting
  - Example: `obj.parameters[row] = [{ start: 1234, end: 1247 }]`

## Troubleshooting checklist

- RawViewer shows nothing
  - Verify `obj.context[row]` exists and is non-empty.
  - Ensure your engine registers an `onLoadSnippet` handler.

- Warning banner: “Unable to find the file related to the data”
  - Fix `trans.project.loc` (Project properties → Raw material location), or
  - Use a custom fallback resolver (staging / unpacked cache).

- Highlight lands on wrong location
  - Ensure offsets are computed against the **decoded text** (same encoding as RawViewer uses).
  - If you compute offsets by searching, try JSON/JS escape variants.

- Only the first string in file fails to preview
  - Your offset might be `start: 0` and gets skipped by `commonHandleFile`.
