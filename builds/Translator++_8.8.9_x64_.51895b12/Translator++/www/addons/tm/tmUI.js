var thisAddon = this;

//await this.until("TMInitialized");


class TMUI extends require("www/js/BasicEventHandler.js") {
    constructor(options) {
        var $tab = $(`<span class="tabButton" data-tran="" data-tranattr="title" title="View translation memory" data-fortab="viewTM"><i class="inline-block tabIcon icon-bulb"></i>${t('Memory')}</span>`)
        super($tab);
        this.$tab = $tab;
    }
}

const searchAndModifyStrings = function(inputText, keywords, prefix, suffix) {
    const regexFlags = 'gi'; // g: global match, i: case-insensitive match
    const regexKeywords = new RegExp(keywords.join('|'), regexFlags);
  
    return inputText.replace(regexKeywords, (match) => {
      return prefix + match + suffix;
    });
}

TMUI.prototype.infoPaneShowMemory = async function() {
    if (!this.isActive) {
        //console.log("Pass here--", this.$tab);

        if (thisAddon.error) return;
        //console.log("Pass here--", this.$tab);
        //  has TM
        var keyText = trans.getSelectedKeyText();
        this.$tab.find(".tabIcon").removeClass("darkyellow");
        this.$tab.find(".tabIcon").removeClass("icon-bulb-fill");
        this.$tab.find(".tabIcon").addClass("icon-bulb");

        var result = await thisAddon.handler.remindMe([keyText]);
        if (!result) return;
        if (!result[0]) return;
        console.log("has remindMe", this.$tab);
        this.lastMemory = result[0];
        this.$tab.find(".tabIcon").addClass("darkyellow");
        this.$tab.find(".tabIcon").removeClass("icon-bulb");
        this.$tab.find(".tabIcon").addClass("icon-bulb-fill");
        await ui.animateCSS(this.$tab.find(".tabIcon"), "bounceIn");
        return;
    }

    if (thisAddon.error) {
        
        this.$tabBody.html(`<div class="tmError blockBox warningBlock withIcon solidWhite m-1" data-tran=""></div>`);
        let $msg = $("<div></div>");
        $msg.text(thisAddon.error.message);
        this.$tabBody.find(".tmError").append($msg)

        if (typeof thisAddon.error.resolve == "function") {
            let $action = $(`<button>${t("Fix the problem!")}</button>`)
            $action.on("click", thisAddon.error.resolve);
            this.$tabBody.find(".tmError").append($action)
        }
        return;
    }

    this.$tabBody.html(`<div class="tmExactMatch"><div class="matchNotFound"><i class="icon-info-circled"></i> ${t("No exact matches found!")}</div></div><div class="tmSimiliar"></div>`);
    // handling exact match
    (async () => {
        var keyText = trans.getSelectedKeyText();

        var result = await thisAddon.handler.remindMe([keyText]);
        console.log("remindMe result", result);
        if (keyText != trans.getSelectedKeyText()) return; // selection has changed

        if (!result) return;
        if (!result[0]) return;
        var $template =  $(`
        <div class="snippetWrapper">
            <div class="snippetInfo flex"><span class="snippetPath"><i class="icon-bulb-fill"></i>Exact match</span><span class="lineNumber"></span></div>
            <div class="memoryResult"></div>
        </div>`)
        $template.find(".memoryResult").text(result[0]);

        this.lastMemory = result[0]
        const $exactMatch = this.$tabBody.find(".tmExactMatch")
        console.log("exact match elm", $exactMatch.length);
        $exactMatch.empty();
        $exactMatch.append($template);
        $template.on("click", function() {
            trans.textEditorSetValue(result[0], true);
        })
    })();

    // Handling similiar result;
    (async () => {
        var keyText = trans.getSelectedKeyText();

        var searchable;
        if (thisAddon.DB.prepareSearchable) {
            searchable = thisAddon.DB.prepareSearchable(keyText);
        }
        const similiar = await thisAddon.handler.remindSimiliar(keyText);
        if (keyText != trans.getSelectedKeyText()) return; // selection has changed

        if (!similiar) return;
        if (!Array.isArray(similiar)) return;
        if (!similiar[0]) return;
        const $similiar = this.$tabBody.find(".tmSimiliar")
        $similiar.empty();
        for (let i=0; i<similiar.length; i++) {
            (()=> {
                const thisRecord = similiar[i];
                let original = thisRecord.original
                if (searchable) {
                    original = searchAndModifyStrings(thisRecord.original, searchable.words, `<span class="highlight">`, `</span>`);
                }
                let $template = $(`
                <div class="snippetWrapper ">
                    <div class="snippetInfo flex"><span class="snippetPath">Similiar result</span><span class="lineNumber">Score: ${Math.round(similiar[i].score*1000)/1000}</span></div>
                    <div class="memoryResult">
                        <div class="innerLabel">${t("Original")} :</div>
                        <div class="memContent tmOriginalText"></div>
                        <div class="innerLabel">${t("Translation")} :</div>
                        <div class="memContent tmTranslation"></div>
                    </div>
                </div>`);
                $template.find(".tmOriginalText").html(original);
                $template.find(".tmTranslation").text(thisRecord.translation);
                $similiar.append($template);
                $template.on("click", function() {
                    trans.textEditorSetValue(thisRecord.translation, true);
                })
            })()
        }
    })()
}

