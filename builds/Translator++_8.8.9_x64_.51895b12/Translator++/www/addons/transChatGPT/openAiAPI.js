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

const https = require('https');
const fs = require('fs');
const FormData = require('form-data');
const nwPath = require('path');

const OpenAiApi = {
    files:{},
    batches:{},
    apiKey: null,
    cacheLocation: 'data/batch/cache'
};

OpenAiApi.getApiKey = function() {
    return this.apiKey;
}

/**
* upload a file to openai
* @param {Object} options
* @param {String} options.file - path to the file
* @param {String} options.purpose - purpose of the file
* @param {String} [options.apiKey] - openai api key
* @returns {Promise<void>}
* @example
* await OpenAiApi.file.create({
*      file: 'path/to/file',
*      purpose: 'batch',
*      apiKey: 'test'
* });
* // response
* {
"object": "file",
"id": "file-kqgi7sN3ZdvgyCnISmsbmXtJ",
"purpose": "batch",
"filename": "batch.jsonl",
"bytes": 506,
"created_at": 1717731582,
"status": "processed",
"status_details": null
}
*/
OpenAiApi.files.create = async function({file, purpose, apiKey}) {
    return new Promise((resolve, reject) => {
        apiKey = apiKey || OpenAiApi.getApiKey();
        const form = new FormData();
        form.append('purpose', purpose);
        form.append('file', fs.createReadStream(file));
        
        const options = {
            method: 'POST',
            hostname: 'api.openai.com',
            path: '/v1/files',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                ...form.getHeaders(),
            },
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('File uploaded successfully:', JSON.parse(data));
                    resolve(JSON.parse(data));
                } else {
                    console.error('Error uploading file:', res.statusCode, JSON.parse(data));
                    reject(new Error(`Failed to upload file: ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('Request error:', error);
        });
        
        form.pipe(req);
    });
}


/**
* list all files uploaded to openai
* @param {String} [apiKey] - openai api key
* @returns {Promise<void>}
* @example
* await OpenAiApi.files.list('test');
* // response
* {
"object": "list",
"data": [
{
"object": "file",
"id": "file-kqgi7sN3ZdvgyCnISmsbmXtJ",
"purpose": "batch",
"filename": "batch.jsonl",
"bytes": 506,
"created_at": 1717731582,
"status": "processed",
"status_details": null
}
],
"has_more": false
}
*/
OpenAiApi.files.list = async function(apiKey) {
    apiKey = apiKey || OpenAiApi.getApiKey();
    
    const url = 'https://api.openai.com/v1/files';
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
    });
    
    if (response.ok) {
        const data = await response.json();
        console.log('Files:', data);
    } else {
        const errorData = await response.json();
        console.error('Error fetching files:', response.status, errorData);
    }
}

OpenAiApi.files.del = async function(fileId, apiKey) {
    apiKey = apiKey || OpenAiApi.getApiKey();
    if (!fileId) {
        throw new Error('File ID is required');
    }
    const url = `https://api.openai.com/v1/files/${fileId}`;
    
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
    });
    
    if (response.ok) {
        const data = await response.json();
        console.log('File deleted successfully:', data);
    } else {
        const errorData = await response.json();
        console.error('Error deleting file:', response.status, errorData);
    }
}

/* 
* retrieve a file from openai
* @param {String} fileId - id of the file
* @param {String} [apiKey] - openai
* @returns {Promise<void>}
* @example
* await OpenAiApi.files.retrieve('file-kqgi7sN3ZdvgyCnISmsbmXtJ', 'test');
* // response
*
{
"object": "file",
"id": "file-kqgi7sN3ZdvgyCnISmsbmXtJ",
"purpose": "batch",
"filename": "batch.jsonl",
"bytes": 506,
"created_at": 1717731582,
"status": "processed",
"status_details": null
}
*/
OpenAiApi.files.retrieve = async function(fileId, apiKey) {
    apiKey = apiKey || OpenAiApi.getApiKey();
    
    const url = `https://api.openai.com/v1/files/${fileId}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
    });
    
    if (response.ok) {
        const data = await response.json();
        console.log('File retrieved successfully:', data);
        return data;
    } else {
        const errorData = await response.json();
        console.error('Error retrieving file:', response.status, errorData);
        throw new Error(`Failed to retrieve file: ${response.status}`);
    }
}


OpenAiApi.files.saveTo = async function(fileId, outputPath, apiKey) {
    if (!fileId) {
        throw new Error('File ID is required');
    }
    if (!outputPath) {
        throw new Error('Output path is required');
    }
    apiKey = apiKey || OpenAiApi.getApiKey();        
    const url = `https://api.openai.com/v1/files/${fileId}/content`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
    });
    
    if (response.ok) {
        const fileStream = fs.createWriteStream(outputPath);
        response.body.pipe(fileStream);
        
        response.body.on('error', (error) => {
            console.error('Error during download:', error);
        });
        
        fileStream.on('finish', () => {
            console.log('File downloaded successfully to', outputPath);
        });
    } else {
        const errorData = await response.json();
        console.error('Error retrieving file content:', response.status, errorData);
        throw new Error(`Failed to retrieve file content: ${response.status}`);
    }
}

