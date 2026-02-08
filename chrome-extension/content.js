let lastSelectedElement = null;

document.addEventListener("mouseover", (e) => {
  lastSelectedElement = e.target;
}, true);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_SELECTED_DOM" && lastSelectedElement) {
    const el = lastSelectedElement;

    sendResponse({
      html: el.outerHTML,
      classes: Array.from(el.classList),
      tag: el.tagName.toLowerCase()
    });
  }
});
