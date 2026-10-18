const BLS = require("better-localstorage");

class DB extends require("www/js/BasicEventHandler.js") {
    constructor(options) {
        super()
        this.options = options || {}

        this.database = this.options.database || "tm";


        this.options.maxInsertPerBatch ||= 10;
        this.options.maxSelectPerBatch ||= 10;

        this.isAvailable = false;
    }
}

// DB.prepareSearchable = function(text = "") {
//     text ??= "";
//     text = text.replace("\r", "");
//     return text.toLowerCase();
// }

DB.prepareSearchable = function(string="", lang) {
  const delimiter = " "
  string = string.toLowerCase();
  lang ||= trans.getSl();
  let words = common.splitWords(string, lang);
  var result = []
  var indexes = {}
  for (let i=0; i<words.length; i++) {
    if (!words[i].trim()) continue;
    let filtered = words[i].replace(/[\p{Zs}\p{P}]+/gu, '');
    if (!filtered) continue;
    indexes[filtered] ||= 0;
    indexes[filtered]++
    if (indexes[filtered] >  1) {
      result.push(filtered+indexes[filtered]);
    } else {
      result.push(filtered);
    }
    
  }
  if (result.length == 0) {
    return {
      text  : "!:"+delimiter+string+delimiter,
      length: 1,
      words : [string],
      delimiter:delimiter
    }
  }
  
  return {
    text : delimiter+result.join(delimiter)+delimiter,
    length: result.length,
    words: result,
    delimiter:delimiter
  }
}

DB.prototype.setDB = async function(dbName = "tpp") {
    return true;
}

DB.prototype.setActiveTable = async function(table) {
    console.log("setActiveTable()", table);
    if (!this.isAvailable) return;
    if (this.activeTable == table) return;
    this.activeTable = table
    
    console.log("Creating new localStorage instance with table", table);
    this.localStorage = new BLS("tm", table);
}

DB.prototype.getActiveTable = function() {
    return this.activeTable;
}

DB.prototype.initTable = async function(tableName) {
    if (!this.isAvailable) return
    if (!tableName) return console.warn("No table specified")
    this.setActiveTable(tableName);
}

DB.prototype.isDBExist = async function(database) {
    return true;
}

DB.prototype.insert = async function(values = [], table = "", replaceMode = false) {
  console.log("Inserting data", arguments);
  table = table || this.getActiveTable();
  await this.setActiveTable(table);
  if (!Array.isArray(values)) values = [values];

  const result = [];
  result.length = values.length;
  console.log("Process insert data", values);
  if (!replaceMode) {
    for (let i=0; i<values.length; i++) {
      console.log("searching existing value");
      let existing = await this.localStorage.get(values[i].original);
      if (existing) {
        console.log("existing data found", existing);
        continue;
      }
      console.log("existing data not found inserting", values[i].original, values[i]);
      await this.localStorage.set(values[i].original, values[i]);
    }
  } else {
    for (let i=0; i<values.length; i++) {
      console.log("Setting new value", values[i].original, values[i]);
      await this.localStorage.set(values[i].original, values[i]);
    }
  }
  console.log("insert data completed");
}

DB.prototype.delete = async function(keys = [], tableName) {
  tableName = tableName || this.getActiveTable();
  await this.setActiveTable(tableName);
  if (!Array.isArray(keys)) keys = [keys];

  console.log("deleting from local storage", keys, tableName);
  for (let i=0; i<keys.length; i++) {
    await this.localStorage.delete(keys[i]);
  }
}

/**
 * Fetch translation
 * @param {String[]} texts 
 * @param {String} tableName 
 * @returns {String[]}
 */
DB.prototype.fetchTranslation = async function(texts = [], tableName) {
  tableName = tableName || this.getActiveTable();
  await this.setActiveTable(tableName);
  if (!Array.isArray(texts)) texts = [texts];
  const result =[]
  for (let i=0; i<texts.length; i++) {
    if (!texts[i]) {
      result.push("");
      continue;
    }
    let memory = await this.localStorage.get(texts[i]);
    if (!memory) {
      result.push("")
    } else {
      result.push(memory.translation)
    }
  }

  return result;
}

DB.prototype.init = async function() {
  this.isAvailable = true;
}

module.exports = DB;