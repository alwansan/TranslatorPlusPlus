class ModelSelector {
    constructor(options = {}) {
        this.options = options || {};
        this.modelsJsonPath = this.options.modelsJsonPath || '/www/addons/basicUtils/ai/models.json';
        this.itemsPerPage = this.options.itemsPerPage || 9; // e.g., 3 cols * 3 rows

        // NW.js specific
        this.nwWindow = nw.Window.get();

        // State
        this.allModels = [];
        this.filteredModels = [];
        this.currentPage = 1;
        this.currentSelectedModelIdForModal = null;
        this.prefixFilter = null; // Store prefix filter from query param
        this.isLoadingMore = false; // Prevent multiple simultaneous loads

        // DOM Elements (jQuery objects)
        this.$modelList = $('#modelList');
        this.$searchInput = $('#searchInput');
        this.$clearSearchBtn = $('#clearSearchBtn');
        this.$loadMoreBtn = $('#loadMoreBtn');
        this.$loadingIndicator = $('#loadingIndicator');
        this.$prefixFilterStatus = $('#prefixFilterStatus');
        this.$prefixFilterValue = $('#prefixFilterValue');

        // Modal related
        this.modelDetailModalElement = document.getElementById('modelDetailModal');
        this.modelDetailModalInstance = null; // Will be initialized in init
        this.$modalModelName = $('#modalModelName');
        this.$modalModelId = $('#modalModelId');
        this.$modalModelDescription = $('#modalModelDescription');
        this.$modalModelContextLength = $('#modalModelContextLength');
        this.$modalModelPricing = $('#modalModelPricing');
        this.$modalModelArchitecture = $('#modalModelArchitecture');
        this.$modalModelCreated = $('#modalModelCreated');
        this.$selectModelFromModalBtn = $('#selectModelFromModalBtn');
    }

    async init() {
        if (this.modelDetailModalElement) {
            this.modelDetailModalInstance = new bootstrap.Modal(this.modelDetailModalElement);
        } else {
            console.error("Model detail modal element not found!");
        }
        
        // Process GET query parameters
        this._processQueryParameters();
        
        this._attachEventListeners();
        await this._loadModels();
    }

    _getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    _processQueryParameters() {
        // Handle search parameter
        const searchParam = this._getQueryParam('search');
        if (searchParam) {
            this.$searchInput.val(searchParam);
            console.log('Applied search parameter:', searchParam);
        }
        
        // Handle prefix parameter
        const prefixParam = this._getQueryParam('prefix');
        if (prefixParam) {
            this.prefixFilter = prefixParam;
            this.$prefixFilterValue.text(prefixParam);
            this.$prefixFilterStatus.removeClass('d-none');
            console.log('Applied prefix filter:', prefixParam);
        }
    }

    _debounce(func, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    async _loadModels() {
        this.$loadingIndicator.removeClass('d-none');
        try {
            const response = await fetch(this.modelsJsonPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} when fetching ${this.modelsJsonPath}`);
            }
            const data = await response.json();
            this.allModels = data.data || [];
            console.log(`Loaded ${this.allModels.length} models.`);
            this._filterAndRenderModels();
        } catch (error) {
            console.error("Error loading models.json:", error);
            this.$modelList.html('<div class="col"><p class="text-danger">Error loading models. Please check console.</p></div>');
        } finally {
            this.$loadingIndicator.addClass('d-none');
        }
    }

    _renderModels(append = false) {
        if (!append) {
            this.$modelList.empty();
            this.currentPage = 1;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const modelsToRender = this.filteredModels.slice(startIndex, endIndex);

        if (modelsToRender.length === 0 && this.currentPage === 1 && !append) {
            this.$modelList.html('<div class="col"><p>No models found matching your criteria.</p></div>');
        }

        modelsToRender.forEach(model => {
            const cardHtml = `
                <div class="col">
                    <div class="card h-100 model-card shadow-sm">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${model.name || 'N/A'}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">${model.id || 'N/A'}</h6>
                            <p class="card-text flex-grow-1">${model.description ? model.description.substring(0, 100) + (model.description.length > 100 ? '...' : '') : 'No description available.'}</p>
                            <div class="mt-auto">
                                <button class="btn btn-sm btn-outline-info btn-details" data-model-id="${model.id}">View Details</button>
                                <button class="btn btn-sm btn-primary btn-select-quick ms-2" data-model-id="${model.id}">Select</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            this.$modelList.append(cardHtml);
        });

        if (endIndex < this.filteredModels.length) {
            this.$loadMoreBtn.removeClass('d-none');
        } else {
            this.$loadMoreBtn.addClass('d-none');
        }
    }

    _filterAndRenderModels() {
        const searchTerm = this.$searchInput.val().toLowerCase().trim();
        
        // Start with all models
        let filtered = [...this.allModels];
        
        // Apply prefix filter first if set
        if (this.prefixFilter) {
            const prefix = this.prefixFilter.toLowerCase();
            filtered = filtered.filter(model =>
                (model.id && model.id.toLowerCase().startsWith(prefix))
            );
        }
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(model =>
                (model.name && model.name.toLowerCase().includes(searchTerm)) ||
                (model.id && model.id.toLowerCase().includes(searchTerm)) ||
                (model.description && model.description.toLowerCase().includes(searchTerm))
            );
        }
        
        this.filteredModels = filtered;
        this._renderModels(false); // Reset and render from the first page
    }

    _attachEventListeners() {
        this.$searchInput.on('input', this._debounce(this._handleSearchInput.bind(this), 300));
        this.$clearSearchBtn.on('click', this._handleClearSearch.bind(this));
        this.$loadMoreBtn.on('click', this._handleLoadMore.bind(this));

        // Use event delegation for dynamically added card buttons
        this.$modelList.on('click', '.btn-details', this._handleViewDetails.bind(this));
        this.$modelList.on('click', '.btn-select-quick', this._handleQuickSelect.bind(this));

        this.$selectModelFromModalBtn.on('click', this._handleSelectFromModal.bind(this));
        
        // Add scroll event listener for infinite scroll
        $(window).on('scroll', this._debounce(this._handleScroll.bind(this), 100));
    }

    _handleSearchInput() {
        this._filterAndRenderModels();
    }

    _handleClearSearch() {
        this.$searchInput.val('').trigger('input');
    }

    _handleLoadMore() {
        if (this.isLoadingMore) return;
        this.isLoadingMore = true;
        this.currentPage++;
        this._renderModels(true); // Append new models
        this.isLoadingMore = false;
    }

    _handleScroll() {
        // Check if user has scrolled to near bottom (within 200px)
        const scrollPosition = $(window).scrollTop() + $(window).height();
        const documentHeight = $(document).height();
        
        if (scrollPosition >= documentHeight - 200) {
            // Check if there are more items to load
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            
            if (endIndex < this.filteredModels.length && !this.isLoadingMore) {
                this._handleLoadMore();
            }
        }
    }

    _handleViewDetails(event) {
        const modelId = $(event.currentTarget).data('model-id');
        const model = this.allModels.find(m => m.id === modelId);
        if (model) {
            this.currentSelectedModelIdForModal = model.id;
            this._populateModal(model);
            if (this.modelDetailModalInstance) {
                this.modelDetailModalInstance.show();
            }
        }
    }

    _populateModal(model) {
        this.$modalModelName.text(model.name || 'N/A');
        this.$modalModelId.text(model.id || 'N/A');
        this.$modalModelDescription.text(model.description || 'No description.');
        this.$modalModelContextLength.text(model.context_length || 'N/A');
        this.$modalModelPricing.text(model.pricing ? JSON.stringify(model.pricing, null, 2) : 'N/A');
        this.$modalModelArchitecture.text(model.architecture ? JSON.stringify(model.architecture, null, 2) : 'N/A');
        const createdDate = model.created ? new Date(model.created * 1000).toLocaleDateString() : 'N/A';
        this.$modalModelCreated.text(createdDate);
    }

    _handleQuickSelect(event) {
        const modelId = $(event.currentTarget).data('model-id');
        this._selectModelAndCallback(modelId);
    }

    _handleSelectFromModal() {
        if (this.currentSelectedModelIdForModal) {
            this._selectModelAndCallback(this.currentSelectedModelIdForModal);
            if (this.modelDetailModalInstance) {
                this.modelDetailModalInstance.hide();
            }
        }
    }

    _selectModelAndCallback(modelId) {
        const model = this.allModels.find(m => m.id === modelId);
        if (model) {
            console.log("Selected model:", model);
            if (typeof window.callback === 'function') {
                try {
                    // Pass the model object and the current NW.js window instance
                    window.callback(model, this.nwWindow);
                } catch (e) {
                    console.error("Error executing callback:", e);
                    alert("Error in callback. Check main app console.");
                }
            } else {
                console.warn("Callback function (window.callback) not found on this window. The opener should set it.");
                alert("Model selected, but no callback found to notify the main application.");
                // Optionally, still close the window if no callback is found
                // this.nwWindow.close();
            }
        } else {
            console.warn(`Model with ID ${modelId} not found for selection.`);
        }
    }
}

// This part remains similar, but now initializes and uses the class
$(document).ready(function() {
    // Optional: pass configurations to the constructor
    const modelSelectorInstance = new ModelSelector({
        // itemsPerPage: 12, // example override
        // modelsJsonPath: './custom/path/to/models.json' // example override
    });

    modelSelectorInstance.init().catch(err => {
        console.error("Failed to initialize ModelSelector:", err);
        // Display a user-friendly error message in the UI if necessary
        $('#modelListContainer').html('<div class="alert alert-danger" role="alert">Failed to initialize the model selector. Please try again later.</div>');
    });

    // Expose the instance to the window object if needed for debugging or external calls
    window.modelSelector = modelSelectorInstance;
});