void async function() {
    const nwPath = require("path");
    window.common = window.opener.common;
    window.trans = window.opener.trans;
    if (!common) console.error("common module not found in opener");
    if (!trans) console.error("trans module not found in opener");
    const basicUtils = window.opener.addonLoader.addons.basicUtils;
    const apiMapping = basicUtils.miraiGetApiMapping(); // fail on this mean new features are not available, or the version is too old. In that case, we can only provide very basic features without API docs.
    if (!apiMapping) {
        console.warn("API mapping not found, new features are not available.");
        return;
    }

    console.log("API Mapping:", apiMapping);
    const localAPI = {};
    window.localAPI = localAPI;

    /**
     * Load API documentation files and register methods in localAPI
     * Will return in a md format string:
     * # ClassName1
     * Description of the class
     * - api1
     * - api2
     * 
     * # ClassName2
     * Description of the class
     * - api1
     * - api2
     * @async
     */
    localAPI.loadAPIList = async function() {
        const baseDir = "data/aiassistant/apidocs/";
        const sections = [];

        for (const [filename, meta] of Object.entries(apiMapping)) {
            const filePath = nwPath.join(baseDir, filename);
            let fileContent;

            try {
                fileContent = await common.fileGetContents(filePath, "utf-8");
            } catch (err) {
                console.error(`Failed to read API doc file ${filename}:`, err);
                continue;
            }

            if (!common.isJSON(fileContent)) {
                console.error(`API doc file ${filename} is not valid JSON.`);
                continue;
            }

            const apiDoc = JSON.parse(fileContent);
            const classNames = meta.className ? [meta.className] : Object.keys(apiDoc);

            classNames.forEach((name) => {
                const doc = apiDoc[name];
                if (!doc) {
                    console.warn(`Class ${name} not found in ${filename}.`);
                    return;
                }

                const members = doc.members ? Object.keys(doc.members) : [];
                const methods = doc.methods ? Object.keys(doc.methods) : [];

                // Build markdown section
                const lines = [`## ${name}`];
                if (meta.description) {
                    lines.push(meta.description);
                }

                if (members.length) {
                    lines.push("### Properties");
                    members.forEach((m) => lines.push(`- ${m}`));
                }

                if (methods.length) {
                    lines.push("### Methods");
                    methods.forEach((m) => lines.push(`- ${m}`));
                }

                if (lines.length > 1) {
                    sections.push(lines.join("\n"));
                }
            });
        }

        return sections.join("\n\n");
    }

    localAPI.getAPIDetails = async function(apiNames) {
        if (typeof apiNames === "string") apiNames = [apiNames];
        if (apiNames.length === 0) return {};

        const baseDir = "data/aiassistant/apidocs/";
        const result = {};

        // Build a map of file -> [apiNames]
        const fileApiMap = {};
        for (const apiName of apiNames) {
            // e.g. "trans.abortTranslation" => find which file/class
            for (const [filename, meta] of Object.entries(apiMapping)) {
                const global = meta.global;
                if (apiName.startsWith(global + ".")) {
                    if (!fileApiMap[filename]) fileApiMap[filename] = [];
                    fileApiMap[filename].push(apiName);
                }
            }
        }

        for (const [filename, names] of Object.entries(fileApiMap)) {
            const filePath = nwPath.join(baseDir, filename);
            let fileContent;
            try {
                fileContent = await common.fileGetContents(filePath, "utf-8");
            } catch (err) {
                console.error(`Failed to read API doc file ${filename}:`, err);
                continue;
            }
            if (!common.isJSON(fileContent)) {
                console.error(`API doc file ${filename} is not valid JSON.`);
                continue;
            }
            const apiDoc = JSON.parse(fileContent);
            // Only one class per file in current mapping
            const className = apiMapping[filename].className;
            const doc = apiDoc[className];
            if (!doc) continue;
            // Merge members and methods
            const all = Object.assign({}, doc.members || {}, doc.methods || {});
            for (const apiName of names) {
                if (all[apiName]) {
                    result[apiName] = all[apiName];
                }
            }
        }
        return result;
    }

    localAPI.getHelpTopics = async function() {

        const helpDir = ["www/docs"];
        const topics = [];
        for (const dir of helpDir) {
            let files = [];
            try {
                files = await common.readDir(dir);
            } catch (err) {
                console.error(`Failed to read directory ${dir}:`, err);
                continue;
            }
            for (const file of files) {
                if (file.toLowerCase().endsWith('.md')) {
                    topics.push(file);
                }
            }
        }
        return topics;
    }

    localAPI.getHelp = async function(topics=[]) {
        if (typeof topics === "string") topics = [topics];

        const helpDir = ["www/docs"];
        let result = [];
        for (let topic of topics) {
            let found = false;
            let topicName = topic;
            let fileCandidates = [];

            // Remove leading helpDir if present
            for (const dir of helpDir) {
                if (topicName.startsWith(dir + "/")) {
                    topicName = topicName.slice(dir.length + 1);
                }
            }

            // Remove leading './' or '/'
            topicName = topicName.replace(/^\.?\/?/, "");

            // Remove .md extension if present
            topicName = topicName.replace(/\.md$/i, "");

            // Build candidate paths
            for (const dir of helpDir) {
                fileCandidates.push(nwPath.join(dir, topicName + ".md"));
            }
            // Also try as-is if it looks like a path
            if (topic.endsWith('.md')) {
                for (const dir of helpDir) {
                    fileCandidates.push(nwPath.join(dir, topic));
                }
                fileCandidates.push(topic); // absolute or relative path
            }

            let content = null;
            let usedPath = null;
            for (const filePath of fileCandidates) {
                try {
                    content = await common.fileGetContents(filePath, "utf-8");
                    if (content !== null) {
                        usedPath = filePath;
                        found = true;
                        break;
                    }
                } catch (err) {
                    continue;
                }
            }
            // Heading should be topicName (without .md)
            const heading = `# ${topicName}`;
            if (found) {
                result.push(`${heading}\n\n${content}`);
            } else {
                result.push(`${heading}\n\n_Not found._`);
            }
        }
        return result.join("\n\n");
    }

    localAPI.automationExists = async function(workspace="global", name) {
        const allowed = ["global", "objectIterator", "rowIterator", "gridSelection", "foundCells"];
        if (!allowed.includes(workspace)) return false;
        if (!name) return false;
        name = name.replace(/\.js$/i, "");
        const filePath = nwPath.join("data/custom-scripts", workspace, name + ".js");
        try {
            return await common.isFileAsync(filePath);
        } catch (err) {
            return false;
        }
    }

    localAPI.automationCreate = async function(workspace="global", name, scriptBody) {
        const allowed = ["global", "objectIterator", "rowIterator", "gridSelection", "foundCells"];
        if (!allowed.includes(workspace)) throw new Error("Invalid workspace");
        if (!name) throw new Error("Name required");
        name = name.replace(/\.js$/i, "");
        const dirPath = nwPath.join("data/custom-scripts", workspace);
        const filePath = nwPath.join(dirPath, name + ".js");
        try {
            await common.mkDir(dirPath);
            await common.filePutContents(filePath, scriptBody, "utf-8");
            return true;
        } catch (err) {
            console.error("automationCreate error:", err);
            return false;
        }
    }

    localAPI.automationGet = async function(workspace="global", name) {
        const allowed = ["global", "objectIterator", "rowIterator", "gridSelection", "foundCells"];
        if (!allowed.includes(workspace)) return null;
        if (!name) return null;
        name = name.replace(/\.js$/i, "");
        const filePath = nwPath.join("data/custom-scripts", workspace, name + ".js");
        try {
            return await common.fileGetContents(filePath, "utf-8");
        } catch (err) {
            return null;
        }
    }

    localAPI.automationList = async function(workspace = "global") {
        const allowed = ["global", "objectIterator", "rowIterator", "gridSelection", "foundCells"];
        if (!allowed.includes(workspace)) return [];
        const dirPath = nwPath.join("data/custom-scripts", workspace);
        let files = [];
        try {
            files = await common.readDir(dirPath);
        } catch (err) {
            return [];
        }
        return files
            .filter(f => f.toLowerCase().endsWith('.js'))
            .map(f => f.replace(/\.js$/i, ""));
    }

    localAPI.runAutomation = async function(workspace="global", name) {
        if (!await this.automationExists(workspace, name)) {
            throw new Error("Automation script does not exist");
        }
        if (name.endsWith(".js")) {
            name = name.slice(0, -3);
        }
        const filePath = nwPath.join("data/custom-scripts", workspace, name + ".js");
        return await trans.runCustomScript(workspace, filePath);
    }

}();