TMUI.prototype.translateCurrent = async function() {
    console.log("setting last memory", this.lastMemory);
    if (!trans.lastSelectedCell) return;
    if (!this.lastMemory) return;
    ui.setCurrentCellText(this.lastMemory, true);
}


TMUI.prototype.initGridMenu = function() {
    console.log("Injecting menu");
    const insertAfter = "sepn"
    const result = {}
    for (var i in trans.gridContextMenu) {
        result[i] = trans.gridContextMenu[i];
        if (i == insertAfter) {
            if (thisAddon.error) {
                if (thisAddon.error?.resolve) {
                    result["tMemory"] = {
                        name: `Translation Memory`,
                        submenu: {
                            items: [
                                {
                                    key:"tMemory:tm-resolve",
                                    name: thisAddon.error.resolveMsg,
                                    callback: thisAddon.error?.resolve,
                                },
                            ]
                        },
                        hidden: function() {
                            if (trans.grid.isRowHeaderSelected()) return true;
                            return false;
                        }
                    }
                    result["sepTM"] = {
                        name: '---------',
                        hidden: function() {
                            if (trans.grid.isRowHeaderSelected()) return true;
                            return false;
                        }
                    }
                }
            } else {
                result["tMemory"] = {
                    name: `Translation Memory`,
                    submenu: {
                        items: [
                            {
                                key:"tMemory:tm-remind",
                                name: "<span>Recall <kbd>ctrl+r</kbd></span>",
                                callback: function() {
                                    if (thisAddon.error) return;
                                    thisAddon.handler.remindIntoSelectedCells();
                                },
                            },
                            {
                                key:"tMemory:tm-memorize",
                                name: "<span>Memorize <kbd>ctrl+m</kbd></span>",
                                callback: function() {
                                    thisAddon.handler.memorizeSelectedCells();
    
                                },
                            },
                            {
                                key:"tMemory:tm-rememorize",
                                name: "<span>Re-memorize <kbd>ctrl+shift+m</kbd></span>",
                                callback: function() {
                                    thisAddon.handler.memorizeSelectedCells(true);
                                },
                            },
                            {
                                key: "tMemory:tm-forget",
                                name: "<span>Forget</span>",
                                callback: function() {
                                    var conf = confirm(t(`Do you want Translator++ to forget the selected cell(s)?`))
                                    if (!conf) return;
                                    thisAddon.handler.forgetFromSelectedCells()
                                },
                            },
                        ]
                    },
                    hidden: function() {
                        if (trans.grid.isRowHeaderSelected()) return true;
                        return false;
                    }
                }
                result["sepTM"] = {
                    name: '---------',
                    hidden: function() {
                        if (trans.grid.isRowHeaderSelected()) return true;
                        return false;
                    }
                }
            }
            

        }
    }

    trans.gridContextMenu = result;
    //console.log("Updating context menu", JSON.stringify(trans.gridContextMenu, undefined, 2));
    trans.grid.updateSettings({
        contextMenu:{
            items: trans.gridContextMenu
        }
    })
}

