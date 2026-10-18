# Translator++ Automation Documentation

This documentation describes the **CodeRunner** environment used to automate tasks in Translator++. Scripts run within an `AsyncFunction` context.

## Global Context
The following objects are available in all workspaces:
*   **`trans`**: The main application instance. Access project data via `trans.project`.
*   **`die(message)`**: Halts script execution immediately with a message.
*   **`window.session`**: Temporary storage object cleared between executions.
*   **`console`**: Standard console logging.
*   All web JS and nodeJS functionality
*   All Translator++ API

---

## User Input (UI Generation)
Scripts can request user input before execution by defining a JSON Schema within a JSDoc `@form` tag in the script header.
*   **Access:** Input data is available via `this.userInput`.
*   **Format:** [Form.io](https://form.io/) compatible JSON schema.

```javascript
/**
 * @form [
 *   {"label": "Prefix", "key": "prefix", "type": "textfield", "input": true}
 * ]
 */
console.log(this.userInput.prefix);
```

---

## Workspaces
The workspace determines the iteration logic and the context of `this`.
5 workspace available depending on how the iteration occured: global, objectIterator, rowIterator, gridSelection, foundCells

### 1. Global (`global`)
Runs the script once. No automatic iteration.
*   **Use case:** Project-wide cleanup, exporting data, complex logic handling its own iteration.
*   **Context:** `this` contains `options` and `userInput`.

### 2. Object Iterator (`objectIterator`)
Iterates through selected **files** in the project.
*   **Use case:** modifying file metadata, deleting specific files.
*   **Context (`this`):**
    *   `file`: (String) The internal ID of the current file.
    *   `index`: (Int) Current iteration index.
    *   `maxIndex`: (Int) Total items - 1.
    *   `isLast`: (Bool) True if processing the last file.

### 3. Row Iterator (`rowIterator`)
Iterates through every **row** of selected files.
*   **Use case:** Batch translation, tagging, search & replace on lines.
*   **Context (`this`):**
    *   `file`: (String) File ID.
    *   `rowId`: (Int) Row index.
    *   `cells`: (Proxy Array) The cell data. **Writeable**. Assigning triggers UI updates.
        *   `this.cells[0]`: Usually the Key/Original column.
        *   `this.cells[1]`: Usually the Translation column.
    *   `keyText`: (String) Text in the key column (`trans.keyColumn`).
    *   `tags`: (Proxy Array) Tags associated with the row. **Writeable**.
        *   Example: `this.tags.push("checked")`
    *   `context`: (String) Context string for the row.
    *   `parameters`: (Object) Row parameters.
    *   `comments`: (String) Comments.
    *   **Helper Methods:**
        *   `getBestTranslation()`: Returns the content of the most relevant translation column.
        *   `getBestTranslationCol()`: Returns the index of that column.

### 4. Grid Selection (`gridSelection`)
Iterates only through **cells** currently selected by the user in the grid view.
*   **Use case:** Modifying specific manually selected cells.
*   **Context (`this`):**
    *   All properties from **Row Iterator**.
    *   `colId`: (Int) The column index of the selected cell.
    *   `text`: (String) Current text in the selected cell.
    *   `setText(val)`: Helper to update the current cell safely.

### 5. Found Cells (`foundCells`)
Iterates through cells resulting from a search/find operation.
*   **Use case:** Replacing text only in search results.
*   **Context (`this`):** Same as **Grid Selection**.

---

## API Reference: `this` Context

| Property | Type | Available In | Description |
| :--- | :--- | :--- | :--- |
| `userInput` | Object | All | Data collected from `@form` schema. |
| `file` | String | All Iterators | ID of the current file. |
| `index` | Int | All Iterators | Current loop index. |
| `isLast` | Bool | All Iterators | True if last item in loop. |
| `rowId` | Int | Row/Cell Iterators | Index of the current row. |
| `colId` | Int | Cell Iterators | Index of the current column. |
| `cells` | Proxy | Row/Cell Iterators | Array of row values. `this.cells[1] = "val"` updates the grid. |
| `keyText` | String | Row/Cell Iterators | The original text (Key column value). |
| `tags` | Proxy | Row/Cell Iterators | Array of strings. `this.tags.push("red")` updates UI. |
| `text` | String | Cell Iterators | Value of the specific cell being iterated. |

## Example Scripts

**Row Iterator (Tagging based on content):**
```javascript
// Workspace: rowIterator
// Adds a "red" tag if the original text contains ".png"
if (!this.keyText) return;
if (this.keyText.includes(".png")) {
    this.tags.push("red");
}
```

**Grid Selection (Uppercase):**
```javascript
// Workspace: gridSelection
// Uppercases selected cells
if (this.colId === 0) return; // Skip key column
this.setText(this.text.toUpperCase());
```