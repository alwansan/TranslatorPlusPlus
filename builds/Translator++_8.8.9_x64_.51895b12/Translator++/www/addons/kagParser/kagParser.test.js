this.kagTest = async function() {
    var myKs = new KsFile(__dirname+'/notes/test/kag/test.ks');
    var result = await myKs.parse()
    console.log(result);
}


this.kagTest2 = async function() {
    var myKs = new KsFile(__dirname+'/notes/test/kag/101_con_0.ks');
    var result = await myKs.parse();
    myKs.write(__dirname+'/notes/test/kag/101_con_0.translated.ks');
    console.log(myKs);
    console.log(result);
}

this.readFileContent = async function(file) {
    var encoding 	= require('encoding-japanese');
    var iconv 		= require('iconv-lite');    

    return new Promise((resolve, reject) => {
        fs.readFile(file, (err, data) => {
            if (err) return reject();

            var detectedEnc = encoding.detect(data);
            console.log("detected encoding", detectedEnc);
            var string = iconv.decode(data, detectedEnc);
            console.log(string);
            resolve(string);
        })
        
    })
}
