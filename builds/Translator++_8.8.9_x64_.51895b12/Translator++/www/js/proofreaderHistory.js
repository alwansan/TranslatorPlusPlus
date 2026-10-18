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
 * View logic for www/proofreaderHistory.html, the Proofreader history viewer opened via
 * `ProofreaderEngine.openHistory()` (www/js/ProofreaderEngine.js). Runs in its own popup window;
 * `window.opener` is the trans.html window that owns `ProofreaderEngine.history` (the actual
 * storage). This file only renders -- see `ProofreaderEngine.history` for list/append/clear/locate.
 */
(function(root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ProofreaderHistoryViewer = api;
        if (root.document) {
            root.document.addEventListener("DOMContentLoaded", function() {
                api.mount(root);
            });
        }
    }
})(typeof window === "undefined" ? undefined : window, function() {
    const labelSets = {
        en: {
            title: "Proofreader History",
            search: "Search by object, previous text or corrected text",
            refresh: "Refresh",
            clear: "Clear",
            close: "Close",
            noRuns: "There is no Proofreader history for this project.",
            noChanges: "No modified cells match this search.",
            status: "Status",
            engine: "Engine",
            mode: "Mode",
            objects: "Objects",
            reviewed: "Reviewed rows",
            changed: "Modified cells",
            original: "Original",
            before: "Before",
            after: "After",
            object: "Object",
            row: "Row",
            location: "Location",
            locate: "Locate",
            unavailable: "Location unavailable",
            clearConfirm: "Delete the Proofreader history for this project?",
            lineChanged: "Line count changed",
            loadError: "Unable to load Proofreader history.",
            completed: "Completed",
            aborted: "Aborted",
            error: "Error",
            selection: "Selection",
            objectsScope: "Objects",
            overwrite: "Overwrite",
            availableColumn: "Next available column",
            rightColumn: "Right column"
        },
        es: {
            title: "Historial de Proofreader",
            search: "Buscar por objeto, texto anterior o texto corregido",
            refresh: "Actualizar",
            clear: "Borrar",
            close: "Cerrar",
            noRuns: "No hay historial de Proofreader para este proyecto.",
            noChanges: "Ninguna celda modificada coincide con la búsqueda.",
            status: "Estado",
            engine: "Motor",
            mode: "Modo",
            objects: "Objetos",
            reviewed: "Filas revisadas",
            changed: "Celdas modificadas",
            original: "Original",
            before: "Antes",
            after: "Después",
            object: "Objeto",
            row: "Fila",
            location: "Ubicación",
            locate: "Localizar",
            unavailable: "Ubicación no disponible",
            clearConfirm: "¿Borrar el historial de Proofreader de este proyecto?",
            lineChanged: "Cambió la cantidad de líneas",
            loadError: "No se pudo cargar el historial de Proofreader.",
            completed: "Completado",
            aborted: "Abortado",
            error: "Error",
            selection: "Selección",
            objectsScope: "Objetos",
            overwrite: "Sobrescritura",
            availableColumn: "Siguiente columna disponible",
            rightColumn: "Columna derecha"
        }
    };

    const getLabels = function(language) {
        return String(language || "").toLowerCase().startsWith("es")
            ? labelSets.es
            : labelSets.en;
    };

    const normalizeSearch = function(value) {
        return String(value || "").trim().toLocaleLowerCase();
    };

    const buildViewModel = function(runs, query, selectedRunId) {
        const sortedRuns = Array.isArray(runs)
            ? runs.slice().sort(function(first, second) {
                return Number(second.finishedAt || second.startedAt || 0) -
                    Number(first.finishedAt || first.startedAt || 0);
            })
            : [];
        const normalizedQuery = normalizeSearch(query);
        const matchesQuery = function(change) {
            if (!normalizedQuery) return true;
            return [
                change.fileName,
                change.fileId,
                change.source,
                change.before,
                change.after,
                Number.isInteger(change.row) ? change.row + 1 : ""
            ].some(function(value) {
                return String(value || "").toLocaleLowerCase().includes(normalizedQuery);
            });
        };
        const visibleRuns = normalizedQuery
            ? sortedRuns.filter(function(run) {
                return (run.changes || []).some(matchesQuery);
            })
            : sortedRuns;
        const selectedRun = visibleRuns.find(function(run) {
            return run.id === selectedRunId;
        }) || visibleRuns[0] || null;
        const changes = (selectedRun?.changes || []).filter(matchesQuery);

        return {
            runs: visibleRuns,
            totalRuns: sortedRuns.length,
            selectedRun,
            changes,
            query: String(query || "")
        };
    };

    const createController = function(options) {
        const state = {
            runs: [],
            query: "",
            selectedRunId: undefined
        };
        const history = options.history;

        return {
            refresh: async function() {
                state.runs = await history.list(options.projectId);
                const view = buildViewModel(state.runs, state.query, state.selectedRunId);
                state.selectedRunId = view.selectedRun?.id;
                return view;
            },
            clear: async function() {
                const approved = await Promise.resolve(options.confirmClear());
                if (!approved) return false;
                await history.clear(options.projectId);
                state.runs = [];
                state.selectedRunId = undefined;
                return true;
            },
            locate: function(change) {
                const located = history.locate(options.projectId, change);
                if (located) options.close();
                return located;
            },
            canLocate: function(change) {
                if (typeof history.canLocate !== "function") return true;
                return history.canLocate(options.projectId, change);
            },
            selectRun: function(id) {
                state.selectedRunId = id;
                return this.view();
            },
            setQuery: function(query) {
                state.query = query;
                return this.view();
            },
            view: function() {
                return buildViewModel(state.runs, state.query, state.selectedRunId);
            }
        };
    };

    const formatDate = function(value, language) {
        const date = new Date(Number(value));
        if (Number.isNaN(date.getTime())) return "";
        try {
            return new Intl.DateTimeFormat(language || "en", {
                dateStyle: "medium",
                timeStyle: "medium"
            }).format(date);
        } catch (error) {
            return date.toLocaleString();
        }
    };

    const translatedValue = function(labels, value) {
        const map = {
            completed: labels.completed,
            aborted: labels.aborted,
            error: labels.error,
            selection: labels.selection,
            objects: labels.objectsScope,
            overwrite: labels.overwrite,
            availableColumn: labels.availableColumn,
            rightColumn: labels.rightColumn
        };
        return map[value] || value || "";
    };

    const mount = async function(browserWindow) {
        const document = browserWindow.document;
        const dialogArguments = browserWindow.dialogArguments || {};
        const labels = getLabels(dialogArguments.language);
        const opener = browserWindow.opener;
        const history = opener?.ProofreaderEngine?.history;
        const message = document.getElementById("viewerMessage");

        document.title = labels.title;
        document.getElementById("viewerTitle").textContent = labels.title;
        document.getElementById("historySearch").placeholder = labels.search;
        document.getElementById("refreshLabel").textContent = labels.refresh;
        document.getElementById("clearLabel").textContent = labels.clear;
        document.getElementById("closeLabel").textContent = labels.close;
        document.getElementById("objectHeading").textContent = labels.object;
        document.getElementById("rowHeading").textContent = labels.row;
        document.getElementById("sourceHeading").textContent = labels.original;
        document.getElementById("beforeHeading").textContent = labels.before;
        document.getElementById("afterHeading").textContent = labels.after;
        document.getElementById("locationHeading").textContent = labels.location;

        if (!history || !dialogArguments.projectId) {
            message.textContent = labels.loadError;
            message.hidden = false;
            return false;
        }

        const controller = createController({
            projectId: dialogArguments.projectId,
            history: history,
            confirmClear: function() {
                return browserWindow.confirm(labels.clearConfirm);
            },
            close: function() {
                browserWindow.close();
            }
        });
        const runList = document.getElementById("runList");
        const summary = document.getElementById("runSummary");
        const changeList = document.getElementById("changeList");
        const emptyDetail = document.getElementById("emptyDetail");

        const makeElement = function(tag, className, text) {
            const element = document.createElement(tag);
            if (className) element.className = className;
            if (typeof text !== "undefined") element.textContent = text;
            return element;
        };

        const render = function() {
            const view = controller.view();
            runList.replaceChildren();
            summary.replaceChildren();
            changeList.replaceChildren();
            message.hidden = true;

            if (!view.runs.length) {
                const emptyText = view.totalRuns ? labels.noChanges : labels.noRuns;
                runList.append(makeElement("div", "empty-state", emptyText));
                emptyDetail.textContent = emptyText;
                emptyDetail.hidden = false;
                return;
            }

            for (const run of view.runs) {
                const button = makeElement(
                    "button",
                    "history-run" + (run.id === view.selectedRun?.id ? " selected" : "")
                );
                button.type = "button";
                button.append(
                    makeElement(
                        "span",
                        "history-run-date",
                        formatDate(run.finishedAt || run.startedAt, dialogArguments.language)
                    ),
                    makeElement("span", "history-run-engine", run.engine?.name || run.engine?.id || ""),
                    makeElement(
                        "span",
                        "history-run-meta",
                        translatedValue(labels, run.status) +
                            " · " +
                            Number(run.changedCount || run.changes?.length || 0) +
                            " " +
                            labels.changed.toLocaleLowerCase()
                    )
                );
                button.addEventListener("click", function() {
                    controller.selectRun(run.id);
                    render();
                });
                runList.append(button);
            }

            const run = view.selectedRun;
            const fields = [
                [labels.status, translatedValue(labels, run.status)],
                [labels.engine, run.engine?.name || run.engine?.id || ""],
                [labels.mode, translatedValue(labels, run.scope) + " · " + translatedValue(labels, run.mode)],
                [labels.objects, String(run.files?.length || 0)],
                [labels.reviewed, String(run.reviewedCount || 0)],
                [labels.changed, String(run.changedCount || run.changes?.length || 0)]
            ];

            for (const field of fields) {
                const item = makeElement("div", "summary-item");
                item.append(
                    makeElement("span", "summary-label", field[0]),
                    makeElement("span", "summary-value", field[1])
                );
                summary.append(item);
            }

            emptyDetail.textContent = labels.noChanges;
            emptyDetail.hidden = view.changes.length > 0;

            for (const change of view.changes) {
                const row = document.createElement("tr");
                const objectCell = makeElement(
                    "td",
                    "object-cell",
                    change.fileName || change.fileId || ""
                );
                const rowCell = makeElement(
                    "td",
                    "row-cell",
                    Number.isInteger(change.row) ? String(change.row + 1) : ""
                );
                const sourceCell = makeElement("td", "text-cell", change.source || "");
                const beforeCell = makeElement("td", "text-cell", change.before || "");
                const afterCell = makeElement("td", "text-cell", change.after || "");
                if (change.lineCountChanged) {
                    afterCell.append(makeElement("span", "line-warning", labels.lineChanged));
                }
                const locationCell = makeElement("td", "location-cell");
                const available = controller.canLocate(change);
                const locateButton = makeElement(
                    "button",
                    "locate-button",
                    available ? labels.locate : labels.unavailable
                );
                locateButton.type = "button";
                locateButton.disabled = !available;
                locateButton.addEventListener("click", function() {
                    if (controller.locate(change)) return;
                    locateButton.disabled = true;
                    locateButton.textContent = labels.unavailable;
                    message.textContent = labels.unavailable;
                    message.hidden = false;
                });
                locationCell.append(locateButton);
                row.append(
                    objectCell,
                    rowCell,
                    sourceCell,
                    beforeCell,
                    afterCell,
                    locationCell
                );
                changeList.append(row);
            }
        };

        document.getElementById("historySearch").addEventListener("input", function(event) {
            controller.setQuery(event.target.value);
            render();
        });
        document.getElementById("refreshHistory").addEventListener("click", async function() {
            try {
                await controller.refresh();
                render();
            } catch (error) {
                message.textContent = labels.loadError;
                message.hidden = false;
            }
        });
        document.getElementById("clearHistory").addEventListener("click", async function() {
            if (await controller.clear()) render();
        });
        document.getElementById("closeHistory").addEventListener("click", function() {
            browserWindow.close();
        });

        try {
            await controller.refresh();
            render();
        } catch (error) {
            message.textContent = labels.loadError;
            message.hidden = false;
        }
        return true;
    };

    return {
        getLabels,
        buildViewModel,
        createController,
        mount
    };
});
