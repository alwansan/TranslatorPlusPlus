# RPG Maker MZ / MV — Decrypted Data Dumper

## Engine Compatibility

| Engine | Supported | Notes |
|--------|-----------|-------|
| RPG Maker MZ (NW.js compiled `.bin`) | ✅ | Primary target; decryption fully opaque in compiled binary |
| RPG Maker MV — encrypted (MV.1.6.1 / MV.1.6.2) | ✅ | Same injection strategy; `rpg_managers.js` is plain JS |
| RPG Maker MV — unencrypted | ✅ | Works, but `loadDecryptedData` just returns plain JSON |

---

## Why This Patch Is Needed

### The problem: NW.js compiled scripts (MZ)

Standard RPG Maker MZ games ship their engine source as plain `.js` files (`rmmz_managers.js`, `rmmz_core.js`, etc.). This makes it straightforward to write **plugin scripts** that alias or override `DataManager` methods — the standard way to interact with the engine.

This game, however, has compiled two critical engine files into NW.js binary modules:

```
js/rmmz_core.bin
js/rmmz_managers.bin
```

These `.bin` files are executed by NW.js via `nw.Window.get().evalNWBin()` and **cannot be read, edited, or inspected** through normal means. The compiled `rmmz_managers.bin` contains a heavily obfuscated, custom implementation of `DataManager.loadDataFile` and `DataManager.onXhrLoad` that:

1. Reads each `.json` data file, which is stored on disk in an **encrypted format** (`{ uid, hash, data }`).
2. Derives a per-file decryption key from a value computed at runtime (`window._K`) combined with a hash of the filename.
3. Decrypts the hex-encoded `data` buffer in-place using a rolling XOR cipher.
4. Parses and stores the result in the appropriate `window.$data*` global.

Because `rmmz_managers.bin` is compiled, it is **impossible to add a conventional RPG Maker plugin** (a `.js` file listed in `js/plugins.js`) that hooks into decryption — the plugin system itself is initialised *after* the `.bin` files run, and the decryption key `window._K` is only set during that early boot phase.

### Encrypted MV games

RPG Maker MV games do **not** compile `rpg_managers.js` into a `.bin` file — it stays as readable plain JavaScript. However, encrypted MV games embed a custom `DataManager.loadDataFile` inside `rpg_managers.js` (heavily obfuscated with `String.fromCharCode` sequences) that:

