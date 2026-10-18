
Prism.languages.ks = {
	// TODO Write tests.
	'comment': /\/\*[\s\S]*?\*\/|\/\/.*|#(?!\[).*/,
	'function': /^[\;\*\@].*\n?/m,
	'tag': {
		'pattern': /\[\/?(?!\d)[^\s\]\/=$\[%]+(?:\s(?:\s*[^\s\]\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'"\]=]+(?=[\s\]]))|(?=[\s/\]])))+)?\s*\/?\]/,
		inside: {
			'tag': {
				pattern: /^\[\/?[^\s\]\/]+/,
				inside: {
					'keyword': [
						/^\[\/?/,
						/^[^\s\]\/:]+/
						]
				}
			},
			'special-attr': [],
			'attr-value': {
				pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'"\]=]+)/,
				inside: {
					'punctuation': [
						{
							pattern: /^=/,
							alias: 'attr-equals'
						},
						/"|'/
					],
					'boolean': /\b(?:[Tt]rue|[Ff]alse)\b/,
					'number': /(?:\b(?:0[bo])?(?:(?:\d|0x[\da-f])[\da-f]*(?:\.\d*)?)|\B\.\d+)(?:e[+-]?\d+)?j?/i
					//'string':/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,

				}
			},
			'keyword': /\/?\]/,
			'attr-name': {
				pattern: /[^\s>\/]+/,
				inside: {
					'namespace': /^[^\s>\/:]+:/
				}
			},			
		}			
	}
};

module.exports = {}