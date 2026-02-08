const BASE_URL = "http://localhost:8000/api";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXPLAIN_DOM") {
    handleExplainDOM(message.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true; // async response
  }
  
  if (message.type === "EXPLAIN_CSS") {
    handleExplainCSS(message.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
  
  if (message.type === "HEALTH_CHECK") {
    checkBackendHealth()
      .then(sendResponse)
      .catch((error) => sendResponse({ healthy: false, error: error.message }));
    return true;
  }
});

async function handleExplainDOM(payload) {
  try {
    const response = await fetch(`${BASE_URL}/explain_dom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: payload.url,
        html: payload.html,
        classes: payload.classes || [],
        tag: payload.tag,
        css_rules: payload.css_rules,
        parent_context: payload.parent_context
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Backend error: ${error}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Explain DOM failed:", error);
    throw error;
  }
}

async function handleExplainCSS(payload) {
  // Similar to DOM but focused on CSS analysis
  try {
    const response = await fetch(`${BASE_URL}/explain_dom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: payload.url,
        html: `<style>${payload.css}</style>`,
        classes: [],
        tag: "style",
        css_rules: payload.css
      })
    });

    if (!response.ok) {
      throw new Error("CSS explanation failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Explain CSS failed:", error);
    throw error;
  }
}

async function checkBackendHealth() {
  try {
    const response = await fetch(`${BASE_URL.replace('/api', '')}/health`, {
      method: "GET"
    });
    
    if (!response.ok) {
      return { healthy: false, error: "Backend unavailable" };
    }
    
    const data = await response.json();
    return { healthy: true, ...data };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

// Initialize: Check backend health on startup
checkBackendHealth().then((health) => {
  if (!health.healthy) {
    console.warn("Backend is not healthy:", health.error);
  } else {
    console.log("Backend is healthy:", health);
  }
});
