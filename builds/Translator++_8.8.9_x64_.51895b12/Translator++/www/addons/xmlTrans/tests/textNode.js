function textNodesUnder(el) {
    const children = [] // Type: Node[]
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    while(walker.nextNode()) {
      children.push(walker.currentNode)
    }
    return children
  }
var $xmlData = $(`<div>Hello world<br />Line 2</div>`)
var result = textNodesUnder($xmlData[0]);
// fill text node with new value
result[0].nodeValue = "unyuuu"
var translatedXML = (new XMLSerializer()).serializeToString($xmlData[0]);
console.log("Translated xml", translatedXML)


// create node
var thisXml = new addonLoader.addons.xmlTrans.XmlTrans("www/addons/xmlTrans/tests/test.xml", {
    config:[
        {targetTranslation:"allTextNodes"}
    ]
});
await thisXml.parse()