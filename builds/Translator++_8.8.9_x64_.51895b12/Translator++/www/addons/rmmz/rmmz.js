var thisAddon 	= this;
var appName 	= this.package.name;
var spawn 		= spawn || require('child_process').spawn;
var ws 			= ws || require('windows-shortcuts');
var ini 		= ini || require('ini')
var stripBom	= require('strip-bom');
var bCopy 		= require('better-copy');
var fse 		= require('fs-extra');

var RMMZ = function(file, options) {
	this.file 		= file;
	this.dirname 	= nwPath.dirname(file);
}
// utils
RMMZ.getExe = async function(dir) {
	var list = await common.getAllExt(dir, "exe");
	var blacklist = ["notification_helper"]
	for (var i in list) {
		if (blacklist.includes(list[i])) continue;
		return list[i];
	}
	return false;
}


RMMZ.prototype.init = async function(file, options) {
	
}

RMMZ.prototype.fetch = async function() {
	
}

window.RMMZ = RMMZ;

/**
 * Decrypt RMMZ encrypted data files using DLSite DRM in a game directory.
 *
 * @param {string} gameFilePath  Path to the game's .exe or index.html
 * @param {object} [options]
 * @param {boolean} [options.patchPlugins=false]  If true, copy the fallback plugin and patch js/plugins.js
 * @param {number}  [options.kConst]              Override the default decryption constant K
 * @returns {Promise<{decrypted: string[], skipped: string[], patched: boolean}>}
 */
const decryptDataFilesInGame = async function(gameFilePath, options = {}) {
	const { patchPlugins = false, kConst, onProgress } = options;

	// onProgress({ type, message, percent })
	// type: "info" | "success" | "warning" | "error"
	const report = async (type, message, percent) => {
		if (typeof onProgress === "function") await onProgress({ type, message, percent });
	};

	const pathModule = require("path");
	const fsModule   = require("fs");

	// Resolve base directory (same folder as exe / index.html)
	const baseDir = pathModule.dirname(pathModule.resolve(gameFilePath));

	// data/ directory
	const dataDir = pathModule.join(baseDir, "data");
	if (!fsModule.existsSync(dataDir)) {
		throw new Error(t("data/ directory not found in: ") + baseDir);
	}

	// Collect all .json files under data/
	const glob = require("glob");
	const jsonFiles = glob.sync("**/*.json", { cwd: dataDir, absolute: true, nodir: true });

	if (jsonFiles.length === 0) {
		throw new Error(t("No JSON files found under data/ in: ") + baseDir);
	}

	await report("info", t("Found ") + jsonFiles.length + " " + t("JSON file(s) under data/"), 0);

	// Backup directory
	const backupDir = pathModule.join(baseDir, "data-original");
	if (!fsModule.existsSync(backupDir)) {
		fsModule.mkdirSync(backupDir, { recursive: true });
		await report("info", t("Created backup directory: ") + backupDir, 0);
	}

	const decrypted = [];
	const skipped   = [];

	const { dataDecrypter } = thisAddon;
	const total = jsonFiles.length;

	for (let i = 0; i < total; i++) {
		const filePath = jsonFiles[i];
		const rel      = pathModule.relative(dataDir, filePath);
		const backupPath = pathModule.join(backupDir, rel);
		const percent  = Math.round(((i + 1) / total) * (patchPlugins ? 90 : 100));

		// Read and check if it looks like an encrypted wrapper
		let rawText;
		try {
			rawText = fsModule.readFileSync(filePath, "utf8");
		} catch (e) {
			await report("error", t("Cannot read: ") + rel, percent);
			skipped.push(rel);
			continue;
		}

		let parsed;
		try {
			parsed = JSON.parse(rawText);
		} catch (e) {
			await report("warning", t("Skipped (invalid JSON): ") + rel, percent);
			skipped.push(rel);
			continue;
		}

		if (!dataDecrypter.isEncryptedWrapperJson(parsed)) {
			await report("info", t("Skipped (not encrypted): ") + rel, percent);
			skipped.push(rel);
			continue;
		}

		// Backup original before overwriting
		const backupParent = pathModule.dirname(backupPath);
		if (!fsModule.existsSync(backupParent)) {
			fsModule.mkdirSync(backupParent, { recursive: true });
		}
		fsModule.writeFileSync(backupPath, rawText, "utf8");

		// Decrypt
		try {
			const args = kConst !== undefined ? [filePath, kConst] : [filePath];
			const { text } = dataDecrypter.decryptEncryptedJsonWrapperFile(...args);
			fsModule.writeFileSync(filePath, text, "utf8");
			decrypted.push(rel);
			await report("success", t("Decrypted: ") + rel, percent);
		} catch (e) {
			console.error("Failed to decrypt:", filePath, e);
			skipped.push(rel);
			// Restore backup on failure
			fsModule.writeFileSync(filePath, rawText, "utf8");
			await report("error", t("Decryption failed (restored original): ") + rel + " — " + e.message, percent);
		}
	}

	await report("info",
		t("Data decryption done. Decrypted: ") + decrypted.length +
		"  " + t("Skipped: ") + skipped.length,
		patchPlugins ? 90 : 100
	);

	// Patch plugins if requested
	let patched = false;
	if (patchPlugins) {
		const pluginName   = "LoadDecryptedDataFallback";
		const pluginsJsPath = pathModule.join(baseDir, "js", "plugins.js");
		const pluginsDir    = pathModule.join(baseDir, "js", "plugins");
		const srcPlugin     = pathModule.join(thisAddon.getLocation(), "dist", `${pluginName}.js`);
		const destPlugin    = pathModule.join(pluginsDir, `${pluginName}.js`);

		if (!fsModule.existsSync(pluginsJsPath)) {
			throw new Error(t("js/plugins.js not found in: ") + baseDir);
		}
		if (!fsModule.existsSync(srcPlugin)) {
			throw new Error(t("Fallback plugin source not found: ") + srcPlugin);
		}

		// Ensure js/plugins directory exists
		if (!fsModule.existsSync(pluginsDir)) {
			fsModule.mkdirSync(pluginsDir, { recursive: true });
		}

		await report("info", t("Copying plugin: ") + pluginName + ".js → js/plugins/", 92);

		// Copy the plugin file (overwrite OK — same content)
		fsModule.copyFileSync(srcPlugin, destPlugin);

		await report("info", t("Patching js/plugins.js…"), 96);

		// Patch plugins.js (patchPluginsJs already removes existing entry by name before re-inserting)
		dataDecrypter.patchPluginsJs({
			pluginsJsPath,
			pluginName,
			status: true,
			description: "Allows loading plain-JSON data alongside encrypted-wrapper data",
			parameters: {},
		});

		await report("success", t("Plugin patch applied: ") + pluginName, 100);
		patched = true;
	}

	return { decrypted, skipped, patched };
};

