const logger = function(ui = {}) {
    
    
    /**
    * Log a message to the console
    * 
    */
    ui.log = async function(message) {
        //console.warn(message);
        const maxWaitTime = 250; // half second for node change is already too slow
        var $console = $("#loadingOverlay .console");
        if (!$console.is(":visible")) return console.log(message);
        var texts = [];
        for (var i=0; i<arguments.length; i++) {
            if (typeof arguments[i] !== "string") {
                texts.push(JSON.stringify(arguments[i], undefined, 2));
            } else {
                texts.push(arguments[i]);
            }
        }
        
        if (ui.log.getConfig().type) {
            $console.append(`<pre data-type="${ui.log.getConfig().type}">${texts.join("\n")}</pre>`);
        } else if (message.constructor.name == "jQuery") {
            // append as is
            let thisPre = $("<pre></pre>");
            thisPre.append(message);
            $console.append(thisPre);
        } else {
            $console.append("<pre>"+texts.join("\n")+"</pre>");
        }
        
        console.log.apply(this, arguments);
        var resolver;
        var promise = new Promise((resolve, reject) => {
            resolver = resolve;
            ui.one("logIsAdded", async ()=>{
                resolve();
            });
        })
        
        window.setTimeout(()=>{
            resolver();
        }, maxWaitTime)
        return promise;
    }
    
    ui.log.isShown = function() {
        return $("#loadingOverlay .console").is(":visible");
    }
    
    ui.log.show = function(options) {
        /*
        options.buttons = [{
        text: "text to display",
        onClick : function
        }]
        */
        options = options||{};
        options.buttons = options.buttons||[];
        
        $("#applicationBar .appActionsLeft").hide();
        
        
        // autofix direct options.buttons object
        if (Array.isArray(options.buttons) == false) {
            if (typeof options.buttons.text !== "undefined") options.buttons = [options.buttons];
        }
        const alreadyShown = ui.consoleIsShown;
        ui.consoleIsShown = true;

        // Always reset progress bar state and buttons so each caller starts clean
        $("#loadingOverlay .loadingBarProgress").empty();
        //$("#loadingOverlay .console").addClass("stickToBottom");
        $("#loadingOverlay .loadingBarProgress").removeClass("stopped");
        $("#loadingOverlay .loadingBarProgress").removeClass("error");
        
        $(".loadingBarButtons").empty();
        for (var i=0; i<options.buttons.length; i++) {
            var thisButton = $("<a href='#'>"+options.buttons[i].text+"</a>");
            if (typeof options.buttons[i].onClick == 'function') {
                thisButton.data("onClick", options.buttons[i].onClick)
                
                thisButton.on("click", function(e) {
                    $(this).data("onClick").call(this);
                });
            }
            
            $(".loadingBarButtons").append(thisButton);
        }
        
        
        if ($("#loadingOverlay").hasClass("initialized") == false) {
            $("#loadingOverlay").addClass("initialized");
            ui.log.init();
        }
        
        ui.appBarTheme("dark");
        $("#loadingOverlay").removeClass("hidden");
        $(document).trigger("showLoading");

        // Only clear the console and announce a new session when the overlay
        // was not already visible.  This lets chained operations share a single
        // log session without wiping earlier output.
        if (!alreadyShown) {
            $("#loadingOverlay .console").empty();
            ui.log("Log started!");
            ui._logTimeStart = Date.now();
            if (nw.process.versions["nw-flavor"] == "sdk") ui.log(t("You can view the more detailed information on console log (F12)"));
        }
        
        
        return $("#loadingOverlay");
    }

    ui.log.start = ui.log.show;
    
    ui.log.hide = function(destroy) {
        ui.consoleIsShown = false;
        destroy = destroy||false;
        $("#loadingOverlay .loadingStatus").text("");
        
        if (destroy) {
            $("#loadingOverlay .console").empty();
        }
        $("#loadingOverlay").addClass("hidden");
        ui.appBarTheme("");
        $("#applicationBar .appActionsLeft").show();
        
        /**
        * Triggered when loading console closed
        * @event ui#loadingScreenIsClosed
        * @since 4.3.20
        */
        ui.trigger("loadingConsoleClosed")
        
        return $("#loadingOverlay");
    }
    
    ui.log.clearButtons = function() {
        $(".loadingBarButtons").empty();
    }
    
    ui.log.showCloseButton = function(options) {
        options=options||{};
        
        var $loadingBarBtn = $(".loadingBarButtons");
        if ($loadingBarBtn.find(".closeButton").length > 0) return;
        
        var thisButton = $("<a class='closeButton icon-cancel-1' href='#'>"+t("Close")+"</a>");
        thisButton.on("click", function(e) {
            ui.log.hide.call(this, true);
            ui.log.clearButtons();
        });
        
        $loadingBarBtn.append(thisButton);	
    }

    ui.log.showOpenDirButton = async function(targetDir, options) {
        options=options||{};
        if (await common.isDir(targetDir)) {
            if (typeof targetDir == 'undefined') return false;
            const dirContent = await common.getAll(targetDir);
            if (dirContent.length) {
                ui.log.addButton("Open folder", function() {
                        nw.Shell.showItemInFolder(nwPath.join(targetDir, dirContent[0]));
                    },{
                        class: "icon-folder-open"
                });
            } else {
                ui.log.error(t("The process is completed, but no file found in the target directory!"));
            }
        } else if (await common.isFile(targetDir)) {
            ui.log.addButton("Open folder", function() {
                    nw.Shell.showItemInFolder(targetDir);
                },{
                    class: "icon-folder-open"
            });
        }
    }
    
    ui.log.showOpenCacheButton = function(target, options) {
        options=options||{};
        if (typeof target == 'undefined') return false;
        $(".loadingBarButtons").find(".openCache").remove();
        var thisButton = $("<a href='#' class='openCache icon-folder-open'>Open Cache</a>");
        thisButton.on("click", function(e) {
            //var thisTmpPath = str_ireplace("\\", "\\\\", target);
            //console.log("running command : \r\n"+'explorer "'+thisTmpPath+'"');
            require('child_process').exec('explorer "'+target+'"' , function (err, stdout, stderr) { console.log("Explorer opened") });
        });
        
        $(".loadingBarButtons").append(thisButton);		
    }

    ui.log.setStatus = function(status="") {
        const $loading = $("#loadingOverlay");
        if ($loading.length == 0) return;
        $loading.find(".loadingStatus").text(status);
    }

    ui.log.addButton = function(text, onClick, options) {
        options=options||{};
        options.class=options.class||"";
        
        if (typeof text == 'undefined') return false
        if (typeof onClick !== 'function') onClick = function(){};
        text = text||"";
        options.a = options.a||"#";
        
        
        var thisButton = $("<a class='"+options.class+"' href='"+options.a+"'>"+text+"</a>");
        thisButton.on("click", function(e) {
            onClick.call(this);
        });
        
        $(".loadingBarButtons").append(thisButton);	
        return thisButton;
    }
    
    
    ui.log.stickToBottom = function($elm) {
        if ($elm.length == 0) return $elm;
        console.log($elm[0].scrollTop+"+"+$elm.height()+" >= "+$elm[0].scrollHeight);
        if (($elm[0].scrollTop+$elm.height() >= $elm[0].scrollHeight)) {
            $elm[0].scrollTop=$elm[0].scrollHeight;
        }
        return $elm;
    }
    
    ui.log.progress = async function(percent, status, options) {
        /*
        options.mode = consoleOutput -> no pre wrapper
        */
        var $loading 		= $("#loadingOverlay");
        options 			= options||{};
        options.consoleOnly = options.consoleOnly||false;
        options.mode 		= options.mode||"";
        options.classStr 	= options.classStr||"";
        if (typeof percent == 'string') {
            //$loading.find(".loadingBarProgress").css("width", 100+"%");
            $loading.find(".loadingBarProgress").css("left", "0%");
            $loading.find(".loadingBarOverlay").text(percent);
        } else if (typeof percent !== 'undefined') {
            percent = percent||0;
            percent = Math.round(percent);
            //$loading.find(".loadingBarProgress").css("width", percent+"%");
            $loading.find(".loadingBarProgress").css("left", (-100+percent)+"%");
            $loading.find(".loadingBarOverlay").text(percent+"%");
        } 
        
        var classStr = "";
        if (options.classStr) {
            classStr = ' class="'+options.classStr+'"';
        }
        
        
        if (typeof status !== "undefined") {
            if (options.consoleOnly == false) {
                $loading.find(".loadingStatus").text(status);
            }
            var console = $("#loadingOverlay .console");
            
            if (options.mode == "consoleOutput") {
                console.append("<span"+classStr+">"+status+"</span>");
            } else {
                console.append("<pre"+classStr+">"+status+"</pre>");
            }
            
            /*
            if (console.hasClass("stickToBottom")) {
            console[0].scrollTop=console[0].scrollHeight;
            }	
            */	
            return status;
        }
    }
    
    ui.log.addHtml = async function(html) {
        const $console = $("#loadingOverlay .console");
        let thisPre = $("<pre></pre>");
        thisPre.append($(html));
        $console.append(thisPre);
    }
    
    ui.log.setConfig = function(config = {}) {
        ui.logConfig = config;
    }
    
    ui.log.getConfig = function() {
        return ui.logConfig || {};
    }
    
    ui.log.error = async function() {
        this.setConfig({type:"error"});
        await ui.log.apply(this, Array.from(arguments));
        this.setConfig({type:undefined});
        return;
    }
    
    ui.log.warning = async function() {
        this.setConfig({type:"warning"});
        await ui.log.apply(this, Array.from(arguments));
        this.setConfig({type:undefined});
        return;
    }
    
    ui.log.info = async function() {
        this.setConfig({type:"info"});
        await ui.log.apply(this, Array.from(arguments));
        this.setConfig({type:undefined});
        return;
    }
    
    ui.log.success = async function() {
        this.setConfig({type:"success"});
        await ui.log.apply(this, Array.from(arguments));
        this.setConfig({type:undefined});
        return;
    }
    
    ui.log.init = function() {
        if (this.loadingObserverIsInitialized) return;
        
        // Select the node that will be observed for mutations
        const targetNode = $("#loadingOverlay")[0];
        
        // Options for the observer (which mutations to observe)
        const config = { attributes: false, childList: true, subtree: true };
        
        // Callback function to execute when mutations are observed
        const callback = function(mutationsList, observer) {
            ui.trigger("logIsAdded");
        };
        
        // Create an observer instance linked to the callback function
        const observer = new MutationObserver(callback);
        
        // Start observing the target node for configured mutations
        observer.observe(targetNode, config);	
        this.loadingObserverIsInitialized = true;
    }
    
    
    ui.log.end = function(percent, status, options) {
        options = options||{};
        console.log("Loading end", arguments);
        var elapsed = Date.now() -  ui._logTimeStart;
        ui.log("Log ended!");
        ui.log("Elapsed time : "+elapsed+"ms");
        ui.log.progress(percent, status, options);
        var $loading = $("#loadingOverlay");
        options.error = options.error || false;
        
        var thisClass = "stopped";
        if (options.warning) thisClass = "warning";
        if (options.error) thisClass = "error";
        $loading.find(".loadingBarProgress").addClass(thisClass);
        ui.log.showCloseButton();
    }
    
}

module.exports = logger;

