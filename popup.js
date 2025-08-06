document.getElementById('summarize-btn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: extractTranscript
  });
});

function extractTranscript() {
  alert('Transcript extraction will go here.');
}