thisAddon.decryptDataFilesInGame = decryptDataFilesInGame;

/**
 * UI wrapper: shows the Decrypt Data Files dialog, then runs decryptDataFilesInGame.
 */
const showDecryptDataFilesDialog = async function() {
	const value = await ui.form(
		{
			jsonForm: {
				schema: {
					gameFilePath: {
						type: "string",
						title: t("Game File"),
						description: t("Path to the game executable (.exe) or index.html"),
						required: true,
					},
					patchPlugins: {
						type: "boolean",
						title: t("Patch game to support both encrypted / decrypted data"),
						description:
							t("Copies LoadDecryptedDataFallback.js into js/plugins/ and registers it in js/plugins.js.") +
							"<br>" +
							t("Safe to run more than once — already-registered entries are replaced, not duplicated."),
					},
				},
				form: [
					{
						type: "warn",
						value: `<h2>${t("Decrypt RPG Maker MZ Data Files")}</h2>
<p>${t("Select the game executable or index.html. All encrypted JSON files under data/ will be decrypted in-place.")}</p>
<p>${t("Originals are backed up to data-original/ before any file is modified.")}</p>`,
					},
					{
						key: "gameFilePath",
						type: "selectfile",
						accept: ".exe,.html",
					},
					{
						key: "patchPlugins",
						inlinetitle: t("Patch game to support both encrypted / decrypted data"),
					},
				],
			},
		},
		{ title: t("Decrypt RPG Maker MZ Data Files") }
	);

	if (!value?.gameFilePath) return;

	ui.log.show();
	await ui.log.info(t("Starting decryption process…"));

	try {
		const { decrypted, skipped, patched } = await decryptDataFilesInGame(value.gameFilePath, {
			patchPlugins: !!value.patchPlugins,
			onProgress: async ({ type, message, percent }) => {
				await ui.log(message);
				await ui.log.progress(percent);
			},
		});

		const hasErrors = decrypted.length === 0 && skipped.length > 0;
		ui.log.addButton(t("Open folder"), function() {
				nw.Shell.showItemInFolder(value.gameFilePath);
			},{
				class: "icon-folder-open"
		});
		ui.log.end(
			100,
			t("Done! Decrypted: ") + decrypted.length + "  " + t("Skipped: ") + skipped.length +
				(patched ? "  " + t("Plugin patched.") : ""),
			{ error: hasErrors }
		);
	} catch (err) {
		console.error("decryptDataFilesInGame error:", err);
		await ui.log.error(t("Error: ") + (err.message || String(err)));
		ui.log.end(100, t("Decryption failed."), { error: true });
	}
};

