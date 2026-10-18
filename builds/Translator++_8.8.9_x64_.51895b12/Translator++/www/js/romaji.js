/**=====LICENSE STATEMENT START=====
    Translator++ 
    CAT (Computer-Assisted Translation) tools and framework to create quality
    translations and localizations efficiently.
        
    Copyright (C) 2018  Dreamsavior<dreamsavior@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
=====LICENSE STATEMENT END=====*/
const romaji = {
	maxCache: 100,
	cache:[],
	cacheData:{},
	rowMode:"table", // table or cell
	generator:"kuromoji" // "wanakana" | "kuromoji" | "mecab"
};
// trans.config = trans.config||{};
// trans.config.loadRomaji = trans.config.loadRomaji||true;

romaji.addCache = function(data, result) {
	if (!data) return false;
	if (romaji.cache.includes(data) == false) {
		romaji.cache.unshift(data);
		romaji.cacheData[data] = result;
		
		while (romaji.cache.length > romaji.maxCache) {
			var id = romaji.cache.pop();
			delete romaji.cacheData[id];
		}
	}
	return true;
}

romaji.loadCache = function(data) {
	if (typeof romaji.cacheData[data] !== 'undefined') return romaji.cacheData[data];
	return false;
}

/**
 * Render a result array (same shape returned by both workers) into $target.
 * @param {jQuery} $target
 * @param {Array<Array<{original:string, romaji:string}>>} result
 */
romaji._renderResult = function($target, result) {
	$target.empty();
	for (let line=0; line<result.length; line++) {
		if (Array.isArray(result[line]) == false) continue;
		if (romaji.rowMode !== "table") {
			let $row = $("<div class='wbw'></div>");
			for (let i=0; i<result[line].length; i++) {
				if (result[line][i]['romaji'].length < 1) result[line][i]['romaji'] = " ";
				let template = $("<span><i>"+result[line][i]['romaji']+"</i><b>"+result[line][i]['original']+"</b></span>");
				$row.append(template);
			}
			$target.append($row);
		} else {
			let $row    = $("<div class='tbl'></div>");
			let $romaji = $("<span class='romaji'></span>");
			let $kanji  = $("<span class='kanji'></span>");
			for (let i=0; i<result[line].length; i++) {
				if (result[line][i]['romaji'].length < 1) result[line][i]['romaji'] = " ";
				$romaji.append("<i>"+result[line][i]['romaji']+"</i>");
				$kanji.append("<b>"+result[line][i]['original']+"</b>");
			}
			$row.append($romaji);
			$row.append($kanji);
			$target.append($row);
		}
	}
}

romaji.resolve = function(text, $target) {
	let rubyTextHandler = sys.getConfig("rubyTextHandler") || romaji.generator;
	if (!text) {
		$target.text("");
		$target.addClass("plain");
		return false;
	}
	if (common.containJapanese(text) == false) {
		$target.text(text);
		$target.addClass("plain");
		$target.attr("data-lang", "");
		return false;
	}
	
	$target.removeClass("plain");
	$target.attr("data-lang", "ja");
	var loadedCache = romaji.loadCache(text);
	if (loadedCache !== false) {
		romaji._renderResult($target, loadedCache);
		return true;
	}
	

	if (this._debounce) clearTimeout(this._debounce);
	this._debounce = setTimeout(()=> {
		const Handler = require("www/js/CommonWorker.js").Handler;
		var workerScript, workerData;

		const utilJModules = nwPath.join(nw.process.cwd(), "www", "addons", "utilJ", "node_modules");

		if (rubyTextHandler === "mecab") {
			workerScript = "./www/js/mecab.worker.js";
			workerData = {
				text: text,
				appRoot: nw.process.cwd(),
				options: { logTarget: "ui" }
			};
		} else if (rubyTextHandler === "kuromoji") {
			workerScript = "./www/js/kuromoji.worker.js";
			workerData = {
				text: text,
				kuromojiPath:     nwPath.join(utilJModules, "kuromoji"),
				kuromojiDictPath: nwPath.join(utilJModules, "kuromoji", "dict"),
				wanakanaPath:     nwPath.join(utilJModules, "wanakana"),
				options: { logTarget: "ui" }
			};
		} else {
			// default: wanakana
			workerScript = "./www/js/wanakana.worker.js";
			workerData = {
				text: text,
				wanakanaPath: nwPath.join(utilJModules, "wanakana"),
				options: { logTarget: "ui" }
			};
		}

		const handler = new Handler(workerScript, workerData);
		handler.getResult().then(function(msg) {
			const result = msg.result;
			console.log("Romaji result ("+romaji.generator+") :", result);
			if (Array.isArray(result)) {
				romaji.addCache(text, result);
				if (typeof $target == 'undefined') return;
				romaji._renderResult($target, result);
			}
		}).catch(function(err) {
			console.error("Romaji worker error ("+romaji.generator+"):", err);
		});
	}, 200);
	
	return true;
}