OpenAiApi.files.content = async function(fileId, force=false, apiKey = OpenAiApi.getApiKey()) {
    // check if the file is already cached
    const cacheFile = `${OpenAiApi.cacheLocation}/${fileId}`;
    if (!force && await common.isFileAsync(cacheFile)) {
        return await common.fileGetContents(cacheFile, 'utf8');
    }

    const url = `https://api.openai.com/v1/files/${fileId}/content`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
    });
    
    if (response.ok) {
        const data = await response.text();
        console.log('File content retrieved successfully.');
        await common.mkDir(OpenAiApi.cacheLocation);
        await common.filePutContents(cacheFile, data, "utf8", false);
        return data;
    } else {
        const errorData = await response.json();
        console.error('Error retrieving file content:', response.status, errorData);
        throw new Error(`Failed to retrieve file content: ${response.status}`);
    }
}


/**
 * Store row information of the batch
 * @param {String} batchID - id of the batch
 * @param {Array} rows - array of row information
 * @param {Object} [options] - options
 * @returns {Promise<void>}
 * @example
 * await OpenAiApi.batches.storeRows('batch_abc123', [{id: 'row_1', data: 'row data'}]);
 * // output
 * // file is saved to data/batch/rows/batch_abc123.json
 * // file content
{
  "tpp-0": {
    "path": "StarlitSeason/Content/Commu/Localize/Tutorial/FreeTime/CML_Tutorial_02_0001_00.csv",
    "info": [
      {
        "r": 0,
        "a": "B"
      },
      {
        "r": 3,
        "a": "P"
      }
    ]
  },
  "tpp-1": {
    "path": "StarlitSeason/Content/Commu/Localize/Tutorial/FreeTime/CML_Tutorial_02_0002_00.csv",
    "info": [
      {
        "r": 0,
        "a": "B"
      },
      {
        "r": 1,
        "a": "Kotori"
      },
      {
        "r": 2,
        "a": "P"
      },
      {
        "r": 5,
        "a": "B"
      },
      {
        "r": 6,
        "a": "P"
      }
    ]
  }
}
 */
OpenAiApi.batches.storeMetadata = async function(batchID, metadata, options={}) {
    const basePath = "data/batch/metadata";
    await common.mkDir(basePath);
    await common.filePutContents(`${basePath}/${batchID}.json`, JSON.stringify(metadata, undefined, 2));
}


