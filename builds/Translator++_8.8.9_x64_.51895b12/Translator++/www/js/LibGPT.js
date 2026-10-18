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
const LibGPT = {}
LibGPT.templateParameters = {
    get LANG_FROM() {
        return langTools.getName(trans.getSl());
    },
    get LANG_TO() {
        return langTools.getName(trans.getTl());
    },
    get LANG_FROM_FULL() {
        return langTools.getFullName(trans.getSl());
    },
    get LANG_TO_FULL() {
        return langTools.getFullName(trans.getTl());
    },
    get ENGINE() {
        let engine = trans.project?.gameEngine;
        if (!engine) return;
        if (engine.startsWith("rm")) {
            engine = "RPG Maker "+engine.replace("rm", "");
        }
        return engine;
    },
    get TITLE() {
        return trans.project?.gameTitle;
    },
    REFERENCE : new Proxy({}, {
        get: function(target, name) {
            let obj = trans.getObjectById(name);
            if (!trans.project) return;
            if (!obj) return;
            if (!obj?.data?.length) return;
            const rows = [];
            const keyColumn = trans.keyColumn;
            for (let i = 0; i < obj.data.length; i++) {
              let translation =trans.getTranslationFromRow(obj.data[i]);
              if (!translation) continue;
              let line = `${JSON.stringify(obj.data[i][keyColumn])} => ${JSON.stringify(translation)}`;
              rows.push(line);
            }
            return rows.join("\n");
            
        }
    })
}

LibGPT.algorithmMsg = {
    JSTemplateCloaking: "The source text and translation result is in JavaScript format. Do not change variable name!",
    htmlCloaking:"Preserve the HTML tags.",
    xmlCloaking: "Preserve the XML tags.",
    hexPlaceholder: "Preserve hexadecimal formatting.",
    HTMLCloakingWrapped:"Preserve HTML tags and line breaks. All elements are `white-space:pre` styled, so preserve the white space and line break characters. Do not change line-break character with <br>.",
    JSONCloaking: `Source texts are in JSON. Complete every element of the array. Reply in JSON format of \`{"translation":[/*translation here*/]}\`. The index of translation must match the index of the original text. For example:\n`+
            `Source: \`["こんにちは", "わぁー。\\nきれいだなぁ。"]\`\nTranslation: \`{"translation": ["Hello", "Waa.\\nIt's so beautiful!"]}\` \n`+"${dat[n]} is place holder for the original text. Do not change it.",
    JSONObjectCloaking: `Source texts are in JSON. Reply in JSON format of \`{"translation":{/*index: translation*/}}\`. Source key and translation must match. Keys must be 0..N-1 (as strings are ok). For example:\n`+
            `Source: \`["こんにちは", "わぁー。\\nきれいだなぁ。"]\`\nTranslation: \`{"translation": {"0": "Hello", "1": "Waa.\\nIt's so beautiful!"}}\`\n`+
            "${dat[n]} is place holder for the original text. Do not change it.",
}

LibGPT.getEscapeAlgorithmTemplateString = function(algorithm) {
    if (LibGPT.algorithmMsg[algorithm]) return LibGPT.algorithmMsg[algorithm]
    return "Number of line of the source and result must be the same.";
}

LibGPT.compileTemplate = function(templateString, parameters={}) {
    parameters = {...LibGPT.templateParameters, ...parameters};
    if (!templateString || typeof templateString !== 'string') {
      throw new Error('Invalid template string');
    }
  
    if (!parameters || typeof parameters !== 'object') {
      throw new Error('Invalid template parameters');
    }
  
    // for (let key in parameters) {
    //   if (typeof parameters[key] !== 'string') {
    //     console.error('Invalid template parameters for key', key, parameters[key]);
    //     throw new Error('Invalid template parameters');
    //   }
    // }
  
    // return templateString.replace(/\$\{(\w+)\}/g, function(match, placeholder) {
    //   if (!parameters?.[placeholder]) return match;
    //   return parameters[placeholder];
    // });

    return templateString.replace(/\$\{(\w+)\[*(\w*)\]*\}/g, function(match, placeholder, param1) {
      if (!param1) {
        if (!parameters?.[placeholder]) return match;
        return parameters[placeholder];
      } else {
        if (!parameters?.[placeholder]?.[param1]) return match;
        return parameters[placeholder][param1];
      }
    });
}

/**
 * Render Array of customParameters into object of key-value pair
 * to append into the request body of the API
 * @param {Array} customParameters
 * @returns {Object}
 */
LibGPT.renderCustomParameters = function(customParameters=[], existingParameters={}) {
    console.log("%c Custom parameters", "color:cyan", customParameters);
    let result = existingParameters;
    if (!customParameters.length) return result;
    try {
        for (let i = 0; i < customParameters.length; i++) {
            let param = customParameters[i];
            if (!param.key || !param.value) continue;
            let thisValue = param.value;
            // adjust the value
            if (param.type == "number") {
                thisValue = parseFloat(param.value);
            } else if (param.type == "boolean") {
                thisValue = param.value == "true";
            } else if (param.type == "javascript") {
                thisValue = eval(`(${param.value})`);
                console.log("%c Evaluated value", "color:cyan", thisValue);
            }
            
            result[param.key] = thisValue;
        }
    } catch (e) {
        console.error("Error in customParameters", e);
        throw new Error("Error in customParameters", e);
    }
    console.log("%c Result of custom parameters", "color:cyan", result);
    return result;
}

LibGPT.dropParameters = function(parameters, keys) {
    if (!keys.length) return parameters;
    for (let i = 0; i < keys.length; i++) {
        delete parameters[keys[i]];
    }
    return parameters;
}

module.exports = LibGPT;