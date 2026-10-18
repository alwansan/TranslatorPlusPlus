const thisAddon = this;

thisAddon.registerMainMenu = async function() {
    ui.mainMenu.addChild("tools", {
        id: "basicUtils",
        label: "Basic Utilities"
    });

    const $changeCore = ui.mainMenu.addChild("basicUtils", {
        label: "Change Core NWJS"
    });

    $changeCore.on("select", async function() {
        thisAddon.NWKit.showChangeCoreNWDialog();
    });

    ui.mainMenu.addChild("basicUtils", {
        label: "Clear Cache",
    }).on("select", async function() {
        conf = confirm("This operation will clear all cache and cookies. Do you want to continue?");
        if (!conf) return;
        nw.App.clearCache();
        alert("Cache cleared. You may need to restart the app.");
    });

    ui.mainMenu.addChild("basicUtils", {
        label: "Update AI Model Database",
    }).on("select", async function() {
        conf = confirm("This operation will update the AI model database. Do you want to continue?");
        if (!conf) return;
        const MM = require("www/addons/basicUtils/ai/ModelManager.js");
        const result = await MM.updateModelDatabase();
        if (result) {
            alert("AI model database updated.");
        } else {
            alert("Failed to update AI model database.");
        }

    });

    ui.mainMenu.addChild("basicUtils", {
        label: "Omni Search",
    }).on("select", async function() {
        nw.Window.open("www/addons/basicUtils/omniSearch/omniSearch.html")
    });    

}



