/**=====LICENSE STATEMENT START=====
    Translator++
    CAT (Computer-Assisted Translation) tools and framework to create quality
    translations and localizations efficiently.

    Copyright (C) 2018  Dreamsavior<dreamsavior@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
=====LICENSE STATEMENT END=====*/
console.log("Loading ProofreaderEngine.js");
/**
 * Handles how an existing translation is proofread (grammar, formatting, inline tags, line breaks)
 * against its source text. Structurally mirrors `www/js/TranslatorEngine.js`, but the contract is
 * different: a translator engine turns source text into a new language; a proofreader engine takes
 * a (source, currentTranslation) pair already in the target language and returns a corrected version
 * of the translation.
 * @class
 * @param {Object} [defaultVal] - Default value. Provide an object with the ProofreaderEngine-like structure.
 * @param {Object} [defaultConfig] - Default user configuration.
 */
var ProofreaderEngine = function(defaultVal, defaultConfig) {
	if (!new.target) {
		throw new Error("ProofreaderEngine() is a constructor and must be called with new");
	}
	this.constructor.apply(this, arguments);
	this.$elm = $("<div></div>");
	this.defaultConfig = defaultConfig || this.defaultConfig || {};
}
require("www/js/BasicEventHandler.js").applyTo(ProofreaderEngine);

/**
 * Get the engine by their ID
 * @param {string} engineID - Engine ID
 * @static
 */
ProofreaderEngine.getEngine = function(engineID) {
	return this?.proofreaders?.[engineID];
}

ProofreaderEngine.getSorted = function() {
	const proofreaders = this.proofreaders;
	return Object.fromEntries(
		Object.entries(proofreaders).sort((a, b) => {
			const nameA = a[1].name || "";
			const nameB = b[1].name || "";
			return nameA.localeCompare(nameB);
		})
	);
}

ProofreaderEngine.mockupMode = false;

ProofreaderEngine.prototype.on = function(evt, fn) {
	this.$elm.on(evt, fn)
}

ProofreaderEngine.prototype.off = function(evt, fn) {
	this.$elm.off(evt, fn)
}

ProofreaderEngine.prototype.one = function(evt, fn) {
	this.$elm.one(evt, fn)
}

ProofreaderEngine.prototype.trigger = function(evt, param) {
	this.$elm.trigger(evt, param)
}

ProofreaderEngine.prototype.constructor = function(defaultVal) {
	this.debugLevel = 0;
	/**
	 * ID of the engine. Must be unique.
	 */
	this.id = ""
	/**
	 * Display name of the engine
	 */
	this.name = ""
	/**
	 * Description of the engine.
	 */
	this.description = ""
	/**
	 * Author of this engine
	 * @default Anonymous
	 */
	this.author = "Anonymous"
	/**
	 * Engine version
	 */
	this.version = "1.0"
	this.isInitialized = false
	this.isDisabled = false

	/**
	 * Maximum request length for each batch in characters.
	 * @default 5000
	 */
	this.maxRequestLength = 5000
	/**
	 * How many rows are allowed per concurrent request. `Infinity` disables chunking.
	 * @default Infinity
	 */
	this.rowLimitPerBatch = Infinity
	/**
	 * How many concurrent requests are allowed. `0`/`undefined` disables concurrency (single request).
	 * @default 1
	 */
	this.maxConcurrentRequest = 1
	/**
	 * Batch delay.
	 * The waiting time between batches. Some servers will ban you for sending intense/attack-like requests.
	 * @default 5000
	 */
	this.batchDelay = 5000
	this.preserveInvalidReturnedRows = false

	/**
	 * In rowByRow mode, newlines (`\n`) are substituted by this character before sending to the proofreader.
	 * @default \r\n
	 */
	this.lineSubstitute = '\\r\\n'
	this.lineSubstituteStripExtraSpace = true

	/**
	 * Escape algorithm to protect inline code/tags from being altered.
	 * Reuses the same static registry as `TranslatorEngine.escapeAlgorithms` -- see `preProcessText()`.
	 */
	this.escapeAlgorithm = ''

	/**
	 * When proofreading "in place" (not "into the right column"), write the correction to the next
	 * empty *existing* translation column instead of overwriting the column that was selected --
	 * keeping the previous translation around for comparison. Only existing columns are considered;
	 * no new column is created. Falls back to overwriting the selected column when none is free.
	 * @default false
	 */
	this.saveToAvailableColumn = false

	/**
	 * A `JSON Form` object to generate a form for options.
	 * @see www/js/TranslatorEngine.js for the same convention.
	 * @type {Object}
	 */
	this.optionsForm = {
		schema: {
			lineSubstitute: {
				"type": "string",
				"title": "New line character substitute",
				"description": "Newline character replacer before sending the text to the proofreader service.\nGlue between lines.",
				"default": this.lineSubstitute
			},
			saveToAvailableColumn: {
				"type": "boolean",
				"title": "Save corrections to the next available column",
				"description": "When proofreading in place, write the correction to the next empty existing translation column instead of overwriting the column you selected. If no later column is empty, it falls back to overwriting normally. Does not apply to \"Proofread into the right column\".",
				"default": this.saveToAvailableColumn
			}
		},
		form: [
			{
				"key": "lineSubstitute",
				"onChange": (evt) => {
					var value = $(evt.target).val();
					this.update("lineSubstitute", value);
				}
			},
			{
				"key": "saveToAvailableColumn",
				"inlinetitle": "Save corrections to the next available column",
				"onChange": (evt) => {
					var value = $(evt.target).prop("checked");
					this.update("saveToAvailableColumn", value);
				}
			}
		]
	};

	if (typeof defaultVal == 'object') {
		for (var key in defaultVal) {
			if (key == "optionsForm") {
				this.mergeOptionsForm(defaultVal[key]);
				continue;
			}
			this[key] = defaultVal[key];
		}
	}

	this.$elm = $("<div></div>");
}

ProofreaderEngine.prototype.mergeOptionsForm = function(optionsForm) {
	if (!optionsForm) return;
	optionsForm ||= {}
	optionsForm.schema ||= {};
	optionsForm.form ||= [];

	this.optionsForm ||= {};
	this.optionsForm.schema ||= {};
	this.optionsForm.form ||= [];

	var exists = [];

	for (var schKey in optionsForm.schema) {
		var thisSchema = optionsForm.schema[schKey];
		if (this.optionsForm.schema[schKey]) exists.push(schKey);
		this.optionsForm.schema[schKey] = thisSchema;
	}

	for (var fldId = 0; fldId < this.optionsForm.form.length; fldId++) {
		var fldKey = this.optionsForm.form[fldId].key;
		if (!fldKey) continue;
		if (exists.includes(fldKey) == false) continue;

		// remove the key from template
		this.optionsForm.form.splice(fldId, 1);
	}

	this.optionsForm.form = optionsForm.form.concat(this.optionsForm.form);

	for (let i in optionsForm) {
		if (["schema", "form"].includes(i)) continue;
		this.optionsForm[i] = optionsForm[i];
	}
}

ProofreaderEngine.prototype.getOptionsFormValue = function() {
	var result = {};
	for (var key in this.optionsForm.schema) {
		result[key] = this.getOptions(key);
	}
	return result;
}

/**
 * Update a configuration and store it to the system.
 * @param {String} key - Key of the key-value pair
 * @param {*} value - Value of the key-value pair
 */
