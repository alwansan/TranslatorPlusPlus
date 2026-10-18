const thisAddon = this;
const http = require('http');
const thisEngine = new TranslatorEngine({
    id:thisAddon.package.name,
    name:thisAddon.package.title,
    description :thisAddon.package.description,
    version:thisAddon.package.version,
    author:"Dreamsavior",
    delimiter:"\n\n",
    lineSubstitute : '¶', //¶	
    maxRequestLength: 2000,
    batchDelay: 1,
    mode:"lineByLine",
    batchTimeOut:60000,
    languages : {
        "af": "af",
        "sq": "sq",
        "am": "am",
        "ar": "ar",
        "hy": "hy",
        "az-latn": "az",
        "eu": "eu",
        "be": "be",
        "bn": "bn",
        "bs": "bs",
        "bg": "bg",
        "ca": "ca",
        "ceb": "ceb",
        "zh": "zh-CN",
        "zh-tw": "zh-TW",
        "co": "co",
        "hr": "hr",
        "cs": "cs",
        "da": "da",
        "nl": "nl",
        "en": "en",
        "eo": "eo",
        "et": "et",
        "fi": "fi",
        "fr": "fr",
        "fy": "fy",
        "gl": "gl",
        "ka": "ka",
        "de": "de",
        "el": "el",
        "gu": "gu",
        "ht": "ht",
        "ha": "ha",
        "haw": "haw",
        "he": "he",
        "hi": "hi",
        "hmn": "hmn",
        "hu": "hu",
        "is": "is",
        "ig": "ig",
        "id": "id",
        "ga": "ga",
        "it": "it",
        "ja": "ja",
        "jv": "jw",
        "kn": "kn",
        "kk": "kk",
        "km": "km",
        "ko": "ko",
        "ku": "ku",
        "ky": "ky",
        "lo": "lo",
        "la": "la",
        "lv": "lv",
        "lt": "lt",
        "lb": "lb",
        "mk": "mk",
        "mg": "mg",
        "ms": "ms",
        "ml": "ml",
        "mt": "mt",
        "mi": "mi",
        "mr": "mr",
        "mn-cyrl": "mn",
        "my": "my",
        "ne": "ne",
        "no": "no",
        "ny": "ny",
        "ps": "ps",
        "fa": "fa",
        "pl": "pl",
        "pt": "pt",
        "pa": "pa",
        "ro": "ro",
        "ru": "ru",
        "sm": "sm",
        "gd": "gd",
        "sr-latn": "sr",
        "st": "st",
        "sn": "sn",
        "sd": "sd",
        "si": "si",
        "sk": "sk",
        "sl": "sl",
        "so": "so",
        "es": "es",
        "su": "su",
        "sw": "sw",
        "sv": "sv",
        "tl": "tl",
        "tg-cyrl": "tg",
        "ta": "ta",
        "te": "te",
        "th": "th",
        "tr": "tr",
        "uk": "uk",
        "ur": "ur",
        "uz": "uz",
        "vi": "vi",
        "cy": "cy",
        "xh": "xh",
        "yi": "yi",
        "yo": "yo",
        "zu": "zu"
    },   
    optionsForm:{
        "schema": {
            "showInterceptWindow": {
                "type": "boolean",
                "title": "Interceptor window",
                "description": "Interceptor window is a browser window injected with Translator++ library that will access the translator's front-end.",
                "default":false
            },		
            "batchTimeOut": {
                "type": "number",
                "title": "Batch Timeout",
                "description": "Timeout for each batch in milisecond",
                "default":"60000",
                //"default":false
            },
            "maxRequestLength": {
                "type": "number",
                "title": "Max Request Length",
                "description": "The maximum length of characters for each translation batch.\nEach translator has a different specs.\nI recommend less than 2000 for WEB front-end translator that uses GET parameter.",
                "default":400,
                "attr": {
                    "max":2000,
                    "min":20
                }
            },
            "batchDelay": {
                "type": "integer",
                "title": "Batch delay",
                "description": "Delay between batch (in miliseconds)",
                "default":"5000",
                "required":false
            },
            "escapeAlgorithm": {
                "type": "string",
                "title": "Code Escaping Algorithm",
                "description": "Escaping algorithm for inline code inside dialogues",
                "default":"",
                "required":false,
                "enum": [
                    "",
                    "hexPlaceholderInsensitive",
                    "HTMLCloakingInsensitive",
                    "agressiveSplitting",
                    "none"
                ]
            }	
        },
        "form": [
            {
                "key": "showInterceptWindow",
                "inlinetitle": "Show interceptor window (default is hidden)",
                // "onChange": function (evt) {
                //     var value = $(evt.target).prop("checked");
                //     thisEngine.update('showInterceptWindow', value);
                // }
            },		
            {
                "key": "batchTimeOut",
                // "onChange": function (evt) {
                //     var value = $(evt.target).val();
                //     thisEngine.update('batchTimeOut', parseInt(value));
                // }
            },
            {
                "key": "batchDelay",
                // "onChange": function (evt) {
                //     var value = $(evt.target).val();
                //     var intValue = parseInt(value);
                //     if (isNaN(intValue)) {
                //         alert("Ilegal value "+value);
                //         intValue = 5000;
                //         $(evt.target).val(intValue)
                //     }
                //     if (intValue < 500) { 
                //         intValue =500;
                //         $(evt.target).val(intValue)
                //     }
                    
                //     thisEngine.update("batchDelay", intValue);
                    
                // }
            },
            {
                "key": "maxRequestLength",
                // "onChange": function (evt) {
                //     var value = $(evt.target).val();
                //     thisEngine.update('maxRequestLength', parseInt(value));
                // }
            },		
            {
                "key": "escapeAlgorithm",
                "titleMap": {
                    "": "Default",
                    "hexPlaceholderInsensitive": "Case Insensitive Hex Placeholder",
                    "HTMLCloakingInsensitive": "Case Insenitive HTMLCloaking (recommended)",
                    "none": "None (no escaping)"
                },
                // "onChange": function (evt) {
                //     var value = $(evt.target).val();
                //     thisEngine.update("escapeAlgorithm", value);
                // }
            }		
        ],
        onChange: function(elm, key, value) {
            console.log("%cChanged through outside onchange", "color: yellow", elm, key, value);
            console.log("%cthis", "color: yellow", this);
            thisEngine.update(key, value);
        },
    },

});

