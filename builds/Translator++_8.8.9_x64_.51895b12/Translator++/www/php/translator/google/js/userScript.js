/* user script injected via miniProxy */

console.log("executing user script!");
(function() {
var oldXHR = window.XMLHttpRequest;

function newXHR() {
    var realXHR = new oldXHR();
    realXHR.addEventListener("readystatechange", function(evt) {
        if(realXHR.readyState==4 && realXHR.status==200){
            //afterAjaxComplete() //run your code here
			console.log("ajax completed");
			if (evt.target.responseURL.indexOf("?https://translate.google.com/translate_a/single?")) {
				console.log("translation process done!");
				console.log("process something here!");
				console.log(evt);
				window.parent.trans.google.onResponse(evt.target.response);
			}
        }
    }, false);
    return realXHR;
}
window.XMLHttpRequest = newXHR;	
})();