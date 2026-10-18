const thisAddon = this;
const XmlTrans = require(thisAddon.getPathRelativeToRoot()+"/xml.module.js");
this.XmlTrans = XmlTrans;
const AddonUtils = require("www/js/AddonUtils.js");
this.gameEngine = "xml"
const supportedEngines = [this.gameEngine]
AddonUtils(thisAddon);
// thisAddon.createProject = AddonUtils.createProject;
// thisAddon.exportToFolder = AddonUtils.exportToFolder;
// thisAddon.exportAsZip = AddonUtils.exportAsZip;
// thisAddon.handleExport = AddonUtils.handleExport;

thisAddon.normalizeInitOptions = function(info={}) {
	const normalized = common.clone(info || {});
	normalized.projectTitle ||= "xml project";
	normalized.parser ||= "xml";
	if (!normalized.filepath && !normalized.dirpath) {
		normalized.dirpath = normalized.entryPoint || "";
	}
	if (normalized.dirpath) {
		normalized.filter ||= "**/*.xml";
		normalized.entryPoint = normalized.dirpath;
	} else if (normalized.filepath) {
		const paths = normalized.filepath.split(";").filter(Boolean);
		normalized.entryPoint = paths[0] || normalized.entryPoint || "";
	}
	return normalized;
}

thisAddon.resolveProjectFiles = async function(info={}) {
	const normalized = thisAddon.normalizeInitOptions(info);
	let path;
	let files = [];
	let basePath;

	if (normalized.filepath) {
		path = normalized.filepath;
		const paths = normalized.filepath.split(";").filter(Boolean);
		if (!paths.length) {
			throw new Error("Path is empty.");
		}
		files = paths.map((thisPath) => nwPath.basename(thisPath));
		basePath = nwPath.dirname(paths[0]);
	} else {
		path = normalized.dirpath;
		if (!path) {
			throw new Error("Path is empty.");
		}
		files = await common.glob(normalized.filter, {cwd:path});
		basePath = path;
	}

	if (!files?.length) {
		throw new Error(`File not found in ${path}\nwith filter ${normalized.filter}!`);
	}

	return {
		basePath,
		files,
		path,
		values: normalized
	};
}

thisAddon.shouldSkipText = function(text, options={}) {
	if (typeof text !== "string") return false;
	const candidate = text.trim();
	if (!candidate) return false;

	if (options.excludeNumericLike) {
		if (/^[+-]?(?:0x[0-9a-f]+|(?:\d+\.\d*|\.\d+|\d+)(?:e[+-]?\d+)?)$/i.test(candidate)) {
			return true;
		}
	}

	if (options.excludeColorCode) {
		if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(candidate)) {
			return true;
		}
	}

	if (options.excludeMiscAnnotation) {
		if (/^(?:true|false|undefined|null|nan|infinity|-infinity|on|off|yes|no)$/i.test(candidate)) {
			return true;
		}
	}

	if (options.excludeNonWords) {
		if (/^[\p{N}\p{P}\p{S}\p{Z}\s]+$/u.test(candidate)) {
			return true;
		}
	}

	return false;
}

thisAddon.prepareRules = function(rules, initOptions={}) {
	const sanitizedRules = thisAddon.sanitizeRule(rules) || [];
	for (const rule of sanitizedRules) {
		const originalHook = typeof rule.onBeforeRegisterString === "function"
			? rule.onBeforeRegisterString
			: function(text) { return text; };

		rule.onBeforeRegisterString = function(text, context, currentElement, thisConfig, options) {
			const processedText = originalHook.call(this, text, context, currentElement, thisConfig, options);
			if (typeof processedText !== "string") {
				return processedText;
			}
			if (thisAddon.shouldSkipText(processedText, initOptions)) {
				return "";
			}
			return processedText;
		};
	}
	return sanitizedRules;
}

