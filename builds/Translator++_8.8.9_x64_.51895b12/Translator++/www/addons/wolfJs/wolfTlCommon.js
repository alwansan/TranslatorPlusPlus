const {ParserBase} = require("www/js/ParserBase.js");
const common = require("www/js/common.js");
const {registerCommandListStrings} = require("www/addons/wolfJs/wolfEventCommands.js");
/**
 * @class WolfTlCommon
 * @extends ParserBase
 * @sample
 * Sample json content to parse
 * ```json
 * {
    "id": 1,
    "name": "○武器増減",
    "description": "武器を増減させます。減らしたいときはマイナスの値を入れて下さい。",
    "commands": [
        {
            "code": 103,
            "codeStr": "Comment",
            "stringArgs": [
                "武器増加処理"
            ],
            "index": 0
        },
        {
            "code": 300,
            "codeStr": "CommonEventByName",
            "stringArgs": [
                "X[共]武器増減"
            ],
            "intArgs": [
                0,
                2,
                1600000,
                1600001
            ],
            "index": 1
        },
        {
            "code": 103,
            "codeStr": "Comment",
            "stringArgs": [
                "ここから下はメッセージ表示処理（セルフ2が1以上のときのみ）\r\r"
            ],
            "index": 2
        },
        {
            "code": 111,
            "codeStr": "VariableCondition",
            "intArgs": [
                1,
                1600002,
                1,
                1
            ],
            "index": 3
        },
        {
            "code": 401,
            "codeStr": "ChoiceCase",
            "intArgs": [
                1
            ],
            "index": 4
        }
    ]
}
* ```
*/

class WolfTlCommon extends ParserBase {
    constructor(script, options) {
		super(script, options);
    }
}

WolfTlCommon.prototype.parse = async function() {
    if (this.isParsed) return this;

    if (!this.script?.commands?.length) {
        this.isParsed = true;
        return this;
    }

    registerCommandListStrings(this, this.script.commands, (command, commandIndex, argIdx) => {
        return ["commands", commandIndex, command.codeStr, "stringArgs", argIdx];
    });

    this.isParsed = true;
}

WolfTlCommon.prototype.toString = async function() {
    if (!this.isParsed) await this.parse();
    return JSON.stringify(this.script, null, 4);
}

module.exports = WolfTlCommon;