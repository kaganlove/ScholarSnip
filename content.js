console.log("ScholarSnip: Injected function running");

function tryClickTranscript() {
  const button = Array.from(document.querySelectorAll("button"))
    .find(btn => btn.textContent.trim().toLowerCase() === "show transcript");
  if (button) {
    console.log("ScholarSnip: Found 'Show transcript' button. Clicking...");
    button.click();
    addSummarizeButton();
  } else {
    console.log("ScholarSnip: 'Show transcript' button not found.");
    setTimeout(tryClickTranscript, 2000);
  }
}

function addSummarizeButton() {
  if (document.getElementById("summarizeBtn")) return;

  const target = document.querySelector("ytd-watch-flexy");
  const btn = document.createElement("button");
  btn.textContent = "Summarize Transcript";
  btn.id = "summarizeBtn";
  btn.style.cssText = "position: fixed; top: 80px; right: 20px; z-index: 9999; padding: 10px; background: #0088ff; color: white; border: none; border-radius: 5px;";
  btn.onclick = summarizeTranscript;
  target.appendChild(btn);
}

function summarizeTranscript() {
  const transcriptContainer = document.querySelector("ytd-transcript-renderer, ytd-transcript-segment-list-renderer");

  if (!transcriptContainer) {
    alert("Transcript container not found.");
    return;
  }

  const segments = Array.from(transcriptContainer.querySelectorAll("ytd-transcript-segment-renderer"));

  if (segments.length === 0) {
    alert("Transcript appears to be empty.");
    return;
  }

  const lines = segments.map(seg => {
    const cue = seg.querySelector(".segment-text") || seg.querySelector("span.ytd-transcript-segment-renderer");
    return cue ? cue.textContent.trim() : '';
  }).filter(Boolean);

  const transcript = lines.join(" ");
  if (!transcript) return alert("Transcript extraction failed or returned empty.");

  chrome.storage.local.get(["openai_api_key"], result => {
    const apiKey = result.openai_api_key;
    if (!apiKey) return alert("Please set your API key in the options page.");

    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Summarize this transcript: " + transcript }]
      })
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`OpenAI API returned ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      const summary = data.choices?.[0]?.message?.content;
      alert(summary || "Failed to get summary.");
    })
    .catch(err => {
      console.error("API error:", err);
      alert("Error calling OpenAI API. " + err.message);
    });
  });
}

setTimeout(tryClickTranscript, 2000);
