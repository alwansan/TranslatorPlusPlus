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
                    var array_line = tmp_line.split(":");
                    chara_name = array_line[0];
                    chara_face = array_line[1];
                }else{
                    chara_name = tmp_line;
                }
                //キャラクターボックスへの名前表示
               var text_obj = {
                                line:i,
                                name:"chara_ptext",
                                pm:{"name":chara_name,"face":chara_face},
                                val:text
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
                    console.warn("Warning line:"+i+" "+ t("label") +" '"+ label_obj.pm.label_name+"' "+ t("is duplicated in the same scenario file"));
                    
                 }else{
                    map_label[label_obj.pm.label_name] = label_obj.pm;
                 }     
            
            }else if(first_char ==="@"){
                //コマンド行確定なので、その残りの部分を、ごそっと回す
                let tag_str =line_str.substr(1,line_str.length); // "image split=2 samba = 5" 
                let tmpobj = this.makeTag(tag_str,i);
                tmpobj.type = "@Command";
                tmpobj.val = line_str;
                tmpobj.col = marginLeft; 
                tmpobj.start = offset+marginLeft;
                tmpobj.end = offset+marginLeft+line_str.length

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
                                var tagObject = this.makeTag(tag_str,i);
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
    makeTag:function(str,line){
        console.log("Making tag", str, line);
        var obj ={
            line:line,
            name:"",
            pm:{},
            val:""
        };
        
        
        var array_c = str.split("");
        
        var flag_quot_c = "";
        
        var tmp_str = "";
        
        var cnt_quot_c = 0;
        
        for (var j=0;j<array_c.length;j++){
            
            var c = array_c[j];
            
            if(flag_quot_c =="" && (c ==="\"" || c ==="'" )){
                flag_quot_c = c;
                cnt_quot_c = 0;
            }else{
            
                //特殊自体発生中
                if(flag_quot_c !=""){
                    
                    //特殊状態解除
                    if(c === flag_quot_c){
                        
                        flag_quot_c ="";
                        
                        //""のように直後に"が出てきた場合undefinedを代入
                        if(cnt_quot_c==0){
                            tmp_str+="undefined";
                        }
                    
                        cnt_quot_c=0;
                    
                    }else{
                    
                        if(c =="="){
                            c = "#";
                        }
                        
                        //空白削除。カンマの中の場合
                        if(c ==" "){
                            //個々消さないとダメ
                            c ="";
                        }
                        
                        tmp_str +=c;
                        cnt_quot_c++;
                    
                    }
                    
                
                    
                }else{
                    tmp_str +=c;
                }
                
            }
            
            
        }
        
        str = tmp_str ;
        
        //str = $.replaceAll(str,'"','');
        //str = $.replaceAll(str,"'",'');
                
        var array = str.split(" ");
        
        //タグの名前 [xxx 
        obj.name = $.trim(array[0]);
        
        //=のみが出てきた場合は前後のをくっつけて、ひとつの変数にしてしまって良い
        for(var k=1;k<array.length;k++){
            
            if(array[k] ==""){
                
                array.splice(k,1);
                k--;
            }
            
            else if(array[k] ==="="){
                if(array[k-1]){
                    if(array[k+1]){
                        array[k-1] = array[k-1]+"="+array[k+1];
                        array.splice(k,2);
                        k--;
                        
                    }
                }
            }else if(array[k].substr(0,1)==="="){
                if(array[k-1]){
                    if(array[k]){
                        array[k-1] = array[k-1]+array[k];
                        array.splice(k,1);
                        //k--;
                        
                    }
                }
            }else if(array[k].substr(array[k].length-1,array[k].length)==="="){
                if(array[k+1]){
                    if(array[k]){
                        array[k] = array[k]+array[k+1];
                        array.splice(k+1,1);
                        //k--;
                        
                    }
                }
            }
            
        }
        
        for(var i=1;i<array.length;i++){
            
            var tmp = $.trim(array[i]).split("=");
            
            var pm_key = $.trim(tmp[0]);
            var pm_val = $.trim(tmp[1]);
            
            //全引き継ぎ対応
            if(pm_key=="*"){
                obj.pm["*"]="";
            }
            //特殊変換された値はそのまま代入できない
            if(pm_val!=""){
                obj.pm[pm_key] = pm_val.replaceAll("#","=");
            }
            
            if(pm_val=="undefined"){
                obj.pm[pm_key]="";
            }
            
        }
        
        if(obj.name == "iscript"){
            this.flag_script = true;
            this.rawName = "textScript"
            this.rawType = "rawText"
        }
        if(obj.name == "endscript"){
            this.flag_script = false;
            this.rawName = ""
            this.rawType = ""
        }

     
        
        switch (obj.name) {
            case "if":
                this.deep_if++;
            case "elsif": // eslint-disable-line
            case "else":
                obj.pm.deep_if = this.deep_if;
                break;
            case "endif":
                obj.pm.deep_if = this.deep_if;
                this.deep_if--;
                break;
		}
        
        console.log("--Returning", JSON.stringify(obj, undefined, 2));
        return obj;
        
    },
    
    test:function(){
        
    }
};



/**
 * @param  {Object} scenarioObj - parseScenario result object 
 * @param  {String} scenarioObj.text - ts file content
 * @param  {Array} scenarioObj.array_s - Array of scenario data
 * @param  {Array} scenarioObj.map_label - Map of labels on the scenario
 * @param  {String[]} literalObj - Command that will be treated as literal text and will be displayed to translator++
 */

TyranoParser.getWritable = function(scenarioObj, literalObj, options={}) {
    literalObj = literalObj || ["ruby", "l", "r"]
    var result =[]

    var lastPointer = 0;
    var lastObj

    scenarioObj.array_s.push({
        type:"EOF",
        name:"EOF",
        start:scenarioObj.text.length,
        end:scenarioObj.text.length
    })

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
        
        if (literalObj.includes(thisObj.name)) thisObj.group = "translatable";

        if (Boolean(lastObj) == false) {
            isChanged = false;
        } else if (thisObj.group !== lastObj.group) {
            isChanged = true;
        }

        //console.log("thisObj", thisObj);

        if (isChanged) {
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
                lastPointer = thisObj.start;
            } else {
                var lastLineMode = ""
                let newData = {}
                newData.raw     = scenarioObj.text.substring(lastPointer, thisObj.start)
                newData.start   = lastPointer
                newData.end     = lastObj.end
                newData.group   = lastObj.group
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
                lastPointer = thisObj.start;
            }

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
console.log("Parsed object", obj)
console.log("Structure group", TyranoParser.getWritable(obj));
*/