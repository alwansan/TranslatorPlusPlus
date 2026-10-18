const applyToObj = function(ui) {
    
    ui.showLoading = function(options) {
        const self = this;
        
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
        const alreadyShown = self.consoleIsShown;
        self.consoleIsShown = true;

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
            self.loadingInit();
        }
        
        self.appBarTheme("dark");
        $("#loadingOverlay").removeClass("hidden");
        $(document).trigger("showLoading");

        // Only clear the console and announce a new session when the overlay
        // was not already visible.  This lets chained operations (e.g. project
        // refresh followed by importCompleteRowData) share a single log session
        // without wiping earlier output.
        if (!alreadyShown) {
            $("#loadingOverlay .console").empty();
            self.log("Log started!");
            self._logTimeStart = Date.now();
            if (nw.process.versions["nw-flavor"] == "sdk") self.log(t("You can view the more detailed information on console log (F12)"));
        }
        
        
        return $("#loadingOverlay");
    }
    
    ui.hideLoading = function(destroy) {
        const self = this;
        self.consoleIsShown = false;
        destroy = destroy||false;
        $("#loadingOverlay .loadingStatus").text("");
        
        if (destroy) {
            $("#loadingOverlay .console").empty();
        }
        $("#loadingOverlay").addClass("hidden");
        self.appBarTheme("");
        $("#applicationBar .appActionsLeft").show();
        
        //$(document).trigger("hideLoading");
        /**
        * Triggered when loading console closed
        * @event ui#loadingScreenIsClosed
        * @since 4.3.20
        */
        self.trigger("loadingConsoleClosed")
        
        return $("#loadingOverlay");
    }
    
    ui.loadingClearButton = function() {
        $(".loadingBarButtons").empty();
    }
    
    ui.showCloseButton = function(options) {
        const self = this;
        options=options||{};
        
        var $loadingBarBtn = $(".loadingBarButtons");
        if ($loadingBarBtn.find(".closeButton").length > 0) return;
        
        var thisButton = $("<a class='closeButton icon-cancel-1' href='#'>"+t("Close")+"</a>");
        thisButton.on("click", function(e) {
            self.hideLoading(true);
            self.loadingClearButton();
        });
        
        $loadingBarBtn.append(thisButton);	
    }
    
    ui.showOpenCacheButton = function(target, options) {
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
    
    ui.LoadingAddButton = function(text, onClick, options) {
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
    
    
    ui.stickToBottom = function($elm) {
        if ($elm.length == 0) return $elm;
        console.log($elm[0].scrollTop+"+"+$elm.height()+" >= "+$elm[0].scrollHeight);
        if (($elm[0].scrollTop+$elm.height() >= $elm[0].scrollHeight)) {
            $elm[0].scrollTop=$elm[0].scrollHeight;
        }
        return $elm;
    }
    
    ui.loadingProgress = async function(percent, status, options) {
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
    
    ui.logHtml = async function(html) {
        const $console = $("#loadingOverlay .console");
        let thisPre = $("<pre></pre>");
        thisPre.append($(html));
        $console.append(thisPre);
    }
    
    ui.logSetConfig = function(config = {}) {
        this.logConfig = config;
    }
    
    ui.logGetConfig = function() {
        return this.logConfig || {};
    }
    
    ui.logError = async function() {
        this.logSetConfig({type:"error"});
        await this.log.apply(this, Array.from(arguments));
        this.logSetConfig({type:undefined});
        return;
    }
    
    ui.loadingInit = function() {
        const self = this;
        
        if (this.loadingObserverIsInitialized) return;
        
        // Select the node that will be observed for mutations
        const targetNode = $("#loadingOverlay")[0];
        
        // Options for the observer (which mutations to observe)
        const config = { attributes: false, childList: true, subtree: true };
        
        // Callback function to execute when mutations are observed
        const callback = function(mutationsList, observer) {
            self.trigger("logIsAdded");
        };
        
        // Create an observer instance linked to the callback function
        const observer = new MutationObserver(callback);
        
        // Start observing the target node for configured mutations
        observer.observe(targetNode, config);	
        this.loadingObserverIsInitialized = true;
    }
    
    
    ui.loadingEnd = function(percent, status, options) {
        const self = this;
        options = options||{};
        console.log("Loading end", arguments);
        var elapsed = Date.now() -  self._logTimeStart;
        self.log("Log ended!");
        self.log("Elapsed time : "+elapsed+"ms");
        self.loadingProgress(percent, status, options);
        var $loading = $("#loadingOverlay");
        options.error = options.error || false;
        
        var thisClass = "stopped";
        if (options.warning) thisClass = "warning";
        if (options.error) thisClass = "error";
        $loading.find(".loadingBarProgress").addClass(thisClass);
        self.showCloseButton();
    }
    
    return ui;
    
}

module.exports = applyToObj;
