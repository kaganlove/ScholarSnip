console.log("ScholarSnip: Injected");

function tryClickTranscript() {
  const button = Array.from(document.querySelectorAll("button"))
    .find(btn => btn.textContent.trim().toLowerCase() === "show transcript");
  if (button) {
    console.log("ScholarSnip: Clicking 'Show transcript'");
    button.click();
    addButtons();
  } else {
    console.log("ScholarSnip: 'Show transcript' not found, retrying...");
    setTimeout(tryClickTranscript, 2000);
  }
}

function addButtons() {
  if (document.getElementById("scholarsnip-toolbar")) return;

  const toolbar = document.createElement("div");
  toolbar.id = "scholarsnip-toolbar";
  toolbar.style.cssText = "position: fixed; top: 80px; right: 20px; z-index: 99999; display: flex; gap: 8px; flex-direction: column;";

  const mkBtn = (id, label, bg) => {
    const b = document.createElement("button");
    b.id = id;
    b.textContent = label;
    b.style.cssText = `padding:10px 12px;background:${bg};color:#fff;border:none;border-radius:8px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.15);font-weight:600`;
    b.onmouseenter = () => b.style.opacity = "0.9";
    b.onmouseleave = () => b.style.opacity = "1";
    return b;
  };

  const sumBtn = mkBtn("summarizeBtn", "Summarize Transcript", "#0b82ff");
  const curBtn = mkBtn("curriculumBtn", "Generate Curriculum", "#16a34a");

  sumBtn.onclick = summarizeTranscript;
  curBtn.onclick = generateCurriculum;

  toolbar.appendChild(sumBtn);
  toolbar.appendChild(curBtn);

  document.body.appendChild(toolbar);
}

function getTranscriptText() {
  const container = document.querySelector("ytd-transcript-renderer, ytd-transcript-segment-list-renderer");
  if (!container) return "";

  const segments = Array.from(container.querySelectorAll("ytd-transcript-segment-renderer"));
  if (segments.length === 0) return "";

  const lines = segments.map(seg => {
    const cue = seg.querySelector(".segment-text") || seg.querySelector("span.ytd-transcript-segment-renderer");
    return cue ? cue.textContent.trim() : "";
  }).filter(Boolean);

  return lines.join(" ");
}

function showModal(title, content) {
  let overlay = document.getElementById("scholarsnip-modal");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "scholarsnip-modal";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;";
    const panel = document.createElement("div");
    panel.id = "scholarsnip-panel";
    panel.style.cssText = "background:#fff;max-width:900px;width:100%;max-height:80vh;overflow:auto;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.25);";
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #eee;">
        <h2 id="scholarsnip-title" style="margin:0;font-size:18px;">ScholarSnip</h2>
        <div style="display:flex;gap:8px;">
          <button id="scholarsnip-copy" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;background:#f8f8f8;cursor:pointer;">Copy</button>
          <button id="scholarsnip-close" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;background:#f8f8f8;cursor:pointer;">Close</button>
        </div>
      </div>
      <div id="scholarsnip-content" style="padding:16px;white-space:pre-wrap;font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;line-height:1.45"></div>
    `;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    document.getElementById("scholarsnip-close").onclick = () => overlay.remove();
    document.getElementById("scholarsnip-copy").onclick = async () => {
      const text = document.getElementById("scholarsnip-content").innerText;
      try {
        await navigator.clipboard.writeText(text);
        document.getElementById("scholarsnip-copy").textContent = "Copied!";
        setTimeout(()=>document.getElementById("scholarsnip-copy").textContent="Copy", 1200);
      } catch (e) {
        alert("Copy failed: " + e.message);
      }
    };
  }
  document.getElementById("scholarsnip-title").textContent = title;
  document.getElementById("scholarsnip-content").textContent = content;
}

function withApiKey(cb) {
  chrome.storage.local.get(["openai_api_key"], res => {
    const apiKey = res.openai_api_key;
    if (!apiKey) { alert("Please set your API key in the ScholarSnip options."); return; }
    cb(apiKey);
  });
}

function summarizeTranscript() {
  const transcript = getTranscriptText();
  if (!transcript) { alert("Transcript not found or empty. Make sure it's open."); return; }

  withApiKey(async (apiKey) => {
    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You create concise, accurate summaries from transcripts." },
            { role: "user", content: "Summarize this transcript in 5 bullet points:\n\n" + transcript }
          ]
        })
      });
      if (!resp.ok) throw new Error(`OpenAI API ${resp.status} ${resp.statusText}`);
      const data = await resp.json();
      const summary = data.choices?.[0]?.message?.content?.trim() || "No summary returned.";
      showModal("Transcript Summary", summary);
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    }
  });
}

function generateCurriculum() {
  const transcript = getTranscriptText();
  if (!transcript) { alert("Transcript not found or empty. Make sure it's open."); return; }

  chrome.storage.local.get(["openai_api_key", "standardsFramework", "subject", "gradeLevel"], (res) => {
    const apiKey = res.openai_api_key;
    if (!apiKey) { alert("Please set your API key in the ScholarSnip options."); return; }

    const framework = res.standardsFramework || "None";
    const subject = res.subject || "";
    const grade = res.gradeLevel || "";

    const standardsNote = framework && framework.toLowerCase() !== "none"
      ? `When appropriate, align the objectives to ${framework}${subject || grade ? ` for ${subject} ${grade}` : ""}. If alignment is unclear, omit it.`
      : `Do not force alignment if unclear; include general Bloom's alignment only.`;

    const prompt = `You are an experienced instructional designer. Based on the video transcript below, produce a structured curriculum package.

Requirements:
1) Learning Objectives: Provide 1–3 measurable objectives using Bloom's taxonomy. Mark each with the Bloom level in parentheses.
2) Mastery Competency: A single, mastery-based competency statement describing observable performance.
3) Lesson Plan Outline: Include Title, Introduction/Hook, Direct Instruction (key concepts), Guided Practice, Independent Practice, Checks for Understanding (CFUs), Assessment (mastery criteria), Closure, and Materials.
4) Tone: clear, concise, practical.
5) ${standardsNote}

Return the result in clean Markdown with headings.

Transcript:
` + transcript;

    (async () => {
      try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a senior curriculum designer who writes measurable objectives and mastery-based lesson plans." },
              { role: "user", content: prompt }
            ]
          })
        });
        if (!resp.ok) throw new Error(`OpenAI API ${resp.status} ${resp.statusText}`);
        const data = await resp.json();
        const out = data.choices?.[0]?.message?.content?.trim() || "No curriculum returned.";
        showModal("Curriculum Package", out);
      } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
      }
    })();
  });
}

setTimeout(tryClickTranscript, 2000);
