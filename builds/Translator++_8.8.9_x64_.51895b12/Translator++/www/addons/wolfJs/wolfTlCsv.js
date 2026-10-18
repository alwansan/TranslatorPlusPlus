const {ParserBase} = require("www/js/ParserBase.js");

/**
 * @class WolfTlCsv
 * @extends ParserBase
 *
 * Parses Wolf RPG multilingual CSV language files.
 *
 * Wolf RPG (version 3.x+) supports multiple languages via CSV files stored
 * in the game's Data directory. The naming convention is:
 *   {Category}_{LangCode}.csv
 *
 * For example:
 *   Dialogue_JP.csv  – Japanese source text (translatable)
 *   Dialogue_EN.csv  – English localization
 *   MAP_JP.csv       – Japanese map descriptions
 *   Other_JP.csv     – Miscellaneous Japanese text
 *
 * CSV structure:
 *   Row 0: header  (e.g. "Text","Face",  or  Text,Category  or  EN,Face)
 *   Row 1+: translatable text in the FIRST column; optional metadata in others
 *
 * The first-column header ("Text" or language code) is replaced with the
 * target language code when writing the translated output.
 *
 * @example
 * // Parse source CSV for project creation
 * const parser = new WolfTlCsv(csvString, { baseContext: ["Dialogue_JP.csv"] });
 * const transData = await parser.toTrans();
 *
 * @example
 * // Write translated CSV during export
 * const parser = new WolfTlCsv(csvString, {
 *   translationPair: { "Hello": "こんにちは" },
 *   baseContext: ["Dialogue_JP.csv"],
 *   targetLang: "EN"
 * });
 * await parser.parse();
 * const output = await parser.toString();
 */
class WolfTlCsv extends ParserBase {
    constructor(script, options) {
        super(script, options);
        /** @type {string[]|null} parsed header row */
        this.header = null;
        /** @type {string[][]|null} parsed data rows (first column may be replaced with translation) */
        this.rows = null;
        /** language code written to the first-column header in the output CSV */
        this.targetLang = options.targetLang || "TRANS";
    }
}

/**
 * Parse the CSV source and register all first-column strings for translation.
 */
WolfTlCsv.prototype.parse = async function() {
    if (this.isParsed) return this;

    const csv = require("jquery-csv");

    let rawCsv = this.script;
    if (!rawCsv || !rawCsv.trim()) {
        this.isParsed = true;
        return this;
    }

    // Strip UTF-8 BOM if present (iconv usually removes it, but just in case)
    if (rawCsv.charCodeAt(0) === 0xFEFF) rawCsv = rawCsv.slice(1);

    let allRows;
    try {
        allRows = csv.toArrays(rawCsv);
    } catch (e) {
        console.error("WolfTlCsv: Failed to parse CSV", e);
        this.isParsed = true;
        return this;
    }

    if (!allRows || allRows.length === 0) {
        this.isParsed = true;
        return this;
    }

    this.header = allRows[0];
    this.rows = allRows.slice(1).map(r => [...r]); // shallow clone each row

    for (let i = 0; i < this.rows.length; i++) {
        const row = this.rows[i];
        if (!row || row.length === 0) continue;

        const text = row[0];
        if (text === null || text === undefined || String(text).trim() === "") continue;

        // Build parameters from extra columns
        const parameters = {};
        if (row.length > 1) {
            // Find first non-empty, non-numeric extra column – use as rowInfoText (e.g. "Choice", "Picture")
            const firstMeta = row.slice(1).find(c => c !== "" && c !== null && c !== undefined && isNaN(c));
            if (firstMeta) {
                parameters.rowInfoText = firstMeta;
            }
        }

        // registerString applies the translation if a translationPair is set
        this.rows[i][0] = this.registerString(String(text), ["row", i], parameters);
    }

    this.isParsed = true;
    return this;
};

/**
 * Encode a single cell value for CSV output (RFC 4180).
 * @param {*} cell
 * @returns {string}
 */
WolfTlCsv.prototype._encodeCell = function(cell) {
    if (cell === null || cell === undefined) return "";
    const str = String(cell);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
};

/**
 * Render the translated CSV as a string.
 * The first-column header is replaced with {@link WolfTlCsv#targetLang}.
 * @returns {Promise<string>}
 */
WolfTlCsv.prototype.toString = async function() {
    if (!this.isParsed) await this.parse();

    if (!this.header || !this.rows) return this.script || "";

    const lines = [];

    // Header: preserve original header as-is
    lines.push(this.header.map(c => this._encodeCell(c)).join(","));

    // Data rows
    for (const row of this.rows) {
        if (!row || row.length === 0) {
            lines.push("");
            continue;
        }
        lines.push(row.map(c => this._encodeCell(c)).join(","));
    }

    return lines.join("\r\n");
};

module.exports = WolfTlCsv;
