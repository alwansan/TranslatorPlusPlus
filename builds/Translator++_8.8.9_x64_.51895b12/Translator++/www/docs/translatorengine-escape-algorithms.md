# TranslatorEngine Escape Algorithms Guide

Translator++ uses **escape algorithms** to *mask* special tokens (RPG Maker tags, placeholders, control codes, numbers, etc.) before sending text to an external translator, then *restore* them afterward.

Why this exists:

- Most translators (especially LLMs) may translate or reformat tags like `\\C[1]`, `\\V[10]`, `%1`, etc.
- Masking replaces those parts with placeholders that translators are less likely to touch.
- After translation, placeholders are converted back to the original tags.

Where it plugs in:

- Each `TranslatorEngine` selects an algorithm via `engine.escapeAlgorithm`.
- The pipeline calls `CodeEscape.escapeTexts(...)` (or the algorithm’s override), then sends `codeEscape.getFilteredText()` / `codeEscape.toTranslate` to the translator.
- After a response is received, `codeEscape.afterTranslation(...)` restores placeholders.

Notes:

- If the engine option `disableCustomEscape` is enabled, masking is skipped and the raw text is sent.
- The examples below show **masking examples** and **payload examples**. Individual translator engines may still wrap/concat payloads differently, but the escape algorithm output is the important part.

---

## `hexPlaceholder` (default)

**Brief**

- Masks matched tokens into compact hex placeholders like `0xF0000`.
- Restoration searches for `/0[xX][fF][\dA-Fa-f]{4}/g` and swaps them back.
- This is the core/default algorithm (implemented by `CodeEscape` itself).

**Before masking**

```text
Hello \\C[1]World\\C[0]! Gold: %1
```

**After masking**

```text
Hello 0xF0000World0xF0001! Gold: 0xF0002
```

**Sent translation payload (typical)**

```text
Hello 0xF0000World0xF0001! Gold: 0xF0002
```

**Expected received translation payload**

```text
Halo 0xF0000Dunia0xF0001! Emas: 0xF0002
```

---

## `hexPlaceholderInsensitive`

**Brief**

- Same as `hexPlaceholder`, but restoration is **case-tolerant**.
- It restores placeholders matching `/0x[Ff][\dA-F]{4}/g`.

**Before masking**

```text
Hello \\C[1]World\\C[0]!
```

**After masking**

```text
Hello 0xF0000World0xF0001!
```

**Sent translation payload**

```text
Hello 0xF0000World0xF0001!
```

**Expected received translation payload**

```text
Bonjour 0xf0000Monde0xf0001!
```

---

## `none` (NoEscapeHandler)

**Brief**

- Disables masking entirely.
- Still applies newline substitution (`engine.lineSubstitute`) for row-by-row / array handling.

**Before masking**

```text
Line 1
Line 2
```

**After masking**

```text
Line 1§Line 2
```

(Here `§` is the default `engine.lineSubstitute`; your engine may configure a different character.)

**Sent translation payload**

```text
Line 1§Line 2
```

**Expected received translation payload**

```text
Ligne 1§Ligne 2
```

---

## `HTMLCloaking` (and alias `htmlCloaking`)

**Brief**

- Masks matched tokens into HTML separators like `<hr id="1">`.
- Restoration scans for `<hr id="(\d+)">` and replaces back.
- Useful when translators are likely to preserve HTML tags better than custom tokens.

**Before masking**

```text
Hello \\C[1]World\\C[0]! Gold: %1
```

**After masking**

```html
Hello <hr id="1">World<hr id="2">! Gold: <hr id="3">
```

**Sent translation payload**

```html
Hello <hr id="1">World<hr id="2">! Gold: <hr id="3">
```

**Expected received translation payload**

```html
Halo <hr id="1">Dunia<hr id="2">! Emas: <hr id="3">
```

---

## `HTMLCloakingInsensitive`

**Brief**

- Same idea as `HTMLCloaking`, but tries to restore even if the translator changes casing/spacing.
- The restore pattern is lenient and intended to match variants like `<HR id="1">`, `<hr   id = "1">`, etc.

**Before masking**

```text
Hello \\C[1]World\\C[0]!
```

**After masking**

```html
Hello <hr id="1">World<hr id="2">!
```

**Sent translation payload**

```html
Hello <hr id="1">World<hr id="2">!
```

**Expected received translation payload**

```html
Bonjour <HR id = "1">Monde<HR id = "2">!
```

---

## `XMLCloaking` (and alias `xmlCloaking`)

**Brief**

- Same as `HTMLCloaking`, but uses XML-style self-closing tags: `<hr id="1" />`.
- Intended for translators or pipelines that prefer well-formed XML.

**Before masking**

```text
Hello \\C[1]World\\C[0]!
```

**After masking**

```xml
Hello <hr id="1" />World<hr id="2" />!
```

