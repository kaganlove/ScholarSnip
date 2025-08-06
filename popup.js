document.getElementById('summarize-btn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: extractTranscript
  });
});

function extractTranscript() {
  const transcriptLines = [];
  const transcriptElements = document.querySelectorAll('ytd-transcript-segment-renderer');

  if (transcriptElements.length === 0) {
    alert('Transcript not found. Make sure it's open or available on this video.');
    return;
  }

  transcriptElements.forEach(el => {
    const time = el.querySelector('#segment-timestamp')?.innerText || '';
    const text = el.querySelector('#segment-text')?.innerText || '';
    transcriptLines.push(`${time} - ${text}`);
  });

  const summary = transcriptLines.length > 0
    ? transcriptLines.join('\n')
    : 'Transcript could not be extracted.';

  alert(summary.slice(0, 1000)); // Preview first 1000 characters
}