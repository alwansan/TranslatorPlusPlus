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
(()=>{
	console.log("Ajax interceptor is loaded");
	console.log("This script will run window.onAfterIntercept() when loading https://www.bing.com/ttranslatev3");
	var originalXMLHttpRequest_send = XMLHttpRequest.prototype.send;
	XMLHttpRequest.prototype.send = function(sentData) {
		var parseQuery = function(queryString) {
			if (!queryString) return;
			var query = {};
			var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
			for (var i = 0; i < pairs.length; i++) {
				var pair = pairs[i].split('=');
				query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
			}
			return query;
		}	

		var base = 'https://www.bing.com/ttranslatev3';
		var self = this;
		var parsedData;
		if (typeof sentData == 'string') {
			parsedData = parseQuery(sentData);
		}
		

		
		var onReadyStateChange = () => {
			var result = {};
			if (this.responseURL.includes(base) == false) return;
			if (this.readyState !== 4 ) return result;
			
			console.log("Ajax intercepted");
			console.log("response url:", this.responseURL);	
			console.log("This:", JSON.stringify(this, undefined, 2));	
			console.log("parsedData", parsedData);
			console.log(this, arguments);
			
			result = {
				response:this.response,
				url:this.responseURL,
				data:parsedData
			}
			
			if (typeof window.onAfterIntercept == 'function') {
				window.onAfterIntercept.call(this, result)
			}
		}
		
		originalXMLHttpRequest_send.apply(this, arguments);

		if (parsedData) {
			// only intercept when has post data
			this.addEventListener("readystatechange", onReadyStateChange, false);
		}
	}
	
	
	window.setInterval(function() {
		var parent = window.opener;
		console.log("pinging parent");
		if (Boolean(parent) == false) {
			console.log("parent doesn't exist");
			return window.close();
		}
	}, 5000);
})();
