/**
 * Gets the most relevant text from an element, limiting its length.
 * @param {HTMLElement} element
 * @returns {string | null}
 */
const getElementText = (element) => {
    if (!element) return null;
    const text = (element.innerText || element.textContent || '').trim().replace(/\s+/g, ' ');
    if (!text) return null;
    return text.substring(0, 100); // Limit length
};

const GENERIC_TEXT_TAGS = ['div', 'span', 'p', 'li', 'section', 'article', 'main', 'header', 'footer', 'label', 'strong', 'em'];
const ICON_LIKE_TAGS = ['svg', 'path', 'g', 'use', 'i'];
const PREFERRED_HIGHLIGHT_TAGS = ['button', 'a', 'input', 'textarea', 'select', 'label', 'summary'];
const PREFERRED_HIGHLIGHT_ROLES = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'option', 'treeitem'];
const INTERACTIVE_FALLBACK_ROLES = ['switch', 'combobox', 'slider', 'spinbutton', 'textbox'];
const MIN_HIGHLIGHT_SIZE = 4;

const formatDescriptionFromTag = (tagName, text, options = {}) => {
    if (!text) return null;
    const lowerTag = (tagName || '').toLowerCase();
    const role = (options.role || '').toLowerCase();
    const source = options.source || 'text';

    const quoted = `"${text}"`;

    if (role === 'button' || lowerTag === 'button') {
        return `Clicked button with text ${quoted}`;
    }
    if (role === 'link' || lowerTag === 'a') {
        return `Clicked link with text ${quoted}`;
    }
    if (source === 'aria') {
        return `Clicked element labeled ${quoted}`;
    }
    if (GENERIC_TEXT_TAGS.includes(lowerTag) || !lowerTag) {
        return `Clicked ${quoted}`;
    }
    return `Clicked ${lowerTag} with text ${quoted}`;
};

const findAncestorWithText = (element, maxDepth = 5) => {
    let current = element ? element.parentElement : null;
    let depth = 0;

    while (current && depth < maxDepth) {
        const tagName = current.tagName ? current.tagName.toLowerCase() : '';
        if (tagName === 'html' || tagName === 'body') break;

        let role = '';
        if (current.getAttribute) {
            role = current.getAttribute('role') || '';
            const ariaLabel = current.getAttribute('aria-label');
            if (ariaLabel) {
                return { text: ariaLabel, tagName, role, source: 'aria' };
            }

            const ariaLabelledBy = current.getAttribute('aria-labelledby');
            if (ariaLabelledBy) {
                const ids = ariaLabelledBy.split(/\s+/).filter(Boolean);
                const labeledTexts = ids
                    .map((id) => document.getElementById(id))
                    .filter((el) => el)
                    .map((el) => getElementText(el))
                    .filter((text) => text);
                if (labeledTexts.length) {
                    return { text: labeledTexts.join(' '), tagName, role, source: 'aria' };
                }
            }

            const describedBy = resolveDescribedByText(current);
            if (describedBy) {
                return { text: describedBy, tagName, role, source: 'aria' };
            }

            const titleAttr = getAttributeText(current, ['title', 'data-tooltip', 'data-original-title', 'data-title', 'aria-roledescription']);
            if (titleAttr) {
                return { text: titleAttr, tagName, role, source: 'title' };
            }
        }

        const text = getElementText(current);
        if (text && (hasDirectText(current) || !hasInteractiveDescendant(current))) {
            return { text, tagName, role, source: 'text' };
        }

        current = current.parentElement;
        depth++;
    }

    return null;
};

const resolveDescribedByText = (element) => {
    if (!element || !element.getAttribute) return null;
    const describedBy = element.getAttribute('aria-describedby');
    if (!describedBy) return null;
    const ids = describedBy.split(/\s+/).filter(Boolean);
    if (!ids.length) return null;
    const texts = ids
        .map((id) => document.getElementById(id))
        .filter((el) => el)
        .map((el) => getElementText(el))
        .filter((text) => text);
    if (texts.length) {
        return texts.join(' ');
    }
    return null;
};

const getAttributeText = (element, attributes) => {
    if (!element || !element.getAttribute) return null;
    for (const attr of attributes) {
        const value = element.getAttribute(attr);
        if (value && value.trim()) return value.trim();
    }
    return null;
};

const hasDirectText = (element) => {
    if (!element || !element.childNodes) return false;
    return Array.from(element.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && !!node.textContent && node.textContent.trim().length > 0
    );
};

const hasInteractiveDescendant = (element) => {
    if (!element || !element.querySelector) return false;
    return !!element.querySelector('button,a,input,select,textarea,summary,[role="button"],[role="link"]');
};

