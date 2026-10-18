# Translator++ Android ARM64 Port

## Current state

The public GitHub repository currently exposes documentation and image assets, not the full application source tree or a reproducible source build. The supplied Windows release archive is a packaged application, not a source checkout. Therefore a complete port cannot be produced safely by merely changing the window manager.

An initial native Android prototype lives in `android/`. It demonstrates the Android Storage Access Framework for opening and exporting plain text. It is not yet a Translator++ engine port and must not be presented as a complete APK.

## Porting strategy

1. **Obtain and inventory the real implementation**
   - Inspect the supplied 8.8.9 archive and identify its NW.js/Node runtime, bundled JS, native modules, parsers, external executables, and licensing notices.
   - Separate application code from packaged runtime and platform-specific binaries.
   - Preserve a clean baseline and work on `android-arm64-port`.

2. **Build an Android-native shell**
   - Native phone-first navigation and responsive editing UI.
   - Android Storage Access Framework; no broad storage permission requirement.
   - Persistent project storage via user-selected document trees or app-private storage.
   - Background jobs with cancellation, progress, and recoverable logs.

3. **Port reusable JavaScript logic**
   - Identify pure JavaScript parsers and translation logic that can run in an Android-compatible JS runtime.
   - Replace NW.js window APIs, Windows paths, registry/COM calls, shell commands, and Windows-only binaries with capability interfaces.
   - Use portable Node-compatible modules only where a supported Android runtime exists; do not assume desktop Node native modules work on Android.

4. **Replace Windows-only engine tools incrementally**
   - Map each parser/extractor/rebuilder to source availability, dependencies, and tests.
   - Prefer portable implementations or Android NDK builds for native components.
   - Mark unsupported formats explicitly rather than silently producing corrupt output.

5. **Validation and release**
   - Unit tests for parse/edit/rebuild round trips and tag preservation.
   - Test large files, interrupted jobs, Unicode/Arabic, SAF permissions, and low-memory devices.
   - Build an `arm64-v8a` APK only after Gradle builds and functional tests pass.

## Initial scope

The first Android prototype only opens, edits, and exports UTF-8 text files. The next meaningful milestone is source/runtime inventory and a tested project-file model, not claiming parity with the Windows application.

## License

Translator++ upstream identifies itself as GPL-3.0. Keep license notices and verify obligations for any redistributed source or binary components.