ProofreaderEngine.prototype.update = function(key, value) {
	if (typeof key == 'undefined') return false;
	if (key == '') return false;
	this[key] = value;

	console.log("Update " + key + " with value: " + value);

	var thisSys;
	if (typeof sys !== 'undefined') {
		thisSys = sys;
	} else if (typeof window.opener.sys !== 'undefined') {
		thisSys = window.opener.sys;
	} else {
		thisSys = window.top.sys;
	}

	thisSys.config.proofreaderEngineOptions = thisSys.config.proofreaderEngineOptions || {};
	thisSys.config.proofreaderEngineOptions[this.id] = thisSys.config.proofreaderEngineOptions[this.id] || {};
	thisSys.config.proofreaderEngineOptions[this.id][key] = value;
	this.trigger("update", {
		key: key,
		value: value
	});

	this.saveDebounced();
}

ProofreaderEngine.prototype.save = function() {
	var thisSys;
	if (typeof sys !== 'undefined') {
		thisSys = sys;
	} else if (typeof window.opener.sys !== 'undefined') {
		thisSys = window.opener.sys;
	} else {
		thisSys = window.top.sys;
	}

	thisSys.saveConfig();
}

// Add a debounced version of the save method
ProofreaderEngine.prototype.saveDebounced = debounce(function() {
	this.save();
}, 100);

ProofreaderEngine.prototype.setOption = ProofreaderEngine.prototype.update;

/**
 * Get option from this proofreader engine.
 * @param {*} key - Key of the option
 * @returns {*} Value of the retrieved option
 */
ProofreaderEngine.prototype.getOptions = function(key) {
	var thisSys;
	if (typeof sys !== 'undefined') {
		thisSys = sys;
	} else if (typeof window.opener.sys !== 'undefined') {
		thisSys = window.opener.sys;
	} else {
		thisSys = window.top.sys;
	}

	thisSys.config.proofreaderEngineOptions = thisSys.config.proofreaderEngineOptions || {};
	thisSys.config.proofreaderEngineOptions[this.id] = thisSys.config.proofreaderEngineOptions[this.id] || this.defaultConfig || {};

	if (!key) return thisSys.config.proofreaderEngineOptions[this.id] ?? this.defaultConfig;

	return thisSys.config.proofreaderEngineOptions[this.id][key] ?? this.defaultConfig?.[key] ?? this[key] ?? this.optionsForm?.schema?.[key]?.default;
}

/**
 * Get the default value of an option
 * @param {string} key - The key of the option
 * @returns {any} - the default value of the option
 */
ProofreaderEngine.prototype.getDefaultOptions = function(key) {
	if (!key) {
		if (!empty(this.defaultConfig)) {
			return this.defaultConfig;
		}

		const obj = {};
		if (!empty(this.defaultSchema)) {
			for (let key in this.defaultSchema) {
				let thisSchema = this.defaultSchema[key]
				obj[key] = thisSchema.default;
			}
			return obj;
		}
		return {}
	}

	return this.defaultConfig?.[key] ?? this.defaultSchema?.[key]?.default ?? this[key];
}

/**
 * Reset the options to their default values.
 * Only affects options set through the option form; will not re-render the option field.
 */
ProofreaderEngine.prototype.resetOptions = function() {
	var thisSys;
	if (typeof sys !== 'undefined') {
		thisSys = sys;
	} else if (typeof window.opener.sys !== 'undefined') {
		thisSys = window.opener.sys;
	} else {
		thisSys = window.top.sys;
	}

	thisSys.config.proofreaderEngineOptions[this.id] ||= {}
	const defaultConfig = this.getDefaultOptions() || {};
	thisSys.config.proofreaderEngineOptions[this.id] = { ...thisSys.config.proofreaderEngineOptions[this.id], ...defaultConfig }

	this.saveDebounced();
	return thisSys.config.proofreaderEngineOptions[this.id];
}

ProofreaderEngine.prototype.loadOptions = async function() {
	var thisEngine = this;

	return new Promise((resolve, reject) => {
		try {
			var thisSys;
			if (typeof sys !== 'undefined') {
				thisSys = sys;
			} else if (typeof window.opener.sys !== 'undefined') {
				thisSys = window.opener.sys;
			} else {
				thisSys = window.top.sys;
			}
		} catch (e) {
			return false;
		}

		thisSys.onReady(function() {
			thisSys.config.proofreaderEngineOptions = thisSys.config.proofreaderEngineOptions || {};
			thisSys.config.proofreaderEngineOptions[thisEngine.id] = thisSys.config.proofreaderEngineOptions[thisEngine.id] || {};

			for (var key in thisSys.config.proofreaderEngineOptions[thisEngine.id]) {
				thisEngine[key] = thisSys.config.proofreaderEngineOptions[thisEngine.id][key];
			}
			resolve();
		});
	})
}

/**
 * Set all options at once
 */
ProofreaderEngine.prototype.setOptions = function(options) {
	for (let key in options) {
		this.setOption(key, options[key]);
	}
}

/** Return additional batch options rendered by the batch-proofreading dialog. */
ProofreaderEngine.prototype.batchProofreadingOptions = function() {
	return { schema: {}, form: [] };
}

/**
 * Check if the required fields are set
 * @returns {String[]} - Array of unset required options
 */
ProofreaderEngine.prototype.getUnsetRequiredOptions = function() {
	this.optionsForm ||= {};
	this.optionsForm.schema ||= {};
	var result = [];

	const getTitleFromForm = (form, key) => {
		for (let i in form) {
			if (form[i].key == key) return form[i].title;
			if (form[i].items) {
				const title = getTitleFromForm(form[i].items, key);
				if (title) return title;
			}
		}
	}

	for (var key in this.optionsForm.schema) {
		if (!this.optionsForm.schema[key].required) continue;
		const thisSchema = this.optionsForm.schema[key];

		if (thisSchema.type == "string") {
			if (typeof this.getOptions(key) !== "undefined" && this.getOptions(key) !== "") continue;
		} else {
			if (typeof this.getOptions(key) !== "undefined") continue;
		}

		if (this.optionsForm.schema[key].title) {
			result.push({
				key: key,
				title: this.optionsForm.schema[key].title
			});
		} else if (this.optionsForm.form?.length) {
			result.push({
				key: key,
				title: getTitleFromForm(this.optionsForm.form, key)
			});
		} else {
			result.push({
				key: key,
				title: key
			});
		}
	}

	return result;
}

/**
 * Pre-process text(s) before sending to the proofreader, protecting inline code/tags.
 * Reuses the exact same static escape-algorithm registry as `TranslatorEngine.escapeAlgorithms`
 * (populated by add-ons such as `www/addons/basicUtils/utils/codeEscape.js`) so proofreader engines
 * get the same inline-tag protection translator engines already have, with no duplicated logic.
 * @param {String|String[]} text - Text or array of text
 * @param {Object} [options]
 * @returns {Object} A CodeEscape-like object, or `{text, originalTexts}` when no algorithm is set
 */
ProofreaderEngine.prototype.preProcessText = function(text, options) {
	if (typeof TranslatorEngine !== "undefined" && TranslatorEngine.escapeAlgorithms[this.escapeAlgorithm]) {
		const AlgoClass = TranslatorEngine.escapeAlgorithms[this.escapeAlgorithm];
		const codeEscape = new AlgoClass(text, { ...{ translatorEngine: this }, ...options });
		codeEscape.escapeTexts(text);
		return codeEscape;
	}

	const originalTexts = Array.isArray(text) ? text : [text];
	return { text, originalTexts, toTranslate: text };
}

