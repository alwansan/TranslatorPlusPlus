const thisAddon = this;
/**
{
    "state": {
        "chats": [
            {
                "id": "dd5f465a-47ab-4286-b50e-e93a2d430c60",
                "title": "New Chat 1",
                "messages": [
                    {
                        "role": "system",
                        "content": [
                            {
                                "type": "text",
                                "text": "You are ChatGPT, a large language model trained by OpenAI.\nCarefully heed the user's instructions. \nRespond using Markdown."
                            }
                        ]
                    }
                ],
                "config": {
                    "model": "gpt-3.5-turbo",
                    "max_tokens": 4000,
                    "temperature": 1,
                    "presence_penalty": 0,
                    "top_p": 1,
                    "frequency_penalty": 0
                },
                "titleSet": false,
                "imageDetail": "auto"
            },
            {
                "id": "6a9a4cd3-7119-439b-bfff-fd65c787a778",
                "title": "New Chat",
                "messages": [
                    {
                        "role": "system",
                        "content": [
                            {
                                "type": "text",
                                "text": "You are ChatGPT, a large language model trained by OpenAI.\nCarefully heed the user's instructions. \nRespond using Markdown."
                            }
                        ]
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Hello, what are you and how can you help me?"
                            }
                        ]
                    },
                    {
                        "role": "assistant",
                        "content": [
                            {
                                "type": "text",
                                "text": "Hello! I am ChatGPT, an AI language model designed to assist you with a variety of tasks. I can help you by providing information, answering questions, generating text, giving suggestions, or engaging in conversation on a wide range of topics. Feel free to ask me anything you'd like help with!"
                            }
                        ]
                    }
                ],
                "config": {
                    "model": "gpt-3.5-turbo",
                    "max_tokens": 4000,
                    "temperature": 1,
                    "presence_penalty": 0,
                    "top_p": 1,
                    "frequency_penalty": 0
                },
                "titleSet": false,
                "imageDetail": "auto"
            }
        ],
        "currentChatIndex": 1,
        "apiKey": "sk-None-iCGKOWfG095QgDjYoTorT3BlbkFJkaX4Rt5LVVTEj3n79G4M",
        "apiVersion": "2024-04-01-preview",
        "apiEndpoint": "https://api.openai.com/v1/chat/completions",
        "theme": "dark",
        "autoTitle": false,
        "advancedMode": true,
        "prompts": [
            {
                "id": "0d3e9cb7-b585-43fa-acc3-840c189f6b93",
                "name": "English Translator",
                "prompt": "I want you to act as an English translator, spelling corrector and improver. I will speak to you in any language and you will detect the language, translate it and answer in the corrected and improved version of my text, in English. I want you to replace my simplified A0-level words and sentences with more beautiful and elegant, upper level English words and sentences. Keep the meaning same, but make them more literary. I want you to only reply the correction, the improvements and nothing else, do not write explanations. Do you understand?"
            }
        ],
        "defaultChatConfig": {
            "model": "gpt-3.5-turbo",
            "max_tokens": 4000,
            "temperature": 1,
            "presence_penalty": 0,
            "top_p": 1,
            "frequency_penalty": 0
        },
        "defaultSystemMessage": "You are ChatGPT, a large language model trained by OpenAI.\nCarefully heed the user's instructions. \nRespond using Markdown.",
        "hideMenuOptions": false,
        "firstVisit": false,
        "hideSideMenu": false,
        "folders": {},
        "enterToSubmit": true,
        "inlineLatex": false,
        "markdownMode": true,
        "totalTokenUsed": {},
        "countTotalTokens": false,
        "displayChatSize": false,
        "menuWidth": 260,
        "defaultImageDetail": "auto",
        "customModels": []
    },
    "version": 9
}
 */