const resolveClickElement = (event) => {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    let fallback = event.target instanceof HTMLElement ? event.target : null;

    for (const node of path) {
        if (!(node instanceof HTMLElement)) continue;

        const tag = node.tagName ? node.tagName.toLowerCase() : '';
        if (tag === 'html' || tag === 'body') break;

        if (!fallback && !ICON_LIKE_TAGS.includes(tag)) {
            fallback = node;
        }

        if (ICON_LIKE_TAGS.includes(tag)) continue;

        const role = node.getAttribute ? (node.getAttribute('role') || '').toLowerCase() : '';
        const hasOnClick = typeof node.onclick === 'function' || node.getAttribute?.('onclick');
        const isFocusable = typeof node.tabIndex === 'number' && node.tabIndex >= 0;
        const isContentEditable = node.contentEditable === 'true';

        if (
            PREFERRED_HIGHLIGHT_TAGS.includes(tag) ||
            PREFERRED_HIGHLIGHT_ROLES.includes(role) ||
            INTERACTIVE_FALLBACK_ROLES.includes(role) ||
            hasOnClick ||
            isFocusable ||
            isContentEditable
        ) {
            return node;
        }
    }

    return fallback;
};

const findHighlightElement = (element, maxDepth = 6) => {
    let current = element;
    let depth = 0;
    let fallback = null;

    while (current && depth < maxDepth) {
        if (!(current instanceof HTMLElement)) break;

        const rect = current.getBoundingClientRect ? current.getBoundingClientRect() : null;
        const tag = current.tagName ? current.tagName.toLowerCase() : '';
        const role = current.getAttribute ? (current.getAttribute('role') || '').toLowerCase() : '';
        const hasSize = rect && rect.width >= MIN_HIGHLIGHT_SIZE && rect.height >= MIN_HIGHLIGHT_SIZE;

        if (hasSize && !fallback && !ICON_LIKE_TAGS.includes(tag)) {
            fallback = current;
        }

        if (hasSize && (PREFERRED_HIGHLIGHT_TAGS.includes(tag) || PREFERRED_HIGHLIGHT_ROLES.includes(role))) {
            return current;
        }

        current = current.parentElement;
        depth++;
    }

    return fallback;
};

const getHighlightData = (element) => {
    if (!(element instanceof HTMLElement)) return null;

    const highlightElement = findHighlightElement(element) || element;
    if (!highlightElement || !(highlightElement instanceof HTMLElement)) return null;

    const rect = highlightElement.getBoundingClientRect ? highlightElement.getBoundingClientRect() : null;
    if (!rect || rect.width < MIN_HIGHLIGHT_SIZE || rect.height < MIN_HIGHLIGHT_SIZE) return null;

    return {
        element: highlightElement,
        rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            tagName: highlightElement.tagName ? highlightElement.tagName.toLowerCase() : undefined
        }
    };
};

// Debounce timers for input events so we don't record on every keystroke
const inputDebounceTimers = new WeakMap();
const INPUT_DEBOUNCE_MS = 800;

const scheduleInputRecord = (element) => {
    if (!element) return;

    // Only handle text-like inputs and textareas here; selects are handled on change
    const tagName = element.tagName ? element.tagName.toLowerCase() : '';
    if (!(tagName === 'input' || tagName === 'textarea')) return;

    const existing = inputDebounceTimers.get(element);
    if (existing) {
        clearTimeout(existing);
    }

    const timeoutId = setTimeout(() => {
        inputDebounceTimers.delete(element);

        if (!(chrome && chrome.runtime && chrome.runtime.sendMessage)) return;

        const description = generateInputChangeDescription(element);
        if (!description) return;

        const highlightInfo = getHighlightData(element);
        const highlight = highlightInfo ? highlightInfo.rect : null;

        chrome.runtime.sendMessage({
            type: "RECORD_STEP",
            payload: {
                description,
                highlight,
                devicePixelRatio: window.devicePixelRatio || 1,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            }
        });
    }, INPUT_DEBOUNCE_MS);

    inputDebounceTimers.set(element, timeoutId);
};

/**
 * Generates a human-readable description of typing or changing a form field.
 * @param {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} element
 * @returns {string | null}
 */