TMUI.prototype.initShortcuts = function() {
    $(document).on('keydown', function(e) {
		var keyCode = e.keyCode || e.which;
		// EDITING COMMAND
		if (e.ctrlKey && e.shiftKey ) {
			switch(keyCode) {
				case 77 : //CTRL+SHIFT+m
					e.preventDefault();
					console.log("Pressing CTRL+shift+m");
					thisAddon.handler.memorizeSelectedCells(true);
				break;
			}
		} else if (e.ctrlKey) {
			switch(keyCode) {
				case 77 : //m
					e.preventDefault();
					console.log("Pressing CTRL+m");
					thisAddon.handler.memorizeSelectedCells();
				break;
                case 82 : //r
                    e.preventDefault();
                    console.log("Pressing CTRL+t");
                    thisAddon.handler.remindIntoSelectedCells();
                break;
            }
		}
	});		
}



TMUI.prototype.init = async function() {
    var that = this;
    // building elements
    this.$tabBody = $(`<div class="cellInfoContent viewTM hidden" id="viewTM"  data-tabname="viewTM"></div>`)
    this.$tabMenu = $(`<div class="cellInfoCtrl hidden" data-tabname="viewTM">
        <button class="setFromMemory" data-tranattr="title" title="Use memorized translation to current cell! (ctrl+r)"><i class="icon-right-bold"></i></button>
    </div>`);
    $(".cellInfoPartsA .cellInfoTabHeader .tabButtons").append(this.$tab);
    $(".cellInfoPartsA .cellInfoTabContent .cellInfoBody").append(this.$tabBody);
    $(".cellInfoPartsA .cellInfoTabContent .cellInfoMenu").append(this.$tabMenu);
    ui.cellInfoTab.init();

    $("head").append(`<style id="tmStyle">
    .snippetWrapper .memoryResult {
        box-sizing: border-box;
        padding: 8px;
        cursor:pointer;
    }
    .tmExactMatch .snippetWrapper .memoryResult {
        white-space: pre;
    }
    #viewTM .snippetWrapper {
        opacity: .75;
    }
    #viewTM > div {
        margin-bottom: .75em;
    }
    #viewTM {
        background-color: rgb(42, 47, 58);
        overflow:auto;
    }
    #viewTM .memoryResult .innerLabel {
        font-size: .8em;
        font-weight: bold;
    }
    #viewTM .memContent {
        margin-bottom: .75em;
        padding-left: 1em;
        white-space: pre;
    }
    #viewTM .snippetWrapper:hover {
        opacity: 1;
    }
    #viewTM .tmExactMatch {
        color: var(--blue-300);
    }
    #viewTM .tmSimiliar {
        color: #dcdcdc;
    }

    #viewTM .matchNotFound {
        padding: 1.2em;
    }
    </style>`);

    // var $menuButton = $(`<button class="menu-button tmMenu buttonExpand" data-tranattr="title" title="Translation memory"><img src="addons/tm/magnet-mind2.png" alt=""></button>`)
    // $(".mainToolbar .toolbar3").append($menuButton);
    
    this.menu = ui.createMenu([
        {
            label: t('Auto recall'),
            type: "checkbox", 
            checked: Boolean(thisAddon.getConfig("autoRemindOnBatchTranslate")),
            click: function(){
                if (!updater || updater.getUser().level < 100) {
                    alert("Sorry, this addon is only available for active patrons only.\nYou can unlock this feature by becoming a $1 patron.")
                    this.checked = false;
                    thisAddon.setConfig("autoRemindOnBatchTranslate", false)	
                    return;
                }
                this.checked = !thisAddon.getConfig("autoRemindOnBatchTranslate");
                thisAddon.setConfig("autoRemindOnBatchTranslate", this.checked)				
            }
        },
        { type: 'separator' },
        {
            label: t('Auto memorize organic translation'),
            type: "checkbox", 
            checked: Boolean(thisAddon.getConfig("autoMemorizeOrganic")),
            click: function(){
                if (!updater || updater.getUser().level < 100) {
                    alert("Sorry, this addon is only available for active patrons only.\nYou can unlock this feature by becoming a $1 patron.")
                    this.checked = false;
                    thisAddon.setConfig("autoMemorizeOrganic", false)	
                    return;
                }
                this.checked = !thisAddon.getConfig("autoMemorizeOrganic");
                thisAddon.setConfig("autoMemorizeOrganic", this.checked)				
      
            }
        },
        {
            label: t('Auto memorize automation'),
            type: "checkbox", 
            checked: Boolean(thisAddon.getConfig("autoMemorizeAutomation")),
            click: function(){
                if (!updater || updater.getUser().level < 100) {
                    alert("Sorry, this addon is only available for active patrons only.\nYou can unlock this feature by becoming a $1 patron.")
                    this.checked = false;
                    thisAddon.setConfig("autoMemorizeAutomation", false)	
                    return;
                }
                this.checked = !thisAddon.getConfig("autoMemorizeAutomation");
                thisAddon.setConfig("autoMemorizeAutomation", this.checked)				
            }
        },
        { type: 'separator' },
        {
            label: t('Use rememorize in organic translation'),
            type: "checkbox", 
            checked: Boolean(thisAddon.getConfig("rememorizeOrganic")),
            click: function(){
                this.checked = !thisAddon.getConfig("rememorizeOrganic");
                thisAddon.setConfig("rememorizeOrganic", this.checked)				
            }
        },

    ])

    // this.menu = new nw.Menu();

	// // Add some items with label
	// this.menu.append(new nw.MenuItem({
    //     label: t('Auto recall'),
    //     type: "checkbox", 
    //     checked: Boolean(thisAddon.getConfig("autoRemindOnBatchTranslate")),
    //     click: function(){
    //         if (updater.getUser().level < 100) {
    //             alert("Sorry, this addon is only available for active patrons only.\nYou can unlock this feature by becoming a $1 patron.")
    //             this.checked = false;
    //             thisAddon.setConfig("autoRemindOnBatchTranslate", false)	
    //             return;
    //         }
    //         this.checked = !thisAddon.getConfig("autoRemindOnBatchTranslate");
    //         thisAddon.setConfig("autoRemindOnBatchTranslate", this.checked)				
    //     }
	// }));
    // this.menu.append(new nw.MenuItem({ type: 'separator' }));
	// this.menu.append(new nw.MenuItem({
    //     label: t('Auto memorize organic translation'),
    //     type: "checkbox", 
    //     checked: Boolean(thisAddon.getConfig("autoMemorizeOrganic")),
    //     click: function(){
    //         if (updater.getUser().level < 100) {
    //             alert("Sorry, this addon is only available for active patrons only.\nYou can unlock this feature by becoming a $1 patron.")
    //             this.checked = false;
    //             thisAddon.setConfig("autoMemorizeOrganic", false)	
    //             return;
    //         }
    //         this.checked = !thisAddon.getConfig("autoMemorizeOrganic");
    //         thisAddon.setConfig("autoMemorizeOrganic", this.checked)				
  
    //     }
    // }));
    // this.menu.append(new nw.MenuItem({
    //     label: t('Auto memorize automation'),
    //     type: "checkbox", 
    //     checked: Boolean(thisAddon.getConfig("autoMemorizeAutomation")),
    //     click: function(){
    //         if (updater.getUser().level < 100) {
    //             alert("Sorry, this addon is only available for active patrons only.\nYou can unlock this feature by becoming a $1 patron.")
    //             this.checked = false;
    //             thisAddon.setConfig("autoMemorizeAutomation", false)	
    //             return;
    //         }
    //         this.checked = !thisAddon.getConfig("autoMemorizeAutomation");
    //         thisAddon.setConfig("autoMemorizeAutomation", this.checked)				

    //     }
    // }));
    // /*
    // this.menu.append(new nw.MenuItem({
    //     label: t('Auto memorize machine translation'),
    //     type: "checkbox", 
    //     checked: Boolean(thisAddon.getConfig("autoRemindOnBatchTranslate")),
    //     click: function(){

    //     }
    // }));
    // */
    // this.menu.append(new nw.MenuItem({ type: 'separator' }));
    // this.menu.append(new nw.MenuItem({
    //     label: t('Use rememorize in organic translation'),
    //     type: "checkbox", 
    //     checked: Boolean(thisAddon.getConfig("rememorizeOrganic")),
    //     click: function(){
    //         this.checked = !thisAddon.getConfig("rememorizeOrganic");
    //         thisAddon.setConfig("rememorizeOrganic", this.checked)				
    //     }
    // }));
    

    await ui.ribbonMenu.until("ready"); 
    const $thisMenu = ui.Toolbar.getById("translator").addMenuButton(
        {
            id:"tm",
            group:"toolbar2",
            img: "addons/tm/magnet-mind2.png"
        }, this.menu)

    console.log("addon error", JSON.stringify(thisAddon.error));
    if (typeof thisAddon?.error?.resolve == "function") {
        $thisMenu.addClass("icon-attention iOverlay")

        this.menu.append(new nw.MenuItem({ type: 'separator' }));
        this.menu.append(new nw.MenuItem({
            label: t(thisAddon.error.resolveMsg),
            type: "normal",
            icon: "www/img/warning.png",
            click: thisAddon.error.resolve
        }));
    }

	// $menuButton.on("click", function(ev) {
	// 	ev.preventDefault();
	// 	// Popup the native context menu at place you click
	// 	console.log(ev.originalEvent);
	// 	var $wrapper = $(this);
	// 	var left = parseInt($wrapper.offset().left);
	// 	var top = parseInt($wrapper.offset().top + $wrapper.outerHeight());
	// 	console.log(left, top)
	// 	//ui.menus.saveAs.popup(parseInt(ev.originalEvent.x), parseInt(ev.originalEvent.y));
	// 	that.menu.popup(left, top);
	// 	return false;	
    // })



    // Initialize grid menu
    this.initGridMenu();
    this.initShortcuts();

    // EVENTS
    // apply event to control pane
    this.$tabMenu.find(".setFromMemory").on("click", () => {
        this.translateCurrent();
    });
    
    $(document).on("cellInfoTabChange.tm", async(e, tab)=> {
        if (tab !== "viewTM") {
            this.isActive = false;
            return;
        }
        this.isActive = true;
        this.infoPaneShowMemory();
    })

    $(document).on("onAfterSelectCell.tm", (e, options)=>{
        this.infoPaneShowMemory();
    });

    console.log("TMUI initialized");
    
}

var initialize = async function() {
    console.log("Initializing TMUI");
    var tmUi = new TMUI();
    thisAddon.tmUi = tmUi;
    await tmUi.init();
}


$(document).ready(function() {
    ui.onReady(async ()=> {
        await thisAddon.until("TMInitialized");
        console.log("TM initialized");
        initialize();
    })
})