thisAddon.openChatGPTChat = async function() {
    const translatorConfig = TranslatorEngine.getEngine("chatGPT");
    // const currentConfig = JSON.parse(localStorage.getItem("free-chat-gpt") || "{}");
    // if (currentConfig.state) {
    //     console.log("currentConfig.state", currentConfig.state);
    //     currentConfig.state.apiEndpoint = translatorConfig.getOptions("baseUrl") || currentConfig.state.apiEndpoint;
    //     currentConfig.state.apiKey = translatorConfig.getOptions("apiKey") || currentConfig.state.apiKey;

    //     currentConfig.defaultChatConfig ||= {};
    //     currentConfig.defaultChatConfig.model = translatorConfig.getOptions("model") || currentConfig.defaultChatConfig.model;
    //     currentConfig.defaultChatConfig.temperature = translatorConfig.getOptions("temperature") || currentConfig.defaultChatConfig.temperature;
    //     currentConfig.defaultChatConfig.max_tokens = translatorConfig.getOptions("maxTokens") || currentConfig.defaultChatConfig.max_tokens;
    //     currentConfig.defaultChatConfig.top_p = translatorConfig.getOptions("top_p") || currentConfig.defaultChatConfig.top_p;
    //     currentConfig.defaultChatConfig.frequency_penalty = translatorConfig.getOptions("frequencyPenalty") || currentConfig.defaultChatConfig.frequency_penalty;
    //     currentConfig.defaultChatConfig.presence_penalty = translatorConfig.getOptions("presencePenalty") || currentConfig.defaultChatConfig.presence_penalty;

    //     if (currentConfig.chats?.[0]) {
    //         currentConfig.chat[0].config = currentConfig.defaultChatConfig;
    //     }
    //     console.log("currentConfig.defaultChatConfig", JSON.stringify(currentConfig));
    //     // save the current state to local storage
    //     localStorage.setItem("free-chat-gpt", JSON.stringify(currentConfig));
    // }
    nw.Window.open("www/addons/basicUtils/assistant/chat.html", {
            id: "chatgpt-window",
            width: 520,
            height: 640,
            position: "mouse",
        }, (newWin) => {
            console.log("ChatGPT window opened", newWin);
            newWin.on("loaded", () => {
                //newWin.setAlwaysOnTop(true);
                newWin.focus();
                if (!newWin.window?.chatAssistant) return;
                let chatAssistant = newWin.window.chatAssistant;
                chatAssistant.on("initialized", () => {
                    console.log("Chat Assistant initialized");
                    if (!chatAssistant.settings) return console.error("Chat Assistant settings not found");
                    chatAssistant.settings.apiKey = translatorConfig.getOptions("apiKey");
                    chatAssistant.settings.apiUrl = translatorConfig.getOptions("baseUrl");
                    chatAssistant.settings.model = translatorConfig.getOptions("model");
                    chatAssistant.populateSettingsModal();
                    chatAssistant.updateParametersBar();
                    // chatAssistant.setConfig("settings.apiKey", translatorConfig.getOptions("apiKey"));
                    // chatAssistant.setConfig("settings.apiUrl", translatorConfig.getOptions("baseUrl"));
                });
            });
        }
    );
}

const initialize = async () => {
    const appIcon =  "/"+thisAddon.getRelativePath()+"/chatgpt-icon.png"

    console.log("Initializing ChatGPT ribbon menu")
    // ui.ribbonMenu.add("OpenAI", {
    //     title : `ChatGPT`,
    //     icon: 'icon-chatgpt',
    //     permanent: true,
    //     toolbar : {
    //         buttons : {
    //             batchManager : {
    //                 icon : "icon-layers-alt",
    //                 title : t("Batch Manager"),
    //                 onClick : async () => {
    //                     if (!trans?.project?.projectId) return alert(t("This feature is only available if you have a project open."));
    //                     thisAddon.batchApi.openBatchManager();
    //                 }
    //             },
                
                
    //         }
    //     }
    // });
    ui.Toolbar.getById("translator").addButtonGroup("chatgpt");
    ui.Toolbar.getById("translator").addButton({
        id:"chatGptApi",
        group:"chatgpt",
        title : t("Chat with ChatGPT API"),
        onClick : async () => {
            thisAddon.openChatGPTChat();
        },
        icon : "icon-chatgpt"
    });

    return;
    ui.Toolbar.getById("translator").addButtonGroup("chatgpt");
    ui.Toolbar.getById("translator").addButton({
        id:"batchManager",
        group:"chatgpt",
        title : t("Batch Manager"),
        onClick : async () => {
            if (!trans?.project?.projectId) return alert(t("This feature is only available if you have a project open."));
            thisAddon.batchApi.openBatchManager();
        },
        icon : "icon-layers-alt"
    });


}

(async ()=> {
    await addonLoader.resolveState("uiReady");
    initialize();
})();