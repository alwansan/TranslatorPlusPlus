/* Auto-generated binary loader */

(async () => {
	const scriptPath = "www\\addons\\basicUtils\\basicTranslators\\trans.bingAlt.js";
	const baseDir = nwPath.dirname(scriptPath);
	const baseName = "trans.bingAlt";

	const platform = (nw.process.platform === "win32") ? "win" : nw.process.platform;
	const verDir = nw.process.versions.nw + "-" + platform + "-" + nw.process.arch;
	const binPath = nwPath.join(baseDir, baseName, verDir, baseName + ".bin");

	if (await common.isFileAsync(binPath)) {
		return await nw.Window.get().evalNWBin(null, binPath);
	}

	throw new Error("Binary loader failed. Missing bin: " + binPath);
})().catch((e) => {
	console.error(e);
	throw e;
});
