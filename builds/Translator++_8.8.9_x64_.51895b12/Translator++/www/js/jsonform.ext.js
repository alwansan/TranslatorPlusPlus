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
* Extending JSONform with custom fields
* https://github.com/jsonform/jsonform/wiki
* @file jsonform.ext.js
* @sample
* {
// The template describes the HTML that the field will generate.
// It uses Underscore.js templates.
template: '<div><div id="<%=node.id%>"><%=value%></div></div>',

// Set the inputfield flag when the field is a real input field
// that produces a value. Set the array flag when it creates an
// array of fields. Both flags are mutually exclusive.
// Do not set any of these flags for containers and other types
// of fields.
inputfield: (true || false || undefined),
array: (true || false || undefined),

// Most real input fields should set this flag that wraps the
// generated content into the HTML code needed to report errors
fieldtemplate: (true || false),

// Return the root element created by the field
// (el is the DOM element whose id is node.id,
// this function is only useful when el is not the root
// element in the field's template)
getElement: function (el) {
    // Adjust the following based on your template. In this example
    // there is an additional <div> so we need to go one level up.
    return $(el).parent().get(0);
},

// This is where you can complete the data that will be used
// to run the template string
onBeforeRender: function (data, node) {},

// This is where you can enhance the generated HTML by adding
// event handlers if needed
onInsert: function (evt, node) {}
};
*/



const JSONFormExt = {};
JSONFormExt.htmlentities = function(str){
    var element = document.createElement('div');
    element.textContent = str;
    return element.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

JSONFormExt.copyToClipboard = function(str) {
    // use nw.js clipboard API if available
    if (window.nw && nw.Clipboard) {
        const clipboard = nw.Clipboard.get();
        clipboard.set(str, 'text');
    }
}

// fill the closest input field with the value.
// Useful for filling a value from a link/ button inside the description of a field.
JSONFormExt.fillClosestInput = function(elm, value) {
    console.log("%cfillClosestInput", "color: cyan", elm, value, $(elm).closest(".form-group").find("input, select, textarea"));
    const $input = $(elm).closest(".form-group").find("input, select, textarea").first();
    if ($input.length) {
        $input.val(value).trigger("change");
    }
}

JSONFormExt.applySelectionLabel = function(formNode, titleMap) {
    // apply selection label onInsert()
    console.log("%capplySelectionLabel", "color: orange", formNode, titleMap);
    let elm = $(formNode.el).find("select");
    if (!elm.length) return;
    for (let key in titleMap) {
        elm.find(`option[value='${key}']`).text(titleMap[key]);
    }
    // set default value if available
    $(elm).val(formNode.value);
}

JSONFormExt.togglePassword = function(elm) {
    // Prevent default button action and toggle password field visibility
    var pwdInput = elm.previousElementSibling;
    if (pwdInput && pwdInput.tagName.toLowerCase() === "input") {
        if (pwdInput.type === "password") {
            pwdInput.type = "text";
            $(elm).find("i").removeClass("icon-eye-1").addClass("icon-eye-off");
            $(elm).attr("title", t("Hide password"));
        } else if (pwdInput.type === "text") {
            pwdInput.type = "password";
            $(elm).find("i").removeClass("icon-eye-off").addClass("icon-eye-1");
            $(elm).attr("title", t("Show password"));
        }
    }
    return false; // Prevent default action
}

JSONFormExt.deepCloneWithoutDefault = function(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Create an array or object to hold the values
    const clone = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        // eslint-disable-next-line no-prototype-builtins
        if (obj.hasOwnProperty(key) && key !== 'default') {
            clone[key] = JSONFormExt.deepCloneWithoutDefault(obj[key]);
        }
    }

    return clone;
}

// generate unique ID based on the structure of its JSON schema
// return the ID if available
JSONFormExt.generateFingerprint = function(node) {
    const formTree = node.ownerTree.formDesc;
    if (formTree.id) return formTree.id;
    const clonedSchema = this.deepCloneWithoutDefault(formTree.schema);
    console.log("clonedSchema", clonedSchema);
    const id = common.crc32String(JSON.stringify(clonedSchema));
    formTree.id = id;
    return id;
}

JSONFormExt.getExportableFormData = function(node, value=null) {
    if (!node) return null;

    const data = {
        header: {
            type: "jsonformvalue",
            date:new Date().toISOString(),
            id: this.generateFingerprint(node)
        },
        value: value || node.ownerTree.root.getFormValues()
    }
    return data;
}

JSONFormExt.exportForm = async function(node) {
    // add header to the value before exporting
    const data = this.getExportableFormData(node);
    const blob = new Blob([JSON.stringify(data)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "form.jsv";
    a.click();
}

JSONFormExt.importForm = async function(node) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".jsv";
    input.onchange = async function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            const data = JSON.parse(e.target.result);
            if (data.header?.type !== "jsonformvalue") {
                alert("Invalid file format");
                console.error("Invalid file format");
                return;
            }
            const fingerPrint = JSONFormExt.generateFingerprint(node);
            if (data.header.id !== fingerPrint) {
                const conf = confirm("The imported form ID is different from the current form. Do you want to import anyway?");
                if (!conf) return console.error("Invalid form ID");
                
                // overwrite the form ID
                data.header.id = fingerPrint;
            }
            $(node.ownerTree.domRoot).jsonFormValue(data.value);
        }
        reader.readAsText(file);
    }
    input.click();
}