ProofreaderEngine.prototype.escapeLineBreak = function(text) {
	if (typeof text == "string") {
		return str_ireplace($DV.config.lineSeparator, this.lineSubstitute, text);
	} else if (Array.isArray(text)) {
		return text.map((t) => str_ireplace($DV.config.lineSeparator, this.lineSubstitute, t));
	}
	return text;
}

ProofreaderEngine.prototype.restoreLineBreak = function(text) {
	const restoreOne = (t) => {
		if (this.lineSubstituteStripExtraSpace) t = str_ireplace(this.lineSubstitute + " ", $DV.config.lineSeparator, t);
		return str_ireplace(this.lineSubstitute, $DV.config.lineSeparator, t);
	}
	if (typeof text == "string") return restoreOne(text);
	if (Array.isArray(text)) return text.map(restoreOne);
	return text;
}

/**
 * @typedef ProofreadResult
 * @type {Object}
 * @property {String[]} source - Source/original texts (read-only column), index-aligned
 * @property {String[]} input - The translation text as it was before proofreading, index-aligned
 * @property {String[]} proofread - The corrected translation text, index-aligned
 */

/**
 * Proofread an existing translation against its source text.
 * This is the generic batching/orchestration entry point; the actual request is done by
 * overriding `fetchProofread(payload, options)` -- mirrors `TranslatorEngine.prototype.translate`
 * delegating to `fetchTranslation()`.
 * @param {String|String[]} sourceTexts - Source/original text(s), read-only column value(s)
 * @param {String|String[]} currentTranslations - Existing translation text(s) to be corrected
 * @param {Object[]} [rowContext=[]] - Per-row context, e.g. `[{speaker, contextPath}, ...]`
 * @param {Object} [options={}]
 * @param {String} [options.tl=trans.getTl()] - Target/translation language
 * @returns {Promise<ProofreadResult>}
 */
ProofreaderEngine.prototype.proofread = async function(sourceTexts = [], currentTranslations = [], rowContext = [], options = {}) {
	if (ProofreaderEngine.mockupMode) ui.log("Running proofreading in mockup mode. You shouldn't see this message in the production build!");
	const thisEngine = this;

	if (this.isDisabled == true) {
		return { source: sourceTexts, input: currentTranslations, proofread: Array.isArray(currentTranslations) ? currentTranslations.slice() : [currentTranslations] };
	}

	if (!Array.isArray(sourceTexts)) sourceTexts = [sourceTexts];
	if (!Array.isArray(currentTranslations)) currentTranslations = [currentTranslations];
	rowContext = rowContext || [];

	options ||= {};
	try {
		options.tl = options.tl || (typeof trans !== "undefined" ? trans.getTl() : undefined) || 'en';
	} catch (e) {
		options.tl = options.tl || 'en';
	}
	options.onAfterLoading ||= function() {};
	options.onError ||= function() {};
	options.always ||= function() {};

	const numberOfElm = sourceTexts.length;

	const ensureArrayElement = (resultTexts, fallback) => {
		if (!Array.isArray(resultTexts)) {
			ui?.logError?.(`Invalid type returned from proofreader. Expected an array, ${typeof resultTexts} given.`);
			return fallback.slice();
		}
		if (resultTexts.length != numberOfElm) {
			ui?.logError?.(`Invalid number of proofread rows returned. Expected ${numberOfElm}, but ${resultTexts.length} were generated!`);
			if (thisEngine.getOptions("preserveInvalidReturnedRows")) return resultTexts;
			return fallback.slice();
		}
		return resultTexts;
	}

	var result = {
		source: sourceTexts,
		input: currentTranslations,
		proofread: currentTranslations.slice()
	};

	try {
		const rowLimitPerBatch = this.getOptions("rowLimitPerBatch") || Infinity;
		const maxConcurrentRequest = this.getOptions("maxConcurrentRequest");

		if (!maxConcurrentRequest || rowLimitPerBatch >= numberOfElm) {
			console.log("%c -Processing proofread in single mode!", "color:aqua;");
			const payload = this.buildPayload(sourceTexts, currentTranslations, rowContext, options);
			const proofread = await this.fetchProofread(payload, options);
			result.proofread = ensureArrayElement(proofread, currentTranslations);
		} else {
			console.log("%c -Processing proofread in concurrent mode!", "color:aqua;");
			const plimit = require("p-limit");
			const limit = plimit(maxConcurrentRequest);
			const sourceChunks = common.arrayChunk(sourceTexts, rowLimitPerBatch);
			const translationChunks = common.arrayChunk(currentTranslations, rowLimitPerBatch);
			const contextChunks = common.arrayChunk(rowContext, rowLimitPerBatch);
			const resultChunks = new Array(sourceChunks.length);

			const queue = sourceChunks.map((_, index) => limit(async () => {
				await ui.log("Proofreading subbatch " + (index + 1) + " of " + sourceChunks.length);
				const payload = thisEngine.buildPayload(sourceChunks[index], translationChunks[index], contextChunks[index] || [], options);
				const proofread = await thisEngine.fetchProofread(payload, options);
				resultChunks[index] = ensureArrayElement(proofread, translationChunks[index]);
			}));

			await Promise.all(queue);
			result.proofread = resultChunks.flat();
		}
	} catch (e) {
		console.error(e);
		if (typeof e?.toString == 'function') {
			ui?.log?.error?.(e.toString());
		} else {
			ui?.log?.error?.("An error occurred during proofreading.");
		}
		if (typeof options.onError == "function") options.onError(e);
	}

	if (typeof options.onAfterLoading == 'function') {
		options.onAfterLoading.call(this, result);
	}

	return result;
}

/**
 * Build the payload object handed to `fetchProofread()`. Kept as its own method so concrete engines
 * can override/extend it (e.g. to add glossary/actor-reference lookups) without re-implementing batching.
 * @returns {Object} `{sourceTexts, currentTranslations, rowContext, tl}`
 */
ProofreaderEngine.prototype.buildPayload = function(sourceTexts, currentTranslations, rowContext, options) {
	return {
		sourceTexts: sourceTexts,
		currentTranslations: currentTranslations,
		rowContext: rowContext || [],
		tl: options?.tl
	};
}

/**
 * Send a proofreading request to the concrete service and return corrected texts.
 * This function should be overridden with the real handler.
 * @param {Object} payload - `{sourceTexts, currentTranslations, rowContext, tl}`
 * @param {Object} [options]
 * @returns {Promise<String[]>} - Corrected texts. Must match the index of `payload.currentTranslations`
 */
ProofreaderEngine.prototype.fetchProofread = async function(payload, options) {
	return payload.currentTranslations;
}

/**
 * List of the proofreader engines
 */
ProofreaderEngine.proofreaders = {};

/**
 * Find the next empty *existing* column after `sourceColumn` in `rowData`. Used when the
 * `saveToAvailableColumn` option is enabled, so a correction doesn't overwrite the translation
 * being corrected. Only existing columns are considered -- no new column is created here.
 * @param {Trans} transInstance
 * @param {Array} rowData - The row's data array (`file.data[row]`)
 * @param {Number} sourceColumn - Column the correction was made against
 * @returns {Number} - The available column, or `sourceColumn` itself if none is free
 */
