const EngineDetectionRegistry = (function() {
    const pathModule = typeof nwPath !== "undefined" ? nwPath : require("path");

    const normalizeConfidence = function(value) {
        const confidence = Number(value);
        if (!Number.isFinite(confidence)) return 0;
        return Math.max(0, Math.min(1, confidence));
    };

    const normalizeMatches = function(result) {
        if (Array.isArray(result)) return result;
        if (Array.isArray(result?.matches)) return result.matches;
        return [];
    };

    class Registry {
        constructor() {
            this.definitions = new Map();
        }

        register(definition) {
            if (!definition || typeof definition !== "object") {
                throw new TypeError("Engine detector definition must be an object.");
            }
            if (!definition.id || typeof definition.id !== "string") {
                throw new TypeError("Engine detector definition must have an id.");
            }
            if (typeof definition.detect !== "function") {
                throw new TypeError(`Engine detector '${definition.id}' must provide detect().`);
            }
            if (this.definitions.has(definition.id)) {
                throw new Error(`Engine detector '${definition.id}' is already registered.`);
            }

            this.definitions.set(definition.id, definition);
            return definition;
        }

        unregister(id) {
            return this.definitions.delete(id);
        }

        list() {
            return Array.from(this.definitions.values());
        }

        createLaunchContext(candidate, request = {}) {
            const selectedPath = request.entryPoint || request.selectedPath || "";
            const selectedDirectory = selectedPath ? pathModule.dirname(selectedPath) : "";
            const entryPoint = candidate.entryPoint || selectedPath;
            const gameRoot = candidate.gameRoot || selectedDirectory;

            return Object.freeze({
                selectedPath,
                selectedDirectory,
                entryPoint,
                gameRoot,
                engineId: candidate.engineId,
                detectorId: candidate.detectorId,
                preferredInput: candidate.preferredInput || "entryPoint",
                evidence: candidate.evidence.slice()
            });
        }

        setFieldValue($field, value) {
            if (!$field?.length) return $field;

            $field.val(value).trigger("input").trigger("change");
            return $field;
        }

        async detect(request = {}) {
            const candidatesByKey = new Map();
            const diagnostics = [];
            const definitions = this.list();

            for (const definition of definitions) {
                if (request.signal?.aborted) break;

                try {
                    const result = await definition.detect({
                        ...request,
                        detectorId: definition.id
                    });

                    for (const match of normalizeMatches(result)) {
                        if (!match || !match.engineId) continue;

                        const candidate = {
                            detectorId: definition.id,
                            addonId: definition.addonId || "",
                            engineId: match.engineId,
                            displayName: match.displayName || definition.displayName || match.engineId,
                            confidence: normalizeConfidence(match.confidence),
                            evidence: Array.isArray(match.evidence) ? match.evidence.filter(Boolean) : [],
                            entryPoint: match.entryPoint || request.entryPoint || request.selectedPath || "",
                            gameRoot: match.gameRoot || "",
                            preferredInput: match.preferredInput || "entryPoint",
                            requirements: Array.isArray(match.requirements) ? match.requirements : [],
                            canOpenProjectWizard: typeof definition.openProjectWizard === "function",
                            openProjectWizard: definition.openProjectWizard,
                            priority: Number(definition.priority) || 0
                        };

                        const key = `${candidate.addonId}:${candidate.engineId}`;
                        const existing = candidatesByKey.get(key);
                        if (!existing || candidate.confidence > existing.confidence) {
                            candidatesByKey.set(key, candidate);
                        }
                    }
                } catch (error) {
                    diagnostics.push({
                        detectorId: definition.id,
                        error
                    });
                    console.warn(`Engine detector '${definition.id}' failed.`, error);
                }
            }

            const candidates = Array.from(candidatesByKey.values()).sort((left, right) => {
                if (right.confidence !== left.confidence) return right.confidence - left.confidence;
                if (right.priority !== left.priority) return right.priority - left.priority;
                return left.displayName.localeCompare(right.displayName);
            });

            return { candidates, diagnostics, cancelled: !!request.signal?.aborted };
        }
    }

    return Registry;
})();

if (typeof window !== "undefined") {
    window.EngineDetectionRegistry = EngineDetectionRegistry;
}

const thisAddon = this;
if (thisAddon?.package) {
    thisAddon.engineDetectionRegistry = new EngineDetectionRegistry();
    window.engineDetectionRegistry = thisAddon.engineDetectionRegistry;
}

if (typeof module !== "undefined") {
    module.exports = EngineDetectionRegistry;
}