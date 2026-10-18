const FILE_PATH_RE = /^[A-Za-z0-9_\-. /\\]+\.[A-Za-z0-9]{2,5}(\r?\n|$)/;

function getTranslatableArgIndexes(command) {
    if (!Array.isArray(command?.stringArgs) || command.stringArgs.length === 0) return [];

    switch (command.code) {
        case 101:
            return [0];
        case 102:
            return command.stringArgs.map((_, index) => index);
        case 106:
            return [0];
        case 122:
            return [0];
        case 210:
            return [1];
        case 250:
            return [0];
        case 300:
            return [1, 2, 3];
        default:
            return [];
    }
}

function shouldTranslateCommandArg(command, argIdx, value) {
    if (typeof value !== "string") return false;

    const trimmed = value.trim();
    if (!trimmed) return false;

    if (command.code === 102 && trimmed.startsWith("\\")) return false;

    if (command.code === 250 && argIdx === 0) {
        if (trimmed === "x" || FILE_PATH_RE.test(trimmed)) return false;
    }

    return true;
}

function registerCommandListStrings(parser, commands, buildContext) {
    if (!Array.isArray(commands) || commands.length === 0) return;

    for (let commandIndex = 0; commandIndex < commands.length; commandIndex++) {
        const command = commands[commandIndex];
        const safeArgs = getTranslatableArgIndexes(command);
        if (safeArgs.length === 0) continue;

        for (const argIdx of safeArgs) {
            const value = command.stringArgs?.[argIdx];
            if (!shouldTranslateCommandArg(command, argIdx, value)) continue;
            command.stringArgs[argIdx] = parser.registerString(value, buildContext(command, commandIndex, argIdx));
        }
    }
}

module.exports = {
    registerCommandListStrings,
};
