let pLimit;
try {
    pLimit = require("p-limit");
} catch (e) {
    pLimit = null;
}
class OfflineTranslator extends require("www/js/BasicEventHandler.js") {
    constructor(options = {}) {
        super();
        this.options = options;
        this.sl = options.sl || "ja";
        this.tl = options.tl || "en";
        this.concurrencyLimit = options.concurrencyLimit || 10;

		this.translator = null;
		this._initPromise = null;
		this._translatorSl = null;
		this._translatorTl = null;
    }
}

OfflineTranslator.prototype.getSl = function() {
    return this.sl;
}

OfflineTranslator.prototype.getTl = function() {
    return this.tl;
}

OfflineTranslator.prototype.is = function(sl, tl) {
    return this.sl === sl && this.tl === tl;
}

OfflineTranslator.prototype.init = async function(sl, tl) {
    /*
        initialize offline translator using Translator API,
        download the models if necessary
        about Translator api: https://developer.mozilla.org/en-US/docs/Web/API/Translator_and_Language_Detector_APIs/Using
     */

    this.sl = sl || this.sl;
    this.tl = tl || this.tl;

    // Fast-path: already initialized for this language pair.
    if (this.translator && this._translatorSl === this.sl && this._translatorTl === this.tl) {
        this.resolveState("initialized", true);
        return true;
    }

    // Avoid concurrent init calls.
    if (this._initPromise) {
        return await this._initPromise;
    }

    const ui = (typeof window !== "undefined" && window.ui) ? window.ui : null;
    const TranslatorApi = (typeof window !== "undefined" && window.Translator) ? window.Translator : (typeof Translator !== "undefined" ? Translator : null);


	this._initPromise = (async () => {
		if (!TranslatorApi || typeof TranslatorApi.create !== "function") {
        if (ui && ui.log && typeof ui.log.error === "function") {
            await ui.log.error("Offline translation is not available in this environment (Translator API not found).");
        } else {
            console.warn("Translator API not found");
        }
        return false;
		}

        let availability = "";
        try {
            if (typeof TranslatorApi.availability === "function") {
                availability = await TranslatorApi.availability({
                    sourceLanguage: this.sl,
                    targetLanguage: this.tl
                });
            }
        } catch (e) {
            availability = "";
        }

        console.log("%cOfflineTranslator availability:", "color:yellow", availability);

        availability = String(availability || "").toLowerCase();
        if (availability === "unavailable") {
            if (ui && ui.log && typeof ui.log.error === "function") {
                await ui.log.error(`Offline translator is unavailable for ${this.sl} → ${this.tl}.`);
            }
            return false;
        }

        const isAvailable = availability === "available";
        const isDownloadable = availability === "downloadable";
        const isUnknown = !availability;

        // Ask for consent whenever a download may happen.
        // - If availability is 'downloadable' => download will happen.
        // - If availability is unknown => be conservative to satisfy user-interaction requirement.
        if (isDownloadable || isUnknown) {
            const consentFn = ui && typeof ui.requestModelDownloadConsent === "function"
                ? ui.requestModelDownloadConsent
                : async () => Boolean(window.confirm("This action requires downloading an on-device model. Continue?"));

            const ok = await consentFn({
                title: "Download on-device model",
                message: `Translator++ needs to download an offline translation model for ${this.sl} → ${this.tl}.`,
                confirmText: "Download",
                cancelText: "Cancel"
            });
            if (!ok) return false;
        }

        // Only attach a monitor when a download is expected.
        // This avoids showing a download overlay when the model is already available.
        let monitor;
        if (isDownloadable) {
            const downloadId = `translator-${this.sl}-${this.tl}-${Date.now()}`;
            monitor = (ui && typeof ui.createGeminiNanoDownloadMonitor === "function")
                ? ui.createGeminiNanoDownloadMonitor(downloadId, {
                    title: `Downloading model (${this.sl} → ${this.tl})`,
                    status: "Downloading"
                })
                : undefined;
        }

        try {
            this.translator = await TranslatorApi.create({
                sourceLanguage: this.sl,
                targetLanguage: this.tl,
                monitor: monitor
            });
            this._translatorSl = this.sl;
            this._translatorTl = this.tl;
        } catch (e) {
            if (ui && ui.log && typeof ui.log.error === "function") {
                await ui.log.error("Failed to initialize offline translator:", String(e));
            } else {
                console.error("Failed to initialize offline translator", e);
            }
            return false;
        }

        this.resolveState("initialized", true);
        return true;
    })();

    try {
        return await this._initPromise;
    } finally {
        this._initPromise = null;
    }
}

OfflineTranslator.prototype.translate = async function(text) {
    if (typeof text == "string") {
        text = [text];
    }
    if (!Array.isArray(text)) {
        throw new Error("Input text must be a string or an array of strings");
    }

    if (!this.translator) {
        const ok = await this.init(this.sl, this.tl);
        if (!ok || !this.translator) {
            throw new Error("OfflineTranslator failed to initialize.");
        }
    }

    // Translator API supports string input; keep it safe.
    const inputs = text.map((item) => String(item));

    // If p-limit isn't available, process sequentially.
    if (!pLimit) {
        const translatedTexts = [];
        for (const item of inputs) {
            translatedTexts.push(await this.translator.translate(item));
        }
        return translatedTexts;
    }

    const concurrency = Math.max(1, Number(this.concurrencyLimit) || 1);
    const limit = pLimit(concurrency);
    const tasks = inputs.map((item) => limit(() => this.translator.translate(item)));
    return await Promise.all(tasks);
}

module.exports = OfflineTranslator;