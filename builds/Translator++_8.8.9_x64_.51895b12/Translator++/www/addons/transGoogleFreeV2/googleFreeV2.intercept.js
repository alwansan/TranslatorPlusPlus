(()=>{
	console.log("Ajax interceptor is loaded");
	console.log("This script will run window.onAfterIntercept() when loading _/TranslateWebserverUi/data/batchexecute");
	async function postDataToServer(data) {
        console.log("Posting data", data);
        try {
          // Parse the query string from the current window's URL
          const urlSearchParams = new URLSearchParams(window.location.search);
          const portNumber = urlSearchParams.get('port');
      
          if (!portNumber) {
            console.error('Port number not found in the query string.');
            return;
          }
      
          const apiUrl = `http://localhost:${portNumber}`;
      
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // You can add other headers if needed
            },
            body: JSON.stringify(data),
          });
      
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
      
          const result = await response.text();
          console.log('Data sent successfully:', result);
          return result;
        } catch (error) {
          console.error('Error sending data:', error.message);
        }
      }
    
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

		var base = '_/TranslateWebserverUi/data/batchexecute';
		var self = this;
		var parsedData;
		if (typeof sentData == 'string') {
			parsedData = parseQuery(sentData);
		}
		

		
		var onReadyStateChange = async () => {
			var result = {};
			if (this.responseURL.includes(base) == false || this.responseURL.includes("rpcids=MkEWBc") == false) return;
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
			
            console.log("Posting", result);
			var postResponse = await postDataToServer(result);
            console.log("Received response", postResponse);
            if (postResponse.includes("Message received.")) {
                console.log("Message sent successfully, closing window.");
                window.close();
            }

		}
		
		originalXMLHttpRequest_send.apply(this, arguments);

		if (parsedData) {
			// only intercept when has post data
			this.addEventListener("readystatechange", onReadyStateChange, false);
		}
	}
	
	
	// window.setInterval(function() {
	// 	var parent = window.opener;
	// 	console.log("pinging parent");
	// 	if (Boolean(parent) == false) {
	// 		console.log("parent doesn't exist");
	// 		return window.close();
	// 	}
	// }, 5000);
})();
