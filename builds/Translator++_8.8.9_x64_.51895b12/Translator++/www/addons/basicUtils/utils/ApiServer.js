const http = require("http");
const { URL } = require("url");

/**
 * HTTP API Server for AI Agent control of Translator++
 * Uses only native Node.js modules — zero dependencies.
 *
 * @class
 */
class ApiServer {
    /**
     * @param {Object} [options]
     * @param {number} [options.port=22883] - Port to listen on
     * @param {string} [options.host="127.0.0.1"] - Host to bind to
     */
    constructor(options) {
        options = options || {};
        this.port = options.port || 22883;
        this.host = options.host || "127.0.0.1";
        this.server = null;
        this.routes = [];
        /** @type {Map<string, {definition: Object, handler: Function}>} */
        this.tools = new Map();
    }

    /**
     * Register a route handler.
     * @param {string} method - HTTP method ("GET", "POST", etc.)
     * @param {string} path - URL path (e.g. "/api/exec")
     * @param {Function} handler - async function(ctx) => result
     *   ctx = { query: Object, body: *, params: Object, req: IncomingMessage }
     */
    route(method, path, handler) {
        this.routes.push({ method: method.toUpperCase(), path: this._normalizePath(path), handler });
    }

    /**
     * Start the HTTP server.
     * @returns {Promise<ApiServer>}
     */
    async start() {
        const self = this;

        this.server = http.createServer(async (req, res) => {
            // ---- CORS headers (allow AI agents from any origin) ----
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

            // Preflight
            if (req.method === "OPTIONS") {
                res.writeHead(204);
                return res.end();
            }

            const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
            const pathname = self._normalizePath(parsedUrl.pathname);
            const method = req.method.toUpperCase();

            // Find matching route
            const route = self.routes.find(r => r.method === method && r.path === pathname);

            if (!route) {
                self._sendJson(res, 404, {
                    error: "Not found",
                    message: `No route for ${method} ${pathname}`,
                    availableRoutes: self.routes.map(r => `${r.method} ${r.path}`)
                });
                return;
            }

            try {
                // Read body
                let body = null;
                if (method === "POST" || method === "PUT" || method === "PATCH") {
                    body = await self._readBody(req);
                }

                const ctx = {
                    query: Object.fromEntries(parsedUrl.searchParams),
                    body,
                    params: {},
                    req
                };

                const result = await route.handler(ctx);
                self._sendJson(res, 200, result);
            } catch (err) {
                self._sendJson(res, 500, {
                    error: err.message,
                    stack: err.stack
                });
            }
        });

        return new Promise((resolve, reject) => {
            self.server.on("error", reject);
            self.server.listen(self.port, self.host, () => {
                console.log(`[ApiServer] Listening on http://${self.host}:${self.port}`);
                resolve(self);
            });
        });
    }

    /**
     * Stop the server.
     * @returns {Promise<void>}
     */
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log("[ApiServer] Stopped");
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Register a named tool that AI agents can call via POST /api/call.
     * @param {string} name - Unique tool name (e.g. "project.info")
     * @param {Object} definition - OpenAI function-calling schema with name, description, parameters
     * @param {Function} handler - async function(params) => result
     */
    registerTool(name, definition, handler) {
        this.tools.set(name, { definition, handler });
    }

