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
const thisWorker = new (require("www/js/CommonWorker.js").Worker)();

thisWorker.process = async function(workerData) {
    if (workerData.command == "calculateHeights") {
        let calculateTableHeight = function(table) {
            if (!table) return;
            let totalLines = 0;
            
            // Step 1: Find the maximum number of lines in any cell
            for (let i = 0; i < table.length; i++) {
                if (!table[i]?.length) continue;
                let thisLength = 1;
                for (let j = 0; j < table[i].length; j++) {
                    if (!table[i][j] && table[i][j] !== 0) continue;
                    // if not string, assume 1 line
                    if (typeof table[i][j] != "string") continue;
                    // count number of lines in the cell
                    const lines = table[i][j].split('\n').length;
                    if (lines > thisLength) {
                        thisLength = lines;
                    }
                }
                totalLines += thisLength;
            }
        
            // Step 2: Calculate the height
            if (totalLines < table.length) return table.length;
            return totalLines;
        }
        return(calculateTableHeight(workerData.data));
    }

    if (workerData.command == "cloneProjectForSave") {
        const input = workerData.data || {};
        const project = input.project;
        const filter = input.filter || [];

        if (!project) return {};

        let projectClone = {};

        // If the caller specifies a filter, avoid cloning the whole `project.files`.
        if (Array.isArray(filter) && filter.length > 0) {
            const projectWithoutFiles = Object.assign({}, project);
            delete projectWithoutFiles.files;
            projectClone = JSON.parse(JSON.stringify(projectWithoutFiles)) || {};
            projectClone.files = {};

            if (project?.files) {
                for (let i = 0; i < filter.length; i++) {
                    const thisId = filter[i];
                    if (typeof project.files[thisId] === "undefined") continue;
                    projectClone.files[thisId] = JSON.parse(JSON.stringify(project.files[thisId]));
                }
            }
        } else {
            projectClone = JSON.parse(JSON.stringify(project)) || {};
        }

        // Strip out reference data (move to `project.references` and remove from `project.files`).
        if (projectClone?.files) {
            for (const fileId in projectClone.files) {
                if (projectClone.files[fileId]?.type !== "reference") continue;
                projectClone.references = projectClone.references || {};
                projectClone.references[fileId] = JSON.parse(JSON.stringify(projectClone.files[fileId]));
                delete projectClone.files[fileId];
            }
        }

        return projectClone;
    }

    if (workerData.command == "cloneProject") {
        // `worker_threads` already clones `workerData` when sending it to the worker.
        // Returning it back to the main thread yields a deep-cloned copy without
        // blocking the UI thread with JSON.stringify/parse.
        const input = workerData.data || {};
        if (input.type == "string") {
            return JSON.stringify(input.project || {});
        }
        return input.project || {};
    }
}
thisWorker.init();