thisAddon.prepareNewProject = async function(info={}) {
	const projectSource = await thisAddon.resolveProjectFiles(info);
	ui.log.show();
	ui.log.progress("Processing", "Creating a new XML translation project.", {consoleOnly:false, mode:'consoleOutput'});
	ui.log("Parser version ", thisAddon.package.version);
	ui.log("Parser options ", projectSource.values);
	ui.log("Files to process ", projectSource.files);
	await thisAddon.createProject(projectSource.files, projectSource.basePath, {
		init: projectSource.values,
		rules: thisAddon.prepareRules(projectSource.values.rules, projectSource.values)
	});
	await common.wait(150);
	await ui.log.progress("Done!", "Done!");
	ui.log.end();
}


thisAddon.writeFile = async function(file, basePath, targetDir, options={}) {
    console.log("%c Writing file", "color:aqua", arguments);
    const fullPath = nwPath.join(basePath, file);
    const targetFile = nwPath.join(targetDir , file)
	const thisOptions = options.parserOptions || {};
	thisOptions.config = this.sanitizeRule(options?.projectInfo?.init?.rules || []);
	thisOptions.parser = options?.projectInfo?.init?.parser || "xml";
    console.log("%c thisOptions", "color:aqua", thisOptions);
    const parser = new this.XmlTrans(fullPath, thisOptions);
    parser.assignTranslationPair(file, options.translationDatas);
	await parser.parse();
    console.log("%c parser", "color:aqua", parser);
    return await parser.write(targetFile);
}

thisAddon.getTransData = async function(file, basePath, options={}) {
	console.log("%c getTransData arguments:", "color:aqua", arguments);
	const xmlTrans = new this.XmlTrans(nwPath.join(basePath, file), {
		config: thisAddon.prepareRules(options.rules, options.init),
		parser: options.init.parser
	});
	try {
		await xmlTrans.parse();
	} catch (e) {
		await ui.log.error("Error parsing file", file, e.toString());
	}
	console.log("%c xmlTrans", "color:aqua", xmlTrans);
	return xmlTrans.transData;
}

thisAddon.sanitizeRule = function(rules) {
	if (common.isJSON(rules)) {
		rules = JSON.parse(rules);
	} else {
		if (typeof rules == "object") {
			rules = common.clone(rules)
		}
	}

	if (!rules) return rules;

	for (let rule of rules) {
		if (typeof rule.onBeforeRegisterString == "string") {
			rule.onBeforeRegisterString = new Function("text", "context", "currentElement", "thisConfig", "options", rule.onBeforeRegisterString)
		}
		if (typeof rule.getTranslatableElement == "string") {
			rule.getTranslatableElement = new Function("elm", rule.getTranslatableElement)
		}
		if (typeof rule.translateElement == "string") {
			rule.translateElement = new Function("elm", "text", "config", rule.translateElement)
		}
	}
	return rules;
}

