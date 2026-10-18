/**
 * Minimal regression test / debug harness for JsonDB newline normalization.
 *
 * Run manually:
 *   node www/addons/rmrgss/tests/jsondb_crlf_test.js
 *
 * Expected:
 *   Translated strings returned by JsonDB.registerString() should have CRLF
 *   ("\r\n") line endings because JsonDB writes the returned value back into
 *   JSON objects (it does not rely on ParserBase.writableData).
 */

// Some modules assume a browser-ish environment exists.
global.window ||= {};
global.document ||= {};

// Prism (used by RGSSParser) expects DOM globals.
// Provide the minimal stubs required for it to load under plain Node.
global.Element ||= function Element() {};
global.Element.prototype ||= {};

// Translator++ modules commonly use `require("www/...")`.
const moduleAlias = require("module-alias");
const path = require("path");
moduleAlias.addAlias("www", path.join(process.cwd(), "www"));

const JsonDB = require("www/addons/rmrgss/JsonInterface/JsonDB.js");

const j = new JsonDB("", { debugLevel: 0 });

// ParserBase.translate() checks context-prefixed keys: `${context.join('/')}` + "\n" + text
// With context ["ctx"], the key becomes: "ctx\nHello\nWorld".
j.translationPair = {
  "ctx\nHello\nWorld": "T1\nT2",
};

const out = j.registerString("Hello\nWorld", ["ctx"], {});

if (out !== "T1\r\nT2") {
  throw new Error(
    `Expected CRLF output. Got: ${JSON.stringify(out)} (len=${out.length})`
  );
}

console.log("OK: JsonDB CRLF normalization works:", JSON.stringify(out));
