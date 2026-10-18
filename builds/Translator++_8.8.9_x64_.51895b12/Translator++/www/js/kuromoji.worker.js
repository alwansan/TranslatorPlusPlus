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
const thisWorker = new (require("www/js/CommonWorker.js").Worker)();

thisWorker.process = async function(workerData) {
	const text = workerData.text;
	if (!text) return [];

	const kuromoji = require(workerData.kuromojiPath);
	const wanakana = require(workerData.wanakanaPath);

	const tokenizer = await new Promise((resolve, reject) => {
		kuromoji.builder({ dicPath: workerData.kuromojiDictPath }).build((err, t) => {
			if (err) return reject(err);
			resolve(t);
		});
	});

	const lines = text.split('\n');
	const result = [];

	for (const line of lines) {
		if (!line) {
			result.push([]);
			continue;
		}

		const tokens = tokenizer.tokenize(line);
		const lineTokens = tokens.map(t => {
			const original = t.surface_form;
			const reading  = t.reading || original;
			const romaji   = wanakana.toRomaji(reading);
			return { original, romaji };
		});
		result.push(lineTokens);
	}

	return result;
};

thisWorker.init();