const init = function() {
	const $slide = $(`<div>
				<h1><i class="icon-plus-circled"></i>XML Translator</h1>
				<div class="xmlTransCustomField"></div>
			</div>`);
	var customField;
	ui.newProjectDialog.addMenu({
		icon 			: "addons/xmlTrans/icon.png",
		descriptionBar 	: `<h2>XML & HTML Translator</h2>
						<p>${t('Start translation from XML-like documents. Supports both XML and HTML format.')}</p>`,
		actionBar		: "",
		goToSlide		: "xmlParser",
		at				: 4,
		slides : {
			kag: ui.newProjectDialog.newSlide("xmlParser", $slide, {
				buttons: [
					{
						text: t("Create project"),
						icon: "ui-icon-plusthick",
						click: async function() {

							if (!customField) return alert("Error: customField is not defined. This should not happen!");
							const values = customField.getFormValues();
							console.log("Form value", values);

							try {
								await thisAddon.prepareNewProject(values);
								$(this).dialog( "close" );
							} catch (e) {
								alert(e.message || e);
							}
						}
					},
				],
                onActive: ()=> {
					customField = new CustomFields($("<form></form>"), {jsonForm: {
						"schema": {
							"projectTitle": {
								"type": "string",
								"title": "Project title",
								"description": "Title of the translation project",
								"default": "xml project"
							},
							"dirpath": {
								"type": "string",
								"title": "Select Folder",
								"description": "Select the folder for processing. Translator++ will recursively retrieve the supported files from the specified folder.",
								"required": true
							},
							"filepath": {
								"type": "string",
								"title": "Select File",
								"description": "Select the files you want to process.",
								"required": true
							},
							"parser": {
								"type": "string",
								"title": "Parser",
								"description": "Select the parser to be used. Default is <code>xml</code>",
								"default": "xml",
								"enum": ["xml", "html"]
							},
							"excludeNumericLike": {
								"type": "boolean",
								"title": "Leave out numeric-like values",
								"description": "Skip pure numbers such as integers, floats, scientific notation, and hexadecimal values during extraction.",
								"default": true
							},
							"excludeColorCode": {
								"type": "boolean",
								"title": "Leave out color codes",
								"description": "Skip values like <code>#fff</code>, <code>#ffffff</code>, <code>#ffff</code>, or <code>#ffffffff</code>.",
								"default": true
							},
							"excludeMiscAnnotation": {
								"type": "boolean",
								"title": "Leave out misc annotations",
								"description": "Skip common non-translatable tokens such as <code>true</code>, <code>false</code>, <code>undefined</code>, <code>null</code>, or <code>NaN</code>.",
								"default": true
							},
							"excludeNonWords": {
								"type": "boolean",
								"title": "Leave out non-word strings",
								"description": "Skip strings made only of numbers, whitespace, punctuation, or symbols, with no letters or word characters to translate.",
								"default": true
							},
							"filter": {
								"type": "string",
								"title": "Filters",
								"description": "Filter the file name with glob pattern. Default is <code>**/*.xml</code>",
								"default": "**/*.xml",
							},
							"rules": {
								"type": "array",
								"items": {
									"type": "object",
									"title": "Friend",
									"properties": {
										"targetTranslation": {
											"type": "string",
										},
										"queryString": {
											"type": "string",
											"title": "Query selectors",
											"description": "Query selectors or <b>CSS queries</b> are patterns used to select the elements you want to style. You can use multiple selectors with comma."
										},
										"attribute": {
											"type": "string",
											"title": "Target Attribute",
											"description": "Specify attribute name to translate",
										},

										//events
										"onBeforeRegisterString": {
											"type": "string",
											"title": "Hook: onBeforeRegisterString",
											"description": "Hook that triggered before registering a translatable texts that found when running a query selectors.",
										},
										"getTranslatableElement": {
											"type": "string",
											"title": "Hook: getTranslatableElement",
											"description": "Get the translatable element. With this hook you can control which element relative to the selector to be processed.",
										},
										"translateElement": {
											"type": "string",
											"title": "Hook: translateElement",
											"description": "Here you can replace the default behavior of translateElement function.",
										},
										
									}
								}
							}
						},
						"form": [

							{
								"type": "info",
								"content": `<h2>XML Parser Ver.`+thisAddon.package.version+`</h2>`
							},
							{
								"type": "selectfieldset",
								"title": "Target file/directory",
								"description": "Select file/directory to be processed",
								"items": [
									{
										"type": "section",
										"legend": "Files",
										"items": [
											{
												"key":"filepath",
												"type": "selectfile",
												"multiple": true,
											}
										]
									},
									{
										"type": "section",
										"legend": "Directory",
										"items": [
											{
												"key":"dirpath",
												"type": "selectfile",
												"directory": true,
											},
											"filter"
										]
									},
								]
							},
							{
								"type": "text",
								"key": "projectTitle"
							},
							{
								"key": "parser",
								"type": "select",
							},
							{
								"type": "fieldset",
								"title": "Text filters",
								"expandable": true,
								"items": [
									{
										"key": "excludeNumericLike",
										"type": "checkbox"
									},
									{
										"key": "excludeColorCode",
										"type": "checkbox"
									},
									{
										"key": "excludeMiscAnnotation",
										"type": "checkbox"
									},
									{
										"key": "excludeNonWords",
										"type": "checkbox"
									}
								]
							},
							{
								"type": "tabarray",
								"items": {
									"type": "section",
									"legend": "{{idx}}. {{value}}",
									"items": [
										{
											"type": "selectfieldset",
											"title": "Target translation",
											"description": "Select whether to translate inner text or attribute. Create a separate rule if you want to translate both.",
											"key": "rules[].targetTranslation",
											"valueInLegend": true,
											"items": [
												{
													"type": "section",
													"legend": "All Text node",
													"value": "allTextNodes",
													"items": [
														{
															"type": "info",
															"value": "Fetch all text nodes in the document",
														}
													]
												},
												{
													"type": "section",
													"legend": "Inner Text",
													"value": "innerText",
													"items": [
														{
															"type": "info",
															"value": "Get the inner text of the selected node by query selector",
														},
														{
															"key": "rules[].queryString",
														},
														
													]
												},
												{
													"type": "section",
													"legend": "Attribute",
													"value": "attributes",
													"items": [
														{
															"type": "info",
															"value": "Get the attribute of the selected node by query selector",
														},
														{
															"key": "rules[].queryString",
														},
														{
															"key": "rules[].attribute",
														},
														
													]
												},
											]
										},

										{
											"type": "fieldset",
											"title": "Advanced",
											"expandable": true,
											"items": [
												{
													"key": "rules[].onBeforeRegisterString",
													"type": "ace",
													"aceMode": "javascript",
													"height": "200px",
													"prepend": "function(text, context, currentElement, thisrules, options) {",
													"placeholder": "return text;",
													"append": "}"
												},
												{
													"key": "rules[].getTranslatableElement",
													"type": "ace",
													"aceMode": "javascript",
													"height": "200px",
													"prepend": "function(elm) {",
													"placeholder": "return elm;",
													"append": "}"
												},
												{
													"key": "rules[].translateElement",
													"type": "ace",
													"aceMode": "javascript",
													"height": "200px",
													"prepend": "function(elm, text, rules) {",
													"append": "}"
												},
											]
										},

										
									]
								}
							}
						],
						// "value": {
						// 	"rules": [
						// 		{
						// 			"targetTranslation": "innerText",
						// 			"query": "query 1",
						// 			"onBeforeRegisterString": "event1"
						// 		},
						// 		{
						// 			"targetTranslation": "allTextNodes",
						// 			"query": "query 2",
						// 			"onBeforeRegisterString": "event2"
						// 		}
						// 	]
						// }
					}});
					console.log("xmltrans' customField", customField);
					$slide.find(".xmlTransCustomField").empty();
					console.log("custom field element:", customField.getElm());
					$slide.find(".xmlTransCustomField").append(customField.getElm());
					//$slide.find(".readEncoding").val("shift-jis, utf-16, utf-16le")
                }
			})
		}
	})



	
    engines.addHandler(supportedEngines, 'exportHandler', async function(targetPath, options) {
        await thisAddon.handleExport(targetPath, options);
        return common.halt();
    })

    engines.addHandler(supportedEngines, 'injectHandler', async function(targetDir, sourceMaterial, options) {
        ui.showLoading();
        ui.loadingProgress("Processing", "Injecting to directory", {consoleOnly:false, mode:'consoleOutput'});
        ui.log("Target directory: ", targetDir);
        ui.log("Source Material: ", sourceMaterial);
        if (sourceMaterial) ui.log("Warning: The app will try to apply translations to the files with the exact match relative location.");
        ui.log("Injecting with options: ", options);
        options.resourcePath = sourceMaterial;
        await thisAddon.exportToFolder(targetDir, undefined, options);
        ui.loadingProgress("Completed", "Completed!", {consoleOnly:false, mode:'consoleOutput'});
        ui.loadingEnd();
        return common.halt();
	});

	engines.addHandler(supportedEngines, 'updateProjectHandler', async function() {
		await thisAddon.updateProject();
		return common.halt();
	});
}

$(document).ready(function() {
	ui.onReady(function() {
		init();
	});
});