# Chat Assistant Confirmation Feature

## Overview
The `confirm()` method provides a user-friendly confirmation dialog that displays at the bottom of the chat area. This is useful when AI Agents need user intervention or permission before executing sensitive operations.

## Usage

```javascript
// Basic usage with default buttons
const result = await chatAssistant.confirm(
    "Are you sure you want to proceed?",
    ["No", "Yes"],
    false
);

if (result === 1) {
    // User clicked "Yes"
    console.log("User confirmed");
} else {
    // User clicked "No"
    console.log("User cancelled");
}
```

## Parameters

### `text` (string)
The HTML content to display in the confirmation dialog. You can use any HTML markup, including:
- Plain text
- `<br>` tags for line breaks
- `<code>` blocks for displaying commands (styled nicely)
- `<pre>` blocks for multi-line code
- `<strong>`, `<em>`, and other formatting tags

### `buttonTexts` (Array<string>)
An array of exactly two strings representing the button labels:
- **Index 0**: The cancel/negative button (styled as secondary, gray)
- **Index 1**: The confirm/positive button (styled as primary, blue)

**Default**: `["Cancel", "Confirm"]`

### `preventNewPrompt` (boolean)
If set to `true`, disables the send button and user input field until the confirmation is resolved. This prevents users from sending new messages while a confirmation is pending.

**Default**: `false`

## Return Value

Returns a `Promise<number>` that resolves to:
- `0` when the first button (cancel) is clicked
- `1` when the second button (confirm) is clicked

## Examples

### Example 1: Simple Yes/No Confirmation
```javascript
const result = await chatAssistant.confirm(
    "Do you want to continue with this action?",
    ["No", "Yes"]
);

if (result === 1) {
    // Proceed with action
    performAction();
}
```

### Example 2: Confirm Command Execution
```javascript
const command = "npm install dangerous-package";
const result = await chatAssistant.confirm(
    `Do you want to execute the following command?<br><code>${command}</code>`,
    ["Cancel", "Execute"],
    true  // Prevent new prompts until resolved
);

if (result === 1) {
    await executeCommand(command);
}
```

### Example 3: Multiple Commands with Code Block
```javascript
const commands = [
    "rm -rf /tmp/*",
    "sudo apt-get update",
    "npm install"
];

const commandsHtml = commands.map(cmd => `<code>${cmd}</code>`).join('<br>');

const result = await chatAssistant.confirm(
    `The following commands will be executed:<br><br>${commandsHtml}`,
    ["Abort", "Proceed"],
    true
);

if (result === 1) {
    for (const cmd of commands) {
        await executeCommand(cmd);
    }
}
```

### Example 4: Data Deletion Warning
```javascript
const result = await chatAssistant.confirm(
    `<strong>⚠️ Warning:</strong> This will permanently delete all cached data.<br>
    This action cannot be undone.<br><br>
    Are you sure you want to continue?`,
    ["Keep Data", "Delete"],
    true
);

if (result === 1) {
    await deleteCachedData();
}
```

### Example 5: File Overwrite Confirmation
```javascript
const filename = "important-file.txt";
const result = await chatAssistant.confirm(
    `The file <code>${filename}</code> already exists.<br>
    Do you want to overwrite it?`,
    ["Keep Existing", "Overwrite"]
);

if (result === 1) {
    await writeFile(filename, newContent);
}
```

## Styling

The confirmation dialog automatically styles:
- **Code blocks** (`<code>`) with a monospace font and highlighted background
- **Pre-formatted blocks** (`<pre>`) for multi-line code
- The first button as a **secondary** (gray) button
- The second button as a **primary** (blue) button

## Integration with AI Tools

When building AI tools/functions that require user confirmation:

```javascript
// In a tool implementation
async function deleteFiles(parameters) {
    const { files } = parameters;
    
    const fileList = files.map(f => `<code>${f}</code>`).join('<br>');
    const result = await this.confirm(
        `About to delete the following files:<br><br>${fileList}`,
        ["Cancel", "Delete"],
        true
    );
    
    if (result === 0) {
        return "Deletion cancelled by user";
    }
    
    // Proceed with deletion
    const deleted = [];
    for (const file of files) {
        await fs.unlink(file);
        deleted.push(file);
    }
    
    return `Successfully deleted ${deleted.length} files`;
}
```

## Notes

- The confirmation overlay is **sticky** at the bottom of the chat area
- It automatically **scrolls into view** when displayed
- The overlay has a **semi-transparent backdrop** for better visibility
- When `preventNewPrompt` is true, both the send button and text input are disabled
- The dialog **auto-removes** itself after a button is clicked
- Includes smooth **slide-up animation** on display
