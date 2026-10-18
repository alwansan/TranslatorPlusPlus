/*
String:
/("|')(?:#\{[^}]+\}|#(?!\{)|\\(?:\r\n|[\s\S])|(?!\1)[^\\#\r\n])*\1/

Heredoc:
/<<[-~]?([a-z_]\w*)[\r\n](?:.*[\r\n])*?[\t ]*\1/i

%/ msg / format
/%\/(.*)\//sg


inside string #{something}:
#\{[^}]+\}


Single line comment:
#.*

Multiple row comment:
/^=begin\s[\s\S]*?^=end/m


Prism.tokenize(await common.fileGetContents('test/ruby/test.rb'), Prism.languages.ruby)
*/



var parseRuby = function(text) {
    if (!text) return text;

    // clear out comments
    var clearedText = text.replace(/#.*/g, (match)=>{
        return " ".repeat(match.length);
    });

    clearedText = clearedText.replace(/^=begin\s[\s\S]*?^=end/mg, (match)=>{
        return " ".repeat(match.length);
    });

}