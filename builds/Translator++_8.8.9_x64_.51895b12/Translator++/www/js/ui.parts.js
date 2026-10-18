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
const UIParts = {};
const CustomFields 	= require('www/js/customFields.js');

const renderStyle = function($formElm, css={}) {
	for (let key in css) {
		$formElm.css(key, css[key]);
	}
}

/**
 * Creates a form dialog with custom fields.
 * @param {jQuery|Object} $elm - jQuery object or customField object representing the element to which the form will be appended.
 * @param {Object} [options={}] - Options for customization.
 * @param {boolean} [options.ignoreValidation=false] - Flag to submit the form regardless of validation errors.
 * @returns {Promise<Object>} - A promise that resolves to the form field values when the form is submitted successfully, or rejects if an error occurs.
 */
UIParts.form = async function($elm, options={}) {
	options ||= {};
	options.css ||=  {};
	options.overlayCss ||= {};
	// submit regardless validation error
	options.ignoreValidation ||= false;

	return new Promise((resolve, reject) => {
		var result;
		const $form = $(`<form class="uiCustomFields"></form>`);
		if ($elm?.id) $form.attr("id", $elm.id);
		const customFields = new CustomFields($form, $elm);
		$form.data("customFields", customFields)
		$form.on("submit", function(e) {
			e.preventDefault();
			console.log("form submitted!");
			//$form.dialog("close");

			let validate = {};
			if (!options.ignoreValidation) {
				validate = customFields.validate();
			}
			if (!validate?.errors) {
				//result = customFields.getValues();
				result = customFields.getFormValues();

				// Optional caller hook. Return false to keep dialog open.
				// Return a value to override what will be resolved.
				if (typeof options.onSubmit === "function") {
					try {
						const hookResult = options.onSubmit(result, customFields, $form);
						if (hookResult === false) return;
						if (typeof hookResult !== "undefined") result = hookResult;
					} catch (err) {
						console.warn("ui.form onSubmit hook error", err);
						return;
					}
				}

				$form.dialog("close");
			}
		});

		options.$form = $form;
		

		const dialogOptions = {...{
			title	: options.title || t("Form"),
			autoOpen: false,
			modal	:options.modal || true,
			width	:options.width ||800,
			height	:options.height ||600,
			minWidth:options.minWidth ||640,
			minHeight:options.minHeight ||320,
			show: {
				effect: "fade",
				duration: 200
			},
			hide: {
				effect: "fade",
				duration: 200
			},
			close:function(event, ui) {
				resolve(result);
				common.wait(500)
				.then(()=> {
					console.log("removing elm");
					$form.remove();
				});
			},
			open: function(event, ui) {
				console.log("form opened", ui, this);
				if (typeof options.onOpen == "function") options.onOpen.call($form, event, ui);
			},
			buttons:options.buttons || [
				{
					text: options.buttonCancelText || t("Cancel"),
					icon: "ui-icon-close",
					click: function() {
						$(this).dialog( "close" );
					}
				},
				{
					text: options.buttonOkText || t("Ok"),
					click: async function() {
						$form.submit();
					}
				}
	
			]
		}, ...options}
		$form.dialog(dialogOptions);
		renderStyle($form.closest(".ui-dialog"), options.css);
		renderStyle($("body > .ui-widget-overlay.ui-front"), options.overlayCss);
		$form.dialog("open");
		
	})
	
}

// UiParts.form available globally as `ui.form`
module.exports = UIParts;