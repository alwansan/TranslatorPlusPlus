void async function() {
    function extractRubyStrings(rubyScript) {
        const stringPatterns = [
          /(["'])(?:(?=(\\?))\2.)*?\1/g, // Match strings in single or double quotes
          /<<-?(\w+).*?\1/m, // Match heredoc strings
        ];
        const commentPattern = /#.*$/gm; // Match comments
        let matches = [];
        
        // Remove comments from the script
        const uncommentedScript = rubyScript.replace(commentPattern, '');
      
        // Extract strings from the uncommented script
        stringPatterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(uncommentedScript)) !== null) {
            const enclosureType = match[0].startsWith('"') ? 'doubleQuote' : 'singleQuote';
            matches.push({
              text: match[0],
              offset: match.index,
              enclosureType: enclosureType
            });
          }
        });
      
        return matches;
      }
      
      // Example usage:
      const rubyScript = `# This is a comment
      puts "Hello, world!" # Another comment
      puts 'This isn\\'t escaped properly'
      <<-HEREDOC
      This is a heredoc string.
      HEREDOC`;
      
      console.log(extractRubyStrings(rubyScript));
}()


function containStringLiteral(rubyScript) {
    // Regular expression to match comments
    const commentRegex = /#[^\n]*/g;

    // Remove comments from the Ruby script
    const scriptWithoutComments = rubyScript.replace(commentRegex, '');

    // Regular expression to match any string literal
    const stringLiteralRegex = /'[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*"|<<-?(\w+)\s*(?:.*\s*)*\s*\1/g;

    // Check if any string literal is found in the Ruby script without comments
    return stringLiteralRegex.test(scriptWithoutComments);
}

