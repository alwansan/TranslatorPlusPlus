if (typeof $ === "undefined") {
    var $ = {};
    if (typeof $.trim === "undefined") {
        $.trim = function(str = "") {
            return str.trim();
        }
    }
}

var TyranoParser ={
    //defaultTags based on http://kirikirikag.sourceforge.net/contents/index.html
    kagTags:["autowc","clearsysvar","clickskip","close","cursor","hidemessage","loadplugin","mappfont","nextskip","quake","rclick","resetwait","s","stopquake","title","wait","waitclick","wc","wq","checkbox","commit","edit","endmacro","erasemacro","macro","cancelautomode","cancelskip","ch","cm","ct","current","deffont","defstyle","delay","endindent","endnowait","er","font","glyph","graph","hch","indent","l","locate","locklink","nowait","p","position","r","resetfont","resetstyle","ruby","style","unlocklink","endhact","hact","history","hr","showhistory","button","call","cclick","click","ctimeout","cwheel","endlink","jump","link","return","timeout","wheel","animstart","animstop","backlay","copylay","freeimage","image","laycount","layopt","mapaction","mapdisable","mapimage","move","pimage","ptext","stopmove","stoptrans","trans","wa","wm","wt","bgmopt","cancelvideoevent","cancelvideosegloop","clearbgmlabel","clearbgmstop","clearvideolayer","fadebgm","fadeinbgm","fadeinse","fadeoutbgm","fadeoutse","fadepausebgm","fadese","openvideo","pausebgm","pausevideo","playbgm","playse","playvideo","preparevideo","resumebgm","resumevideo","rewindvideo","seopt","setbgmlabel","setbgmstop","stopbgm","stopse","stopvideo","video","videoevent","videolayer","videosegloop","wb","wf","wl","wp","ws","wv","xchgbgm","clearvar","else","elsif","emb","endif","endignore","endscript","eval","if","ignore","input","iscript","trace","waittrig","copybookmark","disablestore","erasebookmark","goback","gotostart","load","locksnapshot","record","save","startanchor","store","tempload","tempsave","unlocksnapshot"],
    tyranoTags:["3d_anim","3d_anim_stop","3d_scene","3d_camera","3d_gyro","3d_gyro_stop","3d_debug_camera","3d_motion","3d_debug","3d_init","3d_model_new","3d_sphere_new","3d_sprite_new","3d_event","3d_event_delete","3d_event_start","3d_event_stop","3d_box_new","3d_image_new","3d_show","3d_hide","3d_hide_all","3d_delete","3d_delete_all","3d_canvas_show","3d_canvas_show","camera","reset_camera","wait_camera","anim","wa","keyframe","endkeyframe","frame","kanim","playbgm","stopbgm","fadeinbgm","fadeoutbgm","xchgbgm","playse","stopse","fadeinse","fadeoutse","wb","eval","clearvar","clearsysvar","close","trace","title","iscript","endscript","html","endhtml","emb","if","elsif","else","endif","call","return","macro","endmacro","erasemacro","savesnap","ignore","endignore","edit","preload","clearfix","commit","loadjs","movie","showsave","showload","showmenu","showmenubutton","hidemenubutton","skipstart","skipstop","chara_move","chara_config","chara_new","chara_show","chara_hide","chara_delete","chara_mod","l","p","graph","jump","r","er","cm","ct","current","position","image","freeimage","ptext","backlay","wt","link","endlink","s","wait","hidemessage","quake","font","deffont","delay","nowait","endnowait","resetfont","layopt","ruby","cancelskip","locate","button","clickable","glyph","trans","live2d_color","live2d_expression","live2d_new","live2d_show","live2d_hide","live2d_opacity","live2d_delete","live2d_motion","live2d_trans","live2d_rotate","live2d_scale","live2d_shake","voconfig","vostart","vostop","bgmopt","seopt","wbgm","wse","clearstack","autosave","autoload","plugin","sysview","loadcss","save_img","nolog","endnolog","pushlog","start_keyconfig","stop_keyconfig","showlog","configdelay","web","apply_local_patch","autoconfig","autostart","autostop","awakegame","breakgame","check_web_patch","config_record_label","cursor","dialog","resetdelay","screen_full","sleepgame","mask","mask_off","filter","free_filter","layermode","layermode_movie","free_layermode","bg","image","mtext","bgmovie","wait_bgmovie","stop_bgmovie","chara_face","chara_hide_all","chara_ptext","stopanim","button","glink","speak_on","speak_off","free","bgcamera","qr_config","stop_bgcamera","qr_define","web","stop_kanim"],
    tyrano:null,
    kag:null,
    
    flag_script:false , //スクリプト解析中なら
    deep_if: 0,
    
    init:function(){
        
        //alert("kag.parser 初期化");
        //this.tyrano.test();
        
        
    },
    
    loadConfig:function(call_back){
        
        var that = this;
        
        //同じディレクトリにある、KAG関連のデータを読み込み
        $.loadText("./data/system/Config.tjs",function(text_str){
            
            var map_config = that.compileConfig(text_str);
            
            if(call_back){
                call_back(map_config);
            }
            
        });
        
    },
    
    //コンフィグファイルをデータ構造に格納
    compileConfig:function(text_str){
        
        var error_str ="";
        var map_config = {};
        
        var array_config = text_str.split("\n");
        
        for(var i=0; i< array_config.length;i++){
            
            try{
                
                var line_str = $.trim(array_config[i]); 
                if(line_str !="" && line_str.substr(0,1)===";"){
                    
                    var tmp_comment = line_str.split("//");
                    if(tmp_comment.length>1){
                        line_str = $.trim(tmp_comment[0]);
                    }
                    
                    line_str = line_str.replaceAll(";","");
                    line_str = line_str.replaceAll("\"","");
                    
                    var tmp = line_str.split("=");
                    
                    var key = $.trim(tmp[0]);
                    var val = $.trim(tmp[1]);
                    map_config[key] = val;
                }
                
            }catch(e){
                
                error_str +="Error:Config.tjsに誤りがあります/行:"+i+"";
                
            }
            
        }
        
        if(error_str !=""){
            alert(error_str);
        }
        
        return map_config;
        
    },
    
    /**
    * Convert KAG style scenario into object
    * @param  {String} text_str - String of the KAG style scenario
    */
    parseScenario:function(text_str){
        var array_s = [];
        var map_label = {}; //ラベル一覧
        var array_row = text_str.split("\n");
        var flag_comment = false; //コメント中なら
        var offset = 0; // offset of the current reader
        var commentStart    = undefined;
        var forceType       = undefined; // set for anything inside ignore tag
        
        for(var i=0;i<array_row.length;i++){
            var marginLeft = array_row[i].length - array_row[i].trimLeft().length;
            var line_str = $.trim(array_row[i]);
            var first_char = line_str.substr(0,1);
            
            if(line_str.indexOf("endscript") !=-1){
                this.flag_script = false;
            }
            
            //コメントの場合は無視する
            //console.log("line_str is", line_str);
            if(flag_comment === true && line_str ==="*/"){
                // todo: may bugged on single line /* ... */
                flag_comment = false;
                array_s.push({
                    line:i,
                    name:"comment_multiline",
                    start:commentStart,
                    end:offset+marginLeft+line_str.length
                });
                commentStart = undefined;
            }else if(this.flag_script && line_str==="/*"){
                //console.log("commentStart is", offset+marginLeft);
                flag_comment = true;
                commentStart = offset+marginLeft;
            }else if(flag_comment == true) {
                // do nothing
            } else if(first_char ===";"){
                array_s.push({
                    line:i,
                    name:"comment_line",
                    start:offset+marginLeft,
                    end:offset+marginLeft+line_str.length
                });
            }else if(first_char ==="#"){
                
                var tmp_line = $.trim(line_str.replace("#",""));
                var chara_name = "";
                var chara_face = "";
                if(tmp_line.split(":").length > 1){
                    let array_line = tmp_line.split(":");
                    chara_name = array_line[0];
                    chara_face = array_line[1];
                }else{
                    chara_name = tmp_line;
                }
                
                // Displaying the name in the character box
                // there will be error if there is spaces between # and character name
                var text_obj = {
                    line:i,
                    name:"chara_ptext",
                    pm:{
                        name:chara_name,
                        face:chara_face,
                        // Find the index of the first non-space character after '#'
                        start: (function() {
                            var afterSharp = line_str.slice(1);
                            var firstCharIdx = afterSharp.search(/\S/);
                            return offset + marginLeft + (firstCharIdx !== -1 ? 1 + firstCharIdx : 1);
                        })(),
                        end: (function() {
                            var afterSharp = line_str.slice(1);
                            var firstCharIdx = afterSharp.search(/\S/);
                            var startIdx = (firstCharIdx !== -1 ? 1 + firstCharIdx : 1);
                            return offset + marginLeft + startIdx + chara_name.length;
                        })()
                    },
                    val:text,
                    start:offset+marginLeft,
                    end:offset+marginLeft+line_str.length
                };
                
                array_s.push(text_obj);
                
                
            }else if(first_char ==="*"){
                //ラベル
                var label_tmp = line_str.substr(1,line_str.length).split("|");
                
                var label_key = "";
                var label_val = "";
                
                label_key = $.trim(label_tmp[0]);
                
                if(label_tmp.length >1){
                    label_val = $.trim(label_tmp[1]);
                }
                
                var label_obj = {
                    name:"label",
                    pm:{
                        "line":i,
                        "index":array_s.length,
                        "label_name":label_key,
                        "val":label_val
                    },
                    val:label_val
                };
                
                //dreamsavior edit
                label_obj.start = offset+marginLeft;
                label_obj.end = offset+marginLeft+line_str.length
                //ラベル
                array_s.push(label_obj);
                
                if(map_label[label_obj.pm.label_name]){
                    //this.kag.warning("警告:"+i+"行目:"+"ラベル名「"+label_obj.pm.label_name+"」は同一シナリオファイル内に重複しています");    
                    const translate = typeof globalThis.t === "function"
                        ? globalThis.t
                        : function(text) { return text; };
                    console.warn("Warning line:"+i+" "+ translate("label") +" '"+ label_obj.pm.label_name+"' "+ translate("is duplicated in the same scenario file"));
                    
                }else{
                    map_label[label_obj.pm.label_name] = label_obj.pm;
                }     
                
            }else if(first_char ==="@"){
                // NOTE:
                // In .ks scripts, @commands must start at the beginning of the physical line
                // (ignoring indentation). If we set start/end based on `marginLeft` (the `@` column),
                // the preceding "\r\n + indentation" can be grouped into the previous translatable
                // segment by getWritable(). After translation, that can remove the newline and
                // produce malformed inline commands like: "text ...    @resetfont".
                //
                // To prevent this, anchor @command tokens to the *line start* (including indentation)
                // so that the newline before it is always emitted as an untranslatable chunk.
                const lineStartOffset = offset; // beginning of the physical line (includes indentation)

                //コマンド行確定なので、その残りの部分を、ごそっと回す
                let tag_str =line_str.substr(1,line_str.length); // "image split=2 samba = 5" 
                let tmpobj = this.makeTag(tag_str,i,offset+marginLeft);
                tmpobj.type = "@Command";
                tmpobj.val = line_str;
                tmpobj.col = 0;
                tmpobj.start = lineStartOffset;
                tmpobj.end = lineStartOffset + array_row[i].length;
                
                if (tag_str == "ignore") {
                    forceType = "ignoredText"
                } else if (forceType == "ignoredText" && tag_str == "endignore") {
                    forceType = undefined
                }
                array_s.push(tmpobj);
            }else{
                
                // Ignore starting underbar. Disabled- because will cause problem
                // starting underbar is to escape leading spaces
                /*
                if(first_char === "_") {
                line_str = line_str.substring(1,line_str.length);
                }
                */
                
                // calculates starting offset
                
                
                var array_char = line_str.split("");
                
                var text = "";//Placeholder for non-command literal text
                
                var tag_str ="";
                
                //１文字づつ解析していく
                var flag_tag = false; //タグ解析中
                
                var num_kakko = 0; //embタグの中の配列[]扱うために
                
                for(var j=0;j<array_char.length;j++){
                    var c = array_char[j];
                    
                    if(flag_tag ===true){
                        
                        if(c==="]" && this.flag_script ==false){
                            
                            num_kakko--;
                            
                            if(num_kakko == 0){
                                
                                flag_tag = false;
                                var tagObject = this.makeTag(tag_str,i, offset+(marginLeft+j)-("["+tag_str+"]").length+1);
                                tagObject.type = "tag";
                                tagObject.val = "["+tag_str+"]";
                                tagObject.col = (marginLeft+j)-tagObject.val.length+1; 
                                tagObject.start = offset+(marginLeft+j)-tagObject.val.length+1;
                                tagObject.end = offset+(marginLeft+j)+1                          
                                array_s.push(tagObject);
                                if (tag_str == "ignore") {
                                    forceType = "ignoredText"
                                } else if (forceType == "ignoredText" && tag_str == "endignore") {
                                    forceType = undefined
                                }
                                console.log("tagObject", tagObject);
                                //Build tag_str and store it in the instruction array
                                tag_str ="";
                                
                            }else{
                                tag_str +=c;
                            }
                        } else if(c ==="[" && this.flag_script == false ){
                            
                            num_kakko++;
                            tag_str +=c;
                            
                        } else{
                            tag_str +=c;
                        }
                        
                    } else if(flag_tag === false && c==="[" && this.flag_script == false){
                        
                        num_kakko++;
                        
                        //テキストファイルを命令に格納
                        if(text!=""){
                            // text at the first column
                            console.log("val: ", text, "flag_script", this.flag_script);
                            let text_obj = {
                                line:i,
                                name:"text",
                                type: forceType||"literalText",
                                pm:{"val":text},
                                val:text,
                                //marginLeft:marginLeft,
                                //colEnd:marginLeft+j,
                                col:(marginLeft+j)-text.length,
                                start:offset+(marginLeft+j)-text.length,
                                end:offset+(marginLeft+j)
                            };
                            //console.log("1.Writing", text_obj);
                            array_s.push(text_obj);
                            
                            text ="";
                        }
                        
                        flag_tag = true;
                        
                    }else{
                        
                        text +=c;
                    }
                    
                }
                
                if(text !=""){
                    // text after command
                    console.log("val: ", text, "flag_script", this.flag_script);

                    let text_obj = {
                        line:i,
                        type:forceType||this.rawType||"literalText",
                        name:this.rawName||"text",
                        pm:{"val":text},
                        val:text,
                        //col:marginLeft,
                        //start:offset+marginLeft,
                        //end:offset+text.length
                        col:(marginLeft+j)-text.length,
                        start:offset+(marginLeft+j)-text.length,
                        end:offset+(marginLeft+j)                       
                    };
                    //text_obj.end = text_obj.start + text_obj.val.length;
                    //console.log("2.Writing", text_obj);
                    
                    array_s.push(text_obj);
                }
                
                //console.log(array_char);
                
            }
            
            offset += array_row[i].length + 1; // plus one character new line
        }
        
        var result_obj = {
            text:text_str,
            array_s:array_s,
            map_label:map_label
        };
        
        if (this.deep_if != 0) {
            console.warn("[if]と[endif]の数が一致しません。シナリオを見直してみませんか？");
            this.deep_if = 0;
        }
        
        return result_obj;
        
        
    },
    
    //タグ情報から、オブジェクトを作成して返却する
    //Create and return an object from tag information
    // makeTag:function(str,line){
    //     console.log("Making tag", str, line);
    //     var obj ={
    //         line:line,
    //         name:"",
    //         pm:{},
    //         val:""
    //     };
    
    
    //     var array_c = str.split("");
    
    //     var flag_quot_c = "";
    
    //     var tmp_str = "";
    
    //     var cnt_quot_c = 0;
    
    //     for (var j=0;j<array_c.length;j++){
    
    //         var c = array_c[j];
    
    //         if(flag_quot_c =="" && (c ==="\"" || c ==="'" )){
    //             flag_quot_c = c;
    //             cnt_quot_c = 0;
    //         }else{
        
    //             //特殊自体発生中
    //             if(flag_quot_c !=""){
    
    //                 //特殊状態解除
    //                 if(c === flag_quot_c){
    
    //                     flag_quot_c ="";
    
    //                     //""のように直後に"が出てきた場合undefinedを代入
    //                     if(cnt_quot_c==0){
    //                         tmp_str+="undefined";
    //                     }
    
    //                     cnt_quot_c=0;
    
    //                 }else{
        
    //                     if(c =="="){
    //                         c = "#";
    //                     }
    
    //                     //空白削除。カンマの中の場合
    //                     if(c ==" "){
    //                         //個々消さないとダメ
    //                         c ="";
    //                     }
    
    //                     tmp_str +=c;
    //                     cnt_quot_c++;
    
    //                 }
    
    
    
    //             }else{
        //                 tmp_str +=c;
    //             }
    
    //         }
    
    
    //     }
    
    //     str = tmp_str ;
    
    //     //str = $.replaceAll(str,'"','');
    //     //str = $.replaceAll(str,"'",'');
    
    //     var array = str.split(" ");
    
    //     //タグの名前 [xxx 
    //     obj.name = $.trim(array[0]);
    
    //     //=のみが出てきた場合は前後のをくっつけて、ひとつの変数にしてしまって良い
    //     for(var k=1;k<array.length;k++){
    
    //         if(array[k] ==""){
    
    //             array.splice(k,1);
    //             k--;
    //         }
    
    //         else if(array[k] ==="="){
    //             if(array[k-1]){
    //                 if(array[k+1]){
    //                     array[k-1] = array[k-1]+"="+array[k+1];
    //                     array.splice(k,2);
    //                     k--;
    
    //                 }
    //             }
    //         }else if(array[k].substr(0,1)==="="){
    //             if(array[k-1]){
    //                 if(array[k]){
    //                     array[k-1] = array[k-1]+array[k];
    //                     array.splice(k,1);
    //                     //k--;
    
    //                 }
    //             }
    //         }else if(array[k].substr(array[k].length-1,array[k].length)==="="){
    //             if(array[k+1]){
    //                 if(array[k]){
    //                     array[k] = array[k]+array[k+1];
    //                     array.splice(k+1,1);
    //                     //k--;
    
    //                 }
    //             }
    //         }
    
    //     }
    
    //     for(var i=1;i<array.length;i++){
    
    //         var tmp = $.trim(array[i]).split("=");
    
    //         var pm_key = $.trim(tmp[0]);
    //         var pm_val = $.trim(tmp[1]);
    
    //         //全引き継ぎ対応
    //         if(pm_key=="*"){
    //             obj.pm["*"]="";
    //         }
    //         //特殊変換された値はそのまま代入できない
    //         if(pm_val!=""){
    //             obj.pm[pm_key] = pm_val.replaceAll("#","=");
    //         }
    
    //         if(pm_val=="undefined"){
    //             obj.pm[pm_key]="";
    //         }
    
    //     }
    
    //     if(obj.name == "iscript"){
    //         this.flag_script = true;
    //         this.rawName = "textScript"
    //         this.rawType = "rawText"
    //     }
    //     if(obj.name == "endscript"){
    //         this.flag_script = false;
    //         this.rawName = ""
    //         this.rawType = ""
    //     }
    
    
    
    //     switch (obj.name) {
    //         case "if":
    //             this.deep_if++;
    //         case "elsif": // eslint-disable-line
    //         case "else":
    //             obj.pm.deep_if = this.deep_if;
    //             break;
    //         case "endif":
    //             obj.pm.deep_if = this.deep_if;
    //             this.deep_if--;
    //             break;
    // 	}
    
    //     console.log("--Returning", JSON.stringify(obj, undefined, 2));
    //     return obj;
    
    // },
    makeTag:function(str,line, offset=0){
        console.log("%c Making tag", "color:aqua", str, line, offset);
        const result = {
            name: str.split(" ")[0],
            pm: [],
            line: line,
            val: "",
        };
        
        // Match all key='value' or key="value" pairs in the input, accounting for escaped quotes
        const regex = /(\w+)=(["'])(?:(?=(\\?))\3.)*?\2/g;
        let match;
        while ((match = regex.exec(str)) !== null) {
            const fullMatch = match[0];
            const param = match[1];
            const quoteType = match[2];
            const valueWithQuotes = fullMatch.substring(param.length + 1);
            const value = valueWithQuotes.slice(1, -1).replace(/\\(['"])/g, '$1');
            const start = match.index + param.length + 2; // Adding 2 for the equal sign and opening quote
            const end = start + value.length - 1; // Subtract 1 to account for the closing quote
            console.log("valueWithQuotes", valueWithQuotes)
            result.pm.push({
                param,
                value,
                start:start+offset+1,
                end:start+offset+1+valueWithQuotes.length-2
            });
        }

        if(result.name == "iscript"){
            this.flag_script = true;
            this.rawName = "textScript"
            this.rawType = "rawText"
        }
        if(result.name == "endscript"){
            this.flag_script = false;
            this.rawName = ""
            this.rawType = ""
        }

        switch (result.name) {
            case "if":
                this.deep_if++;
            case "elsif": // eslint-disable-line
            case "else":
                result.pm.deep_if = this.deep_if;
                break;
            case "endif":
                result.pm.deep_if = this.deep_if;
                this.deep_if--;
                break;
    	}        
        
        return result;
    },
    
    test:function(){
        
    }
};

TyranoParser.decodeAttr = function(attr, enclosureType) {
    if (!enclosureType) return attr;
    if (enclosureType == "'") return attr.replace(/\\'/g, "'");
    if (enclosureType == '"') return attr.replace(/\\"/g, '"');
    return attr;
}


/**
 * Get the grouped text and attributes that need to be translated, along with their positions in the original scenario text. This is the main function that will be used by translator++. It will return an array of objects, each object contains the text to be translated, its position in the original text, and its type (literal text, attribute value, etc). The type can be used to determine how to display the text in translator++. For example, attribute values can be displayed in a different color or with a different background to indicate that they are part of a tag.
* @param  {Object} scenarioObj - parseScenario result object 
* @param  {String} scenarioObj.text - ts file content
* @param  {Array} scenarioObj.array_s - Array of scenario data
* @param  {Array} scenarioObj.map_label - Map of labels on the scenario
* @param  {String[]} literalTags - Command that will be treated as literal text and will be displayed to translator++
*/

TyranoParser.getWritable = function(scenarioObj, literalTags, options={}) {
    console.log("getWritable", scenarioObj, literalTags, options);
    literalTags = literalTags || ["ruby", "l", "r"];
    options ||= {};
    options.captureTags ||= {
        // charaName: [
        //     {
        //         attr: ["name", "info"],
        //     }
        // ]
    };
    
    options.actorTags ||= {
        // charaName: {
        //     attr: "name",
        // }
    }
    
    const result =[];
    
    var lastPointer = 0;
    var lastObj;
    var lastActorName = "";
    
    scenarioObj.array_s.push({
        type:"EOF",
        name:"EOF",
        start:scenarioObj.text.length,
        end:scenarioObj.text.length
    })
    
    console.log("%c literalTags is", "color:blue", literalTags);
    console.log("%c ScenarioObj is", "color:blue", scenarioObj);
    
    for (var i = 0; i<scenarioObj.array_s.length; i++) {
        //console.log("Handling scenario index", i, scenarioObj.array_s[i])
        var thisObj = scenarioObj.array_s[i];
        var isChanged = false;
        
        thisObj.group = "untranslatable";
        if (thisObj.type == "literalText") {
            thisObj.group = "translatable"
        } else if (thisObj.name == "textScript") {
            thisObj.group = "script"
        } else if (thisObj.type == "EOF") {
            thisObj.group = "EOF"
        }
        
        if (literalTags.includes(thisObj.name)) thisObj.group = "translatable";
        
        if (Boolean(lastObj) == false) {
            isChanged = false;
        } else if (thisObj.group !== lastObj.group) {
            isChanged = true;
        }
        
        //console.log("thisObj", thisObj);
        
        // register actor name
        if (options.actorTags[thisObj.name]) {
            // if no attribute is present, then the name is the tag itself
            console.log("%cChecking actorTags", "color:green", options.actorTags[thisObj.name]);
            if (!options.actorTags[thisObj.name].attr) {
                lastActorName = thisObj.name;
            } else {
                // if the attribute is present, then the name is the value of the attribute
                let actorName = thisObj.pm.find(e => e.param == options.actorTags[thisObj.name].attr);
                if (actorName) {
                    // get enclosure
                    let enclosure = scenarioObj.text.substring(actorName.start - 1, actorName.start);
                    lastActorName = this.decodeAttr(actorName.value, enclosure);
                }
            }
        }
        
        // if exist in captureTags, process it regardless of the isChanged status
        if (options.captureTags[thisObj.name]) {
            // the structure is always untranslatable - translatable - untranslatable
            for (let captureTagInfo of options.captureTags[thisObj.name]) {
                // force thisObj as untranslatable. Because it can be wrongly marked as translatable if it is defined in the captureTags
                thisObj.group = "untranslatable";
                let capturedAttrs = captureTagInfo.attr;
                if (!Array.isArray(capturedAttrs)) capturedAttrs = [capturedAttrs];
                for (let capturedAttr of capturedAttrs) {
                    if (!Array.isArray(thisObj.pm)) continue; // if not a tag, pm is not an array
                    let attrInfo = thisObj.pm.find(e => e.param == capturedAttr);
                    if (!attrInfo) continue;
                    console.log("%c Processing capture tag", "color:orange", thisObj.name, "attrInfo", attrInfo);
                    
                    // register the first part of the text as untranslatable
                    const suffix = scenarioObj.text.substring(lastPointer, attrInfo.start)
                    result.push({
                        raw: suffix,
                        start: lastPointer,
                        end: attrInfo.start,
                        group: "untranslatable"
                    });
                    
                    // get type of encosure from the last character of the suffix. Enclosure can be quote, double quote, or null
                    let enclosure = suffix.substring(suffix.length - 1);
                    if (enclosure != "'" && enclosure != '"') {
                        enclosure = "";
                    }
                    
                    // register the captured text as translatable
                    // text must be escaped
                    result.push({
                        raw: scenarioObj.text.substring(attrInfo.start, attrInfo.end),
                        start: attrInfo.start,
                        end: attrInfo.end,
                        group: "translatable",
                        type: "attributevalue",
                        attribute: capturedAttr,
                        tag: thisObj.name,
                        enclosure: enclosure,
                    });
                    
                    // register the last part of the text as untranslatable
                    lastPointer = attrInfo.end;
                }
            }
        } else if (
            thisObj.name == "chara_ptext"
            && Array.isArray(thisObj.pm) == false
            && thisObj.pm
            && typeof thisObj.pm.name == "string"
            && typeof thisObj.pm.start == "number"
            && typeof thisObj.pm.end == "number"
        ) {
            // register the text
            console.log("%cRegistering chara_ptext", "color:lightblue", thisObj);
            lastActorName = thisObj.pm.name;
            
            // register the first part of the text as untranslatable
            const suffix = scenarioObj.text.substring(lastPointer, thisObj.pm.start)
            
            result.push({
                raw: suffix,
                start: lastPointer,
                end: thisObj.pm.start,
                group: "untranslatable"
            });
            
            // register the actor name as translatable
            result.push({
                raw: thisObj.pm.name,
                start: thisObj.pm.start,
                end: thisObj.pm.end,
                group: "translatable",
                type: "actorName",
            });
            
            lastPointer = thisObj.pm.end;
            
        } else if (isChanged) {
            // the last new line character of the translatable should belong to the untranslatable
            if (lastObj.group !== "translatable") {
                let newData = {}
                //console.log("Getting text ", lastPointer, thisObj.start);
                newData.raw     = scenarioObj.text.substring(lastPointer, thisObj.start)
                newData.start   = lastPointer
                newData.end     = lastObj.end
                newData.group   = lastObj.group
                //console.log("     0.lastObj = UNtranslatable, which is", lastObj, " inserting:", newData.raw)
                result.push(newData)
            } else {
                var lastLineMode = ""
                let newData = {}
                newData.raw     = scenarioObj.text.substring(lastPointer, thisObj.start)
                newData.start   = lastPointer
                newData.end     = lastObj.end
                newData.group   = lastObj.group
                if (lastActorName) {
                    newData.rowInfoText = lastActorName;
                    lastActorName = ""; // consume the actor name
                }
                
                if (newData.raw.substring(newData.raw.length - 2) == "\r\n") {
                    lastLineMode = "crlf"
                    newData.raw = newData.raw.substring(0, newData.raw.length - 2)
                    newData.end     = lastObj.end-2
                } else if (newData.raw.substring(newData.raw.length - 1) == "\n") {
                    lastLineMode = "lf"
                    newData.raw = newData.raw.substring(0, newData.raw.length - 1)
                    newData.end     = lastObj.end-1
                }
                //console.log("     1.lastObj = translatable, which is", lastObj, "from",lastPointer, "to",thisObj.start, " registering:", newData.raw)
                result.push(newData)
                
                if (lastLineMode == "crlf") {
                    let newData = {}
                    newData.raw     = "\r\n"
                    newData.start   = lastObj.end-2
                    newData.end     = lastObj.end
                    newData.group   = "untranslatable"
                    //console.log("     2.lastObj = translatable, which is", lastObj, " registering:", newData.raw)
                    
                    result.push(newData)
                } else if (lastLineMode == "lf") {
                    let newData = {}
                    newData.raw     = "\n"
                    newData.start   = lastObj.end-1
                    newData.end     = lastObj.end
                    newData.group   = "untranslatable"
                    //console.log("     3.lastObj = translatable, which is", lastObj, " registering:", newData.raw)
                    
                    result.push(newData)
                }
            }
            lastPointer = thisObj.start;
            
        }
        lastObj = thisObj;
    }
    
    return result;
}
exports.TyranoParser = TyranoParser;

/*
var TyranoParser = require("www/addons/kagParser/TyranoParser.js").TyranoParser;
var file = await common.fileGetContents("D:\\Test\\KAG\\repeatederror\\data\\scenario\\1.ks");
var obj = TyranoParser.parseScenario(file);
console.log("Parsed object", obj)
console.log("Structure group", TyranoParser.getWritable(obj));

var TyranoParser = require("www/addons/kagParser/TyranoParser.js").TyranoParser;
var file = await common.fileGetContents("D:/Test/KAG/dummy4/data/scenario/first.ks");
var obj = TyranoParser.parseScenario(file);
console.log("Parsed object", obj)
console.log("Structure group", TyranoParser.getWritable(obj));

var TyranoParser = require("www/addons/kagParser/TyranoParser.js").TyranoParser;
var file = await common.fileGetContents("D:/Test/KAG/dummy4/data/scenario/nocomment.ks");
var obj = TyranoParser.parseScenario(file);
var writableObj = TyranoParser.getWritable(obj);
console.log("Parsed object", obj)
console.log("Structure group", writableObj);


var TyranoParser = require("www/addons/kagParser/TyranoParser.js").TyranoParser;
var file = await common.fileGetContents("D:\\Test\\KAG\\dummy8\\data\\scenario\\first.ks");
var obj = TyranoParser.parseScenario(file);
console.log("Parsed object", obj)
console.log("Structure group", TyranoParser.getWritable(obj, ["ruby", "l", "r"], {
captureTags: {
charaName: [
{
attr: ["name", "info"],
}
],
},
actorTags: {
charaName: {
attr: "name",
}
}

}));
console.log("Text in a tag", obj.text.substring(obj.array_s[43].pm[0].start, obj.array_s[43].pm[0].end))
*/
