// const { on } = require("ws");

const win = nw.Window.get();
// var chatGPTAddon = window.opener.addonLoader.addons.transChatGPT
const engineName = localStorage.getItem("chatGPTTester/engineName") || "ChatGPT";
const translatorEngine = window.opener.trans.getTranslatorEngine(engineName);
// var trans = window.opener.trans;

class ChatTester extends require("www/js/BasicEventHandler.js") {
	constructor() {
		super()

	}
}
ChatTester.prototype.setStatusBar = function(content, pos=0) {
    var $statusBar = $("#footer .footer-content").eq(pos).find("span");
    $statusBar.html(content)
}

ChatTester.prototype.getActiveUserTab = function() {
    return $("#nav-tab-user button.active").data("bs-target");
}

ChatTester.prototype.getActiveResponseTab = function() {
    return $("#nav-tab-response button.active").data("bs-target");
}

ChatTester.prototype.runTranslate = async function(msg) {
    msg ||= this.textToTranslate.getValue();
    if (!msg) return;

    console.log("Translating:", msg);
    loadingScreen.show();
    const result = await translatorEngine.translate(msg, {
        onBeforeFetch: (req) => {
            console.log("Request:", req);
            this.httptransaction.setValue(this.httptransaction.getValue() + "Request Body: "+ JSON.stringify(req, null, 2) + "\n");
        },
        onAfterFetch: (res) => {
            console.log("Response:", res);
            this.httptransaction.setValue(this.httptransaction.getValue() + "Response: "+ JSON.stringify(res, null, 2)+ "\n");
        },
        onRequestError: (err) => {
            this.httptransaction.setValue(this.httptransaction.getValue() + "Error: "+ JSON.stringify(err, null, 2)+ "\n");
        },
        getRawResponse: (res) => {
            this.conversation.setValue(res);
        }
    });
    console.log("Translation result:", result);
    this.translation.setValue(result?.translationText || "No result");
    loadingScreen.hide();
    
}

ChatTester.prototype.runRawChat = async function(msg) {
    msg ||= this.userMessage.getValue();
    if (!msg) return;

    console.log("Sending:", msg);
    const chatMLData = [{"role": "user", "content": msg}];

    loadingScreen.show();
    const result = await translatorEngine.fetch(chatMLData, {
        onBeforeFetch: (req) => {
            console.log("Request:", req);
            this.httptransaction.setValue(this.httptransaction.getValue() + "Request Body: "+ JSON.stringify(req, null, 2) + "\n");
        },
        onAfterFetch: (res) => {
            console.log("Response:", res);
            this.httptransaction.setValue(this.httptransaction.getValue() + "Response: "+ JSON.stringify(res, null, 2)+ "\n");
        },
        onRequestError: (err) => {
            this.httptransaction.setValue(this.httptransaction.getValue() + "Error: "+ JSON.stringify(err, null, 2)+ "\n");
        },
        getRawResponse: (res) => {
            this.conversation.setValue(res);
        }
    });
    $("#nav-rawconversation-tab").click();
    // console.log("Translation result:", result);
    if (result?.choices[0]?.message?.content) this.conversation.setValue(result?.choices[0]?.message?.content);
    loadingScreen.hide();
    
}


ChatTester.prototype.execute = async function() {
    if (this.getActiveUserTab() == "#nav-translate") {
        this.runTranslate();
        return;
    } else {
        this.runRawChat();
        return;
    }
    // loadingScreen.show();
    // var value = this.userMessage.getValue();
    // console.log("Sending:", value);
    // const start = Date.now();
    // var result = await translatorEngine.fetch([
    //     {"role": "system", "content": "You are a JavaScript translator assistant that translates Japanese to English."},
    //     {"role": "user", "content": value}
    // ] );
    // const end = Date.now();
    // this.setStatusBar(`Execution time: ${end - start} ms`, 1)
    // console.log("Response:",result);
    // loadingScreen.hide();
    // if (!result) return alert("Chat GPT returned no result");
    // if (!result.choices[0]) return alert("Chat GPT returned no response");
    // this.conversation.setValue(result.choices[0]?.message?.content);
}


ChatTester.prototype.toggleWordWrap = function() {
    var $thisBtn = $(".button-wordwrap");
    if ($thisBtn.hasClass("checked") == false) {
        $thisBtn.addClass("checked");
        this.conversation.getSession().setUseWrapMode(false);
        this.userMessage.getSession().setUseWrapMode(false);
        this.httptransaction.getSession().setUseWrapMode(false);
        this.translation.getSession().setUseWrapMode(false);
    } else {
        $thisBtn.removeClass("checked");
        this.conversation.getSession().setUseWrapMode(true);
        this.userMessage.getSession().setUseWrapMode(true);
        this.httptransaction.getSession().setUseWrapMode(true);
        this.translation.getSession().setUseWrapMode(true);
    }
}


ChatTester.prototype.initialize = async function() {
    console.log("Initializing Chat Tester");

    const initAceByElmId = (elmId) => {
        var editor = ace.edit(document.querySelector(elmId));//eslint-disable-line
        editor.setTheme("ace/theme/monokai");
        editor.setShowPrintMargin(false);
        editor.on("change", ()=>{
            this.isChanged = true;
        })
        editor.setOptions({
            fontSize: "12pt",
            enableBasicAutocompletion: true,
            enableSnippets: true,
            enableLiveAutocompletion: true,
        });
        return editor;
    }
    
	// initializing editor
    this.conversation = initAceByElmId("#conversation");
    this.conversation.setReadOnly(true);
    this.translation = initAceByElmId("#translation");
    this.translation.setReadOnly(true);
    this.httptransaction = initAceByElmId("#httptransaction");
    this.httptransaction.setReadOnly(true);

    
    this.userMessage = initAceByElmId("#userMessage");
    this.textToTranslate = initAceByElmId("#textToTranslate");
    

    $("#footer .footer1 > span").html("Engine: " + engineName);
}

var loadingScreen;
var chatTester;

$(document).ready(function() {
    loadingScreen    = new LoadingScreen(); //eslint-disable-line
    chatTester       = new ChatTester();
	chatTester.initialize();

	$(".button-execute").on("click", function() {
		chatTester.execute();
	});

    $(".button-wordwrap").on("click", function() {
        chatTester.toggleWordWrap();
    })
    $(".button-debugger").on("click", function() {
        if (nw.process.versions['nw-flavor'] !== 'sdk') return alert(t("This feature only available if you are using Developer version of Translator++. You can switch into Developer version by using Basic Utilities -> Change Core NWJS."));

        win.showDevTools();
    });
    win.on('close', async function() {
        this.hide();
        if (nw.process.versions["nw-flavor"] == "sdk") {
            win.closeDevTools();
            await common.wait(200);
        }
        this.close(true);
    })

});