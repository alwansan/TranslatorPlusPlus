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

// ===========================================================
// Custom field class
// ===========================================================
/**
 * CustomFields class for handling custom form fields.
 * @extends require("www/js/BasicEventHandler.js")
 */
class CustomFields extends require("www/js/BasicEventHandler.js") {
    /**
     * Constructor for CustomFields class.
     * @param {jQuery|Object} $form - jQuery object or object representing form.
     * @param {Object} [options={}] - Options for customization.
     */
    constructor($form, options = {}) {
        super($form);


        // Warns about creation
        console.log("Creating custom fields", arguments);

        // Handling different argument scenarios
        // if (arguments.length == 1 && typeof $form == "object" && $form.constructor.name !== "jQuery") {
        //     options = {
        //         jsonForm: $form
        //     }
        //     $form = $("<form></form>");
        //     $form.submit(false);
        // }
		if (arguments.length == 1) {
			options = CustomFields.sanitize(arguments[0]);
			$form = $("<form class='autogenerateForm'></form>");
		} else {
			options = CustomFields.sanitize(options);
			$form ||= $("<form></form>");
		}

        /**
         * jQuery form element.
         * @type {jQuery}
         */
        this.$elm = $form;
		this.$elm.on("submit", (e)=> {
			e.preventDefault();
		});

		this.getElm = function() {
			return this.$elm;
		}


        /**
         * Initialize the CustomFields instance.
         */
        this.init = (value) => {
			this.$elm.empty();
			if (value) {
				if (options.jsonForm) {
					options.jsonForm.value = value;
				}
			}
            if (options.jsonForm) this.addJSONForm(options.jsonForm);
            if (options.html) this.addHTML(options.html);
            this.resolveState("ready");
        };

        this.init();
    }

    /**
     * Adds JSON form to the form element.
     * @param {Object} [settings={}] - Settings for the JSON form.
     */
    addJSONForm(settings = {}) {
        console.log("Adding jsonform", settings);
        try {
            this.$elm.jsonForm(settings);
            CustomFields.bindExternalLinks(this.$elm[0]);
        } catch (e) {
            console.warn("Invalid jsonForm options", e);
        }
    }

    /**
     * Gets the JSON form tree.
     * @returns {Object} - JSON form tree data.
     */
    getJsonFormTree() {
        return this.$elm.data("jsonformTree");
    }

    /**
     * Validates the form.
     * @returns {boolean} - Validation result.
     */
    validate() {
        const ft = this.getJsonFormTree();
        if (!ft) return;
        return ft.validate();
    }

    /**
     * Adds HTML content to the form.
     * @param {jQuery} $elm - jQuery object representing HTML content.
     */
    addHTML($elm) {
        this.$elm.append($elm);
    }

    /**
     * Gets values from the form.
     * @returns {Object} - Form field values.
     */
    getValues() {
        // let fd = new FormData(this.$elm[0]);
        // return Object.fromEntries(fd);
        return this.getFormValues();
    }

    /**
     * set values from the form.
     * @param {Object} values - Form field values.
     */
	setValues(values) {
		if (!values) return;
		this.init(values);
	}

	/**
     * Gets JSONForm's value.
     * @returns {Object} - Form field values.
     */
	getFormValues() {
		const jsonForm = this.getJsonFormTree();
		if (!jsonForm) throw new Error("Not a jsonform");
		return jsonForm.root.getFormValues()
	}

    /**
     * Sets value for a field by its name.
     * @param {string} name - Name of the field.
     * @param {any} val - Value to set.
     */
    setValueByName(name, val) {
        console.log("Updating value", name, val, "of", this);
        const $fld = this.$elm.find(`[name="${name}"]`);
        $fld.val(val);
    }
}

/**
 * Sanitizes options for CustomFields class.
 * @param {Object} option - Options object.
 * @returns {Object} - Sanitized options.
 */
CustomFields.sanitize = function(option) {
	console.log("CustomFields - sanitizing option", option);
	if (typeof option == "function") {
		option = option();
	}
    if (common.isHTMLNode(option)) return {
        html: option
    }
    if (CustomFields.isJsonForm(option)) return {
        jsonForm: option
    }
    return option;
};

/**
 * Checks if the data represents a JSON form.
 * @param {Object|string|function} [data={}] - Data to check.
 * @returns {boolean} - Whether the data represents a JSON form.
 */
CustomFields.isJsonForm = function(data = {}) {
    if (typeof data == "string") {
        if (common.isJSON(data)) data = JSON.parse(data);
    } else if (typeof data == "function") {
        data = data() || {};
    }
    if (!data) return false;
    if (data.constructor.name !== "Object") return false;
    if (!data?.schema && !data?.form) return false;
    return true;
};

CustomFields.bindExternalLinks = function(parentElement) {
    // Select all elements with the 'help-block' class within the parentElement
    var helpBlocks = parentElement.querySelectorAll('.help-block');
  
    // Iterate over each 'help-block' element
    helpBlocks.forEach(function(helpBlock) {
      // Use a regular expression to find URL-like text
      var urlPattern = /https?:\/\/[^\s]+/g;
      var text = helpBlock.textContent;
      var urls = text.match(urlPattern);
  
      // If URLs are found, create clickable elements
      if (urls) {
        urls.forEach(function(url) {
          var link = document.createElement('a');
          link.href = "#";
          link.textContent = url;
          $(link).attr('data-url', url);
          $(link).attr("external", true);
          // Bind the click event to open the URL externally

  
          // Replace the URL text with the clickable link
          helpBlock.innerHTML = helpBlock.innerHTML.replace(url, link.outerHTML);

          $(helpBlock).find("a[external]").on("click", function(e) {
                e.preventDefault(); // Prevent the default link behavior
                $(this).addClass("externalRendered");

                console.log("opening external link", $(this).attr("data-url"));
                nw.Shell.openExternal($(this).attr("data-url")); // Open the URL in the system's browser
            });
        });
      }
    });

    $(parentElement).find("a[external]").not(".externalRendered").on("click", function(e) {
        $(this).addClass("externalRendered");
        e.preventDefault(); // Prevent the default link behavior
        console.log("opening external link", $(this).attr("href"));
        nw.Shell.openExternal($(this).attr("href")); // Open the URL in the system's browser
    });
    $(parentElement).find("a.externalLink").not(".externalRendered").on("click", function(e) {
        $(this).addClass("externalRendered");
        e.preventDefault(); // Prevent the default link behavior
        console.log("opening external link", $(this).attr("href"));
        nw.Shell.openExternal($(this).attr("href")); // Open the URL in the system's browser
    });
}


CustomFields.loadJSONForm = async function() {
    // load the main jsonform module
    await common.loadDomScript("/www/modules/jsonform/lib/jsonform.js");
    
    // load extended jsonform modules
    await common.loadDomScript("/www/js/jsonform.ext.js");
}

module.exports = CustomFields;