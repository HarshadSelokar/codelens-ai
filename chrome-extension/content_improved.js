let lastSelectedElement = null;
let lastHoverTime = 0;
const HOVER_DEBOUNCE_MS = 300;

// Track hovered element with debouncing
document.addEventListener("mouseover", (e) => {
  const now = Date.now();
  if (now - lastHoverTime < HOVER_DEBOUNCE_MS) {
    return;
  }
  lastHoverTime = now;
  lastSelectedElement = e.target;
}, true);

// Listen for messages from devtools
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_SELECTED_DOM" && lastSelectedElement) {
    const element = lastSelectedElement;
    
    try {
      // Get computed styles
      const computedStyle = window.getComputedStyle(element);
      const importantStyles = {
        display: computedStyle.display,
        position: computedStyle.position,
        flexDirection: computedStyle.flexDirection,
        gridTemplateColumns: computedStyle.gridTemplateColumns,
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        fontSize: computedStyle.fontSize,
        padding: computedStyle.padding,
        margin: computedStyle.margin
      };

      // Get parent context for better understanding
      const parent = element.parentElement;
      const parentContext = parent ? {
        tag: parent.tagName.toLowerCase(),
        classes: Array.from(parent.classList),
        id: parent.id
      } : null;

      // Get applied CSS rules
      const cssRules = getCSSRules(element);

      sendResponse({
        html: element.outerHTML,
        classes: Array.from(element.classList),
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        computedStyles: importantStyles,
        cssRules: cssRules,
        parentContext: parentContext,
        textContent: element.textContent?.substring(0, 200), // First 200 chars
        attributes: getAttributes(element),
        boundingBox: element.getBoundingClientRect()
      });
    } catch (error) {
      console.error("Failed to extract DOM info:", error);
      sendResponse({ error: error.message });
    }
  }
  
  if (msg.type === "HIGHLIGHT_ELEMENT") {
    highlightElement(lastSelectedElement);
    sendResponse({ success: true });
  }
  
  if (msg.type === "GET_PAGE_INFO") {
    sendResponse({
      url: window.location.href,
      title: document.title,
      framework: detectFramework()
    });
  }
});

function getCSSRules(element) {
  const sheets = Array.from(document.styleSheets);
  const rules = [];
  
  try {
    sheets.forEach(sheet => {
      try {
        const cssRules = Array.from(sheet.cssRules || []);
        cssRules.forEach(rule => {
          if (rule.style && element.matches(rule.selectorText)) {
            rules.push({
              selector: rule.selectorText,
              styles: rule.style.cssText
            });
          }
        });
      } catch (e) {
        // CORS error for external stylesheets
      }
    });
  } catch (error) {
    console.warn("Could not extract CSS rules:", error);
  }
  
  return rules.slice(0, 10); // Limit to first 10 rules
}

function getAttributes(element) {
  const attrs = {};
  for (let attr of element.attributes) {
    attrs[attr.name] = attr.value;
  }
  return attrs;
}

function highlightElement(element) {
  if (!element) return;
  
  // Create highlight overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    border: 2px solid #ff0000;
    background-color: rgba(255, 0, 0, 0.1);
    pointer-events: none;
    z-index: 999999;
    transition: opacity 0.3s;
  `;
  
  const rect = element.getBoundingClientRect();
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  
  document.body.appendChild(overlay);
  
  // Fade out and remove
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  }, 2000);
}

function detectFramework() {
  // Detect common frontend frameworks
  if (window.React || document.querySelector('[data-reactroot]')) {
    return "React";
  }
  if (window.Vue || document.querySelector('[data-v-]')) {
    return "Vue";
  }
  if (window.angular || document.querySelector('[ng-version]')) {
    return "Angular";
  }
  if (document.querySelector('[data-svelte-h]')) {
    return "Svelte";
  }
  return "Unknown";
}

// Inject helper notification
console.log("🤖 RAG UI Explainer: Content script loaded. Hover over elements in DevTools.");