JSONFormExt.init = function() {
    const BLS = require("better-localstorage");
    this.localStorage = new BLS("jsonform");

    console.log("JSONFormExt.init loaded");
    JSONForm.fieldTypes['advancedfieldset'].template = '<fieldset<% if (id) { %> id="<%= id %>"<% } %> class="form-group expandable <%= elt.htmlClass?elt.htmlClass:"" %>"><legend role="treeitem" aria-expanded="false"><%= (node.title || node.legend) ? (node.title || node.legend) : "Advanced options" %></legend><div class="form-group"><%= children %></div></fieldset>';
    // JSONForm.fieldTypes['html'] = {
    //     template : '<div class="form-group"><div id="<%=node.id%>"><%=elt.content%></div></div>',
    //     inputfield :false,
    //     array:false,
    //     getElement: function (el) {
    //         // el is the place with node.id
    //         // Adjust the following based on your template. In this example
    //         // there is an additional <div> so we need to go one level up.
    //         return $(el).parent().get(0);
    //     },
    //     onBeforeRender: function (data, node) {},
    //     onInsert: function (evt, node) {}
    // };
    JSONForm.fieldTypes['html'] = {
        template : '<div class="form-group"><%=elt.content || elt.value%></div>',
    };
    JSONForm.fieldTypes['hr'] = {
        template : '<div class="form-group"><hr /></div>',
    };
    JSONForm.fieldTypes['info'] = {
        template : `<div class="form-group blockBox infoBlock withIcon <%= elt.htmlClass?elt.htmlClass:"" %>" ><%=elt.content || elt.value%></div>`,
    };
    JSONForm.fieldTypes['warn'] = {
        template : `<div class="form-group blockBox attentionBlock withIcon <%= elt.htmlClass?elt.htmlClass:"" %>" ><%=elt.content || elt.value%></div>`,
    };
    JSONForm.fieldTypes['error'] = {
        template : `<div class="form-group blockBox errorBlock withIcon <%= elt.htmlClass?elt.htmlClass:"" %>" ><%=elt.content || elt.value%></div>`,
    };
    
    JSONForm.fieldTypes['selectencoding'] = {...{}, ...JSONForm.fieldTypes.select};
    JSONForm.fieldTypes['selectencoding'].onBeforeRender = function(data, node) {
        node.options = [
            "", 
            "utf-7",
            "utf-7-imap",
            "utf8", 
            "UTF-16", 
            "UTF-16BE",
            "UTF-16LE",
            "UTF-32", 
            "UTF-32BE",
            "UTF-32LE",
            "ascii",
            "ISO-8859-1", 
            "ISO-8859-16", 
            "koi8-r", 
            "koi8-u", 
            "koi8-ru", 
            "koi8-t", 
            "Shift_JIS",
            "Windows-31j",
            "Windows932",
            "CP874",
            "Windows-1250",
            "Windows-1251",
            "Windows-1252",
            "Windows-1253",
            "Windows-1254",
            "Windows-1255",
            "Windows-1256",
            "Windows-1257",
            "Windows-1258",
            "CP932",
            "CP936",
            "CP949",
            "CP950",
            "GB2312",
            "EUC-JP",
            "EUC-CN",
            "EUC-KR",
            "GBK",
            "GB18030",
            "Windows936",
            "KS_C_5601",
            "Windows949",
            "Big5",
            "Big5-HKSCS",
            "Windows950",
            "maccroatian",
            "maccyrillic",
            "macgreek",
            "maciceland",
            "macroman",
            "macromania",
            "macthai",
            "macturkish",
            "macukraine",
            "maccenteuro",
            "macintosh",
        ]
    };
    
    JSONForm.fieldTypes['selectcolumn'] = {...{}, ...JSONForm.fieldTypes.select};
    JSONForm.fieldTypes['selectcolumn'].onBeforeRender = function(data, node) {
        node.options = [];
        node.formElement.titleMap = {};
        for (let colId=0; colId<trans.colHeaders.length; colId++) {
            node.options.push(colId);
            node.formElement.titleMap[colId] = trans.colHeaders[colId];
        }
    };
    JSONForm.fieldTypes['selectcolumn'].onInsert = function(evt, node) {
        JSONFormExt.applySelectionLabel(node, node.formElement.titleMap);
    }

    JSONForm.fieldTypes['selecttranslationcolumn'] = {...{}, ...JSONForm.fieldTypes.select};
    JSONForm.fieldTypes['selecttranslationcolumn'].onBeforeRender = function(data, node) {
        console.log("selecttranslationcolumn.onBeforeRender()", data, node, this);
        node.options = [];
        node.formElement.titleMap = {};
        for (let colId=0; colId<trans.colHeaders.length; colId++) {
            if (colId == trans.keyColumn) continue; // skip key column
            node.options.push(colId);
            node.formElement.titleMap[colId] = trans.colHeaders[colId];
        }
    };
    JSONForm.fieldTypes['selecttranslationcolumn'].onInsert = function(evt, node) {
        JSONFormExt.applySelectionLabel(node, node.formElement.titleMap);
    }

    // Multiple select field.
    // - Renders a <select multiple> with configurable size (default 10)
    // - Stores the selected values as JSON in a hidden input, so JSONForm
    //   parses it back into an Array (see jsonform.js JSON parsing in getFormValues)
    JSONForm.fieldTypes['multipleselect'] = {...{}, ...JSONForm.fieldTypes.select};
    JSONForm.fieldTypes['multipleselect'].template =
        '<div>' +
        // Hidden field is what gets serialized by JSONForm
        '<input type="hidden" id="<%= id %>" name="<%= node.name %>" value="<%= escape(JSON.stringify(_.isArray(value) ? value : (value ? [value] : []))) %>" />' +
        // Visible multi-select UI
        '<select id="<%= id %>__select" multiple="multiple" size="<%= (node.schemaElement?.size || elt.size || 10) %>" ' +
        'class=\'form-control<%= (fieldHtmlClass ? " " + fieldHtmlClass : "") %>\'' +
        '<%= (node.schemaElement && node.schemaElement.disabled? " disabled" : "")%>' +
        '> ' +
        '<% var _current = _.isArray(value) ? value : (value ? [value] : []); var _currentStr = _.map(_current, function(v){ return ""+v; }); %>' +
        '<% _.each(node.options, function(key, val) { var optValue = (key instanceof Object) ? key.value : key; var optTitle = (key instanceof Object) ? key.title : key; var optValueStr = ""+optValue; if (_.include(_currentStr, optValueStr)) { %>' +
        ' <option selected value="<%= optValue %>"><%= optTitle %></option> ' +
        '<% } else { %>' +
        ' <option value="<%= optValue %>"><%= optTitle %></option> ' +
        '<% } }); %>' +
        '</select>' +
        '</div>';
    JSONForm.fieldTypes['multipleselect'].onBeforeRender = function(data, node) {
        // Ensure we have options for array schemas too (items.enum)
        if (!node.options || !node.options.length) {
            const itemsEnum = node.schemaElement?.items?.enum || node.schemaElement?.items?.[0]?.enum;
            if (itemsEnum && itemsEnum.length) node.options = itemsEnum;
        }
        if (!node.options || !node.options.length) {
            const schemaEnum = node.schemaElement?.enum;
            if (schemaEnum && schemaEnum.length) node.options = schemaEnum;
        }
    };
    JSONForm.fieldTypes['multipleselect'].onInsert = function(evt, node) {
        const $container = $(node.el);
        const $select = $container.find('#' + node.id + '__select');
        const $hidden = $container.find('#' + node.id);

        const syncToHidden = function() {
            const selected = $select.val() || [];
            $hidden.val(JSON.stringify(selected));
        };

        $select.on('change', syncToHidden);
        // Initial sync in case defaults were set programmatically
        syncToHidden();
    };

    JSONForm.fieldTypes['combobox'] = {
        "template": `<div><input type="search" class='form-control<%= (fieldHtmlClass ? " " + fieldHtmlClass : "") %>'name="<%= node.name %>" value="<%= escape(value) %>" id="<%= id %>" aria-label="<%= node.title ? escape(node.title) : node.name %>"<%= (node.disabled? " disabled" : "")%><%= (node.readOnly ? " readonly='readonly'" : "") %><%= (node.schemaElement && (node.schemaElement.step > 0 || node.schemaElement.step == "any") ? " step='" + node.schemaElement.step + "'" : "") %><%= (node.schemaElement && node.schemaElement.minLength ? " minlength='" + node.schemaElement.minLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.maxLength ? " maxlength='" + node.schemaElement.maxLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.required && (node.schemaElement.type !== "boolean") ? " required='required'" : "") %><%= (node.placeholder? " placeholder=" + '"' + escape(node.placeholder) + '"' : "")%> list="<%= id %>_datalist" /><datalist id="<%= id %>_datalist"></datalist></div>`,
        "fieldtemplate": true,
        "inputfield": true,
        // onBeforeRender: function (data, node) {
        //     console.log("%ccombobox.onBeforeRender", "color:salmon", data, node, this);
        //     data.datalist = "";
        //     let choices = data.formElement.options || node.formElement.whitelist|| node.schemaElement.enum || [];
        //     if (choices) return;
        //     const options = []
        //     for (let item of node.schemaElement.enum) {
        //         options.push(`<option value="${JSONFormExt.htmlentities(item)}">`)
        //     }
        //     data.datalist = options.join("")
        // },
        onInsert: function (evt, node) {
            console.log("%ccombobox.onInsert", "color:salmon", evt, node, this);
            const $datalist = $(node.el).find("datalist");
            const choices = node.formElement.options || node.formElement.whitelist || node.schemaElement.enum || [];
            if (choices && choices.length > 0) {
                $datalist.empty();
                for (let item of choices) {
                    $datalist.append(`<option value="${JSONFormExt.htmlentities(item)}">`);
                }
            }
        }
    }

    
    /**
     * Add tag elements.
     * Schema must be in 'object' type
     */
    JSONForm.fieldTypes['tag'] = {
        "template": `<input type="text" class='jsonform-tags form-control<%= (fieldHtmlClass ? " " + fieldHtmlClass : "") %>'name="<%= node.name %>" value="<%= escape(JSON.stringify(node.value)) %>" id="<%= id %>" aria-label="<%= node.title ? escape(node.title) : node.name %>"<%= (node.disabled? " disabled" : "")%><%= (node.readOnly ? " readonly='readonly'" : "") %><%= (node.schemaElement && (node.schemaElement.step > 0 || node.schemaElement.step == "any") ? " step='" + node.schemaElement.step + "'" : "") %><%= (node.schemaElement && node.schemaElement.minLength ? " minlength='" + node.schemaElement.minLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.maxLength ? " maxlength='" + node.schemaElement.maxLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.required && (node.schemaElement.type !== "boolean") ? " required='required'" : "") %><%= (node.placeholder? " placeholder=" + '"' + escape(node.placeholder) + '"' : "")%> />`,
        "fieldtemplate": true,
        "inputfield": true,
        onInsert: function (evt, node) {
            const $elm = $(node.el).find(".jsonform-tags");
            const whitelist = node.formElement.whitelist || node.schemaElement.enum || []
            const enforceWhitelist = node.formElement.enforceWhitelist || false;
            const maxTags = node.formElement.maxTags || Infinity;
            const mode = node.formElement.mode; // select

            const tagify = new Tagify($elm[0], {
                dropdown: {
                    highlightFirst: true
                },
                whitelist: whitelist, // predefined values
                enforceWhitelist: enforceWhitelist, // only allow values from the whitelist
                maxTags:maxTags,
                mode:mode,
                originalInputValueFormat: (valuesArr)=> {
                    // console.log("%c originalInputValueFormat", "color:orange", valuesArr);
                    const result = [];
                    for (let val of valuesArr) {
                        result.push(val.value)
                    }
                    return JSON.stringify(result);
                }
            });

            if (node.formElement.sortable) {
                void async function() {
                    if (!window.DragSort) {
                        await common.loadDomScript("modules/dragsort/dragsort.js");
                        await common.loadCssFile("modules/dragsort/dragsort.css");
                    }
                    const dragsort = new DragSort(tagify.DOM.scope, {
                        selector: '.'+tagify.settings.classNames.tag,
                        callbacks: {
                            dragEnd: onDragEnd
                        }
                    });

                    function onDragEnd(elm){
                        tagify.updateValueByDOMTags()
                    }
                }();
            }
            $elm.data("tagify", tagify);
            console.log("initialized tag elm : ", $elm);
            console.log("node : ", node);
        },
        // getFormValuesHook : function(originalValues) {
        //     console.log("getFormValuesHook() custom getValue's this", this);
        //     console.log("getFormValuesHook() original value is", originalValues);
        //     const thisValue = originalValues[this.key];
        //     const valObj = JSON.parse(thisValue || "[]");
        //     const result = []
        //     for (let val of valObj) {
        //         result.push(val.value)
        //     }
        //     originalValues[this.key] = result;
        //     console.log("getFormValuesHook(), about to return", originalValues);
        //     return originalValues;
        // }

    };

    /**
     * Draw grid elements with HandsOnTable
     */
    JSONForm.fieldTypes['grid'] = {
        "template": `<input type="hidden" class='hot-value form-control<%= (fieldHtmlClass ? " " + fieldHtmlClass : "") %>'name="<%= node.name %>" value="<%= escape(JSON.stringify(node.value)) %>" id="<%= id %>" aria-label="<%= node.title ? escape(node.title) : node.name %>"<%= (node.disabled? " disabled" : "")%><%= (node.readOnly ? " readonly='readonly'" : "") %><%= (node.schemaElement && (node.schemaElement.step > 0 || node.schemaElement.step == "any") ? " step='" + node.schemaElement.step + "'" : "") %><%= (node.schemaElement && node.schemaElement.minLength ? " minlength='" + node.schemaElement.minLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.maxLength ? " maxlength='" + node.schemaElement.maxLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.required && (node.schemaElement.type !== "boolean") ? " required='required'" : "") %><%= (node.placeholder? " placeholder=" + '"' + escape(node.placeholder) + '"' : "")%> />
        <div class="hot-wrapper"></div>`,
        "fieldtemplate": true,
        "inputfield": true,
        onInsert: async function (evt, node) {
            if (!window.Handsontable) {
                await common.loadDomScript("/www/modules/handsontable/handsontable.js");
                await common.loadCssFile("/www/modules/handsontable/handsontable.css");
            }

            const $elm = $(node.el).find(".hot-wrapper");
            console.log("%con insert grid", "color:aqua", evt, node, this, $elm[0]);
            if (node.schemaElement?.type !== "array") {
                console.error("Grid field must be array type");
                return;
            }

            const hot = new Handsontable($elm[0], {
                data: [],
                colHeaders: true,
                rowHeaders: true,
                filters: true,
                // on change/edit, update the hidden field
                afterChange: function (changes, source) {
                    if (source === "loadData") return; // don't save this change
                    const data = hot.getData();
                    const jsonData = JSON.stringify(data);
                    $(node.el).find(".hot-value").val(jsonData);
                }
            });

            if (typeof node.value === "string") {
                node.value = JSON.parse(node.value);
            }
            if (typeof node.schemaElement?.default === "string" && node.schemaElement?.default.length > 0) {
                node.schemaElement.default = JSON.parse(node.schemaElement.default);
            }

            hot.loadData(node.value);
            hot.render();
        },
        // getFormValuesHook : function(originalValues) {
        //     console.log("getFormValuesHook() custom getValue's this", this);
        //     console.log("getFormValuesHook() original value is", originalValues);
        //     const thisValue = originalValues[this.key];
        //     const valObj = JSON.parse(thisValue || "[]");
        //     const result = []
        //     for (let val of valObj) {
        //         result.push(val.value)
        //     }
        //     originalValues[this.key] = result;
        //     console.log("getFormValuesHook(), about to return", originalValues);
        //     return originalValues;
        // }

    };

    JSONForm.fieldTypes['selectfile'] = {
        "template": `<input type="text" class='jsonform-selectfile form-control<%= (fieldHtmlClass ? " " + fieldHtmlClass : "") %>'name="<%= node.name %>" value="<%= escape(value) %>" id="<%= id %>" accept="<%= node.formElement.accept %>" aria-label="<%= node.title ? escape(node.title) : node.name %>"<%= (node.disabled? " disabled" : "")%><%= (node.readOnly ? " readonly='readonly'" : "") %><%= (node.schemaElement && (node.schemaElement.step > 0 || node.schemaElement.step == "any") ? " step='" + node.schemaElement.step + "'" : "") %><%= (node.schemaElement && node.schemaElement.minLength ? " minlength='" + node.schemaElement.minLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.maxLength ? " maxlength='" + node.schemaElement.maxLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.required && (node.schemaElement.type !== "boolean") ? " required='required'" : "") %><%= (node.placeholder? " placeholder=" + '"' + escape(node.placeholder) + '"' : "")%> />`,
        "fieldtemplate": true,
        "inputfield": true,
        onInsert: function (evt, node) {
            const $elm = $(node.el).find(".jsonform-selectfile");
            $elm.attr("data-renderdvfield", "this");
            var accept = node.formElement.accept || "*";
            $elm.attr("accept", accept);
            if (node.formElement.multiple) $elm.attr("multiple", "multiple");
            if (node.formElement.directory) $elm.attr("nwdirectory", "nwdirectory");
            // NW.js: <input type="file" nwsaveas="filename.ext"> opens a save dialog
            // with the suggested default filename.
            // Historically some code used `nwsaveas: true` just to enable save mode.
            // We support both:
            // - nwsaveas: "project.trans"  -> use that as the suggested filename
            // - nwsaveas: true             -> enable save mode with no specific suggestion
            if (node.formElement.nwsaveas) {
                if (typeof node.formElement.nwsaveas === "string") {
                    $elm.attr("nwsaveas", node.formElement.nwsaveas);
                } else {
                    $elm.attr("nwsaveas", "nwsaveas");
                }
            }
           
            const dvFields = new DVField();
            dvFields.renderAll($elm);
        }
    };
    JSONForm.fieldTypes['selectdir'] = {
        "template": `<input type="text" class='jsonform-selectfile form-control<%= (fieldHtmlClass ? " " + fieldHtmlClass : "") %>'name="<%= node.name %>" value="<%= escape(value) %>" id="<%= id %>" accept="<%= node.formElement.accept %>" aria-label="<%= node.title ? escape(node.title) : node.name %>"<%= (node.disabled? " disabled" : "")%><%= (node.readOnly ? " readonly='readonly'" : "") %><%= (node.schemaElement && (node.schemaElement.step > 0 || node.schemaElement.step == "any") ? " step='" + node.schemaElement.step + "'" : "") %><%= (node.schemaElement && node.schemaElement.minLength ? " minlength='" + node.schemaElement.minLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.maxLength ? " maxlength='" + node.schemaElement.maxLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.required && (node.schemaElement.type !== "boolean") ? " required='required'" : "") %><%= (node.placeholder? " placeholder=" + '"' + escape(node.placeholder) + '"' : "")%> />`,
        "fieldtemplate": true,
        "inputfield": true,
        onInsert: function (evt, node) {
            const $elm = $(node.el).find(".jsonform-selectfile");
            $elm.attr("data-renderdvfield", "this");
            var accept = node.formElement.accept || "*";
            $elm.attr("accept", accept);
            if (node.formElement.multiple) $elm.attr("multiple", "multiple");
            if (node.formElement.nwsaveas) {
                if (typeof node.formElement.nwsaveas === "string") {
                    $elm.attr("nwsaveas", node.formElement.nwsaveas);
                } else {
                    $elm.attr("nwsaveas", "nwsaveas");
                }
            }
            $elm.attr("nwdirectory", true);

            const dvFields = new DVField();
            dvFields.renderAll($elm);
        }
    };
    // patch for ace field.
    // load ace if ace is not defined, add a toolbar header, make the editor vertically resizable, and support fullscreen
    const aceOnInsert = JSONForm.fieldTypes['ace'].onInsert;
    JSONForm.fieldTypes['ace'].onInsert = async function(evt, node) {
        if (!window.ace) {
            await common.loadDomScript("modules/ace/src-min-noconflict/ace.js");
        }
        aceOnInsert.call(this, evt, node);

        const wrapper = $(node.el).find('.jsonformAceWrapper')[0];
        if (!wrapper) return;

        // Insert a toolbar header above the editor container
        const toolbar = document.createElement('div');
        toolbar.className = 'jsonform-ace-toolbar';
        toolbar.style.cssText = 'display:flex;justify-content:flex-end;align-items:center;padding:2px 4px;background:#2d2d2d;border-bottom:1px solid #444;';

        const maxBtn = document.createElement('button');
        maxBtn.type = 'button';
        maxBtn.title = 'Maximize editor';
        maxBtn.innerHTML = '&#x26F6;';
        maxBtn.style.cssText = 'background:none;border:none;color:#ccc;cursor:pointer;font-size:14px;padding:2px 6px;line-height:1;';
        toolbar.appendChild(maxBtn);
        wrapper.insertBefore(toolbar, wrapper.firstChild);

        // Make the ace container resizable vertically
        const container = $(wrapper).find('> div').not('.jsonform-ace-toolbar')[0];
        if (container) {
            container.style.resize = 'vertical';
            container.style.overflow = 'auto';
            const aceDiv = container.querySelector('[id$="__ace"]');
            if (aceDiv) {
                new ResizeObserver(() => {
                    aceDiv.style.height = container.clientHeight + 'px';
                    const editor = window.ace.edit(aceDiv);
                    if (editor) editor.resize();
                }).observe(container);
            }

            // Fullscreen toggle
            maxBtn.addEventListener('click', function() {
                const isFullscreen = wrapper.classList.contains('jsonform-ace-fullscreen');
                if (isFullscreen) {
                    wrapper.classList.remove('jsonform-ace-fullscreen');
                    Object.assign(wrapper.style, { position: '', top: '', left: '', width: '', height: '', zIndex: '', background: '' });
                    if (aceDiv) aceDiv.style.height = container.clientHeight + 'px';
                    maxBtn.innerHTML = '&#x26F6;';
                    maxBtn.title = 'Maximize editor';
                } else {
                    wrapper.classList.add('jsonform-ace-fullscreen');
                    Object.assign(wrapper.style, { position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', zIndex: '9999', background: '#1d1d1d' });
                    container.style.height = 'calc(100vh - 30px)';
                    if (aceDiv) aceDiv.style.height = 'calc(100vh - 30px)';
                    maxBtn.innerHTML = '&#x2715;';
                    maxBtn.title = 'Exit fullscreen';
                }
                const editor = aceDiv ? window.ace.edit(aceDiv) : null;
                if (editor) editor.resize();
            });

            // Exit fullscreen on Escape
            document.addEventListener('keydown', function onEsc(e) {
                if (e.key === 'Escape' && wrapper.classList.contains('jsonform-ace-fullscreen')) {
                    maxBtn.click();
                }
            });
        }
    };

    /**
     * Add color tag component.
     * Schema must be in 'object' type
     */
    JSONForm.fieldTypes['colortag'] = {
        "template": `<div class="colorTagSelector"></div><input type="hidden" class='jsonform-colortags form-control<%= (fieldHtmlClass ? " " + fieldHtmlClass : "") %>'name="<%= node.name %>" value="<%= escape(JSON.stringify(node.value)) %>" id="<%= id %>" aria-label="<%= node.title ? escape(node.title) : node.name %>"<%= (node.disabled? " disabled" : "")%><%= (node.readOnly ? " readonly='readonly'" : "") %><%= (node.schemaElement && (node.schemaElement.step > 0 || node.schemaElement.step == "any") ? " step='" + node.schemaElement.step + "'" : "") %><%= (node.schemaElement && node.schemaElement.minLength ? " minlength='" + node.schemaElement.minLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.maxLength ? " maxlength='" + node.schemaElement.maxLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.required && (node.schemaElement.type !== "boolean") ? " required='required'" : "") %><%= (node.placeholder? " placeholder=" + '"' + escape(node.placeholder) + '"' : "")%> />`,
        "fieldtemplate": true,
        "inputfield": true,
        onInsert: function (evt, node) {
            const $elm = $(node.el).find(".jsonform-colortags");
            const mode = node.formElement.mode; // select

            //console.log("Preparing tagify for elm", $elm[0]);
            const tags = new UiTags();
            tags.on("change", function(e, info) {
                console.log("Tag event args: ", arguments);
                console.log("tag change", info);
                $elm.val(JSON.stringify(info));
            });
            $(node.el).find(".colorTagSelector").empty();
            $(node.el).find(".colorTagSelector").append(tags.element);
            console.log("initialized tag elm : ", $elm);
            console.log("node : ", node);
        }
    };


    // todo
    // select file / folder field
    JSONForm.fieldTypes['selectfileorfolder'] = {
        "template": `<input type="text" class='jsonform-selectfile form-control<%= (fieldHtmlClass ? " " + fieldHtmlClass : "") %>'name="<%= node.name %>" value="<%= escape(value) %>" id="<%= id %>" accept="<%= node.formElement.accept %>" aria-label="<%= node.title ? escape(node.title) : node.name %>"<%= (node.disabled? " disabled" : "")%><%= (node.readOnly ? " readonly='readonly'" : "") %><%= (node.schemaElement && (node.schemaElement.step > 0 || node.schemaElement.step == "any") ? " step='" + node.schemaElement.step + "'" : "") %><%= (node.schemaElement && node.schemaElement.minLength ? " minlength='" + node.schemaElement.minLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.maxLength ? " maxlength='" + node.schemaElement.maxLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.required && (node.schemaElement.type !== "boolean") ? " required='required'" : "") %><%= (node.placeholder? " placeholder=" + '"' + escape(node.placeholder) + '"' : "")%> />`,
        "fieldtemplate": true,
        "inputfield": true,
        onInsert: function (evt, node) {
            const $elm = $(node.el).find(".jsonform-selectfile");
            $elm.attr("data-renderdvfield", "this");
            var accept = node.formElement.accept || "*";
            $elm.attr("accept", accept);
            if (node.formElement.multiple) $elm.attr("multiple", "multiple");
            if (node.formElement.directory) $elm.attr("nwdirectory", "nwdirectory");
            if (node.formElement.nwsaveas) {
                if (typeof node.formElement.nwsaveas === "string") {
                    $elm.attr("nwsaveas", node.formElement.nwsaveas);
                } else {
                    $elm.attr("nwsaveas", "nwsaveas");
                }
            }
           
            const dvFields = new DVField();
            dvFields.renderAll($elm);
        }
    };

    // Consist of sets of buttons
    // Reset, quick save, export and import the value of the form using bootstrap 5
    JSONForm.fieldTypes['formcontrol'] = {
        template: `<div class="bs5 form-group jsonform-formcontrol rounded <%= elt.htmlClass?elt.htmlClass:"" %>">
            <label><%= elt.title %></label>
            <nav class="navbar bg-body-tertiary">
                <div class="container-fluid justify-content-end">
                    <div class="btn-group me-3" role="group">
                        <button class="btn btn-primary jsonform-save">Quick Save</button>
                        <button class="btn btn-primary jsonform-load">Quick Load</button>
                    </div>
                    <div class="btn-group me-3" role="group">
                        <button class="btn btn-primary jsonform-export">Export</button>
                        <button class="btn btn-primary jsonform-import">Import</button>
                    </div>
                    <button class="btn btn btn-outline-danger jsonform-reset">Reset</button>
                </div>
            </nav>
            <nav class="navbar bg-body-tertiary">
                <div class="container-fluid">
                    <div class="input-group">
                            <label class="input-group-text">Preset</label>
                        <select class="form-select custom-select jsonform-preset-list">
                            <optgroup label="Default Presets" class="defaultPresets">
                                <option value="default" selected>Default</option>
                            </optgroup>
                            <optgroup label="User's Presets" class="userPresets">
                            </optgroup>
                        </select>
                            <!-- <button type="button" class="btn btn-outline-secondary jsonform-preset-add" style="border-right: 0;" title="New Preset"><i class="icon-plus"></i></button> -->
                            <button type="button" class="btn btn-outline-secondary jsonform-preset-save" style="border-right: 0;" title="Save"><i class="icon-save"></i></button>
                            <button type="button" class="btn btn-outline-secondary jsonform-preset-saveas" title="Save as"><i class="icon-save-as"></i></button>
                            <button type="button" class="btn btn-danger jsonform-preset-remove" title="Delete"><i class="icon-trash"></i></button>
                    </div>
                </div>
            </nav>
        </div>`,
        onInsert: function (evt, node) {
            console.log("%cformcontrol onInsert", "color:orange", arguments);
            console.log("%c- formcontrol node:", "color:orange", node);
            console.log("%c- formcontrol this:", "color:orange", this);
            const $elm = $(node.ownerTree.domRoot).find(".jsonform-formcontrol");

            

            const formFingerprint = JSONFormExt.generateFingerprint(node);
            console.log("formFingerprint", formFingerprint);

            const resetActivePreset = async (alwaysConfirm) => {
                console.log("reseting form", node);
                if (alwaysConfirm) {
                    const conf = confirm("Resetting will discard all changes. Continue?");
                    if (!conf) return;
                }
                if (typeof node.formElement.onReset === "function") {
                    await node.formElement.onReset(node);
                }
                $(node.ownerTree.domRoot).jsonFormReset();
            }                

                
            $elm.find(".jsonform-reset").on("click", async function(e) {
                e.preventDefault();
                await resetActivePreset(true);
            });
            $elm.find(".jsonform-save").on("click", async function(e) {
                e.preventDefault();
                const value = node.ownerTree.root.getFormValues();
                JSONFormExt.localStorage.set(formFingerprint+"/quickSave", value);
            });
            $elm.find(".jsonform-load").on("click", async function(e) {
                e.preventDefault();
                const value = await JSONFormExt.localStorage.get(formFingerprint+"/quickSave");
                if (value) {
                    $(node.ownerTree.domRoot).jsonFormValue(value);
                }
            });
            $elm.find(".jsonform-export").on("click", async function(e) {
                e.preventDefault();
                JSONFormExt.exportForm(node);
            });
            $elm.find(".jsonform-import").on("click", async function(e) {
                e.preventDefault();
                const conf = confirm("Importing will overwrite the current form value. Continue?");
                if (!conf) return;
                JSONFormExt.importForm(node);
            });

            // handle presets
            const getPresetBaseLocation = () => {
                return "data/form/"+formFingerprint+"/presets";
            }
            /**
             * renders default presets
             */
            const renderDefaultPresets = async () => {
                // get user's preset from common.localStorage and append it to the select menu
                // get all *.jsv files in the default preset folder
                const defaultPresetFolder = getPresetBaseLocation()+"/default";
                if (await common.isDir(defaultPresetFolder)) {
                    let files = await common.searchFile("*.jsv", defaultPresetFolder);
                    console.log("default preset files", files);
                    for (let file of files) {
                        const presetName = common.getFilename(file);
                        $elm.find(".jsonform-preset-list optgroup.defaultPresets").append(`<option value="${presetName}">${presetName}</option>`);
                    }
                }

                // load default preset from schema definition
                if (node.formElement?.presets) {
                    for (let preset of node.formElement.presets) {
                        // if preset.file is defined, add it into option's data attribute
                        if (preset.file) {
                            $elm.find(".jsonform-preset-list optgroup.defaultPresets").append(`<option value="${preset.name}" data-file="${preset.file}">${preset.name}</option>`);
                        } else {
                            $elm.find(".jsonform-preset-list optgroup.defaultPresets").append(`<option value="${preset.name}">${preset.name}</option>`);
                        }
                    }
                }

                // do the same thing for user's preset
                const userPresetFolder = getPresetBaseLocation()+"/user";
                if (await common.isDir(userPresetFolder)) {
                    let files = await common.searchFile("*.jsv", userPresetFolder);
                    for (let file of files) {
                        const presetName = common.getFilename(file);
                        $elm.find(".jsonform-preset-list optgroup.userPresets").append(`<option value="${presetName}">${presetName}</option>`);
                    }
                }

                // immidiately select the activePreset
                let activePreset = node.ownerTree?.formDesc?.activePreset || await getActivePreset() || "default";
                $elm.find(".jsonform-preset-list").val(activePreset);
            }
            renderDefaultPresets();

            const savePreset = async (presetName, value) => {
                //JSONFormExt.localStorage.set(formFingerprint+"/preset/"+presetName, value);
                console.log("saving preset", presetName, value);
                const data = JSONFormExt.getExportableFormData(node, value);
                const path = getPresetBaseLocation()+"/user/"+presetName+".jsv";
                await common.mkDir(getPresetBaseLocation()+"/user");
                await common.filePutContents(path, JSON.stringify(data), "utf8", false);
            }

            const newPreset = async () => {
                while (true) {
                    const presetName = prompt("Enter preset name");
                    if (!presetName) return;
                    if (presetName == "default") {
                        alert("Invalid preset name");
                        continue;
                    }
                    // if presetName is not a valid filename, prompt again
                    if (!common.isValidFilename(presetName)) {
                        alert("Invalid preset name. Preseet name must not contain special characters.");
                        continue;
                    }
                    if ($elm.find(".jsonform-preset-list option[value='"+presetName+"']").length) {
                        alert("Preset name already exists. Please use another name.");
                        continue;
                    }

                    await saveActivePreset(presetName);
                    // append to the userPresets
                    $elm.find(".jsonform-preset-list optgroup.userPresets").append(`<option value="${presetName}">${presetName}</option>`);
                    //immidiate select the new preset
                    $elm.find(".jsonform-preset-list").val(presetName);
                    await $(node.ownerTree.domRoot).jsonFormReset(); // reset the form
                    // const value = node.ownerTree.root.getFormValues();

                    // await savePreset(presetName, value);

                    break;
                }
            }

            const savePresetAs = async (value) =>{
                if (!value) return;
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const presetName = prompt("Enter preset name");
                    if (!presetName) return;
                    if (presetName == "default") {
                        alert("Invalid preset name");
                        continue;
                    }
                    // if presetName is not a valid filename, prompt again
                    if (!common.isValidFilename(presetName)) {
                        alert("Invalid preset name. Preseet name must not contain special characters.");
                        continue;
                    }
                    if ($elm.find(".jsonform-preset-list option[value='"+presetName+"']").length) {
                        alert("Preset name already exists. Please use another name.");
                        continue;
                    }
                    await savePreset(presetName, value);
                    await saveActivePreset(presetName);
                    // append to the userPresets
                    $elm.find(".jsonform-preset-list optgroup.userPresets").append(`<option value="${presetName}">${presetName}</option>`);
                    //immidiate select the new preset
                    $elm.find(".jsonform-preset-list").val(presetName);
                    break;
                }
            }

            const deletePreset = async (presetName) => {
                //JSONFormExt.localStorage.delete(formFingerprint+"/preset/"+presetName);
                await common.unlink(getPresetBaseLocation()+"/user/"+presetName+".jsv");
            }

            const loadPreset = async (presetName) => {
                // get options element by its value, then check if data-file is defined, if so, load the file
                console.log("loading preset", presetName);
                const option = $elm.find(".jsonform-preset-list option[value='"+presetName+"']");
                const defaultPreset = getPresetBaseLocation()+"/default/"+presetName+".jsv";
                const userPreset = getPresetBaseLocation()+"/user/"+presetName+".jsv";
                var fileContent = null;
                if (option.data("file")) {
                    const file = option.data("file");
                    fileContent = await common.fileGetContents(file, "utf8");
                }
                
                // check in default preset first
                else if (await common.isFileAsync(defaultPreset)) {
                    fileContent = await common.fileGetContents(defaultPreset, "utf8");
                } else {
                    fileContent = await common.fileGetContents(userPreset, "utf8");
                }
                if (!fileContent) return null;
                
                try {
                    console.log("%c-Loading preset", "color:green", presetName);
                    const data = JSON.parse(fileContent);
                    
                    if (typeof node.formElement?.onPresetLoad == "function") {
                        node.formElement.onPresetLoad(data.value, node);
                    }

                    return data.value;
                } catch (e) {
                    console.error("Failed to load preset", e);
                    return null;
                }
            }


            /**
             * Save the active preset name
             * @param {*} activePreset 
             */
            const saveActivePreset = async (activePreset) => {
                const configPath = getPresetBaseLocation()+"/config.json";
                const data = {
                    activePreset: activePreset
                }
                await common.filePutContents(configPath, JSON.stringify(data), "utf8", false);
            }

            const getActivePreset = async () => {
                const configPath = getPresetBaseLocation()+"/config.json";
                if (!await common.isFileAsync(configPath)) return null;
                const data = await common.fileGetContents(configPath, "utf8");
                const config =  JSON.parse(data);
                return config?.activePreset;
            }
            
            $elm.find(".jsonform-preset-add").on("click", async function(e) {
                e.preventDefault();
                newPreset();
            });

            // save as a new preset. Prevent the use of default preset and existing preset.
            $elm.find(".jsonform-preset-saveas").on("click", async function(e) {
                e.preventDefault();
                const value = node.ownerTree.root.getFormValues();
                savePresetAs(value);
            });

            
            /**
             * save current preset. Get the current preset name from the select menu
             * and save the value to the localStorage.
             * If the current preset is default, prompt saveAs instead.
             */
            $elm.find(".jsonform-preset-save").on("click", async function(e) {
                e.preventDefault();
                const value = node.ownerTree.root.getFormValues();
                const presetName = $elm.find(".jsonform-preset-list").val();
                if (presetName == "default") {
                    savePresetAs(value);
                    return;
                }
                savePreset(presetName, value);
            });

            /**
             * Delete the current preset. Cannot delete presets under the group of Default Presets.
             */
            $elm.find(".jsonform-preset-remove").on("click", async function(e) {
                e.preventDefault();
                // get the selected option element
                const selectedOption = $elm.find(".jsonform-preset-list option:selected");
                if (selectedOption.parent().hasClass("defaultPresets")) {
                    alert("Cannot delete default preset");
                    return;
                }

                const presetName = $elm.find(".jsonform-preset-list").val();
                await deletePreset(presetName);
                
                $elm.find(".jsonform-preset-list option[value='"+presetName+"']").remove();

                // select the default preset
                $elm.find(".jsonform-preset-list").val("default");
            });


            $elm.find(".jsonform-preset-list").on("focus", function() {
                $(this).data("prevValue", $(this).val());
            });
            /**
             * Load the selected preset value to the form.
             */
            $elm.find(".jsonform-preset-list").on("change", async function(e) {
                // save previous preset
                let lastLoadedPresets = $(this).data("prevValue");
                console.log("%c-Saving previous preset", "color:orange", lastLoadedPresets);

                if (lastLoadedPresets) {
                    const oldValue = node.ownerTree.root.getFormValues();
                    await savePreset(lastLoadedPresets, oldValue);
                }

                $(this).data("prevValue", $(this).val());
                
                const presetName = $(this).val() || "default";
                // store the current preset name to the form
                node.ownerTree.formDesc.activePreset = presetName;
                console.log("%c-Saving active preset name", "color:orange", presetName);
                await saveActivePreset(presetName);

                // if presetName is default, reset the form
                if (presetName.toLowerCase() == "default") {
                    //$(node.ownerTree.domRoot).jsonFormReset();
                    await resetActivePreset(false);
                    return;
                }
                const value = await loadPreset(presetName);
                if (value) {
                    $(node.ownerTree.domRoot).jsonFormValue(value);
                } else {
                    // reset the form
                    $(node.ownerTree.domRoot).jsonFormReset();
                }
                
            });

            /**
             * Assign default value to the select menu
             */
        }
    };


    JSONForm.fieldTypes['password'].template = `<div class="jsonform-password-wrapper"><input type="password" class='form-control<%= (fieldHtmlClass ? " " + fieldHtmlClass : "") %>'name="<%= node.name %>" value="<%= escape(value) %>" id="<%= id %>" aria-label="<%= node.title ? escape(node.title) : node.name %>"<%= (node.disabled? " disabled" : "")%><%= (node.readOnly || node.readonly ? " readonly='readonly'" : "") %><%= (node.schemaElement && (node.schemaElement.step > 0 || node.schemaElement.step == "any") ? " step='" + node.schemaElement.step + "'" : "") %><%= (node.schemaElement && node.schemaElement.minLength ? " minlength='" + node.schemaElement.minLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.maxLength ? " maxlength='" + node.schemaElement.maxLength + "'" : "") %><%= (node.schemaElement && node.schemaElement.required && (node.schemaElement.type !== "boolean") ? " required='required'" : "") %><%= (node.placeholder? " placeholder=" + '"' + escape(node.placeholder) + '"' : "")%> /><button type="button" onclick="JSONFormExt.togglePassword(this)" title="${t('Show password')}"><i class="icon-eye-1"></i></button></div>`;



    JSONForm.fieldTypes.fieldset.template = `<fieldset class="form-group jsonform-error-<%= keydash %> <% if (elt.expandable) { %>expandable<% } %> <%= elt.htmlClass?elt.htmlClass:"" %>" <% if (id) { %> id="<%= id %>"<% } %>><% if (node.title || node.legend) { %><legend role="treeitem" aria-expanded="false"><%= node.title || node.legend %></legend><% } %><% if (elt.expandable) { %><div class="form-group"><% } %><div class="fieldset-content"><%= children %></div><% if (elt.expandable) { %></div><% } %></fieldset>`

}



$(document).ready(function() {
    // apply some css
    $("head").append(`<style>
        .form-group.btn-select-jumbo .controls > div > label {
            width: calc(46% - 1em);
            white-space: normal;
            margin: .5em;
        }

        .form-group.btn-select-jumbo .controls > div {
            display: flex;
            width: 100%;
            flex-flow: wrap;
            justify-content: center;
        }
    </style>`);
});
