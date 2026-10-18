const fs = require('fs').promises;
const nwPath = require('path');

const OpenAiApi = {
    files: {},
    batches: {},
    apiKey: null,
    cacheLocation: 'test/batch'
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

/**
 * Mock file upload: create a file entry in local cache.
 */
OpenAiApi.files.create = async function({file, purpose}) {
    const cacheFilePath = nwPath.join(OpenAiApi.cacheLocation, 'files.json');
    const filesData = await readJsonFile(cacheFilePath) || [];
    
    const newFile = {
        id: `file-${Date.now()}`,
        purpose,
        filename: nwPath.basename(file),
        bytes: (await fs.stat(file)).size,
        created_at: Math.floor(Date.now() / 1000),
        status: "processed"
    };
    
    filesData.push(newFile);
    await writeJsonFile(cacheFilePath, filesData);
    
    return newFile;
};

/**
 * Mock file listing: list all files from local cache.
 */
OpenAiApi.files.list = async function() {
    const cacheFilePath = nwPath.join(OpenAiApi.cacheLocation, 'files.json');
    const filesData = await readJsonFile(cacheFilePath) || [];
    
    return {
        object: "list",
        data: filesData,
        has_more: false
    };
};

/**
 * Mock file deletion: remove a file from local cache.
 */
OpenAiApi.files.del = async function(fileId) {
    const cacheFilePath = nwPath.join(OpenAiApi.cacheLocation, 'files.json');
    let filesData = await readJsonFile(cacheFilePath) || [];
    
    filesData = filesData.filter(file => file.id !== fileId);
    await writeJsonFile(cacheFilePath, filesData);
    
    return { deleted: true, id: fileId };
};

/**
 * Mock file retrieval: get a specific file from local cache.
 */
OpenAiApi.files.retrieve = async function(fileId) {
    const cacheFilePath = nwPath.join(OpenAiApi.cacheLocation, 'files.json');
    const filesData = await readJsonFile(cacheFilePath) || [];
    
    const file = filesData.find(file => file.id === fileId);
    if (!file) throw new Error(`File with id ${fileId} not found`);
    
    return file;
};

/**
 * Mock file content retrieval: get file content from local file system.
 */
OpenAiApi.files.content = async function(fileId) {
    const cacheFilePath = nwPath.join(OpenAiApi.cacheLocation, 'files.json');
    const filesData = await readJsonFile(cacheFilePath) || [];
    
    const file = filesData.find(file => file.id === fileId);
    if (!file) throw new Error(`File with id ${fileId} not found`);

    const filePath = nwPath.join(OpenAiApi.cacheLocation, file.filename);
    const content = await fs.readFile(filePath, 'utf8');
    
    return content;
};

/**
 * Mock batch creation: store batch information in local cache.
 */
OpenAiApi.batches.create = async function({ input_file_id, endpoint, completion_window, metadata = {} }) {
    const batchID = `batch-${Date.now()}`;
    const newBatch = {
        id: batchID,
        object: "batch",
        input_file_id,
        endpoint,
        completion_window,
        metadata,
        created_at: Math.floor(Date.now() / 1000),
        status: "validating"
    };
    
    const batchCachePath = nwPath.join(OpenAiApi.cacheLocation, 'batches.json');
    const batchesData = await readJsonFile(batchCachePath) || [];
    
    batchesData.push(newBatch);
    await writeJsonFile(batchCachePath, batchesData);
    
    return newBatch;
};

/**
 * Mock batch retrieval: get a specific batch from local cache.
 */
OpenAiApi.batches.retrieve = async function(batchId) {
    const batchCachePath = nwPath.join(OpenAiApi.cacheLocation, 'batches.json');
    const batchesData = await readJsonFile(batchCachePath) || [];
    
    const batch = batchesData.find(b => b.id === batchId);
    if (!batch) throw new Error(`Batch with id ${batchId} not found`);
    
    return batch;
};

/**
 * Mock batch listing: list all batches from local cache.
 */
OpenAiApi.batches.list = async function() {
    const batchCachePath = nwPath.join(OpenAiApi.cacheLocation, 'batches.json');
    const batchesData = await readJsonFile(batchCachePath) || [];
    
    return {
        object: "list",
        data: batchesData,
        has_more: false
    };
};

module.exports = OpenAiApi;
