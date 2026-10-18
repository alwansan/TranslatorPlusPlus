const BasicEventHandler = require("www/js/BasicEventHandler.js");
const http = require("http");
const WebSocket = require("ws");

/**
 * Remote Management Service WebSocket Server
 * @class
 * @extends BasicEventHandler
 */
class RemoteManagementServiceWs extends BasicEventHandler {
    /**
     * Creates an instance of RemoteManagementServiceWs
     * @param {Object} [options] - Configuration options
     * @param {number} [options.port=22882] - Port number to listen on
     * @param {string} [options.host="localhost"] - Host address to bind to
     * @param {number} [options.pingInterval=30000] - Ping interval in milliseconds
     */
    constructor(options) {
        super();
        options = options || {};
        this.options = options;
        this.options.port ||= 22882;
        this.options.host ||= "localhost";
        this.options.pingInterval ||= 30000; // 30 seconds default ping interval

        /** @private */
        this.clients = {};
        /** @private */
        this.server = null;
        /** @private */
        this.wss = null;
        /** @private */
        this.nextClientId = 1;
        /** @private */
        this.pingInterval = null;

        // Add to constructor:
        this.maxWaitingTime = 5000; // Default 5 second timeout

        // Check for existing service
        const existingService = RemoteManagementServiceWs.getService(this.options.host, this.options.port);
        if (existingService) {
            return existingService;
        }
    }

    /**
     * Starts the WebSocket server
     * @async
     * @returns {Promise<RemoteManagementServiceWs>}
     * @fires RemoteManagementServiceWs#serverStarted
     * @fires RemoteManagementServiceWs#clientConnected
     * @fires RemoteManagementServiceWs#clientMessage
     * @fires RemoteManagementServiceWs#clientDisconnected
     * @fires RemoteManagementServiceWs#clientError
     */
    async start() {
        return new Promise((resolve, reject) => {
            if (this.wss) {
                return resolve(this); // Server already started
            }

            // Check again for existing service in case of race condition
            const existingService = RemoteManagementServiceWs.getService(this.options.host, this.options.port);
            if (existingService && existingService !== this) {
                return reject(new Error(`Service already running on ${this.options.host}:${this.options.port}`));
            }

            this.server = http.createServer();
            this.wss = new WebSocket.Server({ 
                server: this.server,
                perMessageDeflate: false // Disable compression to simplify ping/pong
            });

            // Setup ping interval
            this.pingInterval = setInterval(() => {
                this._sendPings();
            }, this.options.pingInterval);

            this.wss.on('connection', (ws) => {
                const clientId = this.nextClientId++;
                this.clients[clientId] = ws;
                
                // Send welcome message
                const welcomeMsg = this.formatResponsePayload(
                    `Translator++ Remote Management Service ver. ${RemoteManagementServiceWs.serverVersion}`,
                    "welcome"
                );
                ws.send(welcomeMsg);

                // Set up ping/pong handlers
                ws.isAlive = true;
                ws.on('pong', () => {
                    ws.isAlive = true;
                });

                /**
                 * Client connected event
                 * @event RemoteManagementServiceWs#clientConnected
                 * @type {object}
                 * @property {number} clientId - The unique client ID
                 * @property {WebSocket} ws - The WebSocket connection object
                 */
                this.trigger('clientConnected', { clientId, ws });

                ws.on('message', (message) => {
                    try {
                        // Handle ping messages
                        const parsed = this._tryParseMessage(message);
                        console.log("Received message:", parsed);
                        if (parsed && parsed.type === 'ping') {
                            this._handlePing(ws, parsed);
                            return;
                        }

                        /**
                         * Client message received event
                         * @event RemoteManagementServiceWs#clientMessage
                         * @type {object}
                         * @property {number} clientId - The unique client ID
                         * @property {string|Buffer} message - The received message
                         * @property {WebSocket} ws - The WebSocket connection object
                         */
                        this.trigger('clientMessage', { clientId, message, ws });
                    } catch (error) {
                        this.trigger('clientError', { clientId, error, ws });
                    }
                });

                ws.on('close', () => {
                    /**
                     * Client disconnected event
                     * @event RemoteManagementServiceWs#clientDisconnected
                     * @type {object}
                     * @property {number} clientId - The unique client ID
                     * @property {WebSocket} ws - The WebSocket connection object
                     */
                    this.trigger('clientDisconnected', { clientId, ws });
                    delete this.clients[clientId];
                });

                ws.on('error', (error) => {
                    /**
                     * Client error event
                     * @event RemoteManagementServiceWs#clientError
                     * @type {object}
                     * @property {number} clientId - The unique client ID
                     * @property {Error} error - The error object
                     * @property {WebSocket} ws - The WebSocket connection object
                     */
                    this.trigger('clientError', { clientId, error, ws });
                });
            });

            this.server.on('error', (error) => {
                reject(error);
            });

            this.server.listen(this.options.port, this.options.host, () => {
                RemoteManagementServiceWs.addService(this.options.host, this.options.port, this);

                /**
                 * Server started event
                 * @event RemoteManagementServiceWs#serverStarted
                 * @type {object}
                 * @property {string} host - The host address
                 * @property {number} port - The port number
                 */
                this.trigger('serverStarted', { 
                    host: this.options.host, 
                    port: this.options.port 
                });
                resolve(this);
            });
        });
    }

