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
// Alternative thread. using HTTP server instead

const { resolve } = require('path');

class WSv {
    constructor(options) {
        this.options = options || {};
    }
}

WSv.actions = {
    echo: async function(data, req, res) {
        console.log("response back:", data.post.msg);
        res.write(data.post.msg);
    },
    run: async function(data, req, res) {
        try {
            if (data.post.type == "function") data.post.msg = `return (${data.post.msg})()`
            let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            var thisVal = new AsyncFunction(data.post.msg);
            var result = await thisVal() || ""
            res.write(result);
        } catch (e) {
            res.write("Error executing "+data.post.msg+"\n"+e.toString());
        }
    },
    close: async function(data, req, res) {
        window.close(true);
    }
}

WSv.prototype.action = async function(action, data, req, res) {
    if (!ThreadHost.actions[action]) return;
    return await ThreadHost.actions[action].call(this, data, req, res)
}

WSv.prototype.closeServer = function() {
    this.server.close();
}

WSv.prototype.startServer = function() {
	var http        = require('http');
	var url         = require('url');
	var querystring = require('querystring');
	var hostname    = '127.0.0.1';
	//this.port        = 29942;

    var collectRequestData = async function(request, callback) {
        callback = callback || async function() {}
        return new Promise(async (resolve, reject) => {
            const FORM_URLENCODED = 'application/x-www-form-urlencoded';
            if(request.headers['content-type'].includes(FORM_URLENCODED)) {
                let body = '';
                request.on('data', chunk => {
                    body += chunk.toString();
                });
                request.on('end', async () => {
                    await callback(querystring.parse(body));
                    resolve(querystring.parse(body));
                });
            }
            else {
                await callback(null);
                resolve(null);
            }
        })

    }

	this.server = http.createServer(async (req, res) => {
		console.log("Incoming connection:");
		console.log("Request:", req);
		console.log("response:", res);


		
		var query;
        var postData;
		if (req.url.includes("?")) {
			var queryStr = req.url.substring(req.url.indexOf("?")+1);
			query = querystring.parse(queryStr);
			console.log("query", query);
			// close server if success
			//this.server.close();
		}
        if (req.method === 'POST') {
            postData = await collectRequestData(req);
            console.log("Post data:", postData);
        }


		res.statusCode = 200;
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader('Content-Type', 'text/plain');
        if (query.action) {
            await this.action(query.action, {post:postData, get:query}, req, res);
        }

		// end the response
		res.end();
	});

	this.server.listen(this.port, hostname, () => {
	   this.setStatus(`Server running at http://${hostname}:${this.port}/`);
	});
}

WSv.prototype.setStatus = function(str) {
    $('[data-window="thread"] .status').html(str);
    console.log(str);
}





/**
 * @class
 */
class Thread {
    constructor(options) {
        this.options = options || {};
        this.port = this.options.port || common.rand(30000, 40000);
        
        while (Thread.list[this.port]) {
            this.port = common.rand(30000, 40000);
        }
        Thread.list[this.port] = this;
    }
}
Thread.list = [];

Thread.close = function() {
    delete Thread.list[this.port];
}

Thread.prototype.setReadyState = function(state) {
    this.isReady = state;
}

Thread.prototype.getReadyState = function(state) {
    this.isReady = state;
}

Thread.prototype.openThreadWindow = async function() {
    return new Promise((resolve, reject) => {
        nw.Window.open("www/thread.html?port="+this.port, {new_instance:true}, (win) => {
            console.log(arguments);
            resolve();
        });  
    })
}

Thread.prototype.send = async function(command, msg, options) {
    options         = options || {};
    options.msg     = msg || options.msg;
    options.type    = typeof options.msg;
    if (options.type == "function") {
        options.msg =  options.msg.toString();
    }
    this.setReadyState(false);
    return new Promise((resolve, reject) => {
        $.post(`http://127.0.0.1:${this.port}/?action=${command}`, options, function(data) {
            resolve(data);
        })
        .fail(function() {
           reject();
        })
        .always(()=> {
            this.setReadyState(true);
        })
    })
}

Thread.prototype.init = async function() {

}





/**
 * Handle socket as a server
 * @class
 */
var ThreadServer = function() {
    this.threadList = Thread.list;
}

ThreadServer.prototype.distributeTask = async function(tasks=[]) {
    if (Array.isArray(tasks) == false) tasks = [tasks]

}

/**
 * Add task to the iddle process.
 * If none is iddle, will wait until there is iddle process
 */
ThreadServer.prototype.addTask = async function() {
    
}

ThreadServer.actions = {
    echo: async function(data, req, res) {
        console.log("response back:", data.post.msg);
        res.write(data.post.msg);
    }
}

ThreadServer.prototype.action = async function(action, data, req, res) {
    if (!ThreadServer.actions[action]) return;
    return await ThreadServer.actions[action].call(this, data, req, res)
}

ThreadServer.prototype.startServer = function() {
	var http        = require('http');
	var url         = require('url');
	var querystring = require('querystring');
	var hostname    = '127.0.0.1';
	this.port        = 41014;

    var collectRequestData = async function(request, callback) {
        callback = callback || async function() {}
        return new Promise(async (resolve, reject) => {
            const FORM_URLENCODED = 'application/x-www-form-urlencoded';
            if(request.headers['content-type'].includes(FORM_URLENCODED)) {
                let body = '';
                request.on('data', chunk => {
                    body += chunk.toString();
                });
                request.on('end', async () => {
                    await callback(querystring.parse(body));
                    resolve(querystring.parse(body));
                });
            }
            else {
                await callback(null);
                resolve(null);
            }
        })

    }

	this.server = http.createServer(async (req, res) => {
		console.log("Incoming connection:");
		console.log("Request:", req);
		console.log("response:", res);


		
		var query;
        var postData;
		if (req.url.includes("?")) {
			var queryStr = req.url.substring(req.url.indexOf("?")+1);
			query = querystring.parse(queryStr);
			console.log("query", query);
			// close server if success
			//this.server.close();
		}
        if (req.method === 'POST') {
            postData = await collectRequestData(req);
            console.log("Post data:", postData);
        }


		res.statusCode = 200;
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader('Content-Type', 'text/plain');
        if (query.action) {
            await this.action(query.action, {post:postData, get:query}, req, res);
        }

		// end the response
		res.end();
	});

	this.server.listen(this.port, hostname, () => {
	   this.setStatus(`Server running at http://${hostname}:${this.port}/`);
	});
}





/**
 * Handle socket as a client
 * @class
 */
 class ThreadHost extends WSv {
	constructor(options) {
		super(options);
		this.init();
	}
}

ThreadHost.prototype.init = function() {
    this.query = window.location.search.substr(1)
    var searchparam = new URLSearchParams(this.query);
    this.port = searchparam.get("port")
}


$(document).ready(function() {
	if ($('body').is('[data-window="thread"]') == false) return;
    window.threadHost = new ThreadHost();
    threadHost.startServer();

})