const generateInputChangeDescription = (element) => {
    if (!element || !element.tagName) return null;

    const tagName = element.tagName.toLowerCase();
    const isSelect = tagName === 'select';
    const isTextLike = tagName === 'textarea' || tagName === 'input';

    // Resolve label text, if any
    let labelText = '';
    if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) labelText = getElementText(label) || '';
    }
    if (!labelText) {
        const parentLabel = element.closest('label');
        if (parentLabel) labelText = getElementText(parentLabel) || '';
    }

    // Handle password inputs without exposing value
    if (element.type === 'password') {
        if (labelText) return `Entered a value in password input labeled "${labelText}"`;
        if (element.placeholder) return `Entered a value in password input with placeholder "${element.placeholder}"`;
        return 'Entered a value in password input';
    }

    // Determine the user-visible value
    let valueText = '';
    if (isSelect && element.options) {
        const selectedOption = element.options[element.selectedIndex];
        if (selectedOption) {
            valueText = (selectedOption.text || selectedOption.value || '').trim();
        }
    } else if (typeof element.value === 'string') {
        valueText = element.value.trim();
    }

    // If nothing was entered, treat this as clearing the field
    if (!valueText) {
        if (labelText) return `Cleared input labeled "${labelText}"`;
        if (element.placeholder) return `Cleared input with placeholder "${element.placeholder}"`;
        if (element.name) return `Cleared input named "${element.name}"`;
        return 'Cleared input';
    }

    // Build description including the actual value the user entered/selected
    if (labelText) {
        return `Entered "${valueText}" in "${labelText}"`;
    }
    if (element.placeholder) {
        return `Entered "${valueText}" in input with placeholder "${element.placeholder}"`;
    }
    if (element.name) {
        return `Entered "${valueText}" in input named "${element.name}"`;
    }

    if (isSelect) {
        return `Selected "${valueText}" from dropdown`;
    }

    return `Entered "${valueText}" in input`;
};

/**
 * Generates a human-readable description of a click event.
 * @param {HTMLElement} target The element that was clicked.
 * @returns {string} A description of the click action.
 */
const generateStepDescription = (target) => {
    let element = target;
    const MAX_PARENT_SEARCH = 5; // How many levels up the DOM to search for context.

    // --- Phase 1: Search for meaningful interactive elements by traversing up the DOM ---
    for (let i = 0; i < MAX_PARENT_SEARCH && element; i++) {
        const tagName = element.tagName.toLowerCase();
        
        // Priority 1: Buttons and links, as they are explicit actions.
        if (tagName === 'button' || tagName === 'a') {
            const text = getElementText(element);
            if (text) return `Clicked ${tagName === 'a' ? 'link' : 'button'} with text "${text}"`;
        }
        
        // Priority 2: Form elements, find their associated label.
        if (['input', 'textarea', 'select'].includes(tagName)) {
            // For inputs, we prefer to capture the "entered" value via input/change listeners
            // rather than on click/focus, so skip generating a click-based step here.
            if (tagName === 'input' || tagName === 'textarea') {
                return null;
            }

            let labelText = '';
            // A. Check for an explicit label using `for` attribute.
            if (element.id) {
                const label = document.querySelector(`label[for="${element.id}"]`);
                if (label) labelText = getElementText(label);
            }
            // B. Check for a parent label element.
            if (!labelText) {
                const parentLabel = element.closest('label');
                if (parentLabel) labelText = getElementText(parentLabel);
            }
            
            if (labelText) {
                // For radio/checkbox, include value if available
                if ((element.type === 'radio' || element.type === 'checkbox') && element.value) {
                     return `Selected option "${element.value}" for "${labelText}"`;
                }

                // For text-like inputs, include the typed value when available (but not for passwords)
                const valueText = typeof element.value === 'string' ? element.value.trim() : '';
                if (valueText && element.type !== 'password') {
                    return `Typed "${valueText}" in input labeled "${labelText}"`;
                }

                return `Interacted with input labeled "${labelText}"`;
            }
            
            // Fallback for inputs without labels
            if (element.placeholder) {
                const valueText = typeof element.value === 'string' ? element.value.trim() : '';
                if (valueText && element.type !== 'password') {
                    return `Typed "${valueText}" in input with placeholder "${element.placeholder}"`;
                }
                return `Typed in input with placeholder "${element.placeholder}"`;
            }

            if (element.name) {
                const valueText = typeof element.value === 'string' ? element.value.trim() : '';
                if (valueText && element.type !== 'password') {
                    return `Typed "${valueText}" in input named "${element.name}"`;
                }
                return `Interacted with input named "${element.name}"`;
            }
        }

        element = element.parentElement;
    }
    
    // --- Phase 2: If no specific interactive element was found, analyze the original target ---
    element = target; // Reset to the original clicked element
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute ? (element.getAttribute('role') || '') : '';

    // Check for common testing/ID attributes as they are often meaningful
    const testId = element.getAttribute('data-testid') || element.getAttribute('data-cy') || element.getAttribute('name');
    if (testId) {
        return `Clicked element identified as "${testId}"`;
    }
    
    // Use aria-label as it's meant for accessibility and is often descriptive.
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
        return `Clicked element with label "${ariaLabel}"`;
    }

    const ariaLabelledBy = element.getAttribute ? element.getAttribute('aria-labelledby') : '';
    if (ariaLabelledBy) {
        const ids = ariaLabelledBy.split(/\s+/).filter(Boolean);
        const labeledTexts = ids
            .map((id) => document.getElementById(id))
            .filter((el) => el)
            .map((el) => getElementText(el))
            .filter((text) => text);
        if (labeledTexts.length) {
            return `Clicked element labeled "${labeledTexts.join(' ')}"`;
        }
    }

    const describedBy = resolveDescribedByText(element);
    if (describedBy) {
        return `Clicked element described as "${describedBy}"`;
    }

    const titleAttr = getAttributeText(element, ['title', 'data-tooltip', 'data-original-title', 'data-title', 'aria-roledescription']);
    if (titleAttr) {
        return `Clicked element labeled "${titleAttr}"`;
    }
    
    // Use the element's own text as a general fallback.
    const text = getElementText(element);
    if (text && (hasDirectText(element) || !hasInteractiveDescendant(element))) {
        const formatted = formatDescriptionFromTag(tagName, text, { role, source: 'text' });
        if (formatted) {
            return formatted;
        }
    }

    const ancestorInfo = findAncestorWithText(element);
    if (ancestorInfo) {
        const formatted = formatDescriptionFromTag(ancestorInfo.tagName, ancestorInfo.text, { role: ancestorInfo.role, source: ancestorInfo.source });
        if (formatted) {
            return formatted;
        }
    }

    // --- Phase 3: Final, most generic fallbacks ---
    if (element.id) {
        return `Clicked element "${element.id}"`;
    }

    // Try to infer a human-friendly action from class names like "remove-button"
    if (element.className && typeof element.className === 'string') {
        const classString = element.className.toLowerCase();
        const actionMap = [
            { keyword: 'remove', label: 'Remove' },
            { keyword: 'delete', label: 'Delete' },
            { keyword: 'add', label: 'Add' },
            { keyword: 'save', label: 'Save' },
            { keyword: 'edit', label: 'Edit' },
            { keyword: 'close', label: 'Close' },
            { keyword: 'cancel', label: 'Cancel' }
        ];
        const match = actionMap.find(({ keyword }) => classString.includes(keyword));
        if (match) {
            return `Clicked "${match.label}"`;
        }
    }
    
    if (ICON_LIKE_TAGS.includes(tagName)) {
        return 'Clicked on an icon';
    }

    return 'Clicked here'; // Very generic fallback with no technical details.
};


