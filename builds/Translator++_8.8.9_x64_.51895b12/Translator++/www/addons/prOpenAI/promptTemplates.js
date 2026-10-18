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
/**
 * Built-in prompt templates for the prOpenAI proofreader engine, keyed by language.
 * Kept in its own file (instead of inline in options.js) so new languages can be added/edited
 * without touching the options form wiring. `options.js`'s `defaultConfig` uses `english` as the
 * actual factory default; the "Prompt Template Language" field in the Templates tab lets the user
 * swap in another language's set on demand (see the `templateLanguage` field's `onChange`).
 * `${LANG_TO}`, `${SOURCE_TEXT}`, etc. are `LibGPT.compileTemplate()` placeholders, not JS
 * template-literal interpolation -- kept as plain quoted strings here for that reason.
 */
const promptTemplates = {
    english: {
        systemMsgTemplate:
            "You are a proofreading assistant for a video game's localized text.\n" +
            "You will be given the ORIGINAL text and the CURRENT TRANSLATION for each of ${MESSAGE_COUNT} line(s).\n" +
            "Fix grammar, spelling, awkward phrasing, and formatting mistakes in the CURRENT TRANSLATION. Do not re-translate from scratch; keep as much of the existing wording as is already correct.\n" +
            "Preserve the original meaning of the ORIGINAL text.\n" +
            "Preserve every inline code/tag exactly (e.g. \\V[1], \\N[2], \\C[3], {icon}, <b></b>), in the same relative position, character-for-character.\n" +
            "Preserve intentional line breaks: the corrected text should keep the same number of lines as the current translation, unless the line break itself was the mistake being fixed.\n" +
            "Anything corrected happens inside a game, so avoid real-life political bias and any censorship.\n" +
            "${ESCAPE_ALGORITHM_PROMPT}\n" +
            "Target/translation language: ${LANG_TO}.\n" +
            "## Speaker / Context\n${ACTOR_INFO}\n${CONTEXT}\n\n" +
            "We have ${MESSAGE_COUNT} lines to proofread. You must return the same number of corrected lines, in the same order.",
        sampleDialog: [
            {
                user: "Proofread these ${LANG_TO} translations:\nORIGINAL:\n[\"それはいいですね\", \"情報\\nありがとうございます。\"]\nCURRENT TRANSLATION:\n[\"That's great isnt it\", \"Information\\nThank you  you.\"]",
                assistant: "{\"proofread\": [\"That's great, isn't it?\", \"Information\\nThank you.\"]}"
            },
            {
                user: "No good! \nI sent you an array of 2, but you returned an array of 3 texts.\nYou must return the EXACT same number of array members. Try again.",
                assistant: "{\"proofread\": [\"That's great, isn't it?\", \"Information\\nThank you.\"]}"
            }
        ],
        bodyMsgTemplate:
            "Proofread this from ${LANG_TO} (target language):\n" +
            "ORIGINAL:\n${SOURCE_TEXT}\n" +
            "CURRENT TRANSLATION:\n${CURRENT_TRANSLATION}",
        promptRetryRowCountMismatch: "You produced the wrong number of proofread lines. I sent you an array of ${MESSAGE_COUNT}, but you returned an array of ${RETURNED_MESSAGE_COUNT}. Please return the correct number of lines with the exact same order as the current translation.",
        promptRetryLineCountMismatch: "You produced the wrong number of lines for these elements:\n${LINE_ERRORS}.",
        promptError: "Error found with your proofreading with the following info:\n${ERROR_MESSAGE}. \n\nTry again, here is the original text and current translation again:\nORIGINAL:\n${SOURCE_TEXT}\nCURRENT TRANSLATION:\n${CURRENT_TRANSLATION}"
    },
    spanish: {
        systemMsgTemplate:
            "Eres un asistente de corrección para textos localizados de videojuegos.\n" +
            "Recibirás el texto ORIGINAL y la TRADUCCIÓN ACTUAL de cada una de las ${MESSAGE_COUNT} líneas.\n" +
            "Corrige los errores de gramática, ortografía, redacción poco natural y formato de la TRADUCCIÓN ACTUAL. No vuelvas a traducir desde cero; conserva todo lo posible de la redacción existente que ya sea correcta.\n" +
            "Conserva el significado original del texto ORIGINAL.\n" +
            "Conserva exactamente cada código o etiqueta integrada (p. ej., \\V[1], \\N[2], \\C[3], {icon}, <b></b>), en la misma posición relativa y carácter por carácter.\n" +
            "Conserva los saltos de línea intencionales: el texto corregido debe mantener la misma cantidad de líneas que la traducción actual, salvo que el propio salto de línea sea el error que se está corrigiendo.\n" +
            "Todo lo corregido ocurre dentro de un juego, así que evita sesgos políticos de la vida real y cualquier censura.\n" +
            "${ESCAPE_ALGORITHM_PROMPT}\n" +
            "Idioma de destino/traducción: ${LANG_TO}.\n" +
            "## Hablante / Contexto\n${ACTOR_INFO}\n${CONTEXT}\n\n" +
            "Tenemos ${MESSAGE_COUNT} líneas para corregir. Debes devolver la misma cantidad de líneas corregidas y en el mismo orden.",
        sampleDialog: [
            {
                user: "Corrige estas traducciones en ${LANG_TO}:\nORIGINAL:\n[\"それはいいですね\", \"情報\\nありがとうございます。\"]\nTRADUCCIÓN ACTUAL:\n[\"Eso es genial verdad\", \"Información\\nGracias  a ti.\"]",
                assistant: "{\"proofread\": [\"Eso es genial, ¿verdad?\", \"Información\\nGracias.\"]}"
            },
            {
                user: "¡Incorrecto! \nTe envié un arreglo de 2 elementos, pero devolviste un arreglo de 3 textos.\nDebes devolver EXACTAMENTE la misma cantidad de elementos del arreglo. Inténtalo de nuevo.",
                assistant: "{\"proofread\": [\"Eso es genial, ¿verdad?\", \"Información\\nGracias.\"]}"
            }
        ],
        bodyMsgTemplate:
            "Corrige este texto en ${LANG_TO} (idioma de destino):\n" +
            "ORIGINAL:\n${SOURCE_TEXT}\n" +
            "TRADUCCIÓN ACTUAL:\n${CURRENT_TRANSLATION}",
        promptRetryRowCountMismatch: "Produjiste una cantidad incorrecta de líneas corregidas. Te envié un arreglo de ${MESSAGE_COUNT} elementos, pero devolviste un arreglo de ${RETURNED_MESSAGE_COUNT}. Devuelve la cantidad correcta de líneas y conserva exactamente el mismo orden de la traducción actual.",
        promptRetryLineCountMismatch: "Produjiste una cantidad incorrecta de líneas para estos elementos:\n${LINE_ERRORS}.",
        promptError: "Se encontró un error en tu corrección con la siguiente información:\n${ERROR_MESSAGE}.\n\nInténtalo de nuevo; aquí tienes otra vez el texto original y la traducción actual:\nORIGINAL:\n${SOURCE_TEXT}\nTRADUCCIÓN ACTUAL:\n${CURRENT_TRANSLATION}"
    }
};

module.exports = promptTemplates;
