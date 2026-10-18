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

const SRC = [
	"きゃ","きゅ","きょ",
	"しゃ","しゅ","しょ",
	"ちゃ","ちゅ","ちょ",
	"にゃ","にゅ","にょ",
	"ひゃ","ひゅ","ひょ",
	"みゃ","みゅ","みょ",
	"りゃ","りゅ","りょ",
	"ぎゃ","ぎゅ","ぎょ",
	"じゃ","じゅ","じょ",
	"ぢゃ","ぢゅ","ぢょ",
	"びゃ","びゅ","びょ",
	"ぴゃ","ぴゅ","ぴょ",

	"あ","い","う","え","お",
	"か","き","く","け","こ",
	"さ","し","す","せ","そ",
	"た","ち","つ","て","と",
	"な","に","ぬ","ね","の",
	"は","ひ","ふ","へ","ほ",
	"ま","み","む","め","も",
	"や","ゆ","よ",
	"ら","り","る","れ","ろ",
	"わ","ゐ","ゑ","を",
	"が","ぎ","ぐ","げ","ご",
	"ざ","じ","ず","ぜ","ぞ",
	"だ","ぢ","づ","で","ど",
	"ば","び","ぶ","べ","ぼ",
	"ぱ","ぴ","ぷ","ぺ","ぽ",
	"ん",

	"キャ","キュ","キョ",
	"シャ","シュ","ショ",
	"チャ","チュ","チョ",
	"ニャ","ニュ","ニョ",
	"ヒャ","ヒュ","ヒョ",
	"ミャ","ミュ","ミョ",
	"リャ","リュ","リョ",
	"ギャ","ギュ","ギョ",
	"ジャ","ジュ","ジョ",
	"ヂャ","ヂュ","ヂョ",
	"ビャ","ビュ","ビョ",
	"ピャ","ピュ","ピョ",
	"デャ","デュ","デョ",
	"テャ","テュ","テョ",

	"ア","イ","ウ","エ","オ",
	"カ","キ","ク","ケ","コ",
	"サ","シ","ス","セ","ソ",
	"タ","チ","ツ","テ","ト",
	"ナ","ニ","ヌ","ネ","ノ",
	"ハ","ヒ","フ","ヘ","ホ",
	"マ","ミ","ム","メ","モ",
	"ヤ","ユ","ヨ",
	"ラ","リ","ル","レ","ロ",
	"ワ","ヰ","ヱ","ヲ",
	"ガ","ギ","グ","ゲ","ゴ",
	"ザ","ジ","ズ","ゼ","ゾ",
	"ダ","ヂ","ヅ","デ","ド",
	"バ","ビ","ブ","ベ","ボ",
	"パ","ピ","プ","ペ","ポ",

	"ン","ィ","ェ","ォ",
	"っ","ッ",
	"ぁ","ぃ","ぅ","ぇ","ぉ",
	"ゃ","ゅ","ょ"
];

const REP = [
	"kya","kyu","kyo",
	"sha","shu","sho",
	"cha","chu","cho",
	"nya","nyu","nyo",
	"hya","hyu","hyo",
	"mya","myu","myo",
	"rya","ryu","ryo",
	"gya","gyu","gyo",
	"jya","jyu","jyo",
	"dya","dyu","dyo",
	"bya","byu","byo",
	"pya","pyu","pyo",

	"a","i","u","e","o",
	"ka","ki","ku","ke","ko",
	"sa","shi","su","se","so",
	"ta","chi","tsu","te","to",
	"na","ni","nu","ne","no",
	"ha","hi","fu","he","ho",
	"ma","mi","mu","me","mo",
	"ya","yu","yo",
	"ra","ri","ru","re","ro",
	"wa","wi","we","wo",
	"ga","gi","gu","ge","go",
	"za","ji","zu","ze","zo",
	"da","dji","dzu","de","do",
	"ba","bi","bu","be","bo",
	"pa","pi","pu","pe","po",
	"n",

	"kya","kyu","kyo",
	"sha","shu","sho",
	"cha","chu","cho",
	"nya","nyu","nyo",
	"hya","hyu","hyo",
	"mya","myu","myo",
	"rya","ryu","ryo",
	"gya","gyu","gyo",
	"jya","jyu","jyo",
	"dya","dyu","dyo",
	"bya","byu","byo",
	"pya","pyu","pyo",
	"dya","dyu","dyo",
	"tya","tyu","tyo",

	"a","i","u","e","o",
	"ka","ki","ku","ke","ko",
	"sa","shi","su","se","so",
	"ta","chi","tsu","te","to",
	"na","ni","nu","ne","no",
	"ha","hi","fu","he","ho",
	"ma","mi","mu","me","mo",
	"ya","yu","yo",
	"ra","ri","ru","re","ro",
	"wa","wi","we","wo",
	"ga","gi","gu","ge","go",
	"za","ji","zu","ze","zo",
	"da","dji","dzu","de","do",
	"ba","bi","bu","be","bo",
	"pa","pi","pu","pe","po",

	"n","i","e","o",
	"`","`",
	"a","i","u","e","o",
	"ya","yu","yo"
];

