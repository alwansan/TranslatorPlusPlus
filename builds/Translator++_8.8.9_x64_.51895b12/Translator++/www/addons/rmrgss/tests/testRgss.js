void async function(){
// var copyOptions 				= common.clone(this.options);
// copyOptions.baseContext 	= context;
// copyOptions.baseParameter 	= {attachment:attachmentName}
// copyOptions.baseTags		= ["red"];
// copyOptions.translationInfo = this.translationInfo;
// copyOptions.translationPair = this.translationPair;
const script= await common.fileGetContents("test\\ruby\\test.rb");
const RGSSParser = require("www/addons/rmrgss/RGSSParser.module.js")
var copyOptions = {}
copyOptions.baseParameter = {
    fileName : "test.rb"
}
var scriptObj = new RGSSParser(script, copyOptions);
//scriptObj.debugLevel = 9;
await scriptObj.parse();
console.log("ScriptObj:", scriptObj);
}()