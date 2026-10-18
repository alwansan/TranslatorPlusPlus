const {ParserBase} = require("www/js/ParserBase.js");

// Values that look like file paths (e.g. "CharaChip/Hero.png", "BGM/town.mid\n100")
const FILE_PATH_RE = /^[A-Za-z0-9_\-. \/\\]+\.[A-Za-z0-9]{2,5}(\r?\n|$)/;

/**
 * @class WolfTlDb
 * @extends ParserBase
 *
 * Parses Wolf RPG database files (DataBase.json) dumped by WolfTL.
 *
 * Structure:
 *   root.types[ti]
 *     .description          ← translatable
 *     .data[di]
 *       .name               ← translatable (record name)
 *       .data[ki]
 *         .name             ← field label (used as context, NOT translated)
 *         .value            ← translatable if string && non-empty
 */
class WolfTlDb extends ParserBase {
    constructor(script, options) {
        super(script, options);
        console.log("%c WolfTlDb initialized", "color:orange");
    }
}

WolfTlDb.prototype.parse = async function() {
    if (this.isParsed) return this;

    const types = this.script?.types;
    if (!Array.isArray(types)) {
        this.isParsed = true;
        return this;
    }

    for (let ti = 0; ti < types.length; ti++) {
        const type = types[ti];
        if (!type || typeof type !== 'object') continue;
        const typeName = type.name || String(ti);

        // Register type description
        if (typeof type.description === 'string' && type.description.trim()) {
            type.description = this.registerString(type.description, ["types", ti, typeName, "description"]);
        }

        if (!Array.isArray(type.data)) continue;

        for (let di = 0; di < type.data.length; di++) {
            const record = type.data[di];
            if (!record || typeof record !== 'object') continue;
            const recordName = record.name || String(di);

            // Register record name
            if (typeof record.name === 'string' && record.name.trim()) {
                record.name = this.registerString(record.name, ["types", ti, typeName, "data", di, "name"]);
            }

            if (!Array.isArray(record.data)) continue;

            for (let ki = 0; ki < record.data.length; ki++) {
                const field = record.data[ki];
                if (!field || typeof field !== 'object') continue;
                const fieldName = field.name || String(ki);

                // Register field value if it's a non-empty string and not a file path
                if (typeof field.value === 'string' && field.value.trim() && !FILE_PATH_RE.test(field.value.trim())) {
                    field.value = this.registerString(field.value, ["types", ti, typeName, "data", di, recordName, ki, fieldName]);
                }
            }
        }
    }

    this.isParsed = true;
    return this;
};

WolfTlDb.prototype.toString = async function() {
    if (!this.isParsed) await this.parse();
    return JSON.stringify(this.script, null, 4);
};

module.exports = WolfTlDb;