thisAddon.runWebService = async function(port=19898, timeout=120000) {
    let lastReceivedData = null;
    
    const server = http.createServer((req, res) => {
        if (req.method === 'POST' && req.url === '/') {
            let data = '';
            
            req.on('data', (chunk) => {
                data += chunk;
            });
            
            req.on('end', () => {
                lastReceivedData = JSON.parse(data);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Message received. Closing server.');
                // Close the server after receiving a message
                server.close();
            });
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    });
    
    server.listen(port, () => {
        console.log(`Web service is running on port ${port}`);
    });
    
    // Close the server after the specified timeout
    const timeoutId = setTimeout(() => {
        console.log(`Server timeout (${timeout}ms). Closing server.`);
        server.close();
    }, timeout);
    
    // Ensure the timeout is cleared if a message is received
    server.on('close', () => {
        clearTimeout(timeoutId);
    });
    
    return new Promise((resolve) => {
        server.on('close', () => {
            // Return the last received data if any, otherwise return false
            resolve(lastReceivedData !== null ? lastReceivedData : false);
        });
    });
}




thisEngine.getToken = async function(options) {
    options ||= {};
    options.inject_js_end = "/www/addons/transGoogleFreeV2/googleFreeV2.intercept.js";
    options.id = "googleFreeV2";
    options.show_in_taskbar = true;
    options.show = true;	
    options.show_in_taskbar = false;
    options.show = false;	
    // if (thisEngine.getOptions("showInterceptWindow")) {
    //     options.show_in_taskbar = true;
    //     options.show = true;	
    // }
    
    const port = common.rand(19000, 20000);
    const url = `https://translate.google.com/?sl=en&tl=ja&text=hello%20world&op=translate&port=${port}`;
    
    var resolver;
    var promise = new Promise((resolve, reject) => {
        resolver = resolve;
    })
    
    this.batchTimeOut = this.getOptions("batchTimeOut") || 60000;
    const thisTimeout = window.setTimeout(()=>{
        console.warn("Timeout")
        resolver(false);
    }, this.batchTimeOut) // 60 seconds time out
    
    
    nw.Window.open(url, options, async (new_win) => {
        // can't do anything here since google blocked access to the window object
        const data = await thisAddon.runWebService(port);
        clearTimeout(thisTimeout);
        console.log("Received data", data);
        if (!data?.data?.at) {
            console.error("Cannot get at data");
        }
        resolver({
            at:data?.data?.at,
            url:data?.url
        });
    });	
    
    return promise;
}

thisEngine.makePayload = function(text, sl, tl){
    return JSON.stringify(
        [[
            [
                "MkEWBc",
                JSON.stringify([[text||"",sl,tl,1],[]])
            ]
        ]]
        )
}
    
thisEngine.objectToUrlEncoded = function(obj) {
    return Object.entries(obj)
    .filter(([key, value]) => key !== '' && value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

thisEngine.parseGoogleResponse = function(response = "") {
    var lines = response.split("\n");
    if (lines[0]!==")]}'") throw new Error("Response header not match, expecting )]}', received:", lines[0]);
    const gdata = JSON.parse(lines[3]);
    try {
        var innerContent= JSON.parse(gdata[0][2]);
        if (!innerContent?.[1]?.[0]?.[0]?.[5]?.length) {
            throw new Error("Cannot found translation string");
        }
        const translationStrings = []
        for (let translationData of innerContent[1][0][0][5]) {
            translationStrings.push(translationData[0])
        }
        return translationStrings.join("")
    } catch (e) {
        throw new Error(e)
    }
}

thisEngine.makeTranslateRequest = async function(text, sl="auto", tl="auto") {
    const payload = this.makePayload(text, sl, tl);
    var tokenInfo = this.getOptions("tokenInfo");
    if (!tokenInfo?.at) {
        tokenInfo = await this.getToken();
        this.setOption("tokenInfo", tokenInfo);
    }
    const urlInfo = new URL(tokenInfo.url);
    var oldReqId = parseInt(urlInfo.searchParams.get("_reqid"));
    var newReqId = oldReqId+100;
    urlInfo.searchParams.set("_reqid", newReqId);
    const targetUrl = urlInfo.toString();
    
    const postData = this.objectToUrlEncoded({
        "f.req":payload,
        "at":tokenInfo.at
    });
    console.log("Raw postdata is", postData);

    // postData should be something like: f.req=%5B%5B%5B%22MkEWBc%22%2C%22%5B%5B%5C%22hello%20world%5C%22%2C%5C%22en%5C%22%2C%5C%22id%5C%22%2C1%5D%2C%5B%5D%5D%22%5D%5D%5D&at=AFS6QyjC-JBTQvuiyRLIEqn9wIVQ%3A1702649346622
    
    const headers = new Headers();
    headers.append('Accept', '*/*');
    headers.append('Accept-Encoding', 'gzip, deflate, br');
    headers.append('Accept-Language', 'en-US,en;q=0.9');
    headers.append('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
    headers.append('Content-Length', postData.length.toString());
    headers.append('Origin', 'https://translate.google.com');
    headers.append('Referer', 'https://translate.google.com/');
    
    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: headers,
            body: postData,
        });
        
        const data = await response.text();
        console.log('Response:', data);
        const translatedText = this.parseGoogleResponse(data);
        console.log("Parsed response:", translatedText);
        this.retryToken = false;
        return translatedText;
    } catch (error) {
        console.error('Error:', error);
        console.log("Failed to fetch translation, trying to refresh the token key");
        this.setOption("tokenInfo", {});
        this.retryToken = true;
        if (!this.retryToken) {
            return await this.makeTranslateRequest(text, sl, tl);
        }
    }
}

thisEngine.fetchTranslation = async function(filteredTexts=[], sl, tl, codeEscape) {
	console.log("Filtered texts", filteredTexts, arguments);
    if (!filteredTexts?.length) return []
    var text = filteredTexts
    if (Array.isArray(text)) {
        text = filteredTexts.join("\n")
    }
    return (await this.makeTranslateRequest(text, sl, tl)).split("\n");
}


$(document).ready(function() {
    thisEngine.init();
});