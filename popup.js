document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let state = {
        isRecording: false,
        steps: [],
        isExporting: false,
    };

    // --- DOM ELEMENTS ---
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const exportBtn = document.getElementById('export-btn');
    const exportMenu = document.getElementById('export-menu');
    const stepsContainer = document.getElementById('steps-container');
    const notificationEl = document.getElementById('notification');

    // --- ICONS (as strings) ---
    const recordIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12c0 5.523-4.477 10-10 10S1 17.523 1 12 5.477 2 11 2s10 4.477 10 10z" /></svg>`;
    const exportIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>`;
    const chevronDownSVG = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`;
    const spinnerSVG = `<svg class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;

    // --- RENDER FUNCTIONS ---
    const renderSteps = () => {
        stepsContainer.innerHTML = ''; // Clear previous steps
        if (state.steps.length === 0) {
            stepsContainer.innerHTML = `
                <div class="steps-placeholder">
                    <svg class="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <p class="placeholder-text-main">Your recorded steps will appear here.</p>
                    <p class="placeholder-text-sub">Start recording and interact with any website to begin.</p>
                </div>`;
            return;
        }

        const listContainer = document.createElement('div');
        listContainer.className = 'steps-list-container';
        state.steps.forEach((step, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'step-item';
            stepEl.innerHTML = `
                <p class="step-description">Step ${index + 1}: <span class="step-description-text">${escapeHTML(step.description)}</span></p>
                <details>
                    <summary class="screenshot-summary">View Screenshot</summary>
                    <img src="${step.screenshot}" alt="Screenshot for step ${index + 1}" class="screenshot-image"/>
                </details>
            `;
            listContainer.appendChild(stepEl);
        });
        stepsContainer.appendChild(listContainer);
    };

    const updateUI = () => {
        // Update buttons based on recording state
        startBtn.style.display = state.isRecording ? 'none' : 'flex';
        stopBtn.style.display = state.isRecording ? 'flex' : 'none';
        
        // Update export button state
        exportBtn.disabled = state.isRecording || state.isExporting || state.steps.length === 0;

        if (state.isExporting) {
            exportBtn.innerHTML = `${spinnerSVG} Exporting...`;
        } else {
            exportBtn.innerHTML = `${exportIconSVG} Export ${chevronDownSVG}`;
        }

        renderSteps();
    };
    
    // --- NOTIFICATIONS ---
    let notificationTimer;
    const showNotification = (message) => {
        clearTimeout(notificationTimer);
        notificationEl.textContent = message;
        notificationEl.style.display = 'block';
        notificationTimer = setTimeout(() => {
            notificationEl.style.display = 'none';
        }, 3000);
    };

    // --- EVENT HANDLERS ---
    startBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "START_RECORDING" });
        state.isRecording = true;
        state.steps = [];
        updateUI();
        showNotification("Recording started!");
    });

    stopBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "STOP_RECORDING" });
        state.isRecording = false;
        updateUI();
        showNotification("Recording stopped.");
    });

    exportBtn.addEventListener('click', (e) => {
        if (!state.isExporting) {
            exportMenu.style.display = exportMenu.style.display === 'block' ? 'none' : 'block';
        }
    });

    exportMenu.addEventListener('click', async (e) => {
        if (e.target.matches('.dropdown-item')) {
            e.preventDefault();
            const format = e.target.dataset.format;
            exportMenu.style.display = 'none';
            
            if (state.steps.length === 0) {
                showNotification("No steps to export.");
                return;
            }

            state.isExporting = true;
            updateUI();
            showNotification(`Generating ${format.toUpperCase()} document...`);

            try {
                switch (format) {
                    case 'docx': await exportToDocx(state.steps); break;
                    case 'pdf': await exportToPdf(state.steps); break;
                    case 'md': await exportToMarkdown(state.steps); break;
                    default: throw new Error("Unsupported format");
                }
                showNotification("Export successful!");
            } catch (error) {
                console.error(`Failed to export to ${format.toUpperCase()}:`, error);
                showNotification(`Error: ${error.message}`);
            } finally {
                state.isExporting = false;
                updateUI();
            }
        }
    });

    // Close dropdown if clicking outside
    document.addEventListener('click', (e) => {
        if (!exportBtn.contains(e.target) && !exportMenu.contains(e.target)) {
            exportMenu.style.display = 'none';
        }
    });

    // --- CHROME RUNTIME ---
    chrome.runtime.onMessage.addListener((request) => {
        if (request.type === "STEPS_UPDATED") {
            state.steps = request.payload.steps;
            updateUI();
        }
    });

    // --- INITIALIZATION ---
    const init = () => {
        // Insert SVG icons into buttons
        startBtn.innerHTML = recordIconSVG + startBtn.textContent.trim();
        stopBtn.innerHTML = recordIconSVG + stopBtn.textContent.trim();
        // The export button content is handled by updateUI
        
        // Get initial state from background script
        chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }
            if (response) {
                state.isRecording = response.isRecording;
                state.steps = response.steps || [];
                updateUI();
            }
        });
    };

    // --- UTILS ---
    function escapeHTML(str) {
        const p = document.createElement("p");
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    init();
});