void async function() {
    const RMTransText = require("www/addons/rmrgss/RMTransParser.module.js")
      
    // Example usage:
    const inputText = await common.fileGetContents("www\\addons\\rmrgss\\tests\\Map001.txt");
    const parsedObj = RMTransText.parseRPGMakerTrans(inputText);
    console.log(parsedObj);
    const transObj = RMTransText.parsedObjToTrans(parsedObj);
    console.log(transObj);

    const translationPair = {
        "EV001": "translated EV001",
        "Map003/events/1/name/\nEV001":"context translation"
    }
    const translatedObj = RMTransText.translateParsedObj(parsedObj, translationPair);
    console.log(translatedObj);
    const buildObj = RMTransText.buildRPGMakerTrans(translatedObj);
    console.log(buildObj);

}()

void async function() {
    console.log("running test for escape.txt");
    const RMTransText = require("www/addons/rmrgss/RMTransParser.module.js")
      
    // Example usage:
    const inputText = await common.fileGetContents("www\\addons\\rmrgss\\tests\\escape.txt");
    const parsedObj = RMTransText.parseRPGMakerTrans(inputText);
    console.log("ParsedObj", parsedObj);
    const transObj = RMTransText.parsedObjToTrans(parsedObj);
    console.log("TransObj", transObj);

    const translationPair = 
        {
            "\\n<Something>\\{\\{\\c[6]Someword\\c[0]\\}\\}": "\\n<Translated>\\{\\{\\c[6]Translated Someword\\c[0]\\}\\}"
        };

    const translatedObj = RMTransText.translateParsedObj(parsedObj, translationPair);
    console.log("TranslatedObj", translatedObj);
    const buildObj = RMTransText.buildRPGMakerTrans(translatedObj);
    console.log("BuildObj", buildObj);

}()


// with RGSS script
void async function() {
    const RMTransText = require("www/addons/rmrgss/RMTransParser.module.js")
      
    // Example usage:
    const inputText = await common.fileGetContents("www\\addons\\rmrgss\\tests\\Map001.txt");
    const parsedObj = RMTransText.parseRPGMakerTrans(inputText);
    console.log("%cparsedObj", "color:green", parsedObj);
    const transObj = RMTransText.parsedObjToTransRMRGSS(parsedObj);
    console.log("%ctrans object", "color:yellow", transObj);

    const translationPair = {
        "EV001": "translated EV001",
        "Map003/events/1/name/\nEV001":"context translation",
        "\"main_otoko_skill_con0\"": `"TRANSLATED: main_otoko_skill_con0"`
    }
    const translatedObj = RMTransText.translateParsedObjRMRGSS(parsedObj, translationPair);
    console.log("%ctranslated parsedObj", "color:aqua", translatedObj);
    const buildObj = RMTransText.buildRPGMakerTrans(translatedObj);
    console.log(buildObj);

}()