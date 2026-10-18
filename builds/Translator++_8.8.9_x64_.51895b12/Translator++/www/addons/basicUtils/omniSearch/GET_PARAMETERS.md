# OmniSearch - GET Parameters Guide

This document describes the GET parameters that can be used to pre-configure OmniSearch when opening it.

## Overview

When OmniSearch is opened, it will:
1. **If GET parameters are present**: Load settings from GET parameters (ignores localStorage)
2. **If no GET parameters**: Restore the previous session from localStorage (search configuration and results)

## Supported GET Parameters

### Search Configuration

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `searchPath` | string | The directory path to search in | `?searchPath=C:/Projects/MyApp` |
| `fileTypes` | string | Comma-separated list of file patterns | `?fileTypes=*.js,*.ts,*.json` |
| `searchText` | string | The text to search for | `?searchText=function` |
| `subfolders` | boolean | Search in subfolders | `?subfolders=true` |
| `caseSensitive` | boolean | Case-sensitive search | `?caseSensitive=true` |
| `wholeWord` | boolean | Match whole words only | `?wholeWord=true` |
| `regex` | boolean | Use regular expressions | `?regex=true` |
| `autoSearch` | boolean | Automatically trigger search on load | `?autoSearch=true` |

### Parameter Types

- **string**: Any text value (URL-encoded if contains special characters)
- **boolean**: `true` or `false`

## Usage Examples

### Example 1: Basic Search Setup
```
omniSearch.html?searchPath=C:/Projects/MyApp&searchText=TODO&fileTypes=*.js,*.ts
```
Opens OmniSearch with:
- Search path: `C:/Projects/MyApp`
- Search text: `TODO`
- File types: `*.js, *.ts`

### Example 2: Case-Sensitive Regex Search
```
omniSearch.html?searchPath=C:/logs&searchText=ERROR\s+\d+&regex=true&caseSensitive=true&fileTypes=*.log
```
Opens OmniSearch with:
- Search path: `C:/logs`
- Search text: `ERROR\s+\d+` (regex pattern)
- Regex enabled: Yes
- Case sensitive: Yes
- File types: `*.log`

### Example 3: Auto-Search on Load
```
omniSearch.html?searchPath=E:/Documents&searchText=important&autoSearch=true
```
Opens OmniSearch and automatically starts searching for "important" in `E:/Documents`

### Example 4: All Parameters
```
omniSearch.html?searchPath=C:/Code&fileTypes=*.html,*.css,*.js&searchText=class&subfolders=true&caseSensitive=false&wholeWord=true&regex=false&autoSearch=true
```

## URL Encoding

Remember to URL-encode special characters in parameter values:

| Character | Encoded |
|-----------|---------|
| Space | `%20` |
| `/` | `%2F` |
| `\` | `%5C` |
| `&` | `%26` |
| `=` | `%3D` |

### Example with URL Encoding
```
omniSearch.html?searchPath=C%3A%2FMy%20Documents%2FProject&searchText=hello%20world
```

## LocalStorage Persistence

When no GET parameters are present, OmniSearch will:
1. Restore the last search configuration (path, text, options)
2. Restore the last search results
3. Restore the last selected file in the results grid

This allows users to quickly resume their work from the previous session.

## Notes

- GET parameters take precedence over localStorage
- When using GET parameters, the previous localStorage state is NOT loaded
- All parameters are optional
- Boolean parameters default to `false` if not specified
- The `autoSearch` parameter will trigger a search 500ms after the page loads (to ensure UI is ready)
