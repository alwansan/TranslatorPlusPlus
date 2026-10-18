var thisAddon 	= this;
var appName 	= this.package.name;
var spawn 		= spawn || require('child_process').spawn;
var bCopy 		= require('better-copy');
var fse 		= fse || require('fs-extra');
const csv       = require('jquery-csv');
const AddonUtils = require('www/js/AddonUtils.js');

AddonUtils(thisAddon);
thisAddon.gameEngine = "spreadsheet";
const supportedEngines = [thisAddon.gameEngine];
const spreadsheetFileAccept = ".xls,.xlsx,.xml,.sylk,.csv,.ods,.html,.htm,application/msexcel";


/**
 * Parse a sheet into an array
 * @param  {} xlsFile - Path to the file
 * @returns Array of the sheet, or undefined
 */
common.parseSheet = async function(xlsFile) {
    if (!await common.isFileAsync(xlsFile)) return;

    if (nwPath.extname(xlsFile).toLowerCase() == ".csv") {
        return {
            Worksheet: csv.toArrays(await common.fileGetContents(xlsFile))
        }
    }

    return await php.spawn("sheetToArray.php", {
        args: {
            file    : nwPath.resolve(xlsFile)
        },
        scriptPath: thisAddon.getLocation()
    });
}

/**
 * Patch Sheet
 * @param  {String} xlsFile - Path to the spreadsheet file
 * @param  {Object} patch - Object representation of the patch
 * Patch format should be:
 * {
 *     Sheet1: [
 *         {
 *             row: 0,
 *             col: 0,
 *             translation: "Translation"
 *         }
 *     ]
 * }
 */
thisAddon.patchSheet = async function(xlsFile, patch) {
    if (!await common.isFileAsync(xlsFile)) return;

    if (nwPath.extname(xlsFile).toLowerCase() == ".csv") {
        // patch via javascript
    }

    const patchFile = `xlsFile.patch~`;
    ui.log(`Dumping patch ${patchFile}`);
    await common.filePutContents(patchFile, JSON.stringify(patch), 'utf8', false);

    // patch via PHP
    await php.spawn("patchSheet.php", {
        args: {
            file    : nwPath.resolve(xlsFile),
            patch   : nwPath.resolve(patchFile)
        },
        onData: (output) => {
            ui.log(output.toString());
        },
        scriptPath: thisAddon.getLocation()
    });
    ui.log(`Removing patch file.`);
    await common.unlink(patchFile);
}


class SheetFile extends require("www/js/ParserBase.js").ParserBase {
	constructor(sheetData, options, callback) {
		super(sheetData, options, callback)
		this.transData = {
			data:[],
			context:[],
			tags:[],
			parameters:[],
			indexIds:{}
		};
	}
}

thisAddon.SheetFile = SheetFile;

thisAddon.normalizeInitOptions = function(info = {}, options = {}) {
    const normalized = {
        ...info
    };

    normalized.mode ||= normalized.filepath ? "files" : "folder";
    normalized.filepath ||= "";
    normalized.dirpath ||= "";
    normalized.fetchType ||= "normal";
    normalized.calcValue = Boolean(normalized.calcValue);
    normalized.calcFormat = Boolean(normalized.calcFormat);
    normalized.csvExcel = Boolean(normalized.csvExcel);
    normalized.skipHeader = parseInt(normalized.skipHeader, 10) || 0;
    normalized.model ||= {};
    normalized.model.columnPairs = Array.isArray(normalized.model.columnPairs) ? normalized.model.columnPairs : [];

    if (typeof normalized.model.rowHeaderTextColumn !== "undefined" && normalized.model.rowHeaderTextColumn !== "") {
        normalized.model.rowHeaderTextColumn = parseInt(normalized.model.rowHeaderTextColumn, 10);
    }

    const selectedPath = normalized.mode === "files" ? normalized.filepath : normalized.dirpath;
    normalized.entryPoint ||= selectedPath;
    if (options.ensureProjectTitle && !normalized.projectTitle) {
        if (normalized.mode === "files" && normalized.filepath) {
            const firstPath = normalized.filepath.split(";").filter(Boolean)[0] || "";
            normalized.projectTitle = nwPath.basename(firstPath || "untitled project");
        } else {
            normalized.projectTitle = nwPath.basename(normalized.dirpath || "untitled project");
        }
    }

    return normalized;
}