1. Reads encrypted files in the format `{ uid, bid, data }` where `data` is **base64-encoded** (different from MZ's hex).
2. Derives a per-file XOR key using a `djb2` hash of the filename combined with `window._K` (set at boot).
3. Applies a rolling XOR cipher on the decoded buffer.
4. Parses the result and stores it in `window[name]`.

The patch delegates to this existing `DataManager.loadDataFile` — it does not need to know or replicate the decryption algorithm. As long as the engine can decrypt its own files, the patch extracts the result.

### The solution: inject into `index.html`

NW.js compiles `.bin` files but **cannot compile HTML**. `index.html` is always loaded as plain text by the Chromium engine. Injecting a `<script>` tag at the bottom of `<body>` — after `js/main.js` — gives us a JavaScript execution context that:

- Runs in the same window as the game.
- Has full access to `require('fs')` and `require('path')` (Node.js integration).
- Can alias `Scene_Boot.prototype.start` and call `DataManager.loadDataFile` once the engine is ready, reusing the game's own decryption routine transparently.

---

## What the Injection Does

The injected `<script>` block (at the bottom of `<body>` in `index.html`) provides two public helpers and an automatic engine-readiness hook.

### Engine readiness hook

```
poll every 50 ms → DataManager defined?
                 → Scene_Boot defined?
                 → SceneManager defined?
                        ↓ yes (all three)
              alias Scene_Boot.prototype.start
```

`Scene_Boot.prototype.start` is the earliest safe point where **all** database files have been decrypted into memory (`DataManager.isDatabaseLoaded() === true`). Hooking here avoids any race condition.

---

### `loadDecryptedData(src)` → `Promise<object>`

Loads and decrypts a single data file by delegating to `DataManager.loadDataFile()`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `src` | `string` | Filename only, e.g. `"Map005.json"`. Full paths are accepted and stripped to the filename. |

**Returns** a Promise that resolves with the parsed JSON object.

**How it works:**

1. Generates a unique temporary global key (`__dumpDecrypt_Map005_json_<random>`).
2. Calls `DataManager.loadDataFile(tempKey, src)` — the game's own decryption routine runs normally.
3. Wraps `DataManager.onXhrError` temporarily to detect failures without waiting for the full poll timeout.
   > **MV note:** `DataManager.onXhrError` does not exist in RPG Maker MV — MV games define the XHR error handler inline. The wrapper is silently ignored and the 20-second poll timeout acts as the fallback failure detector instead.
4. Polls `window[tempKey]` every 50 ms (up to 20 s) until the decrypted object appears.
5. Cleans up the temp key and restores the original error handler before resolving.

---

### `dumpDecryptedData([outputDir])` → `Promise<void>`

Decrypts and writes **all** game data files to disk, preserving the `data/` folder structure.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `outputDir` | `string` | `<cwd>/dump` | Absolute output path. Created automatically if it does not exist. |

**Output structure:**

```
<outputDir>/
└── data/
    ├── Actors.json
    ├── Classes.json
    ├── ...
    ├── MapInfos.json
    ├── Map001.json
    ├── Map002.json
    └── ...
```

**Two-phase dump:**

| Phase | Files | Method |
|-------|-------|--------|
| 1 | `DataManager._databaseFiles` (Actors, Classes, Skills, Items, Weapons, Armors, Enemies, Troops, States, Animations, Tilesets, CommonEvents, System, MapInfos) | Read directly from `window.$data*` — already decrypted in memory at `Scene_Boot.start` |
| 2 | All Map files (`Map001.json` … `MapNNN.json`) | Loaded on-demand via `loadDecryptedData()`. Map IDs are taken from `$dataMapInfos` so only existing maps are fetched. Falls back to sequential probing (stops after 3 consecutive misses) if `$dataMapInfos` is unavailable. |

---

## Usage

### From the NW.js DevTools console

Open DevTools (F12 / F8 in NW.js, or via `nw.gui`), wait for the title screen, then:

```js
// Dump all files to the default location (<game dir>/dump/)
await dumpDecryptedData()

// Dump to a custom location
await dumpDecryptedData("D:/decryptedGame")

// Load a single file and inspect it
const map5 = await loadDecryptedData("Map005.json")
console.log(map5.displayName)
```

### Auto-dump on every launch

The last line of the `Scene_Boot.prototype.start` hook currently calls `dumpDecryptedData()` automatically. To disable this, comment it out:

```js
// dumpDecryptedData();
```

---

## RPG Maker MV — Differences

### Folder structure

MV games store everything under a `www/` subdirectory. The injectable file is `www/index.html`, not the root `index.html`.

```
<game root>/
├── Game.exe
├── Game.rpgproject          ← MV project file (if present)
└── www/
    ├── index.html           ← inject here (MV)
    ├── js/
    │   ├── rpg_managers.js  ← plain JS (readable, not compiled)
    │   ├── rpg_core.js
    │   └── plugins.js
    └── data/
        ├── Actors.json      ← encrypted: { uid, bid, data: "<base64>" }
        └── ...
```

Compare with MZ:

```
<game root>/
├── Game.exe
├── index.html               ← inject here (MZ)
├── js/
│   ├── main.js
│   ├── rmmz_managers.bin    ← compiled binary (cannot be edited)
│   └── rmmz_core.bin        ← compiled binary (cannot be edited)
└── data/
    ├── Actors.json          ← encrypted: { uid, hash, data: "<hex>" }
    └── ...
```

### Encrypted data format

| Field | RPG Maker MZ | RPG Maker MV |
|-------|-------------|-------------|
| `uid` | ✅ present | ✅ present |
| `hash` | ✅ present (MZ key identifier) | ❌ absent |
| `bid` | ❌ absent | ✅ present (e.g. `"MV.1.6.2"`) |
| `data` encoding | uppercase hex string | base64 string |
| Decryption location | `rmmz_managers.bin` (compiled) | `rpg_managers.js` (plain JS) |

### Behavioral differences

| Behavior | MZ | MV |
|----------|----|----|
| XHR error fast-fail via `DataManager.onXhrError` | ✅ works | ❌ method absent — falls back to 20 s timeout per missing file |
| Engine readiness poll (`DataManager`, `Scene_Boot`, `SceneManager`) | ✅ | ✅ identical |
| `Scene_Boot.prototype.start` hook | ✅ | ✅ identical |
| `DataManager._databaseFiles` structure (`{name, src}`) | ✅ | ✅ identical |
| `$dataMapInfos` for map ID list | ✅ | ✅ identical |
| Default output path | `<cwd>/dump` where `cwd` = game root | `<cwd>/dump` where `cwd` = `www/` subdirectory |

> **MV output path note:** In MV, `process.cwd()` resolves to the `www/` folder (where `index.html` lives), so the default dump lands at `www/dump/`. Pass an explicit absolute path to `dumpDecryptedData()` to write outside `www/`:
> ```js
> await dumpDecryptedData("D:/decryptedGame")
> ```

---

## Files Modified

| File | Engine | Change |
|------|--------|--------|
| `index.html` | MZ | Added `<script>` block at bottom of `<body>`, after `js/main.js` |
| `www/index.html` | MV | Added `<script>` block at bottom of `<body>`, after `js/main.js` |

No other files are modified. The game runs normally with the patch in place.

---

## Limitations

- **Images are not dumped.** Encrypted image files (`*.png_`, etc.) require a separate `ImageManager`-based pipeline and are out of scope for this patch.
- **Save files are not affected.** This only operates on data (`.json`) files.
- **Map IDs above 999 are not supported** (standard RPG Maker MZ/MV limit).
- **MV: missing file detection is slower.** Because `DataManager.onXhrError` does not exist in MV, each missing map file waits for the full 20-second poll timeout before being skipped. Use an explicit `$dataMapInfos`-driven ID list (Phase 2 already does this) to avoid probing non-existent maps.