ProofreaderEngine.getAvailableColumn = function(transInstance, rowData, sourceColumn) {
	var isEmpty = function(value) {
		return value == null || (typeof value === "string" && value.trim().length === 0);
	}
	// `columns` contains Handsontable settings and may not include the final
	// persisted project column. Use both the headers and row data so an input in
	// column 2 can correctly target the next available column 3.
	var lastColumn = Math.max(
		(transInstance.colHeaders?.length || 0) - 1,
		(rowData?.length || 0) - 1
	);

	for (var column = sourceColumn + 1; column <= lastColumn; column++) {
		if (isEmpty(rowData?.[column])) return column;
	}
	return sourceColumn;
}

/**
 * Local, per-project history of Proofreader corrections -- which cells were changed, their
 * before/after text, and where. Stored with `common.localStorage` (IndexedDB-backed, see
 * `www/addons/basicUtils` -- `better-localstorage`), keyed per project so switching projects
 * doesn't mix histories. Viewed through `www/proofreaderHistory.html`
 * (see `ProofreaderEngine.openHistory()` below).
 */
ProofreaderEngine.history = {
	_writeQueue: Promise.resolve(),
	_key: function(projectId) {
		return "proofreaderHistory:" + projectId;
	},
	_sanitizeChange: function(change) {
		return {
			fileId: String(change.fileId || ""),
			fileName: String(change.fileName || change.fileId || ""),
			row: Number.isInteger(change.row) ? change.row : null,
			source: String(change.source ?? ""),
			before: String(change.before ?? ""),
			after: String(change.after ?? ""),
			sourceColumn: Number.isInteger(change.sourceColumn) ? change.sourceColumn : null,
			destinationColumn: Number.isInteger(change.destinationColumn) ? change.destinationColumn : null,
			destinationHeader: String(change.destinationHeader || ""),
			lineCountChanged: change.lineCountChanged === true
		};
	},
	_sanitizeRun: function(record) {
		var changes = (record.changes || []).map(ProofreaderEngine.history._sanitizeChange);
		return {
			id: String(record.id || (Date.now() + "-" + Math.random().toString(36).slice(2))),
			startedAt: Number(record.startedAt) || Date.now(),
			finishedAt: Number(record.finishedAt) || Date.now(),
			status: String(record.status || "completed"),
			scope: String(record.scope || "selection"),
			mode: String(record.mode || "overwrite"),
			engine: {
				id: String(record.engine?.id || ""),
				name: String(record.engine?.name || "")
			},
			files: Array.isArray(record.files) ? record.files.map(String) : [],
			reviewedCount: Number(record.reviewedCount) || 0,
			changedCount: changes.length,
			changes: changes
		};
	},
	/**
	 * @param {String} [projectId=trans.project.projectId]
	 * @returns {Promise<Object[]>}
	 */
	list: async function(projectId) {
		projectId = projectId || (typeof trans !== "undefined" ? trans.project?.projectId : undefined);
		if (!projectId || !common?.localStorage?.get) return [];
		await ProofreaderEngine.history._writeQueue.catch(function() {});
		var records = await common.localStorage.get(ProofreaderEngine.history._key(projectId));
		return Array.isArray(records) ? records : [];
	},
	/**
	 * Record a completed proofreading run. No-op if nothing was actually changed.
	 * @param {Object} record - `{projectId, startedAt, finishedAt, status, scope, mode, engine, files, reviewedCount, changes}`
	 * @returns {Promise<Object|Boolean>}
	 */
	append: function(record) {
		var projectId = record?.projectId || (typeof trans !== "undefined" ? trans.project?.projectId : undefined);
		if (!projectId || !Array.isArray(record?.changes) || !record.changes.length) {
			return Promise.resolve(false);
		}

		var safeRecord = ProofreaderEngine.history._sanitizeRun(record);
		ProofreaderEngine.history._writeQueue = ProofreaderEngine.history._writeQueue
			.catch(function() {})
			.then(async function() {
				var stored = await common.localStorage.get(ProofreaderEngine.history._key(projectId));
				var records = Array.isArray(stored) ? stored : [];
				records.unshift(safeRecord);
				await common.localStorage.set(ProofreaderEngine.history._key(projectId), records.slice(0, 100));
				return safeRecord;
			});
		return ProofreaderEngine.history._writeQueue;
	},
	/**
	 * @param {String} [projectId=trans.project.projectId]
	 */
	clear: function(projectId) {
		projectId = projectId || (typeof trans !== "undefined" ? trans.project?.projectId : undefined);
		if (!projectId || !common?.localStorage) return Promise.resolve(false);

		ProofreaderEngine.history._writeQueue = ProofreaderEngine.history._writeQueue
			.catch(function() {})
			.then(async function() {
				await common.localStorage.delete(ProofreaderEngine.history._key(projectId));
				return true;
			});
		return ProofreaderEngine.history._writeQueue;
	},
	/**
	 * Whether `change` can still be jumped to in the currently open project (same project, cell
	 * still exists). Used by the history viewer to disable "Locate" on stale entries.
	 */
	canLocate: function(projectId, change) {
		if (typeof trans === "undefined" || !trans.project || trans.project.projectId !== projectId) return false;
		var file = trans.project.files?.[change?.fileId];
		var row = change?.row;
		var col = change?.destinationColumn;
		if (!Number.isInteger(row) || row < 0) return false;
		if (!file || !Array.isArray(file.data?.[row])) return false;
		if (!Number.isInteger(col) || col < 0 || col >= trans.columns.length) return false;
		return true;
	},
	locate: function(projectId, change) {
		if (!ProofreaderEngine.history.canLocate(projectId, change)) return false;
		trans.selectFile(change.fileId);
		trans.selectCell(change.row, change.destinationColumn);
		return true;
	}
};

/**
 * Open the Proofreader history viewer (a modal window, see `www/proofreaderHistory.html`).
 * Mirrors the other core modal-page openers (e.g. `Trans.prototype.openTableEditor` in
 * www/js/TranslatorEngine.js).
 */
ProofreaderEngine.openHistory = async function() {
	if (typeof trans === "undefined" || !trans.project?.projectId) {
		ui.toast.warning(t("Open a translation project to view Proofreader history."));
		return false;
	}

	var showModalDialog = require("www/js/modalDialog.js").showModalDialog;
	await showModalDialog(
		"www/proofreaderHistory.html",
		{ projectId: trans.project.projectId, language: typeof $n !== "undefined" ? $n.language : "en" },
		{
			id: "proofreaderHistory",
			title: t("Proofreader History"),
			width: 1000,
			height: 650,
			min_width: 760,
			min_height: 480,
			resizable: true
		}
	);
	return true;
}

/**
 * Initializing the proofreader engine
 * @returns {Boolean} - True on success
 */
ProofreaderEngine.prototype.init = async function() {
	console.log("initializing proofreader engine : " + this.id);
	if (this.isInitialized) return true;
	ProofreaderEngine.proofreaders[this.id] = this;
	if (this.optionsForm?.schema) {
		this.defaultSchema = common.clone(this.optionsForm.schema)
	}
	await this.loadOptions();
	this.isInitialized = true;
	this.trigger("init", this);
	if (typeof ProofreaderEngine.resolveState == "function") ProofreaderEngine.resolveState(this.id);
	if (typeof trans !== "undefined") {
		ProofreaderEngine.initGridIntegration();
		ProofreaderEngine.initObjectMenuIntegration();
		ProofreaderEngine.initToolbarButton();
	}
}

