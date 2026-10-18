const ModelManager = {
    modelPath: "www/addons/basicUtils/ai/models.json",    
};

ModelManager.updateModelDatabase = async function() {
    // download the models and save it to the modelPath
    const fs = require("graceful-fs");
    const url = "https://openrouter.ai/api/v1/models";
    const destination = "www/"
    const response = await fetch(url, {
        method: "GET",
    });
    if (!response.ok) {
        console.error("Failed to fetch model database:", response.statusText);
        return false;
    }
    const data = await response.text();
    try {
        await fs.promises.writeFile(this.modelPath, data, "utf8");
        console.log("Model database updated successfully.");
        return true;
    } catch (error) {
        console.error("Failed to save model database:", error);
        return false;
    }

}

ModelManager.openModelSelector = async function(options={}) {
    const basePath = "www/addons/basicUtils/ai/modelSelector/modelSelector.html";
    // generate GET query from options
    let query = new URLSearchParams(options).toString();
    let urlWithQuery = basePath + (query ? `?${query}` : "");
    console.log("Opening model selector with options:", options, urlWithQuery);    
    return new Promise((resolve, reject) => {
        nw.Window.open(urlWithQuery, {
            width: 520,
            height: 720,
            position: "center"
        }, function(win) {
            console.log("Model selector opened", win);
            if (win.window) {
                win.window.callback = function(modelInfo) {
                    console.log("Model selected:", modelInfo);
                    resolve(modelInfo);
                    win.close(true);
                }

                win.on("close", function() {
                    console.log("Model selector closed");
                    resolve(null);
                    win.close(true);
                });
            }
        });
    });
}

module.exports = ModelManager;