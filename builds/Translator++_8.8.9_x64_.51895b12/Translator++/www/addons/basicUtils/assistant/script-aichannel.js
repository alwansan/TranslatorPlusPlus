const BLS = require("better-localstorage"); // For NW.js
class AIChannel {
    constructor(options = {}) {
        options ||= {};
        options.settings ||= {};

        this.settings = {...options.settings, ...{
            apiUrl: 'https://api.openai.com/v1/chat/completions',
            apiKey: '',
            model: 'gpt-3.5-turbo', // Default model
            systemMessage: "You are ChatGPT, a large language model trained by OpenAI.\nCarefully heed the user's instructions.\nRespond using Markdown.",
            temperature: 0.7,
            maxTokens: 4094,
            topP: 1,
            presencePenalty: 0,
            frequencyPenalty: 0,
            imageDetail: 'auto',
            stream:false,
            /* More setting */
        }};

        // jquery event handler is handy. So we use it.
        const $elm = $("<div></div>");
        this.on = function(evt, fn) {
            $elm.on(evt, fn);
            return this;
		}
        this.one = function(evt, fn) {
            $elm.one(evt, fn);
            return this;
        }
        this.off = function(evt) {
            $elm.off(evt);
            return this;
        }
        this.trigger = function(evt, data) {
            $elm.trigger(evt, data);
            return this;
        }
    }
}

/**
 * Sends message payload to the AI API.
 * The payload is array of OpenAI message objects.
 * Each message object should have a 'role' and 'content' property.
 * The 'role' can be 'system', 'user', or 'assistant'.
 * Trigger events when :
 * - The request is sent
 * - The response is received
 * - Receive a stream of data
 * - The stream is completed
 * - An error occurs
 * @param {Array} messages - Array of message objects to send to the AI API.
 * @returns {Promise<String>} - A promise that resolves with the AI's response string.
 */
