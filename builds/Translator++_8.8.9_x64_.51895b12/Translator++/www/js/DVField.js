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
 * Render file selector fields
 * @param  {} rootElement
 */// custom field renderer
DVField = function(rootElement, options) {
	this.html = rootElement||$("body");
	this.options = options || {};
	this.options.disableAutoRender = this.options.disableAutoRender || false;
}

DVField.prototype.fileSelector = function(options) {
	options = options||{};
	options.onSelect = options.onSelect || function(path) { console.log(path)};
	options.accept = options.accept || "";
	options.multiple = options.multiple || false;
	options.dir = options.dir || false;
	options.save = options.save || undefined;
	options.default = options.default  || "";
	console.log("File selector", arguments);
	
	$(".__pseudoFileDlg1").remove();
	var $elm = $("<input type='file' style='display:none' class='hidden __pseudoFileDlg1' />");
	$elm.on("input", function() {
		var thisVal = $(this).val();
		$(this).remove();
		options.onSelect.call(this, thisVal);
	});
	
	if (options.accept.length > 0) $elm.attr("accept", options.accept)
	if (options.default.length > 0) $elm.attr("nwworkingdir", options.default)
	if (options.dir) $elm.attr("nwdirectory", "nwdirectory")
	if (options.multiple) $elm.attr("multiple", "multiple")
	if (typeof options.save !== 'undefined') $elm.attr("nwsaveas", options.save)
	
	//$("body").append($elm);
	$elm.trigger("click")
}

DVField.prototype.renderDvFile = function($elm) {
	$elm.each(function() {
		var $this = $(this);
		var $that = $this;
		if ($this.hasClass('.rendered')) return $this;		
		var $psField = $("<input type='file' />");
		$.each(this.attributes, function() {
			if(this.specified) {
				$psField.attr(this.name, this.value);
			}
		});
		$psField.attr("type", "file");
		$psField.addClass("hidden");
		$(this).parent().append($psField);
		$(this).on("click.dvField", function(e) {
			$psField.trigger("click");
		});
		$psField.on("input.dvField", function(e) {
			$that.val($(this).val());
			var target = $(this).data("target")
			if (target) {
				$(target).val($(this).val())
			}					
			$that.trigger("input");
		})
		$psField.on("change.dvField", function(e) {
			$that.val($(this).val());
			var target = $(this).data("target")
			if (target) {
				$(target).val($(this).val())
			}					
			
			$that.trigger("change");
		})
		$(this).addClass("rendered");
	})
	return $elm;	
}

DVField.prototype.renderSelectPath = function($elm) {
	var thisDVField = this;	
	$elm.each(function() {
		var $this = $(this);	
		if ($this.hasClass('.rendered')) return $this;
	
		var $container = $("<span class='dvField dvFieldWrapper dvSelectPath dvSelectPath_wrapper'></span>");
		$this.attr("type", "text");
		$this.addClass("dvField_isRendered");
		
		$this.parent().append($container);
		$container.append($this);
		
		var $fldButton = $("<input type='button' class='dvFieldButton' value='...' />")
		$fldButton.on("click", function() {
			var $this = $(this).prev();
			window.globObj = $this;
			//console.log("nwdirectory", $this.attr());
			thisDVField.fileSelector({
				onSelect : function(path) {
					$this.val(path);
					$this.trigger("change");
				},
				accept 		: $this.attr("accept"),
				multiple 	: $this.is("[multiple]"),
				dir 		: $this.is("[nwdirectory]"),
				save 		: $this.attr("nwsaveas"),
				default		: $this.val()				
			})
		})
		
		$container.append($fldButton);
		$this.addClass("rendered");	
	})
}

DVField.parseTagValue = function(value="") {
	console.log("ParseTagValue");
	var result = []

	if (!value) return result;
	if (!common.isJSON(value)) return result;
	console.log("reached here");
	const parsed = JSON.parse(value);
	for (let obj of parsed) {
		result.push(obj?.value)
	}
	console.log("ParseTagValue result", result);
	return result;
}

