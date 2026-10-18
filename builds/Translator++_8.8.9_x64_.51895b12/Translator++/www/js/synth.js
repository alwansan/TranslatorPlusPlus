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
var Synth = function() {
	// Voice synthesizer handler class
	// to initialize speechSynthesis
	try {
		speechSynthesis;
	} catch (error) {
		console.log(error);
	}
	this.init.apply(this, arguments);
}

Synth.prototype.init = function(defaultVal) {
	console.log("running initialization");
	defaultVal = defaultVal||{};
	
	
	var defaultValCopy = JSON.parse(JSON.stringify(defaultVal));
	if (typeof defaultValCopy == 'object') {
		for (var i in defaultValCopy) {
			this[i] = defaultValCopy[i];
		}
	}
	
	console.log("An instance of Synth is initialized");
}

Synth.prototype.isLanguageAvailable = function(lang) {
	let voices = speechSynthesis.getVoices();

	if (lang.includes("-")) {
		for (var i in voices) {
			if (voices[i].lang == lang) return true;
		}
	} else {
		for (var i in voices) {
			var voicesSegm = voices[i].lang.split("-");	
			if (voicesSegm[0] == lang) return true;
		}		
		
	}
	return false;
	
}

Synth.prototype.getFullLanguageCode = function(lang) {
	let voices = speechSynthesis.getVoices();
	for (var i in voices) {
		if (voices[i].lang.toLowerCase() == lang.toLowerCase()) return  voices[i].lang;
		var voicesSegm = voices[i].lang.split("-");	
		if (voicesSegm[0] == lang) return voices[i].lang;
	}		
	return false;
}

Synth.prototype.getVoiceByLang = function(lang) {
	let voices = speechSynthesis.getVoices();
	for (var i in voices) {
		if (voices[i].lang.toLowerCase() == lang.toLowerCase()) return  voices[i];
		var voicesSegm = voices[i].lang.split("-");	
		if (voicesSegm[0] == lang) return voices[i];
	}		
	return false;
}

Synth.prototype.speak = function(text, lang, options) {
	text = text||"";
	if (Boolean(lang) == false) return console.log("language field is empty");
	var langCode = this.getFullLanguageCode(lang);
	if (!langCode) return console.log("Unsupported language of "+lang);
	
	var utterance = new SpeechSynthesisUtterance(text);	
	utterance.pitch 	= this.pitch ?? sys.config?.speechPitch ?? 1;
	utterance.volume 	= this.volume ?? sys.config?.speechPitch ?? 1;
	utterance.rate 		= this.rate ?? sys.config?.speechRate ?? 1;
	utterance.lang 		= langCode;
	utterance.voice 	= this.getVoiceByLang(lang);
	speechSynthesis.speak(utterance);	
}


Synth.prototype.speakOriginal = function(text) {
	if (!trans.lastSelectedCell) return;
	this.speak(trans.grid.getDataAtCell(trans.lastSelectedCell[0], 0), trans.getSl());
}

Synth.prototype.speakTranslated = function(text) {
	if (!trans.lastSelectedCell) return;
	this.speak(trans.grid.getDataAtCell(trans.lastSelectedCell[0], trans.lastSelectedCell[1]), trans.getTl());
}

Synth.prototype.speakCurrent = function(text) {
	text = text || $("#currentCellText").val()
	if (!trans.lastSelectedCell) return;
	this.speak(text, trans.getTl());
}

synth = new Synth();