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
/*
	Community version :
		Available for all.
		The translation result will be available for public domain
		
	Pro version :
		Can choose to do private project
*/
var Uploader = {};

Uploader.readChunk = async function(file, offset, length) {
	offset	= offset || 0;
	length	= length || 1024;
	var size = await common.getFileSize(file);
	if (size-offset < length) length = size-offset;

	return new Promise((resolve, reejct) => {
		fs.open(file, 'r', function postOpen(errOpen, fd) {
			fs.read(fd, Buffer.alloc(length), 0, length, offset, function postRead(errRead, bytesRead, buffer) {
				resolve(buffer.toString('base64'));
			});
		});
	})
}

Uploader.chunkBuffer = async function(buff, offset, length) {
	offset	= offset || 0;
	length	= length || 1024;
	return buff.slice(offset, offset+length);
}


Uploader.postFile = async function(file, remotePath, destination) {
	destination = destination || nwPath.basename(file);
	if (!remotePath) return console.warn("Remote path is unknown");
	/*
	* batchID : the unique id received each time 
	*/
	var startSession = async function(filename, destination, size) {
		return new Promise(async (resolve, reject) => {
			var postData = {
				chunkUpload:"start",
				filename: filename,
				size:size,
				destination:destination,
				cid			: await transHub.getCid()
			}

			$.post(remotePath, postData)
			.done((data) => {
				if (data.error) {
					console.warn(data.error);
				}
				resolve(data.batchID)
			})
			.fail((msg) => {
				resolve(false)
			})			
		});
	}

	var postChunk = async function(batchID, chunk) {
		return new Promise(async (resolve, reject) => {
			var postData = {
				chunkUpload:"chunk",
				batchID: batchID,
				chunk:chunk,
				cid: await transHub.getCid()
			}

			$.post(remotePath, postData)
			.done((data) => {
				resolve(data.batchID)
			})
			.fail((msg) => {
				resolve(false)
			})			
		});
	}

	var endSession = async function(batchID) {
		return new Promise(async (resolve, reject) => {
			var postData = {
				chunkUpload:"end",
				batchID: batchID,
				endSession:true,
				cid: await transHub.getCid()
			}

			$.post(remotePath, postData)
			.done((data) => {
				resolve(data.path)
			})
			.fail((msg) => {
				resolve(false)
			})			
		});
	}

	var size = await common.getFileSize(file);
	var sessionID = await startSession(nwPath.basename(file), destination, size);

	if (!sessionID) {
		console.warn("can not create session");
		return false;
	}

	console.log("Session ID", sessionID);
	const offsetLength 	= 1024*256; //256kb
	var currentOffset 	= 0;
	const maxIteration 	= 10000;
	var iteration = 0;
	while (true) {
		console.log(currentOffset);

		var chunk = await this.readChunk(file, currentOffset, offsetLength);

		var chunkResult = await postChunk(sessionID, chunk);
		if (chunkResult) {
			currentOffset = currentOffset+offsetLength;
		}

		if (currentOffset >= size) break; 

		if (maxIteration) {
			iteration++;
			if (iteration > maxIteration) {
				console.warn("Terminated because of maximum iteration reached");
				break;
			}
		}
		common.wait(10); // wait 10ms
	}
	return await endSession(sessionID);
}