// =====================================================================================
// Grid integration -- kept inside this core file (not in www/js/trans.js) so proofreader
// support does not require editing trans.js. Mirrors the pattern add-ons already use to inject
// menu items (see www/addons/tm/tmUI.js's `initGridMenu`).
//
// Note: this file is a plain <script> tag loaded right after trans.js in trans.html/thread.html,
// so the bare identifier `Trans` (the class) is expected to already be in scope. In practice that
// lexical binding isn't reliably resolvable from here in every host context, which surfaced as a
// live "ReferenceError: Trans is not defined" that silently aborted the rest of this script (so
// none of the proofreader menu entries got registered). `trans` (the lowercase instance) is the
// one guarantee every caller of this file already relies on (see `ProofreaderEngine.prototype.init`
// above), so every extension point below is attached via `Object.getPrototypeOf(trans)` instead of
// the bare `Trans` identifier.
// =====================================================================================

ProofreaderEngine.transAdapter = async function() {
	if (!trans) throw new Error("ProofreaderEngine.transAdapter() requires a valid `trans` instance in scope.");
	var transPrototype = Object.getPrototypeOf(trans);
	
	/**
	* Get the currently active proofreader engine's ID.
	* Mirrors `Trans.prototype.getActiveTranslator` (www/js/trans.js).
	* @returns {String}
	*/
	transPrototype.getActiveProofreader = function() {
		if (!trans.project) return sys.config?.proofreader;
		trans.project.options = trans?.project.options || {};
		return trans.project?.options?.proofreader || sys.config.proofreader;
	}
	
	/**
	* Set the active proofreader engine.
	* @param {String|ProofreaderEngine} proofreader - Proofreader engine ID or instance
	*/
	transPrototype.setActiveProofreader = function(proofreader) {
		if (typeof proofreader == 'string') {
			proofreader = this.getProofreaderEngine(proofreader);
		}
		if (!proofreader?.id) return;
		this.setOption("proofreader", proofreader.id);
	}
	
	/**
	* Get a proofreader engine object by its ID.
	* @param {String} id
	* @returns {ProofreaderEngine}
	*/
	transPrototype.getProofreaderEngine = function(id) {
		if (ProofreaderEngine.proofreaders[id]) return ProofreaderEngine.proofreaders[id];
		if (this[id] instanceof ProofreaderEngine) return this[id];
		if (id instanceof ProofreaderEngine) return id;
		console.warn(id, " is not a proofreader engine");
	}
	
	/**
	* Get the currently active proofreader engine instance.
	* Falls back to the sole registered engine when none has been explicitly selected yet, so
	* "Proofread here" works immediately with a single installed proofreader add-on (e.g. `prOpenAI`)
	* without requiring the user to first go through "Proofread using...".
	* @returns {ProofreaderEngine}
	*/
	transPrototype.getActiveProofreaderEngine = function() {
		var activeId = this.getActiveProofreader();
		if (activeId) {
			var explicit = this.getProofreaderEngine(activeId);
			if (explicit) return explicit;
		}
		
		var ids = Object.keys(ProofreaderEngine.proofreaders);
		if (ids.length === 1) return ProofreaderEngine.proofreaders[ids[0]];
		return undefined;
	}
	
	/**
	* Proofread the current grid selection.
	* Structurally mirrors `Trans.prototype.translateSelection` / `translateSelectionAsOneLine`
	* (www/js/trans.js) for selection handling and `emitDataMutation` usage.
	* @param {CellRange[]} [currentSelection=trans.grid.getSelectedRange()]
	* @param {Object} [options={}]
	* @param {ProofreaderEngine} [options.proofreaderEngine=trans.getActiveProofreaderEngine()]
	* @param {"inPlace"|"rightColumn"} [options.target="inPlace"]
	*/
	transPrototype.proofreadSelection = async function(currentSelection, options = {}) {
		var trans = this;
		var startedAt = Date.now();
		currentSelection = currentSelection || trans.grid?.getSelectedRange() || [[]];
		if (typeof currentSelection == 'undefined') {
			ui.toast.warning(t("Nothing is selected"));
			return false;
		}
		
		options ||= {};
		options.target ||= "inPlace";
		
		var currentEngine = options.proofreaderEngine || trans.getActiveProofreaderEngine();
		if (!currentEngine) {
			ui.toast.warning(t("No proofreader engine is configured. Install and configure a proofreader add-on first."));
			return false;
		}
		if (currentEngine.isDisabled == true) {
			ui.toast.warning(currentEngine.id + t(" is disabled!"));
			return false;
		}
		
		// "availableColumn": write to the next empty existing column instead of overwriting the
		// selected one (see ProofreaderEngine's `saveToAvailableColumn` option). Only applies to
		// "inPlace" -- "Proofread into the right column" already avoids overwriting anything.
		var outputMode = options.target === "rightColumn" ? "rightColumn" : "overwrite";
		if (options.target === "inPlace" && currentEngine.getOptions("saveToAvailableColumn") === true) {
			outputMode = "availableColumn";
		}
		
		// NOTE: must use trans.getData() (== trans.data), NOT trans.grid.getData() -- the Handsontable
		// getData() call returns a freshly-assembled view, not the live data reference, so mutating it
		// silently does not persist (confirmed empirically: trans.grid.getData() !== trans.data).
		var thisData = trans.getData();
		var cellPool = common.gridSelectedCells(currentSelection).filter((c) => c.col !== trans.keyColumn);
		if (cellPool.length < 1) {
			ui.toast.warning(t("Please select a translation cell to proofread (not the original text column)."));
			return false;
		}
		
		var selectedFileId = trans.getSelectedId();
		var fileObj = selectedFileId ? trans.project?.files?.[selectedFileId] : undefined;
		
		if (options.target === "rightColumn") {
			var maxCol = Math.max.apply(null, cellPool.map((c) => c.col));
			if (maxCol >= trans.columns.length - 1) {
				// append a brand-new column at the very end -- safe because it does not shift the
				// meaning of any already-computed column index for the cells collected below.
				trans.grid.insertColumnRight(t("Proofread"), trans.columns.length - 1);
			}
		}
		
		ui.tableCornerShowLoading?.();
		
		try {
			var sourceTexts = [];
			var currentTranslations = [];
			var rowContexts = [];
			var destinations = []; // {row, col, sourceCol}
			
			for (var i = 0; i < cellPool.length; i++) {
				var row = cellPool[i].row;
				var col = cellPool[i].col;
				var destCol = col;
				if (options.target === "rightColumn") {
					destCol = col + 1;
				} else if (outputMode === "availableColumn") {
					destCol = ProofreaderEngine.getAvailableColumn(trans, thisData[row], col);
				}
				
				sourceTexts.push(thisData[row]?.[trans.keyColumn] || "");
				currentTranslations.push(thisData[row]?.[col] || "");
				rowContexts.push({
					speaker: typeof trans.getRowInfoText == "function" ? trans.getRowInfoText(row) : "",
					contextPath: fileObj?.context?.[row]
				});
				destinations.push({ row: row, col: destCol, sourceCol: col });
			}
			
			var result = await currentEngine.proofread(sourceTexts, currentTranslations, rowContexts, { tl: trans.getTl() });
			
			var countLines = (s) => String(s ?? "").replace(/\r\n|\r/g, "\n").split("\n").length;
			var mutations = [];
			var historyChanges = [];
			var lineMismatchRows = [];
			
			for (var j = 0; j < destinations.length; j++) {
				var dest = destinations[j];
				var newValue = result.proofread[j];
				if (typeof newValue !== "string") continue;
				
				var oldValue = thisData[dest.row][dest.col];
				if (newValue === oldValue) continue;
				
				var lineCountChanged = countLines(currentTranslations[j]) !== countLines(newValue);
				if (lineCountChanged) {
					lineMismatchRows.push(dest.row);
				}
				
				thisData[dest.row][dest.col] = newValue;
				mutations.push({
					kind: "cellChange",
					fileId: selectedFileId,
					rowId: dest.row,
					colId: dest.col,
					oldValue: oldValue,
					newValue: newValue
				});
				historyChanges.push({
					fileId: selectedFileId,
					fileName: fileObj?.name || selectedFileId,
					row: dest.row,
					source: sourceTexts[j],
					before: currentTranslations[j],
					after: newValue,
					sourceColumn: dest.sourceCol,
					destinationColumn: dest.col,
					destinationHeader: trans.colHeaders?.[dest.col] || "",
					lineCountChanged: lineCountChanged
				});
			}
			
			if (mutations.length) {
				trans.emitDataMutation(mutations, {
					source: "proofread",
					scope: "cell",
					method: "proofreadSelection"
				});
				trans.gridIsModified?.(true);
			}
			
			if (lineMismatchRows.length) {
				ui.toast.warning(t("The proofreader changed the line count on ") + lineMismatchRows.length + t(" row(s). Please review the result."));
				console.warn("Proofread line-count mismatch on rows:", lineMismatchRows);
			}
			
			if (historyChanges.length) {
				ProofreaderEngine.history.append({
					projectId: trans.project?.projectId,
					startedAt: startedAt,
					finishedAt: Date.now(),
					status: "completed",
					scope: "selection",
					mode: outputMode,
					engine: { id: currentEngine.id, name: currentEngine.name },
					files: [selectedFileId],
					reviewedCount: cellPool.length,
					changes: historyChanges
				});
			}
			
			trans.grid.render();
			return result;
		} finally {
			ui.tableCornerHideLoading?.();
		}
	}
	
	/**
	* Proofread translated rows across one or more files/objects without opening them individually.
	* Defaults to the checked files in the file list, or every file when none are checked.
	* For each row, the rightmost non-empty translation column (the current best translation --
	* see AGENTS.md's "Column layout" note) is read and overwritten in place.
	* Mirrors `trans.js`'s "Batch translation" (`ui.translateAllDialog`) progress-log UX (abort button,
	* percentage bar), but drives it through the active proofreader engine instead.
	* @param {String|String[]} [files=trans.getCheckedFiles() or trans.getAllFiles()]
	* @param {Object} [options={}]
	* @param {ProofreaderEngine} [options.proofreaderEngine=trans.getActiveProofreaderEngine()]
	* @returns {Object|false} - `{aborted, files, rows, changed, lineMismatches}`, or `false` if nothing ran
	*/
	transPrototype.proofreadObjects = async function(files, options = {}) {
		var trans = this;
		var startedAt = Date.now();
		var currentEngine = options.proofreaderEngine || trans.getActiveProofreaderEngine();
		if (typeof currentEngine === "string") currentEngine = trans.getProofreaderEngine(currentEngine);
		if (!currentEngine) {
			ui.toast.warning(t("No proofreader engine is configured. Install and configure a proofreader add-on first."));
			return false;
		}
		if (currentEngine.isDisabled == true) {
			ui.toast.warning(currentEngine.id + t(" is disabled!"));
			return false;
		}
		
		var outputMode = "explicitColumn";
		var overwrite = options.overwrite !== false;
		if (options.proofreaderOptions && typeof options.proofreaderOptions === "object") currentEngine.setOptions(options.proofreaderOptions);
		var batchLog = function(message, data) {
			var suffix = typeof data === "undefined" ? "" : " " + (() => {
				try { return JSON.stringify(data); } catch (e) { return String(data); }
			})();
			console.log("[BatchProofread] " + message + suffix);
			if (typeof ui?.log === "function") ui.log("[BatchProofread] " + message + suffix);
		};
		batchLog("Started", { filesArgument: files, options: options });
		
		var selectedFiles;
		if (Array.isArray(files)) {
			selectedFiles = files.slice();
		} else if (typeof files === "string") {
			selectedFiles = [files];
		} else {
			selectedFiles = trans.getCheckedFiles();
			if (!selectedFiles.length) selectedFiles = trans.getAllFiles();
		}
		selectedFiles = selectedFiles.filter((fileId) => Array.isArray(trans.project?.files?.[fileId]?.data));
		if (!Number.isInteger(options.destinationColumn)) {
			ui.toast.warning(t("Please select a result column for batch proofreading."));
			return false;
		}
		batchLog("Configuration", {
			engine: { id: currentEngine.id, name: currentEngine.name },
			files: selectedFiles,
			sourceColumn: Number.isInteger(options.sourceColumn) ? options.sourceColumn : trans.keyColumn,
			translationColumn: Number.isInteger(options.translationColumn) ? options.translationColumn : null,
			destinationColumn: options.destinationColumn,
			overwrite: overwrite,
			destinationMode: outputMode,
			batchOptions: options.batchOptions || {},
			engineOptions: {
				rowLimitPerBatch: currentEngine.getOptions("rowLimitPerBatch"),
				maxConcurrentRequest: currentEngine.getOptions("maxConcurrentRequest"),
				batchDelay: currentEngine.getOptions("batchDelay"),
				maxRequestLength: currentEngine.getOptions("maxRequestLength")
			}
		});
		
		var entries = [];
		for (var f = 0; f < selectedFiles.length; f++) {
			var fileId = selectedFiles[f];
			var fileObj = trans.project.files[fileId];
			
			for (var row = 0; row < fileObj.data.length; row++) {
				var rowData = fileObj.data[row];
				if (!Array.isArray(rowData)) continue;
				
				var sourceColumn = Number.isInteger(options.sourceColumn) ? options.sourceColumn : trans.keyColumn;
				var translationColumn = Number.isInteger(options.translationColumn) ? options.translationColumn : undefined;
				var source = rowData[sourceColumn];
				if (typeof source !== "string" || source.length === 0) continue;
				if (options.filterTagMode === "blacklist" && trans.hasTags(options.filterTag, row, fileId)) continue;
				if (options.filterTagMode === "whitelist" && !trans.hasTags(options.filterTag, row, fileId)) continue;
				
				var col = Number.isInteger(translationColumn) ? translationColumn : -1;
				for (var c = rowData.length - 1; col < 0 && c > sourceColumn; c--) {
					if (typeof rowData[c] === "string" && rowData[c].trim().length > 0) {
						col = c;
						break;
					}
				}
				if (col < 0) continue;
				if (col === sourceColumn) continue;
				
				entries.push({
					fileId: fileId,
					row: row,
					col: col,
					destinationCol: options.destinationColumn,
					source: source,
					currentTranslation: rowData[col],
					rowContext: {
						speaker: typeof trans.getRowInfoText == "function" ? trans.getRowInfoText(row, true, fileId) : "",
						contextPath: fileObj.context?.[row]
					}
				});
			}
		}
		
		if (!entries.length) {
			var confirmationEnding = overwrite
			? t("? Existing values in the selected result column will be overwritten.")
			: t("? Existing values in the selected result column will be preserved.");
		}
		batchLog("Collected entries", {
			count: entries.length,
			destinations: entries.slice(0, 20).map((entry) => ({ fileId: entry.fileId, row: entry.row, inputColumn: entry.col, destinationColumn: entry.destinationCol }))
		});
		
		var confirmationEnding = outputMode === "availableColumn"
		? t("? Corrections will be saved to the next available existing column per row; rows without one will overwrite their current translation.")
		: t("? This will overwrite the rightmost non-empty translation.");
		var approved = confirm(
			t("Proofread ") + entries.length + t(" translated row(s) in ") + selectedFiles.length +
			t(" file(s) using ") + currentEngine.name + confirmationEnding
		);
		if (!approved) return false;
		
		var rowLimit = Number(currentEngine.getOptions("rowLimitPerBatch"));
		if (!Number.isFinite(rowLimit) || rowLimit < 1) rowLimit = entries.length;
		rowLimit = Math.max(1, Math.floor(rowLimit));
		
		var concurrentRequests = Number(currentEngine.getOptions("maxConcurrentRequest"));
		if (!Number.isFinite(concurrentRequests) || concurrentRequests < 1) concurrentRequests = 1;
		
		var batches = common.arrayChunk(entries, rowLimit);
		if (options.batchOptions?.alwaysSparateFile) {
			batches = [];
			for (var fileId of selectedFiles) {
				var fileEntries = entries.filter((entry) => entry.fileId === fileId);
				batches.push(...common.arrayChunk(fileEntries, rowLimit));
			}
		}
		var countLines = (s) => String(s ?? "").replace(/\r\n|\r/g, "\n").split("\n").length;
		var processState = { aborted: false, nextBatch: 0, completedBatches: 0, changed: 0, lineMismatches: 0, historyChanges: [] };
		
		var saveHistory = async function(status) {
			if (!processState.historyChanges.length) return;
			await ProofreaderEngine.history.append({
				projectId: trans.project?.projectId,
				startedAt: startedAt,
				finishedAt: Date.now(),
				status: status,
				scope: "objects",
				mode: outputMode,
				engine: { id: currentEngine.id, name: currentEngine.name },
				files: selectedFiles,
				reviewedCount: entries.length,
				changes: processState.historyChanges
			});
		}
		
		await ui.log.start({
			buttons: [{
				text: t("Abort"),
				onClick: function() {
					if (confirm(t("Are you sure want to abort this process?"))) {
						processState.aborted = true;
						ui.log.progress(100, t("Aborted"));
					}
				}
			}]
		});
		await ui.log("Total batch length: " + batches.length);
		
		var processBatch = async function(batch, batchIndex) {
			if (processState.aborted) return;
			await ui.log("[" + (batchIndex + 1) + "/" + batches.length + "] Proofreading translations...");
			
			var result = await currentEngine.proofread(
				batch.map((entry) => entry.source),
				batch.map((entry) => entry.currentTranslation),
				batch.map((entry) => entry.rowContext),
				{ tl: trans.getTl(), batchOptions: options.batchOptions || {} }
			);
			batchLog("Proofreader result", {
				batch: batchIndex + 1,
				requested: batch.length,
				returned: Array.isArray(result?.proofread) ? result.proofread.length : null,
				result: result?.proofread
			});
			if (processState.aborted) return;
			
			var mutations = [];
			for (var i = 0; i < batch.length; i++) {
				var entry = batch[i];
				var newValue = result?.proofread?.[i];
				if (typeof newValue !== "string") {
					batchLog("Skipped result: not a string", { batch: batchIndex + 1, index: i, row: entry.row, value: newValue });
					continue;
				}
				if (newValue === entry.currentTranslation) {
					batchLog("Skipped result: unchanged", { batch: batchIndex + 1, index: i, row: entry.row });
					continue;
				}
				
				var destinationRow = trans.project.files[entry.fileId].data[entry.row];
				var oldValue = destinationRow[entry.destinationCol];
				// Rows may be shorter than the selected destination column. Extend the
				// persisted row before writing so a correction is not lost in a sparse row.
				if (entry.destinationCol >= destinationRow.length) {
					destinationRow.length = entry.destinationCol + 1;
				}
				if (!overwrite && oldValue != null && String(oldValue).trim() !== "") {
					batchLog("Skipped result: destination is not empty", { batch: batchIndex + 1, index: i, row: entry.row, destinationColumn: entry.destinationCol });
					continue;
				}
				if (newValue === oldValue) continue;
				
				var lineCountChanged = countLines(entry.currentTranslation) !== countLines(newValue);
				if (lineCountChanged) {
					processState.lineMismatches++;
				}
				
				destinationRow[entry.destinationCol] = newValue;
				mutations.push({
					kind: "cellChange",
					fileId: entry.fileId,
					rowId: entry.row,
					colId: entry.destinationCol,
					oldValue: oldValue,
					newValue: newValue
				});
				processState.historyChanges.push({
					fileId: entry.fileId,
					fileName: trans.project.files[entry.fileId].name || entry.fileId,
					row: entry.row,
					source: entry.source,
					before: entry.currentTranslation,
					after: newValue,
					sourceColumn: entry.col,
					destinationColumn: entry.destinationCol,
					destinationHeader: trans.colHeaders?.[entry.destinationCol] || "",
					lineCountChanged: lineCountChanged
				});
			}
			batchLog("Batch mutations", { batch: batchIndex + 1, requested: batch.length, mutations: mutations.length });
			
			if (mutations.length) {
				trans.emitDataMutation(mutations, { source: "proofread", scope: "cell", method: "proofreadObjects" });
				processState.changed += mutations.length;
			}
			if (mutations.length && options.saveOnEachBatch) await trans.save?.();
			if (!processState.aborted && batchIndex < batches.length - 1) {
				var batchDelay = Number(currentEngine.getOptions("batchDelay"));
				if (Number.isFinite(batchDelay) && batchDelay > 0) await common.wait(batchDelay);
			}
			
			processState.completedBatches++;
			await ui.log.progress(
				processState.completedBatches / batches.length * 100,
				"[" + (batchIndex + 1) + "/" + batches.length + "] Proofreading completed"
			);
		}
		
		var worker = async function() {
			while (!processState.aborted) {
				var batchIndex = processState.nextBatch++;
				if (batchIndex >= batches.length) return;
				await processBatch(batches[batchIndex], batchIndex);
			}
		}
		
		try {
			var workerCount = Math.min(concurrentRequests, batches.length);
			await Promise.all(Array.from({ length: workerCount }, worker));
			
			trans.evalTranslationProgress?.(selectedFiles);
			if (processState.changed) trans.gridIsModified?.(true);
			trans.refreshGrid?.();
			
			if (processState.lineMismatches) {
				ui.toast.warning(t("The proofreader changed the line count on ") + processState.lineMismatches + t(" row(s). Please review the result."));
			}
			
			await ui.log.progress(100, processState.aborted ? t("Aborted") : t("Completed"));
			await saveHistory(processState.aborted ? "aborted" : "completed");
			if (!processState.aborted && options.playSoundOnComplete && typeof ui.playSound === "function") ui.playSound();
			ui.log.end();
		} catch (e) {
			await saveHistory("error");
			await ui.log.error(e?.toString ? e.toString() : String(e));
			ui.log.end(100, t("Error"), { error: true });
			throw e;
		}
		
		return {
			aborted: processState.aborted,
			files: selectedFiles,
			rows: entries.length,
			changed: processState.changed,
			lineMismatches: processState.lineMismatches
		};
	}
} // end of transAdapter