DVField.prototype.renderTagFields = function($elm, $reference) {
	//const self = this;
	$elm.each(function() {
		const $this = $(this);
		var $thisRef = $this;
		if ($reference?.length) {
			$thisRef = $reference;
		}

		if (!$thisRef.is("[data-tagify]")) return;
		console.log("rendering tagify for:", $elm, $thisRef);
		var enforceWhitelist = Boolean($thisRef.is("[data-tagify-enforcewhitelist]"))
		var maxTags = $thisRef.is("[data-tagify-enforcewhitelist]")
		var mode = $thisRef.attr("data-tagify-mode")
		var whitelist = []
		if ($thisRef.is("[data-tagify-whitelist]")) {
			try {
				whitelist = JSON.parse($thisRef.attr("data-tagify-whitelist"));
			} catch(e) {
				// do nothing
			}
		}
		if (common.isNumeric(maxTags)) {
			maxTags = parseInt(maxTags)
		} else {
			maxTags = Infinity
		}

		var tagify = new Tagify($this[0], {
			dropdown: {
				highlightFirst: true
			},
			whitelist: whitelist, // predefined values
			enforceWhitelist: enforceWhitelist, // only allow values from the whitelist
			maxTags:maxTags || Infinity,
			mode:mode
		});
		$this.data("tagify", tagify);
		// tagify.on('add', function (e) {
		// 	console.log("adding tag", e);

		// 	$this.trigger("add", e.detail.data.value)
		// });
		// tagify.on('remove', function (e) {
		// 	console.log("Removing tag", e);
		// 	$this.trigger("remove", e.detail.data.value)
		// });
		tagify.on('change', function (e) {
			//console.warn('change', e);
			if (common.isJSON(e.detail.value)) {
				$this.trigger("change", JSON.parse(e.detail.value))
				$this.data("value", DVField.parseTagValue(e.detail.value))
			} else {
				$this.trigger("change", [])
				$this.data("value", [])
			}
		});
	})

}

/**
 * Render parameters that not directly applied to the form tags
 * This function will detect data-renderdvfield and render that field
 * data-targetfield is css selector string
 * @param  {} $elm
 */
DVField.prototype.renderAll = function($elm) {
	var thisDVField = this;	
	$elm.each(function() {
		var $this = $(this);
		if ($this.hasClass("rendered")) return $this;
		if ($this.is("[data-renderdvfield]") == false) return $this;

		try {
			var $targetField;
			// if attr("data-renderdvfield") is empty or "this", reffer to the current field
			if ($this.attr("data-renderdvfield").toLocaleLowerCase() == "this" || !$this.attr("data-renderdvfield")) {
				$targetField = $this;
			} else {
				$targetField = $($this.attr("data-renderdvfield"));
			}
			if ($targetField.length == 0) return $this;

			if ($this.is("[data-tagify]")) {
				thisDVField.renderTagFields($targetField, $this);
			} else {
				$targetField.attr('accept', $this.attr('accept'));
				if ($this.is("[multiple]")) $targetField.attr("multiple", "multiple");
				if ($this.is("[nwdirectory]")) $targetField.attr("nwdirectory", "nwdirectory");
				if ($this.is("[nwsaveas]")) $targetField.attr("nwsaveas", "nwsaveas");
				thisDVField.renderSelectPath($targetField);			
			}


		} catch (e) {
			console.warn("Error when rendering DVField");
		}


		$this.addClass("rendered");
	})
}


DVField.prototype.init = function() {
	// type="dvfile"
	// change default display of file field
	var thisDVField = this;
	$(document).ready(()=> {
		if (!this.options.disableAutoRender) {
			thisDVField.renderDvFile(this.html.find('[type=dvfile]').not(".rendered"));
			thisDVField.renderSelectPath(this.html.find('[type=dvSelectPath]').not(".rendered"));
			thisDVField.renderAll(this.html.find('[data-renderdvfield]').not(".rendered"));
		}
	})
}