Uploader.bufferToArrayBuffer = function(b) {
	return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

Uploader.postData = async function(data, filename, remotePath) {
	filename = filename || "postfile.gz";
	var destination = "postfile.gz";
	if (!remotePath) return console.warn("Remote path is unknown");
	/*
	* batchID : the unique id received each time 
	*/
	var startSession = async function(filename, destination, size) {
		return new Promise(async (resolve, reject) => {
			var postData = {
				chunkUpload	:"start",
				filename	: filename,
				size		: size,
				destination	: destination,
				cid			: await transHub.getCid()
			}

			$.post(remotePath, postData)
			.done((data) => {
				if (data.error) {
					console.warn(data.error);
				}
				resolve(data.batchID)
			})
			.fail((msg) => {
				resolve(false)
			})			
		});
	}

	var postChunk = async function(batchID, chunk) {
		return new Promise(async (resolve, reject) => {

			if (typeof chunk == "string") {
				var postData = {
					chunkUpload:"chunk",
					batchID: batchID,
					chunk:chunk,
					cid: await transHub.getCid()
				}
	
				$.post(remotePath, postData)
				.done((data) => {
					resolve(data)
				})
				.fail((msg) => {
					resolve(false)
				})			

			} else if (Buffer.isBuffer(chunk)) {
				//var arraybuffer = new Blob(Uint8Array.from(chunk).buffer);
				var arraybuffer = new Blob([Uploader.bufferToArrayBuffer(chunk)]);
				var form = new FormData();
				form.append('chunkUpload', "chunk");
				form.append('cid', await transHub.getCid());
				form.append('batchID', batchID);
				form.append('chunk', arraybuffer, filename);

				$.ajax({
					url			: remotePath,
					type		: 'POST',
					data		: form,
					processData	: false,
					contentType	: false
				})
				.done((data) => {
					resolve(data)
				})
				.fail((msg) => {
					resolve(false)
				})
			}
		});
	}

	var endSession = async function(batchID) {
		return new Promise(async (resolve, reject) => {
			var postData = {
				chunkUpload:"end",
				batchID: batchID,
				endSession:true,
				cid: await transHub.getCid()
			}

			$.post(remotePath, postData)
			.done((data) => {
				console.log("upload finished", data);
				resolve(data)
			})
			.fail((msg) => {
				resolve(false)
			})			
		});
	}

	var size = data.length;
	var sessionID = await startSession(nwPath.basename(filename), destination, size);

	if (!sessionID) {
		console.warn("can not create session");
		return false;
	}

	if (common.debugLevel() > 2) console.log("Session ID", sessionID);
	const offsetLength 	= 1024*256; //256kb
	var currentOffset 	= 0;
	const maxIteration 	= 1000;
	var iteration 		= 0;
	var errorCount		= 0;
	var maxErrorCount	= 5;

	while (true) {
		if (common.debugLevel() > 2) console.log(currentOffset);

		var chunk = await this.chunkBuffer(data, currentOffset, offsetLength);

		var chunkResult = await postChunk(sessionID, chunk);
		if (chunkResult.error) {
			errorCount++;
			if (errorCount>= maxErrorCount) {
				console.warn("Terminated because maximum error reached");
				break;
			}
		} else if (chunkResult.batchID) {
			currentOffset = currentOffset+offsetLength;
		}

		if (currentOffset >= size) break; 

		if (maxIteration) {
			iteration++;
			if (iteration > maxIteration) {
				console.warn("Terminated because of maximum iteration reached");
				break;
			}
		}
		common.wait(10); // wait 10ms
	}
	return await endSession(sessionID);
}

function getHomepageBaseTransHub() {
	var homepage = (nw && nw.App && nw.App.manifest && nw.App.manifest.homepage) ? nw.App.manifest.homepage : "";
	if (typeof homepage !== "string" || !homepage.trim()) homepage = "https://dreamsavior.net";
	return homepage.replace(/\/+$/, "");
}

class TransHub extends require("www/js/BasicEventHandler.js") {
	constructor() {
		super();
		this.init();
	}
}

TransHub.prototype.post = async function(data) {
	return new Promise((resolve, reject) => {
		var postData = {
			title			: data.gameTitle,
			projectId		: data.projectId,
			cid				: data.cid,
			build_on		: data.buildOn,
			sl				: data.sl,
			tl				: data.tl,
			engine			: data.gameEngine,
			parser			: data.parser,
			parser_version	: data.parserVersion,
			editor_version	: data.editorVersion,
			crc				: data.crc,
			projectChecksum : data.projectChecksum,
			stats			: data.stats,
		}

		$.post(getHomepageBaseTransHub() + '/rest/transhub/sync/?up=1', postData)
		.done((data) => {
			resolve(data)
		})
		.fail((msg) => {
			resolve(false)
		})			
	});
}

TransHub.prototype.pack = async function(data, options) {
	var zlib = require('zlib');
	options = options || {};
	var buff = Buffer.from([]);
	if (Buffer.isBuffer(data)) {
		buff = data;
	} else if (typeof data == "string") {
		buff = Buffer.from(data);
	} else if (typeof data == "object" && !empty(data)) {
		buff = Buffer.from(JSON.stringify(data));
	} else {
		console.error("Can not handle this type of data : ", data);
		return;
	}

	return new Promise((resolve, reject) => {
		zlib.gzip(buff, (err, result) => {
			if (err) {
				return reject(err);
			}
			return resolve(result);
		});
	})
}

TransHub.prototype.setLastSync = async function(data) {
	try {
		var syncInfo = {
			crc:common.crc32String(JSON.stringify(data.translationData)),
			time:Date.now()
		}
		trans.setConfig(["transHub", "lastSync"], syncInfo);
	} catch (e) {
	}
}

TransHub.prototype.isChanged = async function(data) {
	try {
		var currentCRC = trans.getConfig(["transHub", "lastSync", "crc"]);
		var thisCRC = data.crc || common.crc32String(JSON.stringify(data.translationData));
		return currentCRC !== thisCRC;
	} catch (e) {
	}
}


TransHub.prototype.submitTranslation = async function(data) {
	this.trigger("beforeSubmitTranslation", [data]);
	console.log("submitTranslation", data);
	if (empty(data)) return;
	if (empty(data.translationData)) return;

	// do not process when selected partially
	//if (!(trans.isAllSelected() || trans.getCheckedFiles().length == 0)) return;
	if (!(trans.isAllSelected() || trans.getCheckedFiles().length == 0)) {
		data = trans.getTranslationData(undefined, {
			useSelectedFiles:false,
			disableEvent:true
		});
		if (empty(data)) return;
		if (empty(data.translationData)) return;
	}

	data.crc			= common.crc32String(JSON.stringify(data.translationData));
	if (!await this.isChanged(data)) return; // no change in the data

	try {
		var stats = trans.getStats();
		data.stats = stats;
		data.percent = stats.percent;
		// do not process if the 
		if (data.percent < 50) return;
	} catch (e) {
	}

	data.buildOn 		= trans.project.buildOn;
	data.editorVersion 	= trans.project.editorVersion;
	data.gameEngine 	= trans.project.gameEngine;
	data.gameTitle 		= trans.project.gameTitle;
	data.parserVersion 	= trans.project.parserVersion;
	data.parser 		= trans.project.parser;
	data.projectId 		= trans.project.projectId;
	data.projectChecksum= trans.getProjectChecksum();
	data.sl 			= trans.getSl();
	data.tl 			= trans.getTl();
	data.cid			= await this.getCid();

	var syncStatus 	= await this.post(data);
	if (syncStatus.status !== "ok") return;

	//console.log("Sync status", syncStatus);
	//console.log("Syncing");
	var bin 		= await this.pack(JSON.stringify(data));
	var result 		= await Uploader.postData(bin, syncStatus.id, syncStatus.url);
	console.warn("Sync result", result);
	//console.log("Sync completed");
	this.setLastSync(data);
	this.trigger("afterSubmitTranslation", [data]);
}

TransHub.prototype.getSN = async function() {
	const crypto = require('crypto')
	var thisSN = await common.aSpawn("wmic", ["csproduct", "get", "UUID"], {"shell":true})
	if (!thisSN) return common.generateId();
	var lines = thisSN.replaceAll("\r", "").split("\n");
	var sn = lines[2].trim()
	if (sn == "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF") return common.generateId(); 
	return crypto.createHash('md5').update(sn).digest('hex')
}

TransHub.prototype.getCid = async function() {
	this.cid = localStorage.getItem("cid");
	if (!this.cid) this.cid = await this.getSN();

	localStorage.setItem("cid", this.cid);
	return this.cid;
}

TransHub.prototype.handleCellChange = function(changes, source) {
	console.log("afterCellChange", changes, source);
	for (var i in changes) {
		if (!changes[i][3]) {
			trans.cellInfo.delete("t", trans.getSelectedId(), changes[i][0], changes[i][1])
			continue;
		}
		trans.cellInfo.set("t", "HU", trans.getSelectedId(), changes[i][0], changes[i][1])
	}
}

TransHub.prototype.checkOnlineTranslation = async function(trans) {
	trans = trans || window.trans;
	if (!trans.project) return;
	var data = {}
	data.buildOn 		= trans.project.buildOn;
	data.editorVersion 	= trans.project.editorVersion;
	data.gameEngine 	= trans.project.gameEngine;
	data.gameTitle 		= trans.project.gameTitle;
	data.parserVersion 	= trans.project.parserVersion;
	data.parser 		= trans.project.parser;
	data.projectId 		= trans.project.projectId;
	data.projectChecksum= trans.getProjectChecksum();
	data.sl 			= trans.getSl();
	data.tl 			= trans.getTl();
	data.cid			= await this.getCid();
	try {
		var stats = trans.getStats();
		data.stats = stats;
		data.percent = stats.percent;
	} catch (e) {
	}

	const backEnd = getHomepageBaseTransHub() + "/rest/transhub/search/";
	var req = await fetch(backEnd, {
		method: 'POST', // or 'PUT'
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});
	
	return req.json();
}

TransHub.prototype.init = function() {
	$(document).ready(()=> {
		this.trigger("beforeInit");

		trans.on("afterCellChange", (e, changes, source)=> {
			this.handleCellChange(changes, source);
		})

		$(document).on("onGenerateTranslationData", (e, data)=>{
			console.warn("Translation submitted");
			this.submitTranslation(data);
		})
		this.trigger("afterInit");
		this.resolveState("ready");
	});
}

var transHub = new TransHub();