    /**
     * Register the standard AI discovery and call endpoints on this server.
     * - GET  /api/tools  → returns all tool definitions
     * - POST /api/call   → dispatches to a tool by name
     */
    registerAgentRoutes() {
        const tools = this.tools;

        // ---- GET /api/tools: AI discovers available functions ----
        this.route("GET", "/api/tools", async () => ({
            description: "Translator++ API — available tools for AI agents",
            endpoint: "POST /api/call",
            usage: { tool: "tool_name", params: {} },
            tools: Array.from(tools.entries()).map(([name, t]) => ({
                name,
                description: t.definition.description,
                parameters: t.definition.parameters
            }))
        }));

        // ---- POST /api/call: AI invokes a tool ----
        this.route("POST", "/api/call", async (ctx) => {
            const toolName = (ctx.body && ctx.body.tool) || "";
            const userParams = (ctx.body && ctx.body.params) || {};

            if (!toolName) {
                throw new Error("Missing 'tool' field. Available tools: " +
                    Array.from(tools.keys()).join(", "));
            }

            const tool = tools.get(toolName);
            if (!tool) {
                throw new Error(`Unknown tool '${toolName}'. Available: ` +
                    Array.from(tools.keys()).join(", "));
            }

            // Run the tool's handler in an AsyncFunction so it has access to
            // the full NW.js global scope (trans, window, etc.)
            const fnBody = `
                const __handler = ${tool.handler.toString()};
                const __params = ${JSON.stringify(userParams)};
                return await __handler(__params);
            `;

            // Build interceptors (same as /api/exec)
            const consoleOutput = [];
            const originalConsole = {};
            const cmethods = ["log", "warn", "error", "info", "debug", "trace"];
            const stackMethods = new Set(["warn", "error", "trace"]);

            cmethods.forEach(m => {
                originalConsole[m] = console[m];
                console[m] = function () {
                    const args = Array.prototype.slice.call(arguments);
                    const message = args.map(a => {
                        try { return typeof a === "object" && a !== null ? JSON.stringify(a) : String(a); }
                        catch (_) { return String(a); }
                    }).join(" ");
                    const entry = { method: m, message, timestamp: Date.now() };
                    if (stackMethods.has(m)) {
                        const err = new Error();
                        const lines = (err.stack || "").split("\n");
                        const cleaned = [];
                        let skipped = false;
                        for (const line of lines) {
                            if (line.startsWith("Error") || line.trim() === "") continue;
                            if (!skipped && line.trim().startsWith("at ")) { skipped = true; continue; }
                            cleaned.push(line);
                        }
                        entry.stack = cleaned.join("\n").trim();
                    }
                    consoleOutput.push(entry);
                    if (typeof originalConsole[m] === "function") {
                        originalConsole[m].apply(console, arguments);
                    }
                };
            });

            let result;
            let execError = null;
            try {
                const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                const fn = new AsyncFunction("console", fnBody);
                result = await fn(console);
            } catch (e) {
                execError = { message: e.message, stack: e.stack, name: e.name };
            } finally {
                cmethods.forEach(m => { console[m] = originalConsole[m]; });
            }

            return {
                tool: toolName,
                result,
                console: consoleOutput,
                error: execError
            };
        });
    }

    _sendJson(res, statusCode, data) {
        const json = JSON.stringify(data, null, 2);
        res.writeHead(statusCode, {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": Buffer.byteLength(json)
        });
        res.end(json);
    }

    _normalizePath(path) {
        if (!path || path === "/") return "/";
        return path.replace(/\/+$/, "");
    }

    _readBody(req) {
        return new Promise((resolve) => {
            const chunks = [];
            req.on("data", chunk => chunks.push(chunk));
            req.on("end", () => {
                const raw = Buffer.concat(chunks).toString("utf-8");
                try {
                    resolve(JSON.parse(raw));
                } catch (_) {
                    resolve(raw || null);
                }
            });
        });
    }
}

// ---- Built-in /api/exec route ----

/**
 * Registers the /api/exec endpoint on the given server.
 * Executes arbitrary JavaScript as an async function in the NW.js environment.
 *
 * POST /api/exec
 * Body: { "script": "return trans.project.gameTitle;" }
 * Response: { "returned": "...", "console": [...], "error": null }
 */
ApiServer.registerExecRoute = function (server) {
    server.route("POST", "/api/exec", async (ctx) => {
        const script = (ctx.body && ctx.body.script) || "";
        if (!script || typeof script !== "string") {
            throw new Error("Missing or invalid 'script' field in request body");
        }

        const consoleOutput = [];

        // ---- Intercept console methods ----
        const originalConsole = {};
        const methods = ["log", "warn", "error", "info", "debug", "trace"];
        // Methods for which we capture a stack trace
        const stackMethods = new Set(["warn", "error", "trace"]);

        methods.forEach(m => {
            originalConsole[m] = console[m];
            console[m] = function () {
                const args = Array.prototype.slice.call(arguments);
                const message = args.map(a => {
                    try {
                        if (typeof a === "object" && a !== null) {
                            return JSON.stringify(a);
                        }
                        return String(a);
                    } catch (_) {
                        return String(a);
                    }
                }).join(" ");

                const entry = { method: m, message, timestamp: Date.now() };

                // Capture stack for warn, error, trace
                if (stackMethods.has(m)) {
                    const err = new Error();
                    const stackLines = (err.stack || "").split("\n");
                    // Remove the "Error" line and the first "at" frame (our mock function itself).
                    // Everything after that is the user's actual call chain.
                    const cleaned = [];
                    let skippedFirstAt = false;
                    for (const line of stackLines) {
                        if (line.startsWith("Error") || line.trim() === "") continue;
                        if (!skippedFirstAt && line.trim().startsWith("at ")) {
                            skippedFirstAt = true;
                            continue;
                        }
                        cleaned.push(line);
                    }
                    entry.stack = cleaned.join("\n").trim();
                }

                consoleOutput.push(entry);
                // Also forward to original so dev can see in console
                if (typeof originalConsole[m] === "function") {
                    originalConsole[m].apply(console, arguments);
                }
            };
        });

        let returnedValue = undefined;
        let execError = null;

        try {
            // Create and run the async function. The script body is injected into an
            // AsyncFunction that has access to the global scope (window, trans, etc.).
            // We wrap in a with-block so that top-level globals are accessible.
            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

            const fn = new AsyncFunction(
                "console",
                `
                    const _consoleLog_backup = [];
                    ${script}
                `
            );

            returnedValue = await fn(console);
        } catch (e) {
            execError = {
                message: e.message,
                stack: e.stack,
                name: e.name
            };
        } finally {
            // ---- Restore console methods ----
            methods.forEach(m => {
                console[m] = originalConsole[m];
            });
        }

        return {
            returned: returnedValue,
            console: consoleOutput,
            error: execError
        };
    });
};

