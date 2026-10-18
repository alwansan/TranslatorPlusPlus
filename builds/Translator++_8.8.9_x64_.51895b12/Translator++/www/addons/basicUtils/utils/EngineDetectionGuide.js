const thisAddon = this;

const initializeEngineDetectionGuide = function() {
    const registry = thisAddon.engineDetectionRegistry;
    if (!registry || !ui?.newProjectDialog) return;

    const state = {
        candidates: [],
        selectedPath: ""
    };

    const $entrySlide = $(
        `<div class="engineDetectionEntry">
            <h1><i class="icon-help-circled-1"></i><span>${t("Identify game engine")}</span></h1>
            <div class="blockBox infoBlock withIcon">
                <p>${t("Select the executable or entry point used to start the game. Translator++ will inspect the surrounding files without running the game.")}</p>
            </div>
            <div class="fieldgroup">
                <h2>${t("Game entry point")}</h2>
                <input type="file" class="engineDetectionFile fullWidth" accept=".exe,.html" />
                <div class="engineDetectionPath smallInfo"></div>
            </div>
            <div class="engineDetectionError alert alert-warning hidden"></div>
        </div>`
    );
    const $resultSlide = $(
        `<div class="engineDetectionResult">
            <h1><i class="icon-search"></i><span>${t("Detected project type")}</span></h1>
            <div class="engineDetectionSummary"></div>
            <div class="engineDetectionCandidates"></div>
        </div>`
    );

    const selectedPathFromInput = function(input) {
        return input.files?.[0]?.path || input.value || "";
    };

    const showEntryError = function(message = "") {
        const $error = $entrySlide.find(".engineDetectionError");
        $error.text(message);
        $error.toggleClass("hidden", !message);
    };

    const openProjectWizard = async function(candidate) {
        if (!candidate?.canOpenProjectWizard) return;

        const launchContext = registry.createLaunchContext(candidate, {
            entryPoint: state.selectedPath
        });
        try {
            await candidate.openProjectWizard(candidate, launchContext);
        } catch (error) {
            console.warn(`Unable to open project wizard for '${candidate.engineId}'.`, error);
            alert(t("Unable to open the selected project setup wizard."));
        }
    };

    const renderResults = function(result) {
        const $summary = $resultSlide.find(".engineDetectionSummary").empty();
        const $candidates = $resultSlide.find(".engineDetectionCandidates").empty();
        state.candidates = result.candidates;

        if (!result.candidates.length) {
            $summary.append($("<div class='blockBox warningBlock withIcon'></div>").text(t("Translator++ could not identify a supported game engine from this entry point.")));
            return;
        }

        $summary.append($("<p></p>").text(t("Choose the detected project type to continue with its existing setup wizard.")));
        result.candidates.forEach(function(candidate) {
            const $option = $("<button type='button' class='engineDetectionCandidate'></button>")
                .prop("disabled", !candidate.canOpenProjectWizard);
            const $content = $("<span class='engineDetectionCandidateContent'></span>");
            const confidence = Math.round(candidate.confidence * 100);

            $content.append($("<h2></h2>").text(candidate.displayName));
            $content.append($("<p></p>").text(`${t("Confidence")}: ${confidence}%`));
            candidate.evidence.forEach(function(evidence) {
                $content.append($("<div class='smallInfo'></div>").text(evidence));
            });
            if (!candidate.canOpenProjectWizard) {
                $content.append($("<div class='smallInfo'></div>").text(t("This parser cannot open a project setup wizard.")));
            }

            $option.on("click", function() {
                openProjectWizard(candidate);
            });
            $option.append($content);
            $candidates.append($option);
        });
    };

    const analyze = async function() {
        const entryPoint = state.selectedPath;
        if (!entryPoint) {
            showEntryError(t("Select a game executable or entry point first."));
            return;
        }

        showEntryError();
        ui.showBusyOverlay();
        try {
            const result = await registry.detect({ entryPoint });
            renderResults(result);
            ui.newProjectDialog.gotoSlide("engineDetectResult", "engineDetectEntry");
        } catch (error) {
            console.warn("Game engine detection failed.", error);
            showEntryError(t("Translator++ could not analyze this entry point."));
        } finally {
            ui.hideBusyOverlay();
        }
    };

    $entrySlide.on("change", ".engineDetectionFile", function() {
        state.selectedPath = selectedPathFromInput(this);
        $entrySlide.find(".engineDetectionPath").text(state.selectedPath);
        showEntryError();
    });

    ui.newProjectDialog.newSlide("engineDetectEntry", $entrySlide, {
        buttons: [{
            text: t("Analyze"),
            icon: "ui-icon-search",
            click: analyze
        }],
        onActive: function() {
            $entrySlide.find(".engineDetectionFile").val("");
            $entrySlide.find(".engineDetectionPath").text(state.selectedPath);
            showEntryError();
        }
    });
    ui.newProjectDialog.newSlide("engineDetectResult", $resultSlide, {
        buttons: []
    });

    const $searchWrapper = $("#dialogNewProject .searchProjectType").closest(".p-1");
    if (!$searchWrapper.length || $searchWrapper.find(".engineDetectionLaunch").length) return;

    const $launch = $(
        `<div class="engineDetectionLaunch">
            <button type="button" class="menu-button" title="${t("Help me identify the engine of my game")}">
                <i class="icon-help-circled-1"></i>
                <span>${t("Identify game engine")}</span>
            </button>
        </div>`
    );
    $launch.on("click", "button", function() {
        ui.newProjectDialog.gotoSlide("engineDetectEntry", "1");
    });
    $searchWrapper
        .addClass("engineDetectionSearchRow")
        .find(".searchProjectType")
        .removeClass("fullWidth");
    $searchWrapper.append($launch);
};

ui.onReady(initializeEngineDetectionGuide);