const output = document.getElementById("output");
const explainBtn = document.getElementById("explain");
const loadingIndicator = document.getElementById("loading");
const errorContainer = document.getElementById("error");
const backendStatus = document.getElementById("backend-status");

let lastExplanation = null;

// Check backend health on load
checkBackendHealth();

explainBtn.onclick = async () => {
  try {
    setLoading(true);
    clearError();
    
    // Get page info first
    const pageInfo = await sendMessage({ type: "GET_PAGE_INFO" });
    
    // Get selected DOM element
    const dom = await sendMessage({ type: "GET_SELECTED_DOM" });
    
    if (!dom || dom.error) {
      showError("No element selected. Hover over an element in the page first.");
      return;
    }

    // Highlight the selected element
    await sendMessage({ type: "HIGHLIGHT_ELEMENT" });

    // Format CSS rules
    const cssRules = dom.cssRules?.map(r => `${r.selector} { ${r.styles} }`).join('\n') || '';
    
    // Send to backend
    const response = await sendMessage({
      type: "EXPLAIN_DOM",
      payload: {
        url: pageInfo?.url || chrome.devtools.inspectedWindow.tabId,
        html: dom.html,
        classes: dom.classes || [],
        tag: dom.tag,
        css_rules: cssRules,
        parent_context: dom.parentContext ? JSON.stringify(dom.parentContext) : null
      }
    });

    if (response?.error) {
      showError(`Backend error: ${response.error}`);
      return;
    }

    if (response?.explanation) {
      lastExplanation = response.explanation;
      displayExplanation(response.explanation, dom);
    } else {
      showError("No explanation received from backend");
    }

  } catch (error) {
    showError(`Failed to explain: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

// Copy explanation button
document.getElementById("copy")?.addEventListener("click", () => {
  if (lastExplanation) {
    navigator.clipboard.writeText(lastExplanation);
    showNotification("Copied to clipboard!");
  }
});

// Refresh button
document.getElementById("refresh")?.addEventListener("click", () => {
  output.innerHTML = "";
  lastExplanation = null;
  clearError();
});

function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, resolve);
  });
}

function setLoading(isLoading) {
  if (loadingIndicator) {
    loadingIndicator.style.display = isLoading ? "block" : "none";
  }
  explainBtn.disabled = isLoading;
  explainBtn.textContent = isLoading ? "Analyzing..." : "Explain Element";
}

function showError(message) {
  if (errorContainer) {
    errorContainer.textContent = `⚠️ ${message}`;
    errorContainer.style.display = "block";
  }
}

function clearError() {
  if (errorContainer) {
    errorContainer.style.display = "none";
  }
}

function displayExplanation(explanation, domInfo) {
  output.innerHTML = "";
  
  // Element info card
  const infoCard = document.createElement("div");
  infoCard.className = "info-card";
  infoCard.innerHTML = `
    <div class="element-info">
      <strong>Element:</strong> &lt;${domInfo.tag}&gt;<br>
      ${domInfo.id ? `<strong>ID:</strong> #${domInfo.id}<br>` : ''}
      ${domInfo.classes.length ? `<strong>Classes:</strong> ${domInfo.classes.join(', ')}<br>` : ''}
    </div>
  `;
  output.appendChild(infoCard);

  // Explanation content
  const explanationDiv = document.createElement("div");
  explanationDiv.className = "explanation-content";
  
  // Format explanation with markdown-like sections
  const formatted = formatExplanation(explanation);
  explanationDiv.innerHTML = formatted;
  
  output.appendChild(explanationDiv);
}

function formatExplanation(text) {
  // Simple markdown-like formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

async function checkBackendHealth() {
  try {
    const health = await sendMessage({ type: "HEALTH_CHECK" });
    
    if (health?.healthy) {
      if (backendStatus) {
        backendStatus.textContent = "✅ Backend Connected";
        backendStatus.className = "status-healthy";
      }
    } else {
      if (backendStatus) {
        backendStatus.textContent = "❌ Backend Offline";
        backendStatus.className = "status-unhealthy";
      }
      showError("Backend is not available. Make sure the FastAPI server is running.");
    }
  } catch (error) {
    if (backendStatus) {
      backendStatus.textContent = "❌ Backend Error";
      backendStatus.className = "status-unhealthy";
    }
  }
}

// Refresh health check every 10 seconds
setInterval(checkBackendHealth, 10000);
