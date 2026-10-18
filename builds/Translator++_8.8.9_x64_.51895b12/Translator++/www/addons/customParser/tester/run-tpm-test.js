#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const Module = require("module");
const globToRegExp = require("glob-to-regexp");

const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
process.env.NODE_PATH = process.env.NODE_PATH
    ? `${repoRoot}${path.delimiter}${process.env.NODE_PATH}`
    : repoRoot;
Module._initPaths();

global.nwPath = path;

const noopEventTarget = () => ({
    on() {},
    off() {},
    one() {},
    trigger() {}
});

global.$ = function() {
    return noopEventTarget();
};

global.empty = function(value) {
    if (value === undefined || value === null) return true;
    if (typeof value === "string") return value.length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
};

global.common = {
    evalRegExpStr(pattern) {
        return new Function(`return (${pattern});`)();
    },
    clone(value) {
        if (value === undefined) return undefined;
        return JSON.parse(JSON.stringify(value));
    },
    isJSON(value) {
        if (typeof value !== "string") return false;
        try {
            JSON.parse(value);
            return true;
        } catch (error) {
            return false;
        }
    }
};

global.window = {
    ui: {
        log: async function(...args) {
            console.log(...args);
        },
        logError: async function(...args) {
            console.error(...args);
        }
    }
};

const CustomParser = require("www/addons/customParser/CustomParser.js");

async function withMutedConsole(enabled, callback) {
    if (!enabled) {
        return await callback();
    }

    const original = {
        log: console.log,
        warn: console.warn,
        error: console.error
    };

    console.log = function() {};
    console.warn = function() {};
    console.error = function() {};

    try {
        return await callback();
    } finally {
        console.log = original.log;
        console.warn = original.warn;
        console.error = original.error;
    }
}

function parseArgs(argv) {
    const result = {};

    for (let index = 0; index < argv.length; index++) {
        const current = argv[index];
        if (!current.startsWith("--")) continue;
        const key = current.slice(2);
        const next = argv[index + 1];
        if (!next || next.startsWith("--")) {
            result[key] = true;
            continue;
        }
        result[key] = next;
        index += 1;
    }

    return result;
}

function resolveExistingPath(...candidates) {
    for (const candidate of candidates) {
        if (candidate && fs.existsSync(candidate)) {
            return candidate;
        }
    }
}

function getDefaultPaths() {
    const defaultTpm = path.join(repoRoot, "www", "addons", "customParser", "dist", "vtt.tpm");
    const defaultInput = resolveExistingPath(
        "D:\\Test\\custom parser\\vtt\\LAD365 Product Sync.vtt",
        "D:\\Test\\custom parser\\vtt\\LAD365 Dev Scrum MTG (12).vtt"
    );

    return {
        tpm: defaultTpm,
        input: defaultInput
    };
}

function selectFileGroup(model, targetPath) {
    const normalizedPath = targetPath.replace(/\\/g, "/");

    for (const fileGroup of model.files || []) {
        const patterns = String(fileGroup.pattern || "")
            .split(";")
            .map((pattern) => pattern.trim())
            .filter(Boolean);

        for (const pattern of patterns) {
            if (globToRegExp(pattern).test(normalizedPath)) {
                return fileGroup;
            }
        }
    }
}

function buildSummary(parser, originalText) {
    const rows = parser.transData?.data || [];
    const contexts = parser.transData?.context || [];
    const parameters = parser.transData?.parameters || [];
    const reconstructed = parser.toString(true);
    const samples = [];

    for (let index = 0; index < rows.length && samples.length < 5; index++) {
        const source = rows[index]?.[0];
        if (!source) continue;
        samples.push({
            row: index,
            source,
            context: contexts[index] || [],
            parameters: parameters[index] || []
        });
    }

    return {
        totalRows: rows.length,
        totalParsedSegments: parser.parsedData?.length || 0,
        reconstructedMatchesSource: reconstructed === originalText,
        samples
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const quiet = !args.debug && !args.verbose;
    const defaults = getDefaultPaths();
    const tpmPath = path.resolve(args.tpm || defaults.tpm || "");
    const inputPath = path.resolve(args.input || defaults.input || "");

    if (!tpmPath || !fs.existsSync(tpmPath)) {
        throw new Error("TPM file not found. Use --tpm <path>.");
    }
    if (!inputPath || !fs.existsSync(inputPath)) {
        throw new Error("Input file not found. Use --input <path>.");
    }

    const modelText = fs.readFileSync(tpmPath, "utf8");
    const model = JSON.parse(modelText);
    if (!CustomParser.isValidModel(model)) {
        throw new Error("Invalid TPM model.");
    }

    const relativeForMatch = args.matchPath || path.basename(inputPath);
    const fileGroup = selectFileGroup(model, relativeForMatch);
    if (!fileGroup) {
        throw new Error(`No file group in ${tpmPath} matches ${relativeForMatch}.`);
    }

    const inputText = fs.readFileSync(inputPath, "utf8");
    const parser = new CustomParser(inputText, {
        model: fileGroup,
        modelStr: modelText,
        debugLevel: Number(args.debug || 0)
    });

    await withMutedConsole(quiet, async () => {
        await parser.parse();
    });
    const summary = await withMutedConsole(quiet, async () => buildSummary(parser, inputText));

    console.log("TPM:", tpmPath);
    console.log("Input:", inputPath);
    console.log("Matched pattern:", fileGroup.pattern);
    console.log("Rows extracted:", summary.totalRows);
    console.log("Parsed segments:", summary.totalParsedSegments);
    console.log("Round-trip matches source:", summary.reconstructedMatchesSource);
    console.log("Sample rows:");
    for (const sample of summary.samples) {
        console.log(`- row ${sample.row}`);
        console.log(`  text: ${JSON.stringify(sample.source)}`);
        console.log(`  context: ${JSON.stringify(sample.context)}`);
        console.log(`  parameters: ${JSON.stringify(sample.parameters)}`);
    }

    if (args.report) {
        const reportPath = path.resolve(args.report);
        fs.writeFileSync(reportPath, JSON.stringify({
            tpmPath,
            inputPath,
            matchedPattern: fileGroup.pattern,
            summary,
            transData: parser.transData
        }, null, 2));
        console.log("Report written:", reportPath);
    }

    if (!summary.totalRows) {
        process.exitCode = 2;
    } else if (!summary.reconstructedMatchesSource) {
        process.exitCode = 3;
    }
}

main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
});