/**
 * Build the "Proofread here" / "Proofread into the right column" / "Proofread using..." grid
 * context-menu entries. Kept separate so `initGridIntegration()` can splice these into
 * `trans.gridContextMenu` without needing to edit `www/js/trans.js`.
 */
ProofreaderEngine.buildMenuEntries = function() {
	var hiddenGuard = function() {
		if (trans.grid.isColumnHeaderSelected()) return true;
		if (trans.grid.isRowHeaderSelected()) return true;
		if (!trans.getActiveProofreaderEngine()) return true;
		try {
			var cells = common.gridSelectedCells();
			if (cells.length && cells.every((c) => c.col === trans.keyColumn)) return true;
		} catch (e) { /* no selection yet */ }
		return false;
	}

	return {
		'proofreadHere': {
			name: function() {
				var eng = trans.getActiveProofreaderEngine();
				return eng ? t("Proofread here using ") + eng.name : t("Proofread here");
			},
			callback: function() {
				trans.proofreadSelection(undefined, { target: "inPlace" });
			},
			hidden: hiddenGuard
		},
		'proofreadRightColumn': {
			name: function() {
				return t("Proofread into the right column");
			},
			callback: function() {
				trans.proofreadSelection(undefined, { target: "rightColumn" });
			},
			hidden: hiddenGuard
		},
		'proofreadUsing': {
			name: function() {
				ProofreaderEngine.drawGridProofreaderMenu();
				return t('Proofread using...');
			},
			submenu: {
				items: []
			},
			hidden: function() {
				if (trans.grid.isRowHeaderSelected()) return true;
				if (empty(ProofreaderEngine.proofreaders)) return true;
				return false;
			}
		},
		'sepProofread': {
			name: '---------',
			hidden: hiddenGuard
		}
	};
}

