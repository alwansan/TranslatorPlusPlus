const fs = require("graceful-fs");
const iconv = require("iconv-lite");
const path = require("path");

const GAME_DAT_HEADERS = [
    Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x00, 0x46, 0x4D, 0x00]),
    Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x00, 0x46, 0x4D, 0x55]),
];
const CREATOR_CREDIT_RE = /^制作[：:]/;

const normalizeWolfVersion = (version) => {
    if (Array.isArray(version)) return version.join(".");
    if (typeof version === "number") return String(version);
    return String(version || "").trim();
};

const compareVersion = (left, right) => {
    const leftParts = String(left).split(".").map((part) => parseInt(part || "0", 10));
    const rightParts = String(right).split(".").map((part) => parseInt(part || "0", 10));
    const maxLength = Math.max(leftParts.length, rightParts.length);

    for (let i = 0; i < maxLength; i++) {
        const leftValue = leftParts[i] || 0;
        const rightValue = rightParts[i] || 0;
        if (leftValue < rightValue) return -1;
        if (leftValue > rightValue) return 1;
    }

    return 0;
};

const selectGameDatEncoding = (version) => {
    const normalized = normalizeWolfVersion(version);
    if (!normalized) return "Windows-31j";
    return compareVersion("3.000", normalized) <= 0 ? "utf8" : "Windows-31j";
};

const decodeGameDatString = (buffer, encoding) => {
    if (!buffer?.length) return "";
    if (encoding === "utf8") return buffer.toString("utf8");
    return iconv.decode(buffer, encoding);
};

const sanitizeGameTitle = (value) => String(value || "").replace(/[\u0000-\u001f]+/g, "").trim();

const readUInt32LESafe = (buffer, offset) => {
    if (offset + 4 > buffer.length) return null;
    return buffer.readUInt32LE(offset);
};

const readGameDatLengthPrefixedString = (buffer, offset, encoding) => {
    const dataLength = readUInt32LESafe(buffer, offset);
    if (dataLength === null || dataLength < 1) return null;

    const endOffset = offset + 4 + dataLength;
    if (endOffset > buffer.length) return null;

    const stringBuffer = buffer.slice(offset + 4, endOffset - 1);
    return {
        value: decodeGameDatString(stringBuffer, encoding),
        nextOffset: endOffset,
    };
};

const parseGameDatStrings = (buffer, encoding) => {
    const header = GAME_DAT_HEADERS.find((candidate) => buffer.subarray(0, candidate.length).equals(candidate));
    if (!header) return null;

    let offset = header.length;
    const byteDataLength = readUInt32LESafe(buffer, offset);
    if (byteDataLength === null) return null;
    offset += 4;

    if (offset + byteDataLength > buffer.length) return null;
    offset += byteDataLength;

    const stringDataLength = readUInt32LESafe(buffer, offset);
    if (stringDataLength === null) return null;
    offset += 4;

    const stringData = [];
    for (let i = 0; i < stringDataLength; i++) {
        const parsed = readGameDatLengthPrefixedString(buffer, offset, encoding);
        if (!parsed) return null;
        stringData.push(parsed.value);
        offset = parsed.nextOffset;
    }

    return stringData;
};

const pickGameTitle = (stringData, fallbackTitle = "") => {
    const title = sanitizeGameTitle(stringData?.[0]);
    const version = sanitizeGameTitle(stringData?.[8]);

    if (title && !CREATOR_CREDIT_RE.test(title)) return title;
    if (version && !/^ver(?:sion)?\b/i.test(version)) {
        return version.replace(/^[【\[]+|[】\]]+$/g, "");
    }

    return sanitizeGameTitle(fallbackTitle);
};

const isFile = async (filePath) => {
    try {
        const stats = await fs.promises.stat(filePath);
        return stats.isFile();
    } catch (error) {
        return false;
    }
};

const tryReadDumpGameTitle = async (dumpDir, fallbackTitle) => {
    if (!dumpDir) return "";

    const candidatePaths = [
        path.join(dumpDir, "Game.json"),
        path.join(dumpDir, "game.json"),
    ];
    const gameInfoPath = (await Promise.all(candidatePaths.map(async (candidate) => {
        return await isFile(candidate) ? candidate : "";
    }))).find(Boolean);
    if (!gameInfoPath) return "";

    try {
        const gameInfo = JSON.parse(await fs.promises.readFile(gameInfoPath, "utf8"));
        return sanitizeGameTitle(gameInfo?.Title || gameInfo?.title || gameInfo?.gameTitle || fallbackTitle);
    } catch (error) {
        console.warn("Failed to read WolfTL game.json title", gameInfoPath, error);
        return "";
    }
};

const extractWolfGameTitle = async (baseDir, info = {}) => {
    const gameDat = path.join(baseDir, "Data", "BasicData", "Game.dat");
    const fallbackTitle = path.basename(baseDir);

    const dumpTitle = await tryReadDumpGameTitle(info.dumpDir || baseDir, fallbackTitle);
    if (dumpTitle) return dumpTitle;

    if (!await isFile(gameDat)) return fallbackTitle;

    try {
        const buffer = await fs.promises.readFile(gameDat);
        const encoding = selectGameDatEncoding(info.engineVersion || info.wolfVersion || info.version);
        const stringData = parseGameDatStrings(buffer, encoding);
        if (!stringData) return fallbackTitle;
        return pickGameTitle(stringData, fallbackTitle);
    } catch (error) {
        console.warn("Failed to extract Wolf game title from Game.dat", gameDat, error);
        return fallbackTitle;
    }
};

module.exports = {
    extractWolfGameTitle,
};