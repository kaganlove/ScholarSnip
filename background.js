
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["frameworkId","subject","grade","backendUrl"], (cfg) => {
    const patch = {};
    if (!cfg.backendUrl) patch.backendUrl = "http://localhost:3000";
    chrome.storage.sync.set(patch);
  });
});
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "GET_CONFIG") {
    chrome.storage.sync.get(["frameworkId","subject","grade","backendUrl"], (cfg) => {
      sendResponse(cfg || {});
    });
    return true;
  }
});