thisAddon.prepareNewProject = async function(info = {}) {
    const normalized = thisAddon.normalizeInitOptions(info, {ensureProjectTitle: true});
    let gameFolder = "";
    let selectedFile = "";

    if (normalized.mode === "files") {
        const paths = String(normalized.filepath || "").split(";").filter(Boolean);
        if (!paths.length) {
            await ui.logError("No spreadsheet file selected.");
            return;
        }
        selectedFile = paths.join(";");
        gameFolder = nwPath.dirname(paths[0]);
    } else {
        if (!normalized.dirpath) {
            await ui.logError("No spreadsheet folder selected.");
            return;
        }
        selectedFile = normalized.dirpath;
        gameFolder = normalized.dirpath;
    }

    await new Promise((resolve) => {
        trans.one("projectCreated.sheetParserPrepareNewProject", async function() {
            // Let procedureCreateProject finish its onAfterLoading work before refresh import starts.
            await common.wait(150);
            resolve();
        });

        trans.procedureCreateProject(gameFolder, {
            selectedFile: selectedFile,
            gameEngine: thisAddon.gameEngine,
            options: normalized
        });
    });
}

thisAddon.init = function() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const $slide = $(`
        <div class="sheetParserProjectCreator">
            <h1><i class="icon-plus-circled"></i>${t("Spreadsheet")}</h1>
            <div class="blockBox infoBlock withIcon">
                <h2>${t("Spreadsheet Parser Ver.")}${thisAddon.package.version}</h2>
                <p>${t("Create a translation project from spreadsheet data such as xls, xlsx, ods, xml, html, sylk, gnumeric, and csv. This keeps the existing spreadsheet parser behavior, but moves project creation into the addon so the same source settings can be reused by Update project.")}</p>
            </div>
            <form class="fieldgroup sheetParserForm" data-nosubmit="true">
                <div>
                    <h3>${t("Source")}</h3>
                    <label class="flex"><input type="radio" name="sheetParserMode" value="files" checked /> <span>${t("Select one or more spreadsheet files")}</span></label>
                    <label class="flex"><input type="radio" name="sheetParserMode" value="folder" /> <span>${t("Select a folder and let Translator++ scan supported spreadsheet files inside it")}</span></label>
                </div>

                <div class="dialogSectionBlock sheetSourceModeFiles">
                    <h2>${t("Spreadsheet files")}</h2>
                    <div class="info">${t("Choose one or more spreadsheet files from the same source folder.")}</div>
                    <label><input type="dvSelectPath" class="sheetFilepath fullWidth" accept="${spreadsheetFileAccept}" multiple /></label>
                </div>

                <div class="dialogSectionBlock sheetSourceModeFolder hidden">
                    <h2>${t("Spreadsheet folder")}</h2>
                    <div class="info">${t("Choose a folder that contains spreadsheet files to parse.")}</div>
                    <label><input type="dvSelectPath" class="sheetDirpath fullWidth" nwdirectory /></label>
                </div>

                <div class="dialogSectionBlock fieldgroup">
                    <h2>${t("Project title")}</h2>
                    <div class="info">${t("Optional. Leave blank to use the selected file or folder name.")}</div>
                    <label><input type="text" class="sheetProjectTitle fullWidth" /></label>
                </div>

                <div>
                    <h3>${t("Fetch type")}</h3>
                    <label class="flex"><input type="radio" name="spreadSheetFetchType" checked value="normal" /> <span>${t("The first columns are translatable text, the rest of the column are predefined translations (create a grid that matches the original table).")}</span></label>
                    <label class="flex"><input type="radio" name="spreadSheetFetchType" value="all" /> <span>${t("All columns are translatable text")}</span></label>
                    <label class="flex"><input type="radio" name="spreadSheetFetchType" value="custom" /> <span>${t("Custom")}</span></label>
                </div>

                <div class="customOptions hidden">
                    <h3>${t("Custom options")}</h3>
                    <div class="dialogSectionBlock fieldgroup">
                        <h2>${t("Which column do you want to fetch?")}</h2>
                        <div class="info">${t("Specify which source columns should be extracted and which target columns should receive translations. Column numbers are zero-based.")}</div>
                        <table class="fullWidth sheetCustomOptTable">
                            <thead>
                                <tr>
                                    <th>${t("Column to be translated")}</th>
                                    <th>${t("Column to put translation into")}</th>
                                    <th>${t("Action")}</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>

                    <div class="dialogSectionBlock">
                        <label class="flex fullWidth">
                            <div class="flexMain">
                                <div class="label">${t("Enable row header text column")}</div>
                                <div class="info">${t("If enabled, the selected column value will be attached to row context information.")}</div>
                            </div>
                            <div>
                                <input type="checkbox" class="flipSwitch enableRowHeaderTextColumn" value="1" />
                            </div>
                        </label>
                    </div>

                    <div class="dialogSectionBlock fieldgroup rowHeaderColumnBlock hidden">
                        <h2>${t("Row header text column")}</h2>
                        <div class="info">${t("Use a zero-based column index to label rows with speaker, actor, or other identifying text.")}</div>
                        <label><input type="number" class="rowHeaderTextColumn" value="0" min="0" /></label>
                    </div>
                </div>

                <div>
                    <h3>${t("Options")}</h3>
                    <div class="dialogSectionBlock">
                        <label class="flex fullWidth">
                            <div class="flexMain">
                                <div class="label">${t("Calculate cell value")}</div>
                                <div class="info">${t("Cell values produced by formulas will be resolved before extraction.")}</div>
                            </div>
                            <div>
                                <input type="checkbox" class="flipSwitch spreadSheetCalculateValue" value="1" />
                            </div>
                        </label>
                    </div>
                    <div class="dialogSectionBlock">
                        <label class="flex fullWidth">
                            <div class="flexMain">
                                <div class="label">${t("Get formatted value")}</div>
                                <div class="info">${t("Use the displayed formatted text instead of the raw numeric value when possible.")}</div>
                            </div>
                            <div>
                                <input type="checkbox" class="flipSwitch spreadSheetCalculateFormatting" value="1" />
                            </div>
                        </label>
                    </div>
                    <div class="dialogSectionBlock">
                        <label class="flex fullWidth">
                            <div class="flexMain">
                                <div class="label">${t("Parse CSV in Excel format")}</div>
                                <div class="info">${t("Force CSV parsing to follow Microsoft Excel behavior. Only applies to CSV files.")}</div>
                            </div>
                            <div>
                                <input type="checkbox" class="flipSwitch csvExcelFormat" value="1" />
                            </div>
                        </label>
                    </div>
                    <div class="dialogSectionBlock fieldgroup">
                        <h2>${t("Skip the first n row(s)")}</h2>
                        <div class="info">${t("Use this when the spreadsheet contains one or more header rows before the actual text data.")}</div>
                        <label><input type="number" class="skipHeader" value="0" min="0" /></label>
                    </div>
                </div>
            </form>
        </div>
    `);

    const dvField = new DVField($slide);
    let eventsBound = false;
    let projectTitleTouched = false;

    const createRow = (pair = {}) => $(
        `<tr>
            <td class="center"><input type="number" value="${parseInt(pair.source, 10) || 0}" min="0" class="sourceText" /></td>
            <td class="center"><input type="number" value="${parseInt(pair.target, 10) || 0}" min="0" class="translation" /> <button type="button" class="sameWithSourceColumn">${t("Same as source")}</button></td>
            <td class="center"><button type="button" class="removeRow" title="${t("Remove row")}"><i class="icon-cancel-1 red"></i></button> <button type="button" class="addRow" title="${t("Add row")}"><i class="icon-plus"></i></button></td>
        </tr>`
    );

    const resetCustomTable = (pairs = [{source: 0, target: 0}]) => {
        const normalizedPairs = Array.isArray(pairs) && pairs.length ? pairs : [{source: 0, target: 0}];
        const $tbody = $slide.find('.sheetCustomOptTable tbody');
        $tbody.empty();
        for (const pair of normalizedPairs) {
            $tbody.append(createRow(pair));
        }
    };

    const syncSourceModeUi = () => {
        const mode = $slide.find('input[name="sheetParserMode"]:checked').val();
        $slide.find('.sheetSourceModeFiles').toggleClass('hidden', mode !== 'files');
        $slide.find('.sheetSourceModeFolder').toggleClass('hidden', mode !== 'folder');
    };

    const syncFetchTypeUi = () => {
        const fetchType = $slide.find('input[name="spreadSheetFetchType"]:checked').val();
        $slide.find('.customOptions').toggleClass('hidden', fetchType !== 'custom');
    };

    const syncRowHeaderUi = () => {
        const enabled = $slide.find('.enableRowHeaderTextColumn').prop('checked');
        $slide.find('.rowHeaderColumnBlock').toggleClass('hidden', !enabled);
    };

    const suggestProjectTitle = () => {
        if (projectTitleTouched) return;
        const mode = $slide.find('input[name="sheetParserMode"]:checked').val();
        const currentPath = mode === 'files'
            ? String($slide.find('.sheetFilepath').val() || '').split(';').filter(Boolean)[0]
            : String($slide.find('.sheetDirpath').val() || '');
        if (!currentPath) return;
        $slide.find('.sheetProjectTitle').val(nwPath.basename(currentPath));
    };

    const collectValues = () => {
        const values = {
            mode: $slide.find('input[name="sheetParserMode"]:checked').val(),
            filepath: String($slide.find('.sheetFilepath').val() || ''),
            dirpath: String($slide.find('.sheetDirpath').val() || ''),
            projectTitle: String($slide.find('.sheetProjectTitle').val() || '').trim(),
            fetchType: $slide.find('input[name="spreadSheetFetchType"]:checked').val(),
            calcValue: $slide.find('.spreadSheetCalculateValue').prop('checked'),
            calcFormat: $slide.find('.spreadSheetCalculateFormatting').prop('checked'),
            csvExcel: $slide.find('.csvExcelFormat').prop('checked'),
            skipHeader: parseInt($slide.find('.skipHeader').val(), 10) || 0
        };

        if (values.fetchType === 'custom') {
            values.model = {
                columnPairs: []
            };

            $slide.find('.sheetCustomOptTable tbody tr').each(function() {
                const $row = $(this);
                values.model.columnPairs.push({
                    source: parseInt($row.find('.sourceText').val(), 10) || 0,
                    target: parseInt($row.find('.translation').val(), 10) || 0
                });
            });

            if ($slide.find('.enableRowHeaderTextColumn').prop('checked')) {
                values.model.rowHeaderTextColumn = parseInt($slide.find('.rowHeaderTextColumn').val(), 10) || 0;
            }
        }

        return values;
    };

    const populateForm = (info = {}) => {
        const normalized = thisAddon.normalizeInitOptions(info);
        projectTitleTouched = Boolean(normalized.projectTitle);

        $slide.find(`input[name="sheetParserMode"][value="${normalized.mode}"]`).prop('checked', true);
        $slide.find('.sheetFilepath').val(normalized.filepath || '');
        $slide.find('.sheetDirpath').val(normalized.dirpath || '');
        $slide.find('.sheetProjectTitle').val(normalized.projectTitle || '');
        $slide.find(`input[name="spreadSheetFetchType"][value="${normalized.fetchType}"]`).prop('checked', true);
        $slide.find('.spreadSheetCalculateValue').prop('checked', normalized.calcValue);
        $slide.find('.spreadSheetCalculateFormatting').prop('checked', normalized.calcFormat);
        $slide.find('.csvExcelFormat').prop('checked', normalized.csvExcel);
        $slide.find('.skipHeader').val(normalized.skipHeader || 0);
        $slide.find('.enableRowHeaderTextColumn').prop('checked', typeof normalized.model?.rowHeaderTextColumn !== 'undefined');
        $slide.find('.rowHeaderTextColumn').val(normalized.model?.rowHeaderTextColumn || 0);
        resetCustomTable(normalized.model?.columnPairs);
        syncSourceModeUi();
        syncFetchTypeUi();
        syncRowHeaderUi();
        suggestProjectTitle();
    };

    const bindEvents = () => {
        if (eventsBound) return;
        eventsBound = true;

        $slide.on('change', 'input[name="sheetParserMode"]', function() {
            syncSourceModeUi();
            suggestProjectTitle();
        });

        $slide.on('change', 'input[name="spreadSheetFetchType"]', function() {
            syncFetchTypeUi();
        });

        $slide.on('change', '.enableRowHeaderTextColumn', function() {
            syncRowHeaderUi();
        });

        $slide.on('change input', '.sheetFilepath, .sheetDirpath', function() {
            suggestProjectTitle();
        });

        $slide.on('input', '.sheetProjectTitle', function() {
            projectTitleTouched = Boolean(String($(this).val() || '').trim());
        });

        $slide.on('click', '.sameWithSourceColumn', function() {
            const $row = $(this).closest('tr');
            $row.find('.translation').val($row.find('.sourceText').val());
        });

        $slide.on('input', '.sourceText', function() {
            const $row = $(this).closest('tr');
            if (!$row.find('.translation').val()) {
                $row.find('.translation').val($(this).val());
            }
        });

        $slide.on('click', '.removeRow', function() {
            $(this).closest('tr').remove();
            if ($slide.find('.sheetCustomOptTable tbody tr').length < 1) {
                resetCustomTable();
            }
        });

        $slide.on('click', '.addRow', function() {
            $(this).closest('tr').after(createRow());
        });
    };

    ui.newProjectDialog.newSlide('spreadsheet', $slide, {
        buttons: [
            {
                text: t('Create Project'),
                click: async function() {
                    await thisAddon.prepareNewProject(collectValues());
                }
            }
        ],
        onActive: () => {
            dvField.renderSelectPath($slide.find('[type=dvSelectPath]').not('.rendered'));
            bindEvents();
            populateForm();
        }
    });

    const $mainSlide = $('#dialogNewProject [data-gotoSlide="spreadsheet"]');
    if ($mainSlide.length) {
        $mainSlide.find('.iconBar img').attr('src', thisAddon.getWebLocation() + '/icon.png');
        $mainSlide.find('.descriptionBar').html(`<h2>${t('Spreadsheet')}</h2><p>${t('Start a translation project from spreadsheet data (xls, xlsx, ods, xml, html, sylk, gnumeric, csv) with update-project support.')}</p>`);
    }

    if (window.engineDetectionRegistry && !window.engineDetectionRegistry.definitions.has("spreadsheet")) {
        window.engineDetectionRegistry.register({
            id: "spreadsheet",
            addonId: thisAddon.id,
            engineIds: supportedEngines,
            displayName: "Spreadsheet",
            priority: 90,
            detect: async function(request) {
                const entryPoint = request.entryPoint;
                if (!await common.isFileAsync(entryPoint)) return { matches: [] };

                const extension = nwPath.extname(entryPoint).toLowerCase();
                const strongExtensions = [".xls", ".xlsx", ".ods", ".csv", ".sylk", ".gnumeric"];
                const ambiguousExtensions = [".xml", ".html", ".htm"];
                if (!strongExtensions.includes(extension) && !ambiguousExtensions.includes(extension)) {
                    return { matches: [] };
                }

                return {
                    matches: [{
                        engineId: thisAddon.gameEngine,
                        confidence: strongExtensions.includes(extension) ? 1 : 0.6,
                        evidence: [`Selected ${extension.toUpperCase().slice(1)} spreadsheet file.`],
                        entryPoint,
                        gameRoot: nwPath.dirname(entryPoint),
                        preferredInput: "entryPoint"
                    }]
                };
            },
            openProjectWizard: async function(candidate, launchContext) {
                ui.newProjectDialog.gotoSlide("spreadsheet", "engineDetectResult");
                $slide.find('input[name="sheetParserMode"][value="files"]').prop('checked', true).trigger('change');
                window.engineDetectionRegistry.setFieldValue(
                    $slide.find('.sheetFilepath'),
                    launchContext.entryPoint
                );
            }
        });
    }

    engines.addHandler(supportedEngines, 'updateProjectHandler', async function() {
        await thisAddon.updateProject();
        return common.halt();
    });

}


thisAddon.test = async function() {
    var pathToFile = 'D:/test/sheets/test.xlsx'
    var data = await common.parseSheet(pathToFile);
    var sheetFile = new SheetFile(data);

    console.log(sheetFile);
}

$(document).ready(function() {
	ui.onReady(function() {
		thisAddon.init();
	});
});