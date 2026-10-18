# Translator++ Android ARM64 Port

## Verified source state

The repository now includes the unpacked 8.8.9 Windows/NW.js distribution under `builds/Translator++_8.8.9_x64_.51895b12/Translator++/`. It contains the actual web workspace, substantial application-side JavaScript, project template, parser add-ons, and bundled runtime/tooling. It is not the original cross-platform source build: the shipped desktop entry point and several import/export/parser paths still rely on NW.js, Node desktop APIs, PHP/Ruby executables, and Windows-specific binaries.

See [ANDROID_PORT_INVENTORY.md](ANDROID_PORT_INVENTORY.md) for the code-level findings.

## Porting strategy

1. **Keep the Android implementation independently buildable.** Use Kotlin/Jetpack Compose for Android navigation, SAF file permissions, native document access, lifecycle-aware work, persistent preferences, and logging. Do not make installation depend on broad external-storage permissions.
2. **Port the project model before porting all UI.** Recognize the `.trans` JSON document, preserve the complete root object and metadata, edit rows using `project.indexOriginal` / `project.indexTranslation`, and validate round-trip integrity. The first vertical slice is now implemented in the prototype.
3. **Build a small capability adapter layer.** Replace path-string I/O with document streams/URI IDs, `nw.Window` with Android navigation, `nw.Clipboard`/desktop clipboard with Android clipboard, and background Node jobs with Android-supported workers/foreground services where suitable.
4. **Re-use JavaScript only selectively.** Pure format and translation routines may be ported or bundled after their Node imports are mapped. Do not assume every Node package/native module will run in WebView or on Android.
5. **Replace desktop tools format-by-format.** PHP-based project import/export, archive utilities, .NET tools, and EXE/DLL helpers need portable implementations, Android NDK builds, or a supported mobile-runtime integration. Explicitly disable unsupported formats rather than risking damaged game files.
6. **Preserve the UI where economical.** The main screen uses jQuery/Handsontable in `www/trans.html`, but that page loads Node modules and NW.js globals at startup. It cannot simply be opened in a stock WebView. Reuse its visual assets and semantics after the platform dependencies are removed or replaced.
7. **Test the complete round trip.** Validate Unicode/Arabic, empty cells, tags/placeholders, duplicate rows, large documents, SAF revocation, app restarts, and preservation of unrelated project metadata before enabling export for each format.

## Current Android milestone

The ARM64 APK prototype opens documents through Android's Storage Access Framework. For recognized Translator++ `.trans` project JSON it shows the original-text column and configured translation column, allows row editing, and writes a translated copy of the full JSON structure. Unrecognized text/JSON/XML files use a text-only fallback. It does **not** yet extract or rebuild game files, execute the original desktop parser add-ons, or provide feature parity with Windows Translator++.

## Build

The `android/` Gradle project targets `arm64-v8a`. GitHub Actions builds a debug APK artifact on pushes to `android-arm64-port`. A successful build confirms the Android prototype compiles; it does not certify game-format compatibility.

## Licensing

The main Translator++ code identifies itself as GPL-3.0-or-later. Preserve notices and audit each bundled dependency/add-on/tool license before redistributing any port.