thisAddon.registerToolbar = async function() {
    if (this.toolbarIsRegistered) return;
    ui.Toolbar.getById("translator").addButton({
        id:"changeLanguage",
        group:"toolbar1",
        title : t("Change Language"),
        className: "buttonExpand",
        onClick : async () => {
            const result = await ui.showLanguageSelector(trans.getSl(), trans.getTl(), {
                parentElement: ui.Toolbar.getById("translator").elm.find("[data-id=changeLanguage]"),
            });
            if (!result) return;
            console.log("Change language", result);
            trans.setSl(result.sl);
            trans.setTl(result.tl);
            ui.Toolbar.getById("translator").elm.find(".menu-sl").text((result.sl || "").toUpperCase());
            ui.Toolbar.getById("translator").elm.find(".menu-tl").text((result.tl || "").toUpperCase());
        },
        text : `<span class="icon icon-language-1" style="padding-top:3px; padding-right: 0px; font-size:1.2em"></span> <span class="menu-sl"  style="padding-left: 0px;"></span> - <span class="menu-tl"></span>`
    });

    const mtlUIMenu = function() {
        const mtlMenu = [];
        let supportedEngines = TranslatorEngine.getEnginesBySupportedLanguage(trans.getSl(), trans.getTl());
        if (!supportedEngines.length) {
            mtlMenu.push({
                label: t("No MTL available for this language pair"),
                enabled: false
            });
        } else {
            const activeTranslator = trans.getActiveTranslator();
            // sort supported engines by name
            supportedEngines.sort((a, b) => a.name.localeCompare(b.name));
            for (let i=0; i<supportedEngines.length; i++) {
                const thisEngine = supportedEngines[i];
                if (thisEngine.id === activeTranslator) continue;
                mtlMenu.push({
                    label: thisEngine.name,
                    click: function() {
                        ui.Toolbar.getById("translator").elm.find(".menu-default-mtl").text(thisEngine.name);
                        trans.setActiveTranslator(thisEngine);
                    }
                });
            }
        }

        return ui.createMenu(mtlMenu);
    }
    
    ui.Toolbar.getById("translator").addMenuButton(
        {
            id:"changeMTL",
            group:"toolbar1",
            title : t("Change default MTL for this project"),
            text : `<span class="icon icon-mtl" style="padding-top:3px; padding-right: 0px; font-size:1.2em"></span> <span class="menu-default-mtl" style="padding-left: 0px;"></span>`
        }, mtlUIMenu);
    
    // ui.Toolbar.getById("translator").addButton({
    //     id:"changeMTL",
    //     group:"toolbar1",
    //     title : t("Change default MTL for this project"),
    //     onClick : async () => {
    //         thisAddon.batchApi.openBatchManager();
    //     },
    //     text : `<span class="icon icon-mtl" style="padding-top:3px; padding-right: 0px; font-size:1.2em"></span> <span class="menu-default-mtl" style="padding-left: 0px;"></span>`
    // });

    ui.Toolbar.getById("translator").elm.on("beforeShow", async function() {
        const $this = $(this);
        const $sl = $this.find(".menu-sl");
        const $tl = $this.find(".menu-tl");
        $sl.text((trans.getSl() || "").toUpperCase());
        $tl.text((trans.getTl() || "").toUpperCase());

        const $defaultMtl = $this.find(".menu-default-mtl");
        const engine = trans.getActiveTranslatorEngine();
        const engineName = engine?.name || t("???");
        $defaultMtl.text(engineName);
    });

    ui.Toolbar.list.home.addButtonWithMenu(
        {
            id: "omniSearch",
            group:"toolbar3",
            title:"Omni Search",
            onClick:async function() {
                nw.Window.open("www/addons/basicUtils/omniSearch/omniSearch.html");
            },
            //img: `${thisAddon.getWebLocation()}/icon.png`,
            icon: "icon-search-file"
        }, 
        [
            // {
            //     label: t('Use secure protocol(HTTPS)'),
            //     type: "checkbox",
            //     checked: Boolean(thisAddon.getConfig("isSecureProtocol")),
            //     click: function(){
            //         console.log("Menu clicked", this);
                    
            //         thisAddon.setConfig("isSecureProtocol", this.checked)
            //         thisAddon.restartProxy();
            //     }
            // },
            // {
            //     label: t('Port'),
            //     click: function(){
            //         thisAddon.changePort();
            //     }
            // },
            {
                label: " "+t('Search in a folder'),
                icon: "www/img/zoom_icon-blue.png",
                click: function(){
                    nw.Window.open("www/addons/basicUtils/omniSearch/omniSearch.html");
                }
            },            
            {
                type: "separator", 
            },
            {
                label: " "+t('Search in Staging Files'),
                icon: "www/img/zoom_icon-blue.png",
                click: function(){
                    const searchParam = {
                        searchPath: trans.getStagingPath(),
                    };
                    const queryString = new URLSearchParams(searchParam).toString();

                    nw.Window.open("www/addons/basicUtils/omniSearch/omniSearch.html?" + queryString);
                }
            },
            {
                label: " "+t('Search in Original Files'),
                icon: "www/img/zoom_icon-blue.png",
                click: function(){
                    if (!trans.project?.loc) return alert(t("No original files path is set for this project."), "error");
                    const searchParam = {
                        searchPath: trans.project.loc,
                    };
                    const queryString = new URLSearchParams(searchParam).toString();

                    nw.Window.open("www/addons/basicUtils/omniSearch/omniSearch.html?" + queryString);
                }
            },
            {
                label: " "+t('Search in Translated Files'),
                icon: "www/img/zoom_icon-blue.png",
                click: function(){
                    if (!trans.project?.devPath) return alert(t("No translated files path is set for this project.\nYou need to inject your translation once to set the translated files path."), "error");
                    const searchParam = {
                        searchPath : trans.project.devPath,
                    };
                    const queryString = new URLSearchParams(searchParam).toString();
                    nw.Window.open("www/addons/basicUtils/omniSearch/omniSearch.html?" + queryString);
                }
            },

            
        ])

    ui.Toolbar.getById("home").addButton({
        id:"aiAssistant",
        group:"toolbar5",
        title : t("Chat with AI Assistant"),
        onClick : async () => {
            if (!thisAddon.openMiraiAssistant) {
                alert(t("AI Assistant is not available since the new features are not loaded.\nPlease reinstall or re-update Translator++."), "error");
                return;
            }
            thisAddon.openMiraiAssistant();
        },
        icon : "icon-mira-ai-assistant"
    });
        

    this.toolbarIsRegistered = true;
}

$(document).ready(function() {
    ui.onReady(function() {
        thisAddon.registerMainMenu();
        thisAddon.registerToolbar();
	});
});