/**
 * Registers all built-in Translator++ tools on the given server.
 * (Tool handlers run in an AsyncFunction with full NW.js global scope.)
 */
ApiServer.registerTools = function (server) {
    // ---- Window tools ----

    server.registerTool("window.capture", {
        description: "Capture one or more Translator++ NW.js windows as PNG images encoded as base64. By default, captures the current window.",
        parameters: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    enum: ["current", "master", "all", "index", "title", "titleLike"],
                    description: "Which windows to capture. Defaults to current."
                },
                index: { type: "integer", minimum: 0, description: "Window index when selector is index." },
                title: { type: "string", description: "Exact window title when selector is title." },
                titleLike: { type: "string", description: "Case-insensitive title fragment when selector is titleLike." },
                format: { type: "string", enum: ["png"], description: "Image format. Currently only png is supported." },
                datatype: { type: "string", enum: ["raw", "buffer"], description: "NW.js capture datatype. Both are returned as base64 in the API response." }
            },
            required: []
        }
    }, async (params) => {
        const NWUtil = require("www/js/NWUtil.js");
        const selector = params.selector || "current";
        const windows = await NWUtil.getNwWindows({
            selector,
            index: params.index,
            title: params.title,
            titleLike: params.titleLike
        });

        if (windows.length === 0) {
            throw new Error("No NW.js windows matched the requested selector");
        }

        const format = params.format || "png";
        const datatype = params.datatype || "raw";
        if (format !== "png") throw new Error("Only png capture format is supported");
        if (datatype !== "raw" && datatype !== "buffer") throw new Error("datatype must be raw or buffer");

        const captures = [];
        for (let i = 0; i < windows.length; i++) {
            const window = windows[i];
            const image = await NWUtil.capturePage(window, { format, datatype });
            captures.push({
                index: i,
                title: window.title || "",
                mimeType: "image/png",
                encoding: "base64",
                data: image
            });
        }

        return {
            selector,
            count: captures.length,
            captures
        };
    });

    // ---- Project tools ----

    server.registerTool("project.info", {
        description: "Get metadata about the currently open translation project.",
        parameters: { type: "object", properties: {}, required: [] }
    }, async () => {
        const p = trans.project || {};
        return {
            gameTitle: p.gameTitle || null,
            projectId: p.projectId || null,
            fileCount: Object.keys(p.files || {}).length,
            currentFile: trans.currentFile || null,
            modified: typeof trans.gridIsModified === "function" ? trans.gridIsModified() : false
        };
    });

    server.registerTool("project.languages", {
        description: "Get the current project source and target language codes.",
        parameters: { type: "object", properties: {}, required: [] }
    }, async () => {
        const options = trans.project?.options || {};
        return {
            sourceLanguage: typeof trans.getSl === "function" ? trans.getSl() : (options.sl || null),
            targetLanguage: typeof trans.getTl === "function" ? trans.getTl() : (options.tl || null)
        };
    });

    // ---- Runtime tools ----

    server.registerTool("runtime.python.init", {
        description: "Initialize the portable Python runtime used by Translator++. Downloads and extracts it if it is not already available.",
        parameters: {
            type: "object",
            properties: {
                venvID: { type: "string", description: "Optional portable Python environment ID. Defaults to 'def'." },
                version: { type: "string", description: "Optional portable Python version. Defaults to '3.10.5-x64'." }
            },
            required: []
        }
    }, async (params) => {
        const Python = require("www/js/Python.js");
        const python = new Python(params.venvID, params.version);

        await python.init();

        const exists = await common.isFileAsync(python.pythonPath);
        if (!python.isInitialized || !exists) {
            throw new Error("Failed to initialize portable Python runtime");
        }

        let runtimeVersion = null;
        try {
            runtimeVersion = await common.aSpawn(python.pythonPath, ["--version"], { cwd: python.baseDir });
        } catch (_) {
            runtimeVersion = null;
        }

        return {
            initialized: true,
            venvID: python.venvID,
            version: python.version,
            runtimeVersion,
            pythonPath: python.pythonPath,
            baseDir: python.baseDir,
            configDir: python.configDir
        };
    });

    // ---- File tools ----

    server.registerTool("project.files.list", {
        description: "List all files in the current translation project.",
        parameters: { type: "object", properties: {}, required: [] }
    }, async () => {
        const files = trans.project?.files || {};
        return Object.keys(files).map(id => {
            const f = files[id];
            return {
                id,
                name: f.name || null,
                rowCount: Array.isArray(f.data) ? f.data.length : 0,
                colCount: Array.isArray(f.data) && f.data[0] ? f.data[0].length : 0
            };
        });
    });

    server.registerTool("project.files.select", {
        description: "Select a file by its ID, making it the active file in the editor.",
        parameters: {
            type: "object",
            properties: {
                fileId: { type: "string", description: "The file ID to select" }
            },
            required: ["fileId"]
        }
    }, async (params) => {
        if (!trans.project?.files?.[params.fileId]) {
            throw new Error(`File '${params.fileId}' not found`);
        }
        if (typeof trans.selectFile === "function") {
            trans.selectFile(params.fileId);
        } else {
            // Fallback: set data directly
            trans.data = trans.project.files[params.fileId].data;
        }
        return { selected: params.fileId, ok: true };
    });

    // ---- Cell read/write tools ----

    server.registerTool("cells.read", {
        description: "Read translation cells from a file. Returns cell data for the specified row/column range.",
        parameters: {
            type: "object",
            properties: {
                fileId: { type: "string", description: "File ID to read from" },
                startRow: { type: "number", description: "Starting row index (0-based)" },
                endRow: { type: "number", description: "Ending row index (inclusive, 0-based)" },
                startCol: { type: "number", description: "Starting column index (0-based), defaults to 0" },
                endCol: { type: "number", description: "Ending column index (inclusive, 0-based), defaults to last column" }
            },
            required: ["fileId", "startRow", "endRow"]
        }
    }, async (params) => {
        const file = trans.project?.files?.[params.fileId];
        if (!file || !Array.isArray(file.data)) {
            throw new Error(`File '${params.fileId}' not found or has no data`);
        }
        const startRow = Math.max(0, params.startRow);
        const endRow = Math.min(file.data.length - 1, params.endRow);
        const startCol = params.startCol || 0;
        const endCol = params.endCol !== undefined ? params.endCol : (file.data[0]?.length || 1) - 1;

        const rows = [];
        for (let r = startRow; r <= endRow; r++) {
            const row = file.data[r];
            if (!row) continue;
            const cells = [];
            for (let c = startCol; c <= Math.min(endCol, row.length - 1); c++) {
                cells.push({ col: c, value: row[c] });
            }
            rows.push({ row: r, cells });
        }
        return { fileId: params.fileId, startRow, endRow, rows };
    });

    server.registerTool("cells.write", {
        description: "Write a translation value to a specific cell in a file.",
        parameters: {
            type: "object",
            properties: {
                fileId: { type: "string", description: "File ID to write to" },
                row: { type: "number", description: "Row index (0-based)" },
                col: { type: "number", description: "Column index (0-based)" },
                value: { type: "string", description: "The new cell value" }
            },
            required: ["fileId", "row", "col", "value"]
        }
    }, async (params) => {
        const file = trans.project?.files?.[params.fileId];
        if (!file || !Array.isArray(file.data)) {
            throw new Error(`File '${params.fileId}' not found or has no data`);
        }
        if (!Array.isArray(file.data[params.row])) {
            throw new Error(`Row ${params.row} not found in file '${params.fileId}'`);
        }

        const selectedId = typeof trans.getSelectedId === "function" ? trans.getSelectedId() : trans.project?.selectedId;
        if (selectedId === params.fileId && trans.grid && typeof trans.grid.setDataAtCell === "function") {
            trans.grid.setDataAtCell(params.row, params.col, params.value, "api.cells.write");
        } else {
            file.data[params.row][params.col] = params.value;
            if (typeof trans.gridIsModified === "function") {
                trans.gridIsModified(true);
            }
            if (typeof trans.evalTranslationProgress === "function") {
                trans.evalTranslationProgress([params.fileId]);
            }
        }
        return { fileId: params.fileId, row: params.row, col: params.col, written: true };
    });

    // ---- Find untranslated cells ----

    server.registerTool("cells.find_untranslated", {
        description: "Find cells that are empty or untranslated in a file. Returns up to `limit` untranslated cells with their context.",
        parameters: {
            type: "object",
            properties: {
                fileId: { type: "string", description: "File ID to search in" },
                limit: { type: "number", description: "Maximum number of results (default 20)" }
            },
            required: ["fileId"]
        }
    }, async (params) => {
        const file = trans.project?.files?.[params.fileId];
        if (!file || !Array.isArray(file.data)) {
            throw new Error(`File '${params.fileId}' not found or has no data`);
        }
        const limit = params.limit || 20;
        const results = [];
        for (let r = 0; r < file.data.length && results.length < limit; r++) {
            const row = file.data[r];
            if (!row) continue;
            for (let c = 0; c < row.length && results.length < limit; c++) {
                const val = row[c];
                if (val === null || val === undefined || String(val).trim() === "") {
                    // Get source text (col 0 typically) as context
                    const sourceCol = row[0] !== val ? row[0] : (row.length > 1 ? row[1] : null);
                    results.push({ row: r, col: c, emptyValue: val, contextSource: sourceCol });
                }
            }
        }
        return { fileId: params.fileId, totalRows: file.data.length, untranslatedCount: results.length, results };
    });

    // ---- Translator tools ----

    server.registerTool("translators.list", {
        description: "List all available translation engines currently loaded in Translator++.",
        parameters: { type: "object", properties: {}, required: [] }
    }, async () => {
        const engines = [];
        // Check common translator registry patterns
        if (typeof TranslatorEngine !== "undefined" && TranslatorEngine.translators) {
            for (const key of Object.keys(TranslatorEngine.translators)) {
                const engine = TranslatorEngine.translators[key] || {};
                engines.push({ id: key, name: engine.name || key });
            }
        }
        if (typeof trans !== "undefined" && trans.translators) {
            for (const key of Object.keys(trans.translators)) {
                if (!engines.find(e => e.id === key)) {
                    const engine = trans.translators[key] || {};
                    engines.push({ id: key, name: engine.name || key });
                }
            }
        }
        if (window && window.translatorEngines) {
            for (const key of Object.keys(window.translatorEngines)) {
                if (!engines.find(e => e.id === key)) {
                    engines.push({ id: key, name: key });
                }
            }
        }
        if (engines.length === 0) {
            // Fallback: try to find translators in addon registry
            try {
                const addons = window.addons || window.AddonLoader?.addons || {};
                for (const key of Object.keys(addons)) {
                    if (key.toLowerCase().includes("trans")) {
                        engines.push({ id: key, name: key });
                    }
                }
            } catch (_) { /* ignore */ }
        }
        return { count: engines.length, engines };
    });

    server.registerTool("translator.engines.list", {
        description: "List all Translator++ translator engine instances with useful metadata for agents.",
        parameters: { type: "object", properties: {}, required: [] }
    }, async () => {
        const engines = [];
        const registry = (typeof TranslatorEngine !== "undefined" && TranslatorEngine.translators) ? TranslatorEngine.translators : {};
        const ids = Object.keys(registry).sort((a, b) => {
            const nameA = registry[a]?.name || a;
            const nameB = registry[b]?.name || b;
            return String(nameA).localeCompare(String(nameB));
        });
        for (const id of ids) {
            const engine = registry[id] || {};
            engines.push({
                id,
                name: engine.name || id,
                author: engine.author || null,
                version: engine.version || null,
                description: engine.description || null,
                mode: engine.mode || null,
                translatorType: engine.translatorType || null,
                isDisabled: Boolean(engine.isDisabled),
                isInitialized: Boolean(engine.isInitialized),
                hasOptionsForm: Boolean(engine.optionsForm?.schema),
                hasTranslate: typeof engine.translate === "function",
                hasFetchTranslation: typeof engine.fetchTranslation === "function"
            });
        }
        return { count: engines.length, engines };
    });

    server.registerTool("translator.engine.config.get", {
        description: "Get the saved and form-backed configuration values for a Translator++ translator engine.",
        parameters: {
            type: "object",
            properties: {
                engineId: { type: "string", description: "Translator engine ID." },
                key: { type: "string", description: "Optional single configuration key to read." }
            },
            required: ["engineId"]
        }
    }, async (params) => {
        const engine = trans.getTranslatorEngine(params.engineId);
        if (!engine) throw new Error(`Translator engine '${params.engineId}' not found`);

        if (params.key) {
            return {
                engineId: engine.id,
                key: params.key,
                value: typeof engine.getOptions === "function" ? engine.getOptions(params.key) : engine[params.key],
                defaultValue: typeof engine.getDefaultOptions === "function" ? engine.getDefaultOptions(params.key) : undefined
            };
        }

        return {
            engineId: engine.id,
            config: typeof engine.getOptions === "function" ? engine.getOptions() : {},
            defaultConfig: typeof engine.getDefaultOptions === "function" ? engine.getDefaultOptions() : {},
            formValues: typeof engine.getOptionsFormValue === "function" ? engine.getOptionsFormValue() : {}
        };
    });

    server.registerTool("translator.engine.config.set", {
        description: "Set one or more configuration values on a Translator++ translator engine and persist them through the engine option system.",
        parameters: {
            type: "object",
            properties: {
                engineId: { type: "string", description: "Translator engine ID." },
                key: { type: "string", description: "Single configuration key to set. Use with value." },
                value: { description: "Single configuration value to set. Use with key." },
                options: { type: "object", description: "Multiple configuration key/value pairs to set." }
            },
            required: ["engineId"]
        }
    }, async (params) => {
        const engine = trans.getTranslatorEngine(params.engineId);
        if (!engine) throw new Error(`Translator engine '${params.engineId}' not found`);

        const updates = {};
        if (params.options && typeof params.options === "object" && !Array.isArray(params.options)) {
            Object.assign(updates, params.options);
        }
        if (params.key) {
            updates[params.key] = params.value;
        }
        if (Object.keys(updates).length < 1) throw new Error("No configuration values provided. Use 'options' or 'key' with 'value'.");

        if (typeof engine.setOptions === "function") {
            engine.setOptions(updates);
        } else if (typeof engine.setOption === "function") {
            for (const key of Object.keys(updates)) engine.setOption(key, updates[key]);
        } else if (typeof engine.update === "function") {
            for (const key of Object.keys(updates)) engine.update(key, updates[key]);
        } else {
            for (const key of Object.keys(updates)) engine[key] = updates[key];
        }

        return {
            engineId: engine.id,
            updated: updates,
            config: typeof engine.getOptions === "function" ? engine.getOptions() : updates,
            formValues: typeof engine.getOptionsFormValue === "function" ? engine.getOptionsFormValue() : {}
        };
    });

    server.registerTool("translator.engine.schema", {
        description: "Get a Translator++ translator engine optionsForm schema/form definition and current option values.",
        parameters: {
            type: "object",
            properties: {
                engineId: { type: "string", description: "Translator engine ID." }
            },
            required: ["engineId"]
        }
    }, async (params) => {
        const engine = trans.getTranslatorEngine(params.engineId);
        if (!engine) throw new Error(`Translator engine '${params.engineId}' not found`);
        const optionsForm = JSON.parse(JSON.stringify(engine.optionsForm || {}));
        return {
            engineId: engine.id,
            optionsForm,
            values: typeof engine.getOptionsFormValue === "function" ? engine.getOptionsFormValue() : {},
            defaultConfig: typeof engine.getDefaultOptions === "function" ? engine.getDefaultOptions() : {}
        };
    });

    server.registerTool("translator.engine.translate", {
        description: "Translate an array of texts with a specific Translator++ translator engine instance by calling engine.translate(texts, options).",
        parameters: {
            type: "object",
            properties: {
                engineId: { type: "string", description: "Translator engine ID." },
                texts: { type: "array", items: { type: "string" }, description: "Array of source texts to translate." },
                options: { type: "object", description: "Options forwarded to engine.translate, such as sl, tl, mode, or escape settings." }
            },
            required: ["engineId", "texts"]
        }
    }, async (params) => {
        const engine = trans.getTranslatorEngine(params.engineId);
        if (!engine) throw new Error(`Translator engine '${params.engineId}' not found`);
        if (typeof engine.translate !== "function") throw new Error(`Translator engine '${params.engineId}' does not expose translate()`);
        if (!Array.isArray(params.texts)) throw new Error("texts must be an array of strings");

        const texts = params.texts.map(text => text === null || typeof text === "undefined" ? "" : String(text));
        const options = params.options && typeof params.options === "object" && !Array.isArray(params.options) ? params.options : {};
        const result = await engine.translate(texts, options);
        return {
            engineId: engine.id,
            sourceLanguage: options.sl || (typeof trans.getSl === "function" ? trans.getSl() : undefined),
            targetLanguage: options.tl || (typeof trans.getTl === "function" ? trans.getTl() : undefined),
            result
        };
    });

    server.registerTool("translate.text", {
        description: "Translate a single text string using the active translation engine. Returns the translated text.",
        parameters: {
            type: "object",
            properties: {
                text: { type: "string", description: "Source text to translate" },
                from: { type: "string", description: "Source language code (e.g. 'ja', 'auto')" },
                to: { type: "string", description: "Target language code (e.g. 'en', 'zh')" }
            },
            required: ["text", "from", "to"]
        }
    }, async (params) => {
        // Try multiple translation approaches
        if (typeof trans !== "undefined" && typeof trans.translate === "function") {
            const result = await trans.translate(params.text, params.from, params.to);
            return { text: params.text, translated: result, from: params.from, to: params.to };
        }
        if (typeof window !== "undefined" && window.translate) {
            const result = await window.translate(params.text, params.from, params.to);
            return { text: params.text, translated: result, from: params.from, to: params.to };
        }
        throw new Error("No translation function available. Use /api/exec for custom translation logic.");
    });

    // ---- Automation tools ----

    server.registerTool("automation.exists", {
        description: "Check whether an automation script exists in a Translator++ automation workspace.",
        parameters: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Automation workspace: global, objectIterator, rowIterator, gridSelection, or foundCells. Defaults to global." },
                name: { type: "string", description: "Automation script name, with or without the .js extension." }
            },
            required: ["name"]
        }
    }, async (params) => {
        const allowed = ["global", "objectIterator", "rowIterator", "gridSelection", "foundCells"];
        const workspace = params.workspace || "global";
        if (!allowed.includes(workspace)) return { exists: false, workspace, name: params.name || null };
        if (!params.name) return { exists: false, workspace, name: null };

        const nwPath = require("path");
        const name = String(params.name).replace(/\.js$/i, "");
        const filePath = nwPath.join("data/custom-scripts", workspace, name + ".js");
        let exists = false;
        try {
            exists = await common.isFileAsync(filePath);
        } catch (_) {
            exists = false;
        }
        return { exists, workspace, name, filePath };
    });

    server.registerTool("automation.create", {
        description: "Create or overwrite an automation script in a Translator++ automation workspace. The script body is JavaScript async function body code executed by CodeRunner.",
        parameters: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Automation workspace: global, objectIterator, rowIterator, gridSelection, or foundCells. Defaults to global." },
                name: { type: "string", description: "Automation script name, with or without the .js extension." },
                scriptBody: { type: "string", description: "JavaScript async function body to save as the automation script." }
            },
            required: ["name", "scriptBody"]
        }
    }, async (params) => {
        const allowed = ["global", "objectIterator", "rowIterator", "gridSelection", "foundCells"];
        const workspace = params.workspace || "global";
        if (!allowed.includes(workspace)) throw new Error("Invalid workspace");
        if (!params.name) throw new Error("Name required");
        if (typeof params.scriptBody !== "string") throw new Error("scriptBody must be a string");

        const nwPath = require("path");
        const name = String(params.name).replace(/\.js$/i, "");
        const dirPath = nwPath.join("data/custom-scripts", workspace);
        const filePath = nwPath.join(dirPath, name + ".js");
        await common.mkDir(dirPath);
        await common.filePutContents(filePath, params.scriptBody, "utf-8");
        return { created: true, workspace, name, filePath };
    });

    server.registerTool("automation.get", {
        description: "Read an automation script from a Translator++ automation workspace.",
        parameters: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Automation workspace: global, objectIterator, rowIterator, gridSelection, or foundCells. Defaults to global." },
                name: { type: "string", description: "Automation script name, with or without the .js extension." }
            },
            required: ["name"]
        }
    }, async (params) => {
        const allowed = ["global", "objectIterator", "rowIterator", "gridSelection", "foundCells"];
        const workspace = params.workspace || "global";
        if (!allowed.includes(workspace)) return { found: false, workspace, name: params.name || null, scriptBody: null };
        if (!params.name) return { found: false, workspace, name: null, scriptBody: null };

        const nwPath = require("path");
        const name = String(params.name).replace(/\.js$/i, "");
        const filePath = nwPath.join("data/custom-scripts", workspace, name + ".js");
        try {
            const scriptBody = await common.fileGetContents(filePath, "utf-8");
            return { found: scriptBody !== null && typeof scriptBody !== "undefined", workspace, name, filePath, scriptBody };
        } catch (_) {
            return { found: false, workspace, name, filePath, scriptBody: null };
        }
    });

    server.registerTool("automation.list", {
        description: "List automation scripts in a Translator++ automation workspace.",
        parameters: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Automation workspace: global, objectIterator, rowIterator, gridSelection, or foundCells. Defaults to global." }
            },
            required: []
        }
    }, async (params) => {
        const allowed = ["global", "objectIterator", "rowIterator", "gridSelection", "foundCells"];
        const workspace = params.workspace || "global";
        if (!allowed.includes(workspace)) return { workspace, scripts: [] };

        const nwPath = require("path");
        const dirPath = nwPath.join("data/custom-scripts", workspace);
        let files = [];
        try {
            files = await common.readDir(dirPath);
        } catch (_) {
            return { workspace, scripts: [] };
        }
        const scripts = files
            .filter(f => String(f).toLowerCase().endsWith(".js"))
            .map(f => String(f).replace(/\.js$/i, ""));
        return { workspace, scripts };
    });

    server.registerTool("automation.run", {
        description: "Run an automation script through Translator++ CodeRunner in the selected workspace.",
        parameters: {
            type: "object",
            properties: {
                workspace: { type: "string", description: "Automation workspace: global, objectIterator, rowIterator, gridSelection, or foundCells. Defaults to global." },
                name: { type: "string", description: "Automation script name, with or without the .js extension." },
                options: { type: "object", description: "Optional CodeRunner options, such as userInput or foundCells." }
            },
            required: ["name"]
        }
    }, async (params) => {
        const allowed = ["global", "objectIterator", "rowIterator", "gridSelection", "foundCells"];
        const workspace = params.workspace || "global";
        if (!allowed.includes(workspace)) throw new Error("Invalid workspace");
        if (!params.name) throw new Error("Name required");

        const nwPath = require("path");
        const name = String(params.name).replace(/\.js$/i, "");
        const filePath = nwPath.join("data/custom-scripts", workspace, name + ".js");
        let exists = false;
        try {
            exists = await common.isFileAsync(filePath);
        } catch (_) {
            exists = false;
        }
        if (!exists) throw new Error("Automation script does not exist");
        if (typeof trans.runCustomScript !== "function") throw new Error("trans.runCustomScript is not available");

        const result = await trans.runCustomScript(workspace, filePath, params.options || {});
        return { ran: true, workspace, name, filePath, result };
    });

    // ---- Selection / navigation tools ----

    server.registerTool("selection.get", {
        description: "Get the currently selected cells/ranges in the grid.",
        parameters: { type: "object", properties: {}, required: [] }
    }, async () => {
        if (!trans || typeof trans.getSelected !== "function") {
            return { selected: null };
        }
        const sel = trans.getSelected();
        if (!sel || sel.length === 0) return { selected: null };
        return {
            selected: sel.map(s => ({
                startRow: s[0], startCol: s[1],
                endRow: s[2], endCol: s[3]
            }))
        };
    });

    server.registerTool("grid.refresh", {
        description: "Refresh the currently visible Translator++ grid after project data has been modified.",
        parameters: {
            type: "object",
            properties: {
                fileId: { type: "string", description: "Optional file ID expected to be visible. If provided and not selected, the grid is not refreshed." },
                updateProgress: { type: "boolean", description: "Whether to re-evaluate translation progress before refreshing. Defaults to true." }
            },
            required: []
        }
    }, async (params) => {
        const selectedId = typeof trans.getSelectedId === "function" ? trans.getSelectedId() : trans.project?.selectedId;
        if (params.fileId && params.fileId !== selectedId) {
            return {
                refreshed: false,
                selectedId,
                requestedFileId: params.fileId,
                reason: "Requested file is not currently visible. Select it first or omit fileId to refresh the visible grid."
            };
        }

        if (params.updateProgress !== false && typeof trans.evalTranslationProgress === "function") {
            trans.evalTranslationProgress(selectedId ? [selectedId] : undefined);
        }
        if (typeof trans.refreshGrid === "function") {
            trans.refreshGrid();
        } else if (trans.grid && typeof trans.grid.render === "function") {
            trans.grid.render();
        } else {
            throw new Error("No grid refresh method is available");
        }

        return { refreshed: true, selectedId, progressUpdated: params.updateProgress !== false };
    });

    server.registerTool("cells.count", {
        description: "Get row and column counts for the currently selected file.",
        parameters: { type: "object", properties: {}, required: [] }
    }, async () => {
        const totalRows = typeof trans.countRows === "function" ? trans.countRows() :
            (trans.data ? trans.data.length : 0);
        const totalCols = typeof trans.countCols === "function" ? trans.countCols() :
            (trans.data && trans.data[0] ? trans.data[0].length : 0);
        return { totalRows, totalCols };
    });
};

/**
 * Convenience: registers exec route, tools route, call route, and all built-in tools.
 * Call this once after constructing the server.
 */
ApiServer.registerAll = function (server) {
    ApiServer.registerExecRoute(server);
    server.registerAgentRoutes();
    ApiServer.registerTools(server);
};

module.exports = ApiServer;