OpenAiApi.batches.loadMetadata = async function(batchID, options={}) {
    const basePath = "data/batch/metadata";
    const metadataFile = `${basePath}/${batchID}.json`;
    if (!fs.existsSync(metadataFile)) return;
    const metadata = await common.fileGetContents(metadataFile);
    return JSON.parse(metadata);
}
/**
* create a batch
* @param {Object} options
* @param {String} options.input_file_id - id of the input file
* @param {String} [options.endpoint] - endpoint to use
* @param {String} [options.completion_window] - completion window
* @param {String} [options.apiKey] - openai api key
* @param {Object} [options.metadata] - arbitrary object
* @returns {Promise<object>}
* @example
* // output
{
"id": "batch_abc123",
"object": "batch",
"endpoint": "/v1/chat/completions",
"errors": null,
"input_file_id": "file-abc123",
"completion_window": "24h",
"status": "validating",
"output_file_id": null,
"error_file_id": null,
"created_at": 1711471533,
"in_progress_at": null,
"expires_at": null,
"finalizing_at": null,
"completed_at": null,
"failed_at": null,
"expired_at": null,
"cancelling_at": null,
"cancelled_at": null,
"request_counts": {
"total": 0,
"completed": 0,
"failed": 0
},
"metadata": {
"customer_id": "user_123456789",
"batch_description": "Nightly eval job",
}
}
*/
OpenAiApi.batches.create = async function({input_file_id, endpoint, completion_window, apiKey = OpenAiApi.getApiKey(), metadata = {}}) {
    const url = 'https://api.openai.com/v1/batches';
    if (!input_file_id) {
        throw new Error('Input file ID is required');
    }
    
    // currently only supports /v1/chat/completions, /v1/embeddings or /v1/completions
    endpoint ||= "/v1/chat/completions";
    
    completion_window ||= "24h"; // currently cannot be changed
    
    const body = JSON.stringify({
        input_file_id: input_file_id,
        endpoint: endpoint,
        completion_window: completion_window,
        metadata: {
            data:JSON.stringify(metadata), // arbitrary object
        }
    });
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: body,
    });
    
    if (response.ok) {
        const data = await response.json();
        console.log('Batch created successfully:', data);
        return data;
    } else {
        const errorData = await response.json();
        console.error('Error creating batch:', response.status, errorData);
        throw new Error(`Failed to create batch: ${response.status}`);
    }
}

OpenAiApi.batches.getBatchFromFileId = async function(fileId, apiKey = OpenAiApi.getApiKey()) {
    const batchList = await OpenAiApi.batches.list();
    if (!batchList.data) {
        throw new Error('No batches found');
    }
    return batchList.data.find(batch => batch.input_file_id === fileId);
}

OpenAiApi.batches.retrieve = async function(batchId, apiKey = OpenAiApi.getApiKey()) {
    if (batchId.includes('file-')) {
        // the given batchID is fileID, try to retrieve the batchID from the fileID
        const batch = await OpenAiApi.batches.getBatchFromFileId(batchId, apiKey);
        if (!batch?.id) {
            throw new Error('Batch not found');
        }
        batchId = batch.id;
    }
    
    const url = `https://api.openai.com/v1/batches/${batchId}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    });
    console.log("%c Retrieving batch", "color:cyan", batchId);
    
    if (response.ok) {
        const data = await response.json();
        console.log('Batch retrieved successfully:', data);
        return data;
    } else {
        const errorData = await response.json();
        console.error('Error retrieving batch:', response.status, errorData);
        throw new Error(`Failed to retrieve batch: ${response.status}`);
    }
}

OpenAiApi.batches.list = async function(limit = undefined, apiKey = OpenAiApi.getApiKey()) {
    let url = 'https://api.openai.com/v1/batches';
    
    if (limit) {
        url += `?limit=${limit}`;
    }
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    });
    
    if (response.ok) {
        const data = await response.json();
        console.log('Batch list retrieved successfully:', data);
        if (data?.data?.length > 0) {
            for (let batch of data.data) {
                if (batch?.metadata?.data) {
                    batch.metadata.data = JSON.parse(batch.metadata.data);
                }
            }
        }
        return data;
    } else {
        const errorData = await response.json();
        console.error('Error retrieving batch list:', response.status, errorData);
        throw new Error(`Failed to retrieve batch list: http code: ${response.status}\nCode:${errorData?.error?.code}\nMessage:${errorData?.error?.message}`);
    }
}

/**
* Cancels a batch with the given batch ID.
*
* @param {string} batchId - The ID of the batch to cancel.
* @param {string} [apiKey=OpenAiApi.getApiKey()] - The API key for authentication.
* @returns {Promise<Object>} The response data from the API.
* @throws {Error} If the request fails.
*/
OpenAiApi.batches.cancel = async function(batchId, apiKey = OpenAiApi.getApiKey()) {
    const url = `https://api.openai.com/v1/batches/${batchId}/cancel`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    });
    
    if (response.ok) {
        const data = await response.json();
        console.log('Batch canceled successfully:', data);
        return data;
    } else {
        const errorData = await response.json();
        console.error('Error canceling batch:', response.status, errorData);
        throw new Error(`Failed to cancel batch: ${response.status}`);
    }
}



module.exports = OpenAiApi;