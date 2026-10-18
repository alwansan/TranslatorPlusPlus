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
 * Converts FormIO schema into JSONForm format
 */



const FormIOConverter = function() {

}

FormIOConverter.typeMap = {
    // formIoType : JSONFormType
    "textfield" : "text",
    "selectboxes" : "checkboxes",
    "radio" : "radios",
    "well": "section",
    "panel": "fieldset",
}

FormIOConverter.prototype.formIOtoJSONForm = function(formIOSchema) {
    const JSONForm = {
        schema: {},
        form: []
    }
    const convertType = (type)=> {
        if (FormIOConverter.typeMap[type]) return FormIOConverter.typeMap[type];
        return type;
    }

    if (typeof formIOSchema !== "object") return JSONForm;
    if (Array.isArray(formIOSchema)) {
        // assume components
        formIOSchema = {
            components : formIOSchema
        }
    }

    const fetchComponents = (formIOComponents, JSONFormForm, parentComponent)=> {
        for (let i in formIOComponents) {
            let thisComponent = formIOComponents[i];
            JSONForm.schema[thisComponent.key] = {
                type: "string", // default
                title: thisComponent.label,
                default: thisComponent.defaultValue,
            }
            let JSONFormSchema = JSONForm.schema[thisComponent.key]

            let thisForm = {}
            thisForm = thisComponent;
            
            // translates validation
            if (thisComponent.validate) {
                if (typeof thisComponent.validate.required !== "undefined") JSONFormSchema.required = thisComponent.validate.required;
            }
            //translate html attributes
            if (thisComponent.attributes) {
                thisForm.htmlMetaData = thisComponent.attributes
            }
            //translate custom class
            //FormIO only applies classes on the wrapper and not on the field
            if (thisComponent.customClass) {
                thisForm.htmlClass = thisComponent.customClass
            }

            if (["checkbox"].includes(thisComponent.type)) {
                JSONFormSchema.type = "boolean"
                thisForm.inlinetitle =  thisComponent.label
            } else if (["number"].includes(thisComponent.type)) {
                JSONFormSchema.type = "number"
            } else if (["selectboxes"].includes(thisComponent.type)) {
                // map selection
                let thisEnum = []
                let titleMap = {}
                for (let x in thisComponent.values) {
                    let thisKey = thisComponent.values[x].value;
                    thisEnum.push(thisKey);
                    titleMap[thisKey] = thisComponent.values[x].label;
                }
                JSONFormSchema.items = {
                    type: "string",
                    title: thisComponent.label,
                    enum:thisEnum
                }
                thisForm.titleMap = titleMap;
            } else if (["radio"].includes(thisComponent.type)) {
                // map selection
                let thisEnum = []
                let titleMap = {}
                for (let x in thisComponent.values) {
                    let thisKey = thisComponent.values[x].value;
                    thisEnum.push(thisKey);
                    titleMap[thisKey] = thisComponent.values[x].label;
                }
                JSONFormSchema.enum = thisEnum;
                thisForm.titleMap = titleMap;


            } else if (["select"].includes(thisComponent.type)) {
                let thisEnum = []
                let titleMap = {}
                if (thisComponent?.data?.values) {
                    for (let x in thisComponent.data.values) {
                        let thisKey = thisComponent.data.values[x].value;
                        thisEnum.push(thisKey);
                        titleMap[thisKey] = thisComponent.data.values[x].label;
                    }
                }
                JSONFormSchema.enum = thisEnum;
                thisForm.titleMap = titleMap;
            }
            
            // if has components then recursively translate FormIO components to JSONForm's items
            if (thisComponent.components) {
                //recursive
                thisForm.items = [];

                // view only shouldn't have key
                if (thisForm.key) {
                    thisForm.formIOKey = thisForm.key;
                    delete thisForm.key;
                }

                fetchComponents(thisComponent.components, thisForm.items, thisComponent)
            }

            if (parentComponent?.type == "tabs") {
                // formIO don't have form type for immidiate tabs's child
                thisForm.type = "tab"
                thisForm.id = thisForm.formIOKey;
            } else {
                // translate types according to the FormIOConverter.typeMap definition
                thisForm.type = convertType(thisForm.type)
            }


            JSONFormForm.push(thisForm);

        }
        return JSONForm;
    }

    return fetchComponents(formIOSchema.components, JSONForm.form);
}


module.exports = FormIOConverter;