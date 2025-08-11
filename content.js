function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function openTranscriptViaMenu(){
  try {
    const more = [...document.querySelectorAll('tp-yt-paper-button, yt-formatted-string, a')]
      .find(el => /more/i.test(el.textContent||"") && el.closest('#description'));
    if (more) { more.click(); await wait(300); }
    const show = [...document.querySelectorAll('tp-yt-paper-button, yt-formatted-string, a, button')]
      .find(el => /show transcript/i.test(el.textContent||""));
    if (show) { show.click(); await wait(900); }
  } catch(e) {}
}

function getTranscriptText(){
  const sel = [
    'ytd-transcript-search-panel-renderer',
    'ytd-engagement-panel-section-list-renderer',
    '#transcript',
    'ytd-transcript-renderer'
  ];
  for (const s of sel){
    const root = document.querySelector(s);
    if (!root) continue;
    const lines = [...root.querySelectorAll('*')].map(n=>n.innerText||"").filter(Boolean);
    const text = lines.join('\\n').replace(/\\n{3,}/g,'\\n\\n');
    if (text && text.length>120) return text;
  }
  const rows = [...document.querySelectorAll('ytd-transcript-segment-renderer, .segment-text')];
  return rows.map(r=>r.innerText||"").join('\\n');
}

// --- UI helpers (classic modal) ---
function ensureUI(){
  if (document.querySelector('.schsnip-toolbar')) return;
  const bar = document.createElement('div');
  bar.className = 'schsnip-toolbar';
  bar.innerHTML = `
    <button class="schsnip-btn" id="schsnip-summarize">Summarize Transcript</button>
    <button class="schsnip-btn" id="schsnip-curriculum">Generate Curriculum</button>
  `;
  document.body.appendChild(bar);

  const backdrop = document.createElement('div');
  backdrop.className = 'schsnip-modal-backdrop';
  backdrop.id = 'schsnip-backdrop';
  const modal = document.createElement('div');
  modal.className = 'schsnip-modal';
  modal.id = 'schsnip-modal';
  modal.innerHTML = `
    <header>
      <div>Curriculum Package</div>
      <div class="schsnip-actions">
        <button class="schsnip-btn schsnip-raw" id="schsnip-raw">Raw</button>
        <button class="schsnip-btn" id="schsnip-copy">Copy</button>
        <button class="schsnip-btn" id="schsnip-download">Download HTML</button>
        <button class="schsnip-btn schsnip-close" id="schsnip-close">Close</button>
      </div>
    </header>
    <div class="schsnip-body"><div id="schsnip-output">(ready)</div></div>
  `;
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  const showModal = () => { backdrop.style.display='block'; modal.style.display='block'; };
  const hideModal = () => { backdrop.style.display='none'; modal.style.display='none'; };

  document.getElementById('schsnip-close').onclick = hideModal;
  backdrop.onclick = hideModal;

  document.getElementById('schsnip-copy').onclick = async () => {
    const text = document.getElementById('schsnip-output').innerText;
    await navigator.clipboard.writeText(text);
    alert("Copied");
  };
  document.getElementById('schsnip-raw').onclick = () => {
    const el = document.getElementById('schsnip-output');
    el.classList.toggle('schsnip-mono');
  };
  document.getElementById('schsnip-download').onclick = () => {
    const blob = new Blob([document.getElementById('schsnip-output').innerHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'curriculum.html'; a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById('schsnip-summarize').onclick = () => runMode("summary");
  document.getElementById('schsnip-curriculum').onclick = () => runMode("curriculum");

  // expose for runMode
  window.__schsnip_showModal = showModal;
}

// Render JSON -> HTML template
function renderLessonHTML(lesson) {
  const esc = (s) => String(s||"").replace(/</g,'&lt;');
  const list = (arr) => (Array.isArray(arr) && arr.length)
    ? `<ul>${arr.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : "";
  const nlist = (arr) => (Array.isArray(arr) && arr.length)
    ? `<ol>${arr.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>` : "";
  const vocab = (arr) => (Array.isArray(arr) && arr.length)
    ? `<ul>${arr.map(v=>`<li><strong>${esc(v.term||"")}</strong>: ${esc(v.definition||"")}</li>`).join('')}</ul>` : "";

  const topLine = lesson.standard && (lesson.standard.code || lesson.standard.description)
    ? `<p><strong>Standard:</strong> ${esc(lesson.standard.code||"")} ${esc(lesson.standard.description||"")}</p>`
    : (lesson.framework || lesson.subject || lesson.grade)
      ? `<p><strong>Framework:</strong> ${esc(lesson.framework||"")}${lesson.subject?` | <strong>Subject:</strong> ${esc(lesson.subject)}`:""}${lesson.grade?` | <strong>Grade:</strong> ${esc(lesson.grade)}`:""}</p>`
      : "";

  return `
    <h2>Curriculum Package: ${esc(lesson.video_title || document.title.replace(/ - YouTube$/, ''))}</h2>
    ${topLine}
    ${lesson.essential_questions?.length ? `<h3>Essential Questions</h3>${list(lesson.essential_questions)}` : ""}
    ${lesson.learning_objectives?.length ? `<h3>Learning Objectives</h3>${list(lesson.learning_objectives)}` : ""}
    ${lesson.materials?.length ? `<h3>Materials</h3>${list(lesson.materials)}` : ""}
    ${lesson.lesson_steps?.length ? `<h3>Lesson Plan</h3>${nlist(lesson.lesson_steps)}` : ""}
    ${lesson.checks_for_understanding?.length ? `<h3>Checks for Understanding</h3>${list(lesson.checks_for_understanding)}` : ""}
    ${lesson.assessment?.length ? `<h3>Assessment</h3>${list(lesson.assessment)}` : ""}
    ${lesson.differentiation?.length ? `<h3>Differentiation</h3>${list(lesson.differentiation)}` : ""}
    ${lesson.vocabulary?.length ? `<h3>Vocabulary</h3>${vocab(lesson.vocabulary)}` : ""}
    ${lesson.extensions?.length ? `<h3>Extensions</h3>${list(lesson.extensions)}` : ""}
  `.replace(/\n\s+\n/g, '\n');
}

async function runMode(mode){
  const cfg = await new Promise(r=>chrome.runtime.sendMessage({type:'GET_CONFIG'}, r));
  const backendUrl = cfg.backendUrl || "http://localhost:3000";
  const frameworkId = cfg.frameworkId || "";
  const subject = cfg.subject || "";
  const grade = cfg.grade || "";

  await openTranscriptViaMenu();
  await wait(800);
  const transcript = getTranscriptText();

  const payload = {
    videoUrl: location.href,
    transcriptText: transcript,
    standardSetId: frameworkId,
    standardItemId: "",  // (optional) if you later map subject+grade -> a specific ID
    subject, grade,
    mode
  };

  const res = await fetch(backendUrl + "/summarize", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });
  const json = await res.json();

  if (!res.ok || !json?.data) {
    document.getElementById('schsnip-output').innerHTML =
      `<div class="schsnip-mono">Error: ${JSON.stringify(json || {}, null, 2)}</div>`;
    window.__schsnip_showModal();
    return;
  }

  const html = renderLessonHTML(json.data);
  document.getElementById('schsnip-output').innerHTML = html;
  window.__schsnip_showModal();
}

// init
function init(){ ensureUI(); }
document.addEventListener('yt-page-data-updated', init);
setTimeout(init, 2000);
