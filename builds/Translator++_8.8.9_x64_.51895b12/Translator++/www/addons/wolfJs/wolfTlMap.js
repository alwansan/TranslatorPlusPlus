const {ParserBase} = require("www/js/ParserBase.js");
const common = require("www/js/common.js");
const {registerCommandListStrings} = require("www/addons/wolfJs/wolfEventCommands.js");
/**
 * @class WolfTlMap
 * @extends ParserBase
 * @sample
 * Sample json content to parse
 * ```json
 * {
    "events": [
        {
            "id": 0,
            "name": "",
            "pages": [
                {
                    "id": 0,
                    "list": [
                        {
                            "code": 101,
                            "codeStr": "Message",
                            "stringArgs": [
                                "プレイいただきありがとうございました。\n何を見ますか？"
                            ],
                            "index": 0
                        },
                        {
                            "code": 102,
                            "codeStr": "Choices",
                            "stringArgs": [
                                "お姉ちゃん",
                                "みー",
                                "やめる",
                                "タイトル画面へ"
                            ],
                            "intArgs": [
                                4
                            ],
                            "index": 2
                        },
                        {
                            "code": 401,
                            "codeStr": "ChoiceCase",
                            "intArgs": [
                                2
                            ],
                            "index": 3
                        },
                        {
                            "code": 101,
                            "codeStr": "Message",
                            "stringArgs": [
                                "高橋 舞\n20歳"
                            ],
                            "index": 4
                        },
                        {
                            "code": 101,
                            "codeStr": "Message",
                            "stringArgs": [
                                "小さい女の子が好き\n半年前 家出して道端でうずくまっていた\nみいなを見つけ 誘拐する"
                            ],
                            "index": 5
                        },
                        {
                            "code": 101,
                            "codeStr": "Message",
                            "stringArgs": [
                                "自分の事を「お姉ちゃん」と呼ばせ\n自身もみいなを妹の様にかわいがる"
                            ],
                            "index": 6
                        }
                    ]
                }
            ]
        }
    ]
}
* ```
*/

class WolfTlMap extends ParserBase {
    constructor(script, options) {
		super(script, options);
        //this.debugLevel = 9;
    }

}

WolfTlMap.prototype.parse = async function() {
    if (this.isParsed) return this;
    if (!this.script?.events?.length) {
        this.isParsed = true;
        return this;
    }

    // iterate through the events
    for (let eventIndex=0; eventIndex<this.script.events.length; eventIndex++) {
        let event = this.script.events[eventIndex];

        // iterate through the pages
        for (let pageIndex=0; pageIndex<event.pages.length; pageIndex++) {
            let page = event.pages[pageIndex];
            registerCommandListStrings(this, page.list, (command, listIndex, argIdx) => {
                return ["events", eventIndex, "pages", pageIndex, "list", listIndex, command.codeStr, "stringArgs", argIdx];
            });
        }
    }
    this.isParsed = true;
    
}

WolfTlMap.prototype.toString = async function() {
    if (!this.isParsed) await this.parse();
    return JSON.stringify(this.script, null, 4);
}

module.exports = WolfTlMap;