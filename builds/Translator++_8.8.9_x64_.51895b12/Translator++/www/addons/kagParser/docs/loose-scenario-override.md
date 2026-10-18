# Loose Scenario Override In KAG

This note documents a verified way to make loose `data\scenario\*.ks` files override the scripts inside `data.xp3` for a KAG game.

## Summary

Finding:

- In the tested sample game, loose `scenario/` files did **not** override `data.xp3` by default.
- An external `Override2.tjs` placed beside the executable was **not sufficient** for this sample.
- A working method was to patch `data/system/Config.tjs` inside the extracted `data` folder, then repack that folder back into `data.xp3`.

Working override line:

```tjs
Storages.addAutoPath("scenario/");
```

This line must run **after** the archive paths have already been registered.

## Why This Works

The tested game's `system/Initialize.tjs` contains this note:

```tjs
// 後に指定した物が、より優先されて使用される
```

Meaning:

- paths added later have higher priority

The same script adds plain folders first:

```tjs
Storages.addAutoPath("scenario/");
Storages.addAutoPath("system/");
```

Then it adds archive paths later:

```tjs
useArchiveIfExists("scenario.xp3");
useArchiveIfExists("system.xp3");
useArchiveIfExists("patch.xp3");
```

In practice, this means archive-backed paths can win over the earlier loose folder registrations.

Re-registering `scenario/` later restores priority to the loose scenario folder.

## Tested Sample

Sample game used for proof of concept:

- `D:\Test\KAG\demo\sizumeruwinv102`

Isolated test copy:

- `D:\Test\KAG\demo\sizumeruwinv102-aec-poc`

Probe file used:

- `data\scenario\honnpenn.ks`

Probe line used in testing:

```text
俺は特に部活もしてなければ、これと言って真面目に勉学に勤しんでるわけでもない。【LOOSE_KS_TEST_20260527】[na][テキストはじめ]
```

## What Was Tested

### 1. Default extracted state

The game was extracted from `data.xp3` using the same GARbro-based extraction path used by the KAG add-on.

Result:

- extracted scripts were readable and not garbled
- loose `honnpenn.ks` worked when `data.xp3` was removed or renamed away

### 2. External `Override2.tjs`

A root-level file was tested:

```tjs
Storages.addAutoPath("scenario/");
```

Result:

- the game still did not show the probe while `data.xp3` was present
- for this sample, root-level `Override2.tjs` was not enough to change effective scenario precedence

### 3. Embedded `Config.tjs` patch inside `data.xp3`

The extracted file `data/system/Config.tjs` was patched near the top:

```tjs
Storages.addAutoPath("scenario/");
```

Then the extracted `data` folder was repacked into `data.xp3`.

Result:

- the game displayed the probe even with `data.xp3` restored
- confirmed: loose `data\scenario\*.ks` can be made to override archive content by patching `Config.tjs` inside the archive

## Recommended Approach

For KAG builds where loose scenario files should override `data.xp3`:

1. Extract `data.xp3`
2. Patch `data/system/Config.tjs`
3. Add this line near the top:

```tjs
Storages.addAutoPath("scenario/");
```

4. Repack the modified `data` folder back into `data.xp3`

## Translator++ Support

Translator++ now supports this through the KAG inject options.

Inject option:

- `Repack Option`

Available values:

- `Do not repack translation`
- `Repack translation into data.xp3`
- `Repack translation into patch9.xp3`

Behavior:

- `data.xp3` extracts the copied archive, applies translated scripts into that extracted content, then rebuilds `data.xp3`
- `patch9.xp3` exports translated scripts into a temporary folder and repacks them into `patch9.xp3`
- for `patch9.xp3`, Translator++ now patches `data.xp3`'s `system/Config.tjs` to register the patch archive paths that were actually packed
- `patch9.xp3` itself does not need to carry its own `Config.tjs`; the translated patch archive now contains only the translated files and folders that need to override the original data

Practical implication:

- this avoids relying on loose files next to an existing `data.xp3` when a title keeps prioritizing archive-backed script loading

Confirmed runtime result from the working `patch9.xp3` build:

- `data.xp3/system/Config.tjs` was patched with:

```tjs
Storages.addAutoPath(System.exePath + "patch9.xp3>scenario/");
Storages.addAutoPath(System.exePath + "patch9.xp3>system/");
```

- `patch9.xp3/scenario/honnpenn.ks` contained the translated line
- `patch9.xp3` did not contain a `Config.tjs` file

## Practical Notes

- This finding is confirmed for the tested sample game, not guaranteed for every KAG title.
- `Override2.tjs` may still work on some titles, but it did not work in this sample.
- Patching `Config.tjs` is closer to the game's actual startup/config path and was reliable in this test.
- If broader loose-folder overrides are needed, similar lines can be added for other folders, for example:

```tjs
Storages.addAutoPath("system/");
Storages.addAutoPath("image/");
Storages.addAutoPath("bgimage/");
```

This should be done carefully because it changes resource precedence, not just scenario loading.
