/**
 * Class to process and apply string replacement rules.
 * Supports direct string replacement, regular expressions, and function-based replacements.
 */
class TextReplacer {
    /**
     * @param {Array<[string, string|Function]>} rules - Array of replacement rules.
     */
    constructor(rules) {
        if (!Array.isArray(rules)) {
            throw new TypeError("Rules must be an array of [pattern, replacement] pairs.");
        }
        this.rules = this.parseRules(rules);
    }

    /**
     * Parses the rules and converts them into appropriate types.
     * @param {Array<[string, string|Function]>} rules - Raw rules from user input.
     * @returns {Array<[string|RegExp, string|Function]>} - Parsed rules.
     */
    parseRules(rules) {
        console.log("%cParsing rules", "color: yellow", rules);
        let parsedRules = [];
        
        for (let i = 0; i < rules.length; i++) {
            let [pattern, replacement] = rules[i];
            
            if (!pattern) continue; // Skip blank patterns
            
            if (typeof pattern !== "string" || (typeof replacement !== "string" && typeof replacement !== "function")) {
                throw new TypeError("Each rule must be a [string, string|function] pair.");
            }
    
            if (common.isStringFunction(replacement)) {
                try {
                    replacement = eval(replacement); // Convert string to function
                    if (typeof replacement !== "function") {
                        throw new TypeError("Evaluated replacement is not a function.");
                    }
                } catch (error) {
                    console.error("Error evaluating function string:", replacement, error);
                    throw new Error("Invalid function definition in replacement rule.");
                }
            }
    
            if (common.isRegExp(pattern)) {
                try {
                    parsedRules.push([
                        new RegExp(pattern.slice(1, pattern.lastIndexOf('/')), pattern.slice(pattern.lastIndexOf('/') + 1)),
                        replacement || ""
                    ]);
                    continue;
                } catch (error) {
                    console.error("Error creating RegExp:", pattern, error);
                    throw new Error("Invalid regular expression pattern.");
                }
            }
    
            parsedRules.push([pattern, replacement || ""]);
        }
        
        return parsedRules;
    }
    

    /**
     * Applies the replacement rules to the given text.
     * @param {string} text - The input text to process.
     * @returns {string} - The modified text.
     */
    apply(text) {
        if (typeof text !== "string") {
            throw new TypeError("Input text must be a string.");
        }
        return this.rules.reduce((result, [pattern, replacement]) => {
            if (!pattern) return result;
            return result.replace(pattern, replacement);
        }, text);
    }
}

module.exports = TextReplacer;