/**
 * Populate `proofreadUsing`'s submenu from `ProofreaderEngine.proofreaders`.
 * Mirrors `Trans.prototype.drawGridTranslatorMenu` (www/js/trans.js).
 */
ProofreaderEngine.drawGridProofreaderMenu = function() {
	if (empty(ProofreaderEngine.proofreaders)) return;
	var menuEntry = trans.gridContextMenu?.proofreadUsing;
	if (!menuEntry) return;

	menuEntry.submenu.items = [];
	var sorted = Object.keys(ProofreaderEngine.proofreaders).sort((a, b) => {
		var nameA = (ProofreaderEngine.proofreaders[a].name || "").toLowerCase();
		var nameB = (ProofreaderEngine.proofreaders[b].name || "").toLowerCase();
		if (nameA < nameB) return -1;
		if (nameA > nameB) return 1;
		return 0;
	});

	for (let i = 0; i < sorted.length; i++) {
		let id = sorted[i];
		let thisEngine = ProofreaderEngine.proofreaders[id];
		menuEntry.submenu.items.push({
			key: `proofreadUsing:${id}`,
			name: thisEngine.name,
			callback: () => {
				trans.setActiveProofreader(thisEngine);
				trans.proofreadSelection(undefined, { target: "inPlace", proofreaderEngine: thisEngine });
			},
			hidden: () => {
				if (trans.grid.isColumnHeaderSelected()) return true;
				if (trans.grid.isRowHeaderSelected()) return true;
			}
		});
	}
}

