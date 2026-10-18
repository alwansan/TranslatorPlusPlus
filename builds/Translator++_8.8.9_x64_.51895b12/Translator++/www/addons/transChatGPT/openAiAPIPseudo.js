const fs = require('fs').promises;
const nwPath = require('path');

const OpenAiApi = {
    files: {},
    batches: {},
    apiKey: null,
    cacheLocation: 'www/php/cache/1ef4a407f44444dd7a7ee8f86cc34eef/logs/batch'
};

OpenAiApi.getApiKey = function() {
    return this.apiKey;
};

// Helper function to simulate JSON file read/write
async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading file:', err);
        return null;
    }
}

async function writeJsonFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('Data written to', filePath);
    } catch (err) {
        console.error('Error writing file:', err);
    }
}



module.exports = OpenAiApi;