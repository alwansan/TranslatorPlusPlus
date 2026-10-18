const thisAddon 	= this;
const nwPath        = require("path");
const glob          = require("glob");

thisAddon.binPath = nwPath.join(thisAddon.getPathRelativeToRoot(), "bin/GARbro-cli");

thisAddon.knownFileTypes = [
    
];


thisAddon.extractFile = async function(file, destination) {
    console.log("Extracting", file, "into", destination);
    if (!file || !destination) return;
    if (!await common.isFileAsync(file)) return;
    if (!await common.isDir(destination)) {
        await common.mkDir(destination);
    }

    // handle .asar file
    if (nwPath.extname(file).toLowerCase() == ".asar") {
        const asar = thisAddon.require("@electron/asar");
        asar.extractAll(file, destination);
        return;
    }
    
    await common.aSpawn("GARbro.Console.exe", ["x", "-y", "-o", `"${destination}"`, `"${file}"`], {
        cwd: nwPath.join(thisAddon.getLocation(), "bin/GARbro-cli"),
        shell:true,
        onData: function(data) {
            ui.log(data.toString());
        }
    })
}

thisAddon.getAllFiles = async function(directory, globFilter) {
    return new Promise((resolve, reject) => {
        glob(globFilter, {cwd:directory}, function(err, matches) {
            if (err) return reject(new Error(err))
            resolve(matches);
        });
    })
}

thisAddon.detectFileType = async function(file) {
    if (!await common.isFileAsync(file)) return;
    const output = await common.aSpawn("GARbro.Console.exe", ["i", `"${file}"`], {
        cwd: nwPath.join(thisAddon.getLocation(), "bin/GARbro-cli"),
        shell:true
    })
    console.log("output is", output);
    if (output.includes("Error:")) return;
    return output.trim();
}

thisAddon.extractAll = async function(directory, globFilter, destination) {
    if (!globFilter) return console.warn("No filter defined. Please define a filter such as **/*.dat");
    destination = destination || directory;

    var files = await this.getAllFiles(directory, globFilter);

    if (!files) return;
    if (files.length == 0) return;

    // just make sure destination directory is exist
    await common.mkDir(destination);

    for (let i=0; i<files.length; i++) {
        let currentDestination = nwPath.join(destination, nwPath.dirname(files[i]), nwPath.basename(files[i], nwPath.extname(files[i])));
        console.log("Extracting to", currentDestination);
        await this.extractFile(nwPath.join(directory, files[i]), currentDestination)
    }
}

thisAddon.showExtractDialog = async function(from, to, options) {
    const value = await ui.form({jsonForm: 
        {
            schema: {
                sourceFile: {
                    type: "string",
                    title: "Source file",
                    description: "Select the file to unpack",
                },
                targetDir: {
                    type: "string",
                    title: "Target directory",
                    description: "Select the target directory to store the unpacked files",
                },
            },
            form: [
                {
                    type: "info",
                    content: `This tool will extract the archive file into the target directory.`
                        +`<br>`    
                        +`While this tool support wide range of archive files, it may not support all of them.`
                },
                {
                    key: "sourceFile",
                    type: "selectfile",
                    multiple: false,
                },
                {
                    key: "targetDir",
                    type: "selectdir",
                },
                
            ]
        }
    },
    {
        title: t("Universal Archive Unpacker"),
    });

    if (!value) return;
    console.log("value", value);
    if (!value.sourceFile || !value.targetDir) return alert("Please select the source files and target directory");
    ui.log.show();
    ui.log.progress(100, "Unpacking files");
    await this.extractFile(value.sourceFile, value.targetDir);
    ui.log("Done!");
    ui.log.end();
    ui.log.addButton("Open Output Directory", function() {
        nw.Shell.openItem(value.targetDir);
    },
    {
        class: "icon-folder-open"
    });
}


thisAddon.initTools = function() {
    ui.mainMenu.addChild("tools", {
        id: "aec",
        label: "Archive Extractor Compendium",
    });

    let $newTransMenu = ui.mainMenu.addChild("aec", {
        label: t("Universal Archive Unpacker")
    });

    $newTransMenu.on("select", function() {
        thisAddon.showExtractDialog();
    });

}

$(document).ready(function() {
	ui.onReady(function() {
		thisAddon.initTools();
	});
});

