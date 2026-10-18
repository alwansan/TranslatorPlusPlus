var bufferTools = {}

bufferTools.split = function(buf,splitBuf,includeDelim) {
  var search = -1
  , lines = []
  , move = includeDelim?splitBuf.length:0
  ;

  while((search = buf.indexOf(splitBuf)) > -1){
    lines.push(buf.slice(0,search+move));
    buf = buf.slice(search+splitBuf.length,buf.length);
  }

  lines.push(buf);
        
  return lines;
	
}

bufferTools.join = function(arr, separator) {
  if (!separator) {
    separator = Buffer.alloc(0)
  } else {
    separator = Buffer.from(separator)
  }

  switch (arr.length) {
    case 0:
      return Buffer.alloc(0)
    case 1:
      return arr[0]
    case 2:
      return Buffer.concat([arr[0], separator, arr[1]])
    case 3:
      return Buffer.concat([arr[0], separator, arr[1], separator, arr[2]])
  }

  let result = Buffer.from(arr[0])
  for (let i = 1; i < arr.length; i++) {
    result = Buffer.concat([result, separator, arr[i]])
  }

  return result
}

bufferTools.replace = function(buf, src, rep) {
	buf = Buffer.from(buf)
	src = Buffer.from(src)
	rep = Buffer.from(rep)
	var split = this.split(buf, src)
	return this.join(split, rep)
}

module.exports = bufferTools;