/**
 * Inject the proofreader menu entries into `trans.gridContextMenu` and wire up
 * `trans.proofreadSelection`. Idempotent -- safe to call once per window regardless of how many
 * proofreader add-ons end up installed.
 */
ProofreaderEngine.initGridIntegration = function() {
	if (typeof trans === "undefined" || !trans?.gridContextMenu) return;
	if (trans.proofreaderContextMenuIsInitialized) return;
	trans.proofreaderContextMenuIsInitialized = true;

	var insertAfter = "translateSimiliar";
	var newMenu = {};
	var inserted = false;

	for (var key in trans.gridContextMenu) {
		newMenu[key] = trans.gridContextMenu[key];
		if (key === insertAfter) {
			Object.assign(newMenu, ProofreaderEngine.buildMenuEntries());
			inserted = true;
		}
	}
	if (!inserted) Object.assign(newMenu, ProofreaderEngine.buildMenuEntries());

	trans.gridContextMenu = newMenu;
	trans.grid?.updateSettings({
		contextMenu: {
			items: trans.gridContextMenu
		}
	});
}

/**
 * Inject a "Proofreader" entry into the file list's "With selected"/"With all" context menu
 * (`trans.fileSelectorMenu.withSelected.items`, built by `Trans.prototype.fileSelectorContextMenuInit`
 * in www/js/trans.js), wired to `trans.proofreadObjects()`. This is a different menu widget than the
 * grid's Handsontable menu above -- it's rendered by the jQuery-contextMenu plugin (see trans.html),
 * which supports a per-item `callback` the same way each item here already uses.
 * Idempotent -- safe to call once per window regardless of how many proofreader add-ons load.
 */
ProofreaderEngine.initObjectMenuIntegration = function() {
	if (typeof trans === "undefined" || !trans?.fileSelectorMenu?.withSelected?.items) return;
	if (trans.proofreaderObjectMenuIsInitialized) return;
	trans.proofreaderObjectMenuIsInitialized = true;

	var insertAfter = "batchTranslation";
	var existingItems = trans.fileSelectorMenu.withSelected.items;
	var newItems = {};
	var inserted = false;

	var proofreadObjectsEntry = {
		name: function() {
			return t("Batch Proofread");
		},
		icon: 'context-menu-icon icon-edit',
		callback: function() {
			ui.proofreadAllDialog?.();
		}
	};

	for (var key in existingItems) {
		newItems[key] = existingItems[key];
		if (key === insertAfter) {
			newItems.proofreadObjects = proofreadObjectsEntry;
			inserted = true;
		}
	}
	if (!inserted) newItems.proofreadObjects = proofreadObjectsEntry;

	trans.fileSelectorMenu.withSelected.items = newItems;
}

/**
 * Add a "Proofreader" history button to the translator toolbar, opening
 * `ProofreaderEngine.openHistory()`. Idempotent -- safe to call more than once.
 */
ProofreaderEngine.initToolbarButton = function() {
	var toolbar = ui.Toolbar?.getById?.("translator");
	if (!toolbar || toolbar.buttons?.proofreaderHistory) return;

	toolbar.addButtonGroup("proofreader");
	toolbar.addButton({
		id: "proofreaderHistory",
		group: "proofreader",
		title: t("Proofreader History"),
		icon: "icon-history",
		onClick: function() {
			return ProofreaderEngine.openHistory();
		}
	});
}

$(document).ready(function() {
	if ($('body').is('[data-window="trans"]') == false) return;
	ProofreaderEngine.transAdapter();
	// trans.grid may not exist yet on very first paint; either path is safe since
	// initGridIntegration()/initObjectMenuIntegration() are idempotent and
	// ProofreaderEngine.prototype.init() calls them again once the first engine finishes loading.
	if (typeof trans !== "undefined" && trans.gridContextMenu) {
		ProofreaderEngine.initGridIntegration();
	}
	if (typeof trans !== "undefined" && trans.fileSelectorMenu?.withSelected?.items) {
		ProofreaderEngine.initObjectMenuIntegration();
	}
	ProofreaderEngine.initToolbarButton();
});