AIChannel.prototype.sendMessages = async function(messages = []) {
    if (!this.settings.apiKey) {
        const error = new Error('API key is not set.');
        this.trigger('error', { error, message: error.message, context: 'preflight_check_apikey' });
        return Promise.reject(error);
    }
    if (!Array.isArray(messages) || messages.length === 0) {
        const error = new Error('Messages array cannot be empty and must be an array.');
        this.trigger('error', { error, message: error.message, context: 'preflight_check_messages' });
        return Promise.reject(error);
    }

    const apiPayload = {
        model: this.settings.model,
        messages: messages.map(msg => {
            // Handle multimodal content (e.g., images)
            if (Array.isArray(msg.content)) {
                return {
                    ...msg,
                    content: msg.content.map(item => {
                        if (item.type === 'image_url' && item.image_url) {
                            return {
                                ...item,
                                image_url: {
                                    url: item.image_url.url, // URL is mandatory
                                    // Apply default detail from settings if not specified in the message
                                    detail: item.image_url.detail || this.settings.imageDetail 
                                }
                            };
                        }
                        return item;
                    })
                };
            }
            return msg;
        }),
        temperature: this.settings.temperature,
        max_tokens: this.settings.maxTokens,
        top_p: this.settings.topP,
        presence_penalty: this.settings.presencePenalty,
        frequency_penalty: this.settings.frequencyPenalty,
        stream: this.settings.stream,
    };

    // Add other OpenAI optional parameters if they exist in settings
    // e.g., if (typeof this.settings.n !== 'undefined') apiPayload.n = this.settings.n;
    // e.g., if (typeof this.settings.stop !== 'undefined') apiPayload.stop = this.settings.stop;
    // e.g., if (typeof this.settings.user !== 'undefined') apiPayload.user = this.settings.user;

    this.trigger('requestSent', { messages, payload: apiPayload });

    try {
        const response = await fetch(this.settings.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.settings.apiKey}`,
            },
            body: JSON.stringify(apiPayload),
        });

        if (!response.ok) {
            let errorBody;
            let errorBodyText = await response.text();
            try {
                errorBody = JSON.parse(errorBodyText);
            } catch (e) {
                errorBody = errorBodyText; // Keep as text if not JSON
            }
            const error = new Error(`API request failed with status ${response.status}: ${typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody.error || errorBody)}`);
            error.status = response.status;
            error.body = errorBody;
            this.trigger('error', { error, message: error.message, context: 'api_response_error', status: response.status, body: errorBody });
            throw error;
        }

        if (this.settings.stream) {
            let accumulatedContent = "";
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            // Process the stream
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    // End of stream
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataContent = line.substring(6).trim();
                        if (dataContent === '[DONE]') {
                            // OpenAI specific signal for end of data stream
                            continue; 
                        }
                        try {
                            const parsed = JSON.parse(dataContent);
                            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                                const deltaContent = parsed.choices[0].delta.content;
                                if (deltaContent) {
                                    accumulatedContent += deltaContent;
                                    this.trigger('streamData', {
                                        chunk: deltaContent,
                                        currentFullContent: accumulatedContent,
                                        rawChunkData: parsed
                                    });
                                }
                            }
                            // Optional: Handle finish_reason if needed
                            if (parsed.choices && parsed.choices[0] && parsed.choices[0].finish_reason) {
                               this.trigger('streamFinish', { reason: parsed.choices[0].finish_reason, currentFullContent: accumulatedContent });
                            }
                        } catch (e) {
                            console.error("Error parsing stream JSON:", e, "Data:", dataContent);
                            this.trigger('error', {
                                error: e,
                                message: `Error parsing stream data: ${e.message}`,
                                context: 'stream_data_parsing',
                                rawData: dataContent
                            });
                            // Decide whether to continue or abort; for now, continue processing other lines/chunks
                        }
                    }
                }
            }
            
            // Final flush for the decoder (though usually not needed if stream ends cleanly)
            const finalDecodedChunk = decoder.decode();
            if (finalDecodedChunk) { // Should be empty if stream terminated cleanly after last SSE message
                // This part assumes finalDecodedChunk is simple text. If it could be complex SSE, it needs parsing.
                // For OpenAI, this is usually empty. If it occurs, it might be an unexpected fragment.
                // accumulatedContent += finalDecodedChunk; // Potentially add, but log it
                console.warn("AIChannel: Flushed non-empty final chunk from decoder:", finalDecodedChunk);
            }

            this.trigger('streamCompleted', { fullContent: accumulatedContent });
            this.trigger('responseReceived', { response: accumulatedContent, isStream: true });
            return accumulatedContent;

        } else { // Not streaming
            const responseData = await response.json();
            const assistantMessageContent = (responseData.choices && responseData.choices[0] && responseData.choices[0].message) ?
                                            responseData.choices[0].message.content : null;

            if (assistantMessageContent === null && !(responseData.choices && responseData.choices[0] && responseData.choices[0].message && typeof responseData.choices[0].message.content === 'string')) {
                 // Handle cases like function calls or empty content if that's valid, or error out.
                 // For now, error if content is not a string.
                const error = new Error('Invalid or missing message content in API response.');
                this.trigger('error', { error, message: error.message, context: 'api_response_parsing', rawResponse: responseData });
                throw error;
            }
            
            this.trigger('responseReceived', {
                response: assistantMessageContent,
                isStream: false,
                rawResponse: responseData
            });
            return assistantMessageContent;
        }

    } catch (error) {
        // Catches errors from fetch (network, DNS) or errors thrown explicitly above (API errors, parsing errors)
        if (!error.status) { // If not an API error with status (already triggered)
            this.trigger('error', { error, message: error.message, context: 'network_or_unknown_error' });
        }
        // Ensure the promise is rejected
        throw error;
    }
};

/**
 * Sends message payload to the AI API as a single message from the user.
 * The payload will be sent as array of two OpenAI message objects which are 'system' and 'user'.
 * The 'system' message is the system message set in the settings.
 * Trigger events when :
 * - The request is sent
 * - The response is received
 * - Receive a stream of data
 * - The stream is completed
 * - An error occurs
 * @param {String|Array} content - The content of the message to send. Can be a string or an array for multimodal messages.
 * @param {String} role - The role of the message. Default is 'user'.
 * @returns {Promise<String>} - A promise that resolves with the AI's response string.
 */
AIChannel.prototype.sendMessage = async function(content, role = 'user') {
    if ((typeof content !== 'string' || String(content).trim() === '') && !Array.isArray(content)) {
        const error = new Error('Message content must be a non-empty string or a content array.');
        this.trigger('error', { error, message: error.message, context: 'sendMessage_input_validation' });
        return Promise.reject(error);
    }
    if (Array.isArray(content) && content.length === 0) {
         const error = new Error('Message content array cannot be empty.');
        this.trigger('error', { error, message: error.message, context: 'sendMessage_input_validation_empty_array' });
        return Promise.reject(error);
    }


    const messages = [];
    if (this.settings.systemMessage && String(this.settings.systemMessage).trim() !== '') {
        messages.push({ role: 'system', content: this.settings.systemMessage });
    }
    messages.push({ role: role, content: content });

    return this.sendMessages(messages);
};



class ChatAssistant {
    constructor(options = {}) {
        this.localStorage = new BLS('chatAssistant');
        this.settings = {
            apiUrl: 'https://api.openai.com/v1/chat/completions',
            apiKey: '',
            model: 'gpt-3.5-turbo', // Default model
            systemMessage: "You are ChatGPT, a large language model trained by OpenAI.\nCarefully heed the user's instructions.\nRespond using Markdown.",
            temperature: 0.7,
            maxTokens: 4094,
            topP: 1,
            presencePenalty: 0,
            frequencyPenalty: 0,
            imageDetail: 'auto'
            // Note: 'stream' is not a user-configurable setting here, 
            // but AIChannel defaults to stream:false. We'll manage it per call if needed.
        };
        this.messages = []; // Format: { id: 'uuid', role: 'system' | 'user' | 'assistant', content: '...', collapsed: false, isStreaming: false }
        this.currentChatId = 'defaultChat'; // For potentially saving multiple chats later
        this.isLoading = false;

        // Initialize AIChannel with current settings
        this.aiChannel = new AIChannel({ settings: this.settings });


        // NW.js specific: make sure marked is loaded
        if (typeof marked === 'undefined' && typeof require !== 'undefined') {
            try {
                // This path might need adjustment depending on your NW.js setup if marked is local
                // For CDN, it should be globally available. This is a fallback.
                // global.marked = require('marked'); // If installed via npm
            } catch (e) {
                console.warn("Marked.js not found via require. Ensure it's loaded via CDN.");
            }
        }
         if (typeof DOMPurify === 'undefined' && typeof require !== 'undefined') {
            try {
                // global.DOMPurify = require('dompurify'); // If installed via npm
            } catch (e) {
                console.warn("DOMPurify.js not found via require. Ensure it's loaded via CDN.");
            }
        }

        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true, // Add <br> on single line breaks
                gfm: true,    // Enable GitHub Flavored Markdown
            });
        } else {
            console.error("marked.js is not loaded. Markdown rendering will not work.");
        }
         if (typeof DOMPurify === 'undefined') {
            console.error("DOMPurify is not loaded. Markdown sanitization will not work.");
        }
    }

    generateUUID() {
        return crypto.randomUUID();
    }

    async loadSettings() {
        const savedSettings = await this.localStorage.getItem('settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        // Update AIChannel's settings whenever ChatAssistant's settings are loaded
        this.aiChannel.settings = { ...this.settings };
        console.log("Settings loaded:", this.settings);
        // Apply to UI elements in init
    }

    async saveSettings() {
        await this.localStorage.setItem('settings', JSON.stringify(this.settings));
        // Update AIChannel's settings whenever ChatAssistant's settings are saved
        this.aiChannel.settings = { ...this.settings };
        this.updateParametersBar();
        // If system message changed and it's the first message, update it
        if (this.messages.length > 0 && this.messages[0].role === 'system') {
            this.messages[0].content = this.settings.systemMessage;
            this.renderChatMessages();
        } else if (this.messages.length === 0) { // Initialize with new system message if chat is empty
             this.addMessageToHistory('system', this.settings.systemMessage, null, false);
        }
    }

    async loadChatState() {
        const savedChat = await this.localStorage.getItem(this.currentChatId);
        if (savedChat) {
            this.messages = JSON.parse(savedChat);
        } else {
            // Initialize with a system message if no chat is loaded
            this.messages = [
                { id: this.generateUUID(), role: 'system', content: this.settings.systemMessage, collapsed: false }
            ];
        }
    }

    async saveChatState() {
        await this.localStorage.setItem(this.currentChatId, JSON.stringify(this.messages));
        $('#saveChatButton').removeClass('btn-danger').addClass('btn-secondary').text('Save');
        console.log("Chat state saved.");
    }

    async init() {
        await this.loadSettings(); // This will also update this.aiChannel.settings
        await this.loadChatState();

        this.populateSettingsModal();
        this.updateParametersBar();
        this.bindUIEvents();
        this.renderChatMessages();
        this.updateTokenCount();

        // Scroll to bottom
        const chatArea = document.getElementById('chatArea');
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    populateSettingsModal() {
        $('#apiUrlInput').val(this.settings.apiUrl);
        $('#apiKeyInput').val(this.settings.apiKey);
        $('#modelInput').val(this.settings.model);
        $('#systemMessageInput').val(this.settings.systemMessage);

        $('#maxTokensInput').val(this.settings.maxTokens);
        $('#maxTokensValue').text(this.settings.maxTokens);
        $('#temperatureInput').val(this.settings.temperature);
        $('#temperatureValue').text(this.settings.temperature);
        $('#topPInput').val(this.settings.topP);
        $('#topPValue').text(this.settings.topP);
        $('#presencePenaltyInput').val(this.settings.presencePenalty);
        $('#presencePenaltyValue').text(this.settings.presencePenalty);
        $('#frequencyPenaltyInput').val(this.settings.frequencyPenalty);
        $('#frequencyPenaltyValue').text(this.settings.frequencyPenalty);
        $('#imageDetailInput').val(this.settings.imageDetail);
    }

    updateParametersBar() {
        $('#paramModel').text(this.settings.model);
        $('#paramMaxToken').text(this.settings.maxTokens);
        $('#paramTemperature').text(this.settings.temperature);
        $('#paramTopP').text(this.settings.topP);
        $('#paramPresencePenalty').text(this.settings.presencePenalty);
        $('#paramFrequencyPenalty').text(this.settings.frequencyPenalty);
        $('#paramImageDetail').text(this.settings.imageDetail);
    }

    bindUIEvents() {
        const self = this; // For event handlers

        // Settings Modal
        $('#saveSettingsButton').on('click', () => {
            self.settings.apiUrl = $('#apiUrlInput').val();
            self.settings.apiKey = $('#apiKeyInput').val();
            self.settings.model = $('#modelInput').val();
            self.settings.systemMessage = $('#systemMessageInput').val();
            self.settings.maxTokens = parseInt($('#maxTokensInput').val());
            self.settings.temperature = parseFloat($('#temperatureInput').val());
            self.settings.topP = parseFloat($('#topPInput').val());
            self.settings.presencePenalty = parseFloat($('#presencePenaltyInput').val());
            self.settings.frequencyPenalty = parseFloat($('#frequencyPenaltyInput').val());
            self.settings.imageDetail = $('#imageDetailInput').val();
            self.saveSettings(); // This will also update self.aiChannel.settings
            var settingsModal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
            settingsModal.hide();
        });

        // Update slider values dynamically
        ['maxTokens', 'temperature', 'topP', 'presencePenalty', 'frequencyPenalty'].forEach(param => {
            $(`#${param}Input`).on('input', function() {
                $(`#${param}Value`).text($(this).val());
            });
        });

        // Generate Button
        $('#generateButton').on('click', () => self.handleSendMessage());
        $('#userInput').on('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                self.handleSendMessage();
            }
        });

        // Save Chat Button
        $('#saveChatButton').on('click', () => self.saveChatState());
        
        // New Chat Button
        $('#newChatButton').on('click', () => self.startNewChat());

        // Dynamic events for messages (delegated)
        $('#chatArea').on('click', '.edit-message', function() {
            const messageId = $(this).closest('.message-block').data('message-id');
            self.toggleEditState(messageId, true);
        });
        $('#chatArea').on('click', '.save-edit', function() {
            const messageBlock = $(this).closest('.message-block');
            const messageId = messageBlock.data('message-id');
            const newContent = messageBlock.find('.message-edit-area textarea').val();
            self.updateMessageContent(messageId, newContent);
            self.toggleEditState(messageId, false);
        });
        $('#chatArea').on('click', '.cancel-edit', function() {
            const messageId = $(this).closest('.message-block').data('message-id');
            self.toggleEditState(messageId, false); // Also re-renders original content
        });
        $('#chatArea').on('click', '.delete-message', function() {
            const messageId = $(this).closest('.message-block').data('message-id');
            if (confirm('Are you sure you want to delete this message?')) {
                self.deleteMessage(messageId);
            }
        });
        $('#chatArea').on('click', '.copy-message', function() {
            const messageBlock = $(this).closest('.message-block');
            const content = self.messages.find(m => m.id === messageBlock.data('message-id'))?.content;
            if (content) {
                navigator.clipboard.writeText(content).then(() => {
                    $(this).find('i').removeClass('bi-clipboard').addClass('bi-check-lg');
                    setTimeout(() => $(this).find('i').removeClass('bi-check-lg').addClass('bi-clipboard'), 1500);
                }).catch(err => console.error('Failed to copy: ', err));
            }
        });
        $('#chatArea').on('click', '.toggle-expand', function() {
            const messageBlock = $(this).closest('.message-block');
            const messageId = messageBlock.data('message-id');
            const message = self.messages.find(m => m.id === messageId);
            if (message) {
                message.collapsed = !message.collapsed;
                messageBlock.find('.message-content-wrapper').toggle(!message.collapsed);
                $(this).find('i').toggleClass('bi-chevron-down bi-chevron-up');
                self.markChatAsUnsaved();
            }
        });
        $('#chatArea').on('click', '.add-message-btn', function(event) { // Added event parameter
            const afterMessageId = $(this).data('after-message-id');
            // Pass the event to know which button was clicked if multiple add buttons exist
            self.insertNewMessageUI(afterMessageId, event); 
        });
         $('#chatArea').on('change', '.role-selector', function() {
            const messageId = $(this).closest('.message-block').data('message-id');
            const newRole = $(this).val();
            self.updateMessageRole(messageId, newRole);
        });
    }
    
    markChatAsUnsaved() {
        $('#saveChatButton').addClass('btn-danger').removeClass('btn-secondary').text('Save*');
    }

    startNewChat() {
        if (confirm('Are you sure you want to start a new chat? Unsaved changes will be lost unless saved.')) {
            this.messages = [
                { id: this.generateUUID(), role: 'system', content: this.settings.systemMessage, collapsed: false }
            ];
            this.renderChatMessages();
            this.saveChatState(); // Save the new empty state
            $('#userInput').val('');
            this.updateTokenCount();
        }
    }

    addMessageToHistory(role, content, id = null, isStreaming = false) {
        const messageId = id || this.generateUUID();
        const message = { id: messageId, role, content, collapsed: false, isStreaming };
        this.messages.push(message);
        this.markChatAsUnsaved();
        return messageId;
    }
    
    updateMessageRole(messageId, newRole) {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            message.role = newRole;
            this.renderChatMessages(); // Re-render to update icon and selector
            this.markChatAsUnsaved();
        }
    }

    renderChatMessages() {
        const chatArea = $('#chatArea');
        chatArea.empty();

        this.messages.forEach((msg, index) => {
            chatArea.append(this.createMessageDividerHTML(msg.id, index === 0)); // Add divider before message
            chatArea.append(this.createMessageHTML(msg));
        });
        // Add a final divider for adding message at the end
        chatArea.append(this.createMessageDividerHTML(null, this.messages.length === 0 && this.messages.filter(m => m.role !== 'system').length === 0));


        // Scroll to bottom
        chatArea.scrollTop(chatArea[0].scrollHeight);
        this.updateTokenCount();
    }

    createMessageHTML(message) {
        const iconClass = message.role === 'system' ? 'bi-gear-fill' : (message.role === 'user' ? 'bi-person-fill' : 'bi-robot');
        const roleText = message.role.charAt(0).toUpperCase() + message.role.slice(1);
        
        let safeContent = '';
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            safeContent = DOMPurify.sanitize(marked.parse(message.content || ''));
        } else if (typeof marked !== 'undefined') {
            safeContent = marked.parse(message.content || ''); // Less safe without DOMPurify
        } else {
            // Correct basic escaping
            safeContent = (message.content || '').replace(/</g, "<").replace(/>/g, ">");
        }


        const isUserOrSystem = message.role === 'user' || message.role === 'system';
        const roleSelectorOptions = ['system', 'user', 'assistant'].map(r =>
            `<option value="${r}" ${message.role === r ? 'selected' : ''}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`
        ).join('');

        const messageHtml = `
            <div class="message-block" data-message-role="${message.role}" data-message-id="${message.id}">
                <div class="message-header">
                    <i class="bi ${iconClass} me-2"></i>
                    ${isUserOrSystem ? `<select class="role-selector form-select form-select-sm w-auto me-2">${roleSelectorOptions}</select>` : `<span class="role-label">${roleText}</span>`}
                    <div class="message-toolbar">
                        <button class="btn btn-sm btn-icon toggle-expand" title="Toggle content"><i class="bi ${message.collapsed ? 'bi-chevron-up' : 'bi-chevron-down'}"></i></button>
                        <button class="btn btn-sm btn-icon copy-message" title="Copy content"><i class="bi bi-clipboard"></i></button>
                        ${message.role !== 'assistant' || !message.isStreaming ? `<button class="btn btn-sm btn-icon edit-message" title="Edit message"><i class="bi bi-pencil-square"></i></button>` : ''}
                        <button class="btn btn-sm btn-icon delete-message" title="Delete message"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
                <div class="message-content-wrapper" style="${message.collapsed ? 'display:none;' : ''}">
                    <div class="message-content markdown-body">
                        ${message.isStreaming ? (safeContent + ' <span class="streaming-cursor">▍</span>') : safeContent}
                    </div>
                    <div class="message-edit-area" style="display: none;">
                        <textarea class="form-control mb-2">${message.content}</textarea>
                        <button class="btn btn-sm btn-success save-edit me-2">Save</button>
                        <button class="btn btn-sm btn-secondary cancel-edit">Cancel</button>
                    </div>
                </div>
            </div>`;
        return messageHtml;
    }

    createMessageDividerHTML(afterMessageId, isFirst = false) {
        let dataAttr = '';
        if (isFirst && !afterMessageId) { 
            dataAttr = `data-insert-before-idx="0"`;
        } else if (afterMessageId) {
             dataAttr = `data-after-message-id="${afterMessageId}"`;
        } else { 
             dataAttr = `data-add-at-end="true"`;
        }

        return `
            <div class="message-add-divider">
                <button class="btn btn-sm add-message-btn" ${dataAttr} title="Add new message here">
                    <i class="bi bi-plus-lg"></i>
                </button>
            </div>`;
    }
    
    insertNewMessageUI(afterMessageId, event) { // Added event parameter
        const role = prompt("Enter role for new message (system, user, assistant):", "user");
        if (!role || !['system', 'user', 'assistant'].includes(role.toLowerCase())) {
            alert("Invalid role.");
            return;
        }
        const content = prompt("Enter content for the new message:");
        if (content === null) return; 

        const newMessage = {
            id: this.generateUUID(),
            role: role.toLowerCase(),
            content: content,
            collapsed: false
        };

        let insertAtIndex = -1;
        const clickedButton = event ? $(event.currentTarget) : null; // Get the button that was clicked

        if (clickedButton && clickedButton.data('insert-before-idx') !== undefined) {
            insertAtIndex = parseInt(clickedButton.data('insert-before-idx'));
        } else if (clickedButton && clickedButton.data('add-at-end') === true) {
            insertAtIndex = this.messages.length;
        } else if (afterMessageId) {
            insertAtIndex = this.messages.findIndex(m => m.id === afterMessageId) + 1;
        } else { // Default to end if no specific button info and no afterMessageId
             insertAtIndex = this.messages.length;
        }
        
        if (insertAtIndex !== -1) {
             this.messages.splice(insertAtIndex, 0, newMessage);
             this.renderChatMessages();
             this.markChatAsUnsaved();
        }
    }


    toggleEditState(messageId, isEditing) {
        const messageBlock = $(`.message-block[data-message-id="${messageId}"]`);
        const contentDiv = messageBlock.find('.message-content');
        const editArea = messageBlock.find('.message-edit-area');
        const editTextArea = editArea.find('textarea');

        if (isEditing) {
            const message = this.messages.find(m => m.id === messageId);
            editTextArea.val(message.content); 
            contentDiv.hide();
            editArea.show();
            editTextArea.focus();
        } else {
            contentDiv.show();
            editArea.hide();
            const message = this.messages.find(m => m.id === messageId);
            if (message) {
                let safeContent = '';
                 if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                    safeContent = DOMPurify.sanitize(marked.parse(message.content || ''));
                } else if (typeof marked !== 'undefined') {
                    safeContent = marked.parse(message.content || '');
                } else {
                    safeContent = (message.content || '').replace(/</g, "<").replace(/>/g, ">");
                }
                contentDiv.html(safeContent);
            }
        }
    }

    updateMessageContent(messageId, newContent) {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            message.content = newContent;
            this.markChatAsUnsaved();
            const messageBlock = $(`.message-block[data-message-id="${messageId}"]`);
            let safeContent = '';
            if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                safeContent = DOMPurify.sanitize(marked.parse(newContent || ''));
            } else if (typeof marked !== 'undefined') {
                safeContent = marked.parse(newContent || '');
            } else {
                safeContent = (newContent || '').replace(/</g, "<").replace(/>/g, ">");
            }
            messageBlock.find('.message-content').html(safeContent);
        }
        this.updateTokenCount();
    }

    deleteMessage(messageId) {
        this.messages = this.messages.filter(m => m.id !== messageId);
        this.renderChatMessages();
        this.markChatAsUnsaved();
    }

    async handleSendMessage() {
        if (this.isLoading) return;

        const userInput = $('#userInput').val().trim();
        if (!userInput) return;

        this.addMessageToHistory('user', userInput);
        // renderChatMessages will be called after adding assistant shell
        
        $('#userInput').val(''); // Clear input
        
        const assistantMessageId = this.addMessageToHistory('assistant', '', null, true);
        this.renderChatMessages(); // Show user message & empty assistant message with streaming indicator
        
        const chatArea = $('#chatArea');
        // Scroll to bottom after rendering new messages
        chatArea.scrollTop(chatArea[0].scrollHeight);


        this.isLoading = true;
        $('#generateButton').prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...');

        // Store original stream setting for AIChannel and force it to true for this operation
        const originalAICStreamSetting = this.aiChannel.settings.stream;
        this.aiChannel.settings.stream = true;

        let assistantContentAccumulator = ''; 

        this.aiChannel.on('streamData', (event, data) => {
            if (data.chunk) {
                assistantContentAccumulator += data.chunk;
                const streamingMsg = this.messages.find(m => m.id === assistantMessageId);
                if (streamingMsg) { 
                    streamingMsg.content = assistantContentAccumulator; 
                    
                    const messageBlock = $(`.message-block[data-message-id="${assistantMessageId}"]`);
                    const contentDiv = messageBlock.find('.message-content');
                    if (contentDiv.length) {
                        let streamingSafeHTML = '';
                        const contentWithCursor = assistantContentAccumulator + ' <span class="streaming-cursor">▍</span>';
                        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                            streamingSafeHTML = DOMPurify.sanitize(marked.parse(contentWithCursor));
                        } else if (typeof marked !== 'undefined') {
                            streamingSafeHTML = marked.parse(contentWithCursor);
                        } else {
                            streamingSafeHTML = contentWithCursor.replace(/</g, "<").replace(/>/g, ">");
                        }
                        contentDiv.html(streamingSafeHTML);
                    }
                }
                chatArea.scrollTop(chatArea[0].scrollHeight); // Auto-scroll
            }
        });
        
        const payloadMessages = this.messages
            .filter(m => m.id !== assistantMessageId) // Exclude the temporary assistant message shell
            .map(m => ({ role: m.role, content: m.content }));

        try {
            const finalContent = await this.aiChannel.sendMessages(payloadMessages);

            const finalAssistantMsg = this.messages.find(m => m.id === assistantMessageId);
            if (finalAssistantMsg) {
                finalAssistantMsg.content = finalContent; 
                finalAssistantMsg.isStreaming = false;
            }
            this.markChatAsUnsaved();

        } catch (error) {
            console.error('Error sending message via AIChannel or processing stream:', error);
            let errorMessage = "An unexpected error occurred.";
            if (error instanceof Error) { 
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }

            const failedAssistantMsg = this.messages.find(m => m.id === assistantMessageId);
            if (failedAssistantMsg) {
                failedAssistantMsg.content = `Error: ${errorMessage}`;
                failedAssistantMsg.isStreaming = false;
            }
            this.markChatAsUnsaved();
        } finally {
            this.isLoading = false;
            $('#generateButton').prop('disabled', false).text('Generate');
            
            this.aiChannel.off('streamData'); 
            this.aiChannel.settings.stream = originalAICStreamSetting; // Restore AIChannel's original stream setting

            this.renderChatMessages(); // Final render to show complete message or error, and remove cursor
            this.updateTokenCount();
            this.saveChatState(); 
        }
    }

    updateTokenCount() {
        // Simple character count as a proxy for tokens. Real token counting is complex.
        const totalChars = this.messages.reduce((sum, msg) => sum + (msg.content ? msg.content.length : 0), 0);
        $('#tokenCount').text(`${totalChars} chars (approx)`);
        // Cost calculation is omitted as it requires precise tokenization and model costs.
    }
}

// Initialize the chat assistant when the document is ready
$(document).ready(function() {
    window.chatAssistant = new ChatAssistant();
    window.chatAssistant.init();
});