// Ensure we don't attach the listener multiple times
if (!window.scribeFlowListenerAttached) {
    document.addEventListener('click', (event) => {
        // Check if the runtime is available before sending a message
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            const resolvedElement = resolveClickElement(event) || (event.target instanceof HTMLElement ? event.target : null);
            const highlightInfo = resolvedElement ? getHighlightData(resolvedElement) : null;
            const descriptionTarget = highlightInfo ? highlightInfo.element : resolvedElement || (event.target instanceof HTMLElement ? event.target : null);
            const description = descriptionTarget ? generateStepDescription(descriptionTarget) : 'Clicked on the page';
            if (!description) {
                return; // Skip recording if we decided this click isn't meaningful (e.g., focusing an input)
            }
            const highlight = highlightInfo ? highlightInfo.rect : null;

            chrome.runtime.sendMessage({
                type: "RECORD_STEP",
                payload: {
                    description,
                    highlight,
                    devicePixelRatio: window.devicePixelRatio || 1,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                }
            });
        }
    }, true); // Use capture phase to get the click event early

    // Record when the user actually finishes changing an input (e.g., dropdowns, checkboxes)
    document.addEventListener('change', (event) => {
        // Guard against non-form elements
        const target = event.target;
        if (
            !(target instanceof HTMLInputElement) &&
            !(target instanceof HTMLTextAreaElement) &&
            !(target instanceof HTMLSelectElement)
        ) {
            return;
        }

        // Check if the runtime is available before sending a message
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            const description = generateInputChangeDescription(target);
            if (!description) return;

            const highlightInfo = getHighlightData(target);
            const highlight = highlightInfo ? highlightInfo.rect : null;

            chrome.runtime.sendMessage({
                type: "RECORD_STEP",
                payload: {
                    description,
                    highlight,
                    devicePixelRatio: window.devicePixelRatio || 1,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                }
            });
        }
    }, true);

    // Record text entry with a debounce so we include the actual value they typed (e.g., amounts)
    document.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
            return;
        }
        scheduleInputRecord(target);
    }, true);

    window.scribeFlowListenerAttached = true;
}
