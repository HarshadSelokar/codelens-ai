const output = document.getElementById("output");

document.getElementById("explain").onclick = async () => {
  chrome.runtime.sendMessage(
    { type: "GET_SELECTED_DOM" },
    async (dom) => {
      if (!dom) {
        output.textContent = "No element selected.";
        return;
      }

      chrome.runtime.sendMessage(
        {
          type: "EXPLAIN_DOM",
          payload: {
            url: chrome.devtools.inspectedWindow.location.href,
            html: dom.html,
            classes: dom.classes,
            tag: dom.tag
          }
        },
        (res) => {
          if (res?.explanation) {
            output.textContent = res.explanation;
          } else {
            output.textContent = "Error explaining element.";
          }
        }
      );
    }
  );
};