// Build a regex that matches the longest patterns first (SRC is already ordered longest-first)
const kanaRegex = new RegExp(
	SRC.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
	'g'
);
const romajiMap = Object.fromEntries(SRC.map((s, i) => [s, REP[i]]));

function kanaToRomaji(str) {
	return str.replace(kanaRegex, match => romajiMap[match] !== undefined ? romajiMap[match] : match);
}

/**
 * Parse a single MeCab sentence block into an array of token objects.
 * Each token: { original, furigana, romaji }
 * Mirrors the PHP parseMecab() logic.
 */
function parseMecab(input) {
	const result = [];
	if (!input) return result;

	const lines = input.split("\r\n");
	let mergeFirstChar = false;

	for (let key = 0; key < lines.length; key++) {
		const line = lines[key];
		if (line === "EOS" || line === "") break;

		const ELM = {};
		const segment = line.split(",");

		// Original token: part of first segment before the tab character
		const tabIdx = segment[0].indexOf("\t");
		ELM.original = tabIdx !== -1 ? segment[0].substring(0, tabIdx).trim() : segment[0].trim();

		// Furigana: last comma-separated field
		ELM.furigana = segment[segment.length - 1].trim();
		if (ELM.furigana === '*') {
			ELM.furigana = ELM.original;
		}

		ELM.romaji = kanaToRomaji(ELM.furigana);

		if (mergeFirstChar) {
			const x = ELM.romaji.charAt(0);
			if (result[key - 1]) {
				result[key - 1].romaji = result[key - 1].romaji.slice(0, -1) + x;
			}
			mergeFirstChar = false;
		}

		// Handle っ/ッ (represented as ` placeholder after kana conversion)
		while (ELM.romaji.includes("`")) {
			const location = ELM.romaji.indexOf("`");
			if (location >= ELM.romaji.length - 1) {
				mergeFirstChar = true;
				break;
			} else {
				const nextChar = ELM.romaji.charAt(location + 1);
				ELM.romaji = ELM.romaji.substring(0, location) + nextChar + ELM.romaji.substring(location + 1);
			}
			break;
		}

		result[key] = ELM;
	}

	return result;
}

thisWorker.process = async function(workerData) {
	const text = workerData.text;
	if (!text) return [];

	const path         = require("path");
	const childProcess = require("child_process");

	const appRoot  = workerData.appRoot;
	const mecabBin = path.join(appRoot, "3rdParty", "MeCab", "bin", "mecab.exe");

	const output = await new Promise((resolve, reject) => {
		const child = childProcess.spawn(mecabBin, [], { windowsHide: true });

		let stdout = "";
		let stderr = "";

		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");

		child.stdout.on("data", chunk => { stdout += chunk; });
		child.stderr.on("data", chunk => { stderr += chunk; });

		child.on("error", reject);
		child.on("close", code => {
			if (code !== 0 && !stdout) {
				reject(new Error("MeCab exited with code " + code + ": " + stderr));
			} else {
				resolve(stdout);
			}
		});

		child.stdin.write(text, "utf8");
		child.stdin.end();
	});

	// Split output into sentence blocks by "EOS\r\n"
	const sentenceBlocks = output.split("EOS\r\n");
	sentenceBlocks.pop(); // remove trailing empty element

	const result = [];
	for (const block of sentenceBlocks) {
		result.push(parseMecab(block.trimEnd()));
	}

	return result;
};

thisWorker.init();