    /**
     * @private
     * Try to parse incoming message
     */
    _tryParseMessage(message) {
        try {
            message = message.toString();
            return typeof message === 'string' ? JSON.parse(message) : message;
        } catch {
            return null;
        }
    }

    /**
     * @private
     * Handle ping message from client
     */
    _handlePing(ws, message) {
        const response = this.formatResponsePayload(
            message.content || 'pong',
            'pong',
            message.headers || {}
        );
        ws.send(response);
    }

    /**
     * @private
     * Send pings to all connected clients
     */
    _sendPings() {
        if (!this.wss) return;

        this.wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                return ws.terminate();
            }

            ws.isAlive = false;
            try {
                ws.ping();
            } catch (error) {
                // Handle error if needed
            }
        });
    }

    /**
     * Stops the WebSocket server
     * @async
     * @returns {Promise<void>}
     * @fires RemoteManagementServiceWs#serverStopped
     */
    async stop() {
        return new Promise((resolve) => {
            // Clear ping interval
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
            }

            if (this.wss) {
                // Close all client connections
                this.wss.clients.forEach(client => {
                    client.terminate();
                });
                
                // Close the WebSocket server
                this.wss.close(() => {
                    // Close the HTTP server
                    this.server.close(() => {
                        /**
                         * Server stopped event
                         * @event RemoteManagementServiceWs#serverStopped
                         */
                        this.trigger('serverStopped');
                        this.wss = null;
                        this.server = null;
                        RemoteManagementServiceWs.removeService(this.options.host, this.options.port);
                        resolve();
                    });
                });
            } else {
                RemoteManagementServiceWs.removeService(this.options.host, this.options.port);
                resolve();
            }
        });
    }

    isStarted() {
        return Boolean(this.wss);
    }

    /**
     * Sends a message to a specific client
     * @param {number} clientId - The client ID to send to
     * @param {*} content - The message content
     * @param {string} [type="response"] - The message type
     * @param {Object} [headers={}] - Additional headers
     * @returns {boolean} True if message was sent, false if client not found or connection closed
     */
    sendToClient(clientId, content, type = "response", headers = {}) {
        const client = this.getClient(clientId);
        if (client && client.readyState === WebSocket.OPEN) {
            const payload = this.formatResponsePayload(content, type, headers);
            client.send(payload);
            return true;
        }
        return false;
    }

    /**
     * Broadcasts a message to all connected clients
     * @param {*} content - The message content
     * @param {string} [type="broadcast"] - The message type
     * @param {Object} [headers={}] - Additional headers
     */
    broadcast(content, type = "broadcast", headers = {}) {
        const payload = this.formatResponsePayload(content, type, headers);
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }

    /**
     * Waits for a response from a specific client
     * @param {number} clientId - The client ID to expect response from
     * @param {*} [content] - The content to match (optional)
     * @param {string} [type] - The expected response type
     * @param {Object} [headers] - The expected headers (optional)
     * @param {number} [timeout] - Timeout in milliseconds
     * @returns {Promise<Object>} Resolves with the response message
     */
    async expectResponse(clientId, content, type, headers, timeout = this.maxWaitingTime) {
        const client = this.getClient(clientId);
        if (!client || client.readyState !== WebSocket.OPEN) {
            throw new Error('Client not connected');
        }

            // Generate unique event scope ID
        const scope = RemoteManagementServiceWs.makeId();
        return new Promise((resolve, reject) => {
            // Setup cleanup function
            const cleanup = () => {
                clearTimeout(timer);
                this.off(`clientMessage.${scope}`);
                this.off(`error.${scope}`);
            };

            const timer = setTimeout(() => {
                cleanup();
                reject(new Error(`Timeout waiting for response from client ${clientId}`));
            }, timeout);

            this.on(`clientMessage.${scope}`, (evt, response) => {
                const message = this._tryParseMessage(response.message);
                console.log("%c---Response:", "color:cyan", message);
                if (message?.headers?.scope !== scope) {
                    return;
                }
                cleanup();
                resolve(message);
            });

            this.on(`error.${scope}`, () => {
                cleanup();
                reject(new Error('Client error'));
            });

            // Send the message to client
            this.sendToClient(
                clientId,
                content,
                type,
                { ...headers, expectResponse: true, scope}
            );
            
        });
    }

    /**
     * Waits for responses from multiple clients
     * @param {number[]} [clientIds] - Array of client IDs (empty = all clients)
     * @param {*} [content] - The content to match (optional)
     * @param {string} [type] - The expected response type
     * @param {Object} [headers] - The expected headers (optional)
     * @param {number} [timeout] - Timeout per client in milliseconds
     * @param {boolean} [waitForAll=true] - Wait for all clients (false = first response)
     * @returns {Promise<Object|Object[]>} Single response or array of responses
     */
    async expectResponses(clientIds, content, type, headers, timeout = this.maxWaitingTime, waitForAll = true) {
        const targets = clientIds?.length ? clientIds : Object.keys(this.clients).map(Number);
        
        if (!targets.length) {
            return waitForAll ? [] : Promise.reject(new Error('No clients connected'));
        }

        const promises = targets.map(clientId => 
            this.expectResponse(clientId, content, type, headers, timeout)
        );

        return waitForAll 
            ? Promise.all(promises)
            : Promise.race(promises);
    }

    // Aliases for clearer usage
    async expectResponseBroadcast(content, type, headers, timeout) {
        return this.expectResponses(undefined, content, type, headers, timeout, false);
    }

    async expectAllResponses(content, type, headers, timeout) {
        return this.expectResponses(undefined, content, type, headers, timeout, true);
    }

   /**
     * Finds the first client with specified capability
     * @param {string|string[]} capabilities - Capability or array of capabilities to check
     * @param {number} [timeout=5000] - Timeout in milliseconds
     * @returns {Promise<number>} Resolves with client ID of first capable client
     * @throws {Error} If no capable client found within timeout
     */
    async findFirstWithCapability(capabilities, timeout = 5000) {
        const capabilityList = Array.isArray(capabilities) ? capabilities : [capabilities];
        const clients = Object.entries(this.clients);
        
        if (clients.length === 0) {
            throw new Error('No clients connected');
        }

        // Create a promise for each client that resolves when capability is confirmed
        const capabilityChecks = clients.map(([clientId, ws]) => {
            return this.expectResponse(
                Number(clientId),
                capabilityList,
                'canYou',
                {},
                timeout
            )
            .then((response) => {
                console.log("Capability response:", response);
                return {
                    clientId: Number(clientId),
                    capable: this._checkCapabilityResponse(response.content, capabilityList)
                }
            })
            .catch(() => ({ clientId: Number(clientId), capable: false }));
        });

        // Race all capability checks
        return new Promise((resolve, reject) => {
            let resolved = false;
            const globalTimer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    reject(new Error(`No capable clients found for: ${capabilityList.join(', ')}`));
                }
            }, timeout);

            capabilityChecks.forEach(checkPromise => {
                checkPromise.then(({ clientId, capable }) => {
                    if (!resolved && capable) {
                        resolved = true;
                        clearTimeout(globalTimer);
                        resolve(clientId);
                    }
                });
            });
        });
    }

    /**
     * Get random clientId
     */
    getAnyClient = function() {
        const clients = Object.keys(this.clients);
        return clients.length ? Number(clients[Math.floor(Math.random() * clients.length)]) : null;
    }

    waitForAnyClient = async function(timeout = 10000) {
        // if have client imminently, return the last client
        const clientIds = Object.keys(this.clients);
        if (clientIds.length) {
            return clientIds[clientIds.length - 1];
        }

        return new Promise((resolve, reject) => {
            const scope = RemoteManagementServiceWs.makeId();
            const cleanup = () => {
                clearTimeout(timer);
                this.off(`clientConnected.${scope}`);
            };

            const timer = setTimeout(() => {
                cleanup();
                reject(new Error(`Timeout waiting for client`));
            }, timeout);

            this.one(`clientConnected.${scope}`, (clientId) => {
                resolve(clientId);
                cleanup();
            });       
        });

    }


    /**
     * Finds all clients with specified capability
     * @param {string|string[]} capabilities - Capability or array of capabilities to check
     * @param {number} [timeout=5000] - Timeout in milliseconds
     * @returns {Promise<number[]>} Resolves with array of client IDs with the capability
     */
    async findAllWithCapability(capabilities, timeout = 5000) {
        const capabilityList = Array.isArray(capabilities) ? capabilities : [capabilities];
        const clients = Object.entries(this.clients);
        
        if (clients.length === 0) {
            return [];
        }

        const capabilityChecks = clients.map(([clientId, ws]) => {
            return this.expectResponse(
                Number(clientId),
                capabilityList,
                'canYou',
                {},
                timeout
            )
            .then(response => ({
                clientId: Number(clientId),
                capable: this._checkCapabilityResponse(response.content, capabilityList)
            }))
            .catch(() => ({ clientId: Number(clientId), capable: false }));
        });

        const results = await Promise.all(capabilityChecks);
        return results.filter(r => r.capable).map(r => r.clientId);
    }

    /**
     * @private
     * Helper to check capability response
     */
    _checkCapabilityResponse(responseContent, requiredCapabilities) {
        if (typeof responseContent !== 'object') return false;
        return requiredCapabilities.every(cap => 
            responseContent[cap] === true
        );
    }
    
    /**
     * @private
     * Helper method to match headers
     */
    _matchHeaders(messageHeaders, expectedHeaders) {
        for (const key in expectedHeaders) {
            if (messageHeaders[key] !== expectedHeaders[key]) {
                return false;
            }
        }
        return true;
    }

}

