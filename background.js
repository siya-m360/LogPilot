const dataUrlToBlob = async (dataUrl) => {
    const response = await fetch(dataUrl);
    return response.blob();
};

const blobToDataUrl = async (blob) => {
    const buffer = await blob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        let chunkString = '';
        for (let j = 0; j < chunk.length; j++) {
            chunkString += String.fromCharCode(chunk[j]);
        }
        binary += chunkString;
    }
    return `data:image/png;base64,${btoa(binary)}`;
};

const annotateScreenshot = async (dataUrl, highlight, devicePixelRatio = 1) => {
    if (!highlight || typeof OffscreenCanvas === 'undefined') {
        return dataUrl;
    }

    try {
        const blob = await dataUrlToBlob(dataUrl);
        const imageBitmap = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return dataUrl;
        }

        ctx.drawImage(imageBitmap, 0, 0);

        const scale = devicePixelRatio || 1;
        const padding = 8;
        const lineWidth = Math.max(2, Math.round(3 * scale));
        const dashLength = Math.round(12 * scale);
        const gapLength = Math.round(6 * scale);

        const scaled = {
            x: Math.max(0, Math.round((highlight.left - padding) * scale)),
            y: Math.max(0, Math.round((highlight.top - padding) * scale)),
            width: Math.round((highlight.width + padding * 2) * scale),
            height: Math.round((highlight.height + padding * 2) * scale)
        };

        if (scaled.x + scaled.width > imageBitmap.width) {
            scaled.width = imageBitmap.width - scaled.x;
        }
        if (scaled.y + scaled.height > imageBitmap.height) {
            scaled.height = imageBitmap.height - scaled.y;
        }

        ctx.fillStyle = 'rgba(255, 69, 0, 0.2)';
        ctx.fillRect(scaled.x, scaled.y, scaled.width, scaled.height);

        ctx.strokeStyle = 'rgba(255, 69, 0, 0.9)';
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([dashLength, gapLength]);
        ctx.strokeRect(scaled.x + lineWidth / 2, scaled.y + lineWidth / 2, scaled.width - lineWidth, scaled.height - lineWidth);

        const annotatedBlob = await canvas.convertToBlob({ type: 'image/png' });
        return await blobToDataUrl(annotatedBlob);
    } catch (error) {
        console.error("Failed to annotate screenshot:", error);
        return dataUrl;
    }
};

// Initialize state in storage
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ isRecording: false, steps: [] });
});

// Helper to decide if a URL is a normal web/file page we can record on
const isRecordableUrl = (url) => {
    if (!url) return false;
    return url.startsWith('http') || url.startsWith('file');
};

// Build a more descriptive navigation message, including the route/path
const buildNavigationDescription = (tab) => {
    if (!tab) return 'Navigated to a new page';

    const url = tab.url || '';
    let path = '';

    try {
        if (url && (url.startsWith('http') || url.startsWith('file'))) {
            const parsed = new URL(url);
            // Include pathname + hash + search so SPA routes are visible
            path = `${parsed.pathname || ''}${parsed.search || ''}${parsed.hash || ''}`;
        }
    } catch (e) {
        // Fallback to raw URL if parsing fails
        path = url;
    }

    if (tab.title && path) {
        return `Navigated to "${tab.title}" (${path})`;
    }
    if (tab.title) {
        return `Navigated to "${tab.title}"`;
    }
    if (path) {
        return `Navigated to ${path}`;
    }
    if (url) {
        return `Navigated to ${url}`;
    }
    return 'Navigated to a new page';
};

// Main message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_STATE") {
        chrome.storage.local.get(['isRecording', 'steps'], (result) => {
            sendResponse(result);
        });
        return true; // Indicates asynchronous response
    }
    
    if (request.type === "START_RECORDING") {
        chrome.storage.local.set({ isRecording: true, steps: [] }, () => {
            // Query for the active tab to inject the content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                if (activeTab && activeTab.id) {
                    // Inject content script into the active tab, ensuring it's a valid page
                    if (activeTab.url && (activeTab.url.startsWith('http') || activeTab.url.startsWith('file'))) {
                        chrome.scripting.executeScript({
                            target: { tabId: activeTab.id },
                            files: ['content.js'],
                        });
                    } else {
                        console.log("ScribeFlow: Cannot inject script into the current page:", activeTab.url);
                    }
                }
            });
        });
    }
    
    if (request.type === "STOP_RECORDING") {
        chrome.storage.local.set({ isRecording: false });
    }

    if (request.type === "RECORD_STEP") {
        chrome.storage.local.get(['isRecording', 'steps'], async (result) => {
            if (result.isRecording && sender.tab) {
                try {
                    const payload = request && request.payload ? request.payload : {};
                    const { description, highlight = null, devicePixelRatio = 1 } = payload;

                    const screenshot = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
                    const annotatedScreenshot = await annotateScreenshot(screenshot, highlight, devicePixelRatio);
                    const newStep = {
                        id: Date.now(),
                        description,
                        screenshot: annotatedScreenshot,
                        highlight
                    };
                    const updatedSteps = [...result.steps, newStep];
                    chrome.storage.local.set({ steps: updatedSteps });

                    // Notify popup that state has changed
                    chrome.runtime.sendMessage({ type: "STEPS_UPDATED", payload: { steps: updatedSteps } });

                } catch (error) {
                    console.error("Failed to capture tab or update steps:", error);
                }
            }
        });
    }
    // Return true for async operations to keep message channel open
    return true;
});

// When the active tab finishes navigating to a new URL while recording,
// ensure the content script is injected so we keep capturing user actions.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    if (!tab || !tab.active || !isRecordableUrl(tab.url)) return;

    chrome.storage.local.get(['isRecording', 'steps'], async (result) => {
        if (!result || !result.isRecording) return;

        // Re-inject content script into the newly loaded page so clicks/inputs continue to be tracked,
        // but do NOT create an extra "Navigated to ..." step.
        if (!isRecordableUrl(tab.url)) return;

        try {
            chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js'],
            });
        } catch (error) {
            console.error('Failed to inject content script after navigation:', error);
        }
    });
});