**Sent translation payload**

```xml
Hello <hr id="1" />World<hr id="2" />!
```

**Expected received translation payload**

```xml
Hola <hr id="1" />Mundo<hr id="2" />!
```

---

## `SubstituteNumber`

**Brief**

- Replaces matched tokens with a numeric placeholder like `9xxxxx9` (digits wrapped by `9`).
- This is designed for situations where translators frequently corrupt numbers.
- After translation it:
  - Restores known placeholders.
  - Attempts to “repair” broken placeholders.
  - Removes unexpected numbers that were not present in the original (best-effort cleanup).

**Before masking**

```text
Gold: %1 / HP: 1200
```

**After masking (example)**

```text
Gold: 9012349 / HP: 9076549
```

(Exact placeholders are random per request.)

**Sent translation payload**

```text
Gold: 9012349 / HP: 9076549
```

**Expected received translation payload**

```text
Oro: 9012349 / PV: 9076549
```

---

## `JSTemplateCloaking`

**Brief**

- Masks tokens as `${dat[n]}` (JavaScript template placeholders).
- Sends the request as a **JavaScript array literal** using template literals (backticks).
- Restores by running `eval(...)` with `dat` bound to the placeholder map.

This is primarily intended for LLM-style translators that can reliably preserve code-like structures.

**Before masking**

```text
Hello \\C[1]World\\C[0]!
```

**After masking**

```text
Hello ${dat[1]}World${dat[2]}!
```

**Sent translation payload (JS array literal)**

```js
[
  `Hello ${dat[1]}World${dat[2]}!`
]
```

**Expected received translation payload (JS array literal)**

```js
[
  `Halo ${dat[1]}Dunia${dat[2]}!`
]
```

---

## `JSONCloaking`

**Brief**

- Masks tokens as `${dat[n]}`.
- Sends the request as a **JSON array string**.
- Expects the response to be a JSON array (or already-parsed array), then unescapes each element.

**Before masking**

```text
Hello \\C[1]World\\C[0]!
```

**After masking**

```text
Hello ${dat[1]}World${dat[2]}!
```

**Sent translation payload (JSON array)**

```json
["Hello ${dat[1]}World${dat[2]}!"]
```

**Expected received translation payload (JSON array)**

```json
["Halo ${dat[1]}Dunia${dat[2]}!"]
```

---

## `JSONObjectCloaking`

**Brief**

- Masks tokens as `${dat[n]}`.
- Sends the request as a **JSON object** keyed by source index.
- Accepts several response shapes:
  - a JSON object mapping indexes to translated strings
  - or an object with a `translation` field containing that mapping
  - it also tries to recover JSON embedded in code fences

**Before masking**

```text
(0) Hello \\C[1]World\\C[0]!
(1) Gold: %1
```

**After masking**

```text
(0) Hello ${dat[1]}World${dat[2]}!
(1) Gold: ${dat[3]}
```

**Sent translation payload (JSON object)**

```json
{"0":"Hello ${dat[1]}World${dat[2]}!","1":"Gold: ${dat[3]}"}
```

**Expected received translation payload (common forms)**

As a direct mapping:

```json
{"0":"Halo ${dat[1]}Dunia${dat[2]}!","1":"Emas: ${dat[3]}"}
```

Or wrapped:

```json
{"translation":{"0":"Halo ${dat[1]}Dunia${dat[2]}!","1":"Emas: ${dat[3]}"}}
```

---

## `HTMLCloakingWrapped`

**Brief**

- Masks matched tokens into `<hr id="n">` (HTML style), but also:
  - Wraps each input text in its own `<p>...</p>` block
  - Sends one combined HTML payload with one paragraph per source line
- Restoration parses the returned HTML and extracts translations from `<p>` tags only.

**Before masking**

```text
(0) Hello \\C[1]World\\C[0]!
(1) Gold: %1
```

**After masking**

```html
<p>Hello <hr id="1">World<hr id="2">!</p>
<p>Gold: <hr id="3"></p>
```

**Sent translation payload (HTML, one paragraph per entry)**

```html
<p>Hello <hr id="1">World<hr id="2">!</p>
<p>Gold: <hr id="3"></p>
```

**Expected received translation payload (HTML, keep `<p>` boundaries)**

```html
<p>Halo <hr id="1">Dunia<hr id="2">!</p>
<p>Emas: <hr id="3"></p>
```

---

## Practical tips

- If your translator tends to break custom strings like `0xF0000`, try `HTMLCloaking` or `HTMLCloakingWrapped`.
- If you’re using an LLM and want strong structure enforcement, prefer `JSONCloaking` / `JSONObjectCloaking`.
- If numbers are getting mangled, `SubstituteNumber` can help, but it’s best-effort.
- For debugging: log `codeEscape.getFilteredText()` right before `fetchTranslation(...)`.