/**
 * The server version
 * @static
 * @type {string}
 */
RemoteManagementServiceWs.serverVersion = "0.1.0";

/**
 * Gets all connected clients
 * @returns {Object.<number, WebSocket>} An object mapping client IDs to WebSocket connections
 */
RemoteManagementServiceWs.prototype.getClients = function () {
    return this.clients;
}

/**
 * Gets a specific client by ID
 * @param {number} clientId - The client ID to retrieve
 * @returns {WebSocket|null} The WebSocket connection or null if not found
 */
RemoteManagementServiceWs.prototype.getClient = function (clientId) {
    return this.clients[clientId] || null;
}

/**
 * Formats a response payload according to the service specification
 * @param {*} content - The content to send
 * @param {string} type - The type of the content
 * @param {Object} [headers={}] - Additional headers
 * @returns {string} The formatted JSON string
 */
RemoteManagementServiceWs.prototype.formatResponsePayload = function (content, type, headers) {
    const payload = {
        content: content, // any type of content
        type: type, // The type of the content, eg: "response", "error" etc.
        headers: { ...headers }, // Ensure we don't mutate the input headers
    }
    console.log("Sending payload:", payload);
    return JSON.stringify(payload);
}

RemoteManagementServiceWs.makeId = function() {
    return `${Math.random().toString(36).substr(2, 9)}${Math.random().toString(36).substr(2, 9)}`;
}

RemoteManagementServiceWs.activeServices = {};
RemoteManagementServiceWs.addService = function (host, port, service) {
    RemoteManagementServiceWs.activeServices[`${host}:${port}`] = service;
}

RemoteManagementServiceWs.removeService = function (host, port) {
    const key = `${host}:${port}`;
    if (RemoteManagementServiceWs.activeServices[key]) {
        delete RemoteManagementServiceWs.activeServices[key];
    }
}

RemoteManagementServiceWs.getService = function (host, port) {
    return RemoteManagementServiceWs.activeServices[`${host}:${port}`] || null;
}


module.exports = RemoteManagementServiceWs;