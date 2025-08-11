async function getCfg() {
  return new Promise(resolve =>
    chrome.storage.sync.get(["backendUrl","frameworkId","subject","grade"], resolve)
  );
}
async function setCfg(patch) {
  return new Promise(resolve => chrome.storage.sync.set(patch, resolve));
}
async function fetchJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
  return await r.json();
}

// Frameworks = Common Core, TEKS, …
async function loadFrameworks(backendUrl, selectedId) {
  const sel = document.getElementById("framework");
  sel.innerHTML = "<option value=''>Loading...</option>";
  try {
    const sets = await fetchJSON(backendUrl + "/standards");
    sel.innerHTML = "<option value=''>Select a standards framework</option>";
    (sets || []).forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;         // e.g., "common-core", "teks"
      opt.textContent = s.label; // e.g., "Common Core"
      sel.appendChild(opt);
    });
    if (selectedId) sel.value = selectedId;
  } catch (e) {
    console.error(e);
    sel.innerHTML = "<option value=''>Failed to load</option>";
  }
}

// Subjects & grades from backend meta for the selected framework
async function loadSubjectAndGrade(backendUrl, frameworkId, chosenSubject, chosenGrade) {
  const sub = document.getElementById("subject");
  const grd = document.getElementById("grade");
  sub.innerHTML = "<option value=''>Loading...</option>";
  grd.innerHTML = "<option value=''>Loading...</option>";
  sub.disabled = grd.disabled = true;

  if (!frameworkId) {
    sub.innerHTML = "<option value=''>Select a framework first</option>";
    grd.innerHTML = "<option value=''>Select a framework first</option>";
    return;
  }

  try {
    const meta = await fetchJSON(`${backendUrl}/standards/framework/${encodeURIComponent(frameworkId)}/meta`);

    // make unique + sorted
    const subjects = Array.from(new Set(meta.subjects || [])).sort((a,b)=>a.localeCompare(b));
    // Try to sort grades numerically where possible, otherwise fallback alpha
    const grades = Array.from(new Set(meta.grades || []))
      .sort((a,b) => (parseInt(a) || a).toString().localeCompare((parseInt(b) || b).toString(), undefined, { numeric: true }));

    sub.innerHTML = "<option value=''>Any</option>";
    subjects.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      sub.appendChild(opt);
    });

    grd.innerHTML = "<option value=''>Any</option>";
    grades.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      grd.appendChild(opt);
    });

    if (chosenSubject) sub.value = chosenSubject;
    if (chosenGrade) grd.value = chosenGrade;

    sub.disabled = grd.disabled = false;
  } catch (e) {
    console.error(e);
    sub.innerHTML = "<option value=''>Failed to load</option>";
    grd.innerHTML = "<option value=''>Failed to load</option>";
  }
}

(async () => {
  const cfg = await getCfg();
  // default to your running backend on 3000
  const backendUrl = cfg.backendUrl || "http://localhost:3000";

  await loadFrameworks(backendUrl, cfg.frameworkId);
  await loadSubjectAndGrade(backendUrl, cfg.frameworkId, cfg.subject, cfg.grade);

  document.getElementById("framework").addEventListener("change", async (e) => {
    await setCfg({ frameworkId: e.target.value, subject: "", grade: "" });
    await loadSubjectAndGrade(backendUrl, e.target.value, "", "");
  });

  document.getElementById("save").addEventListener("click", async () => {
    const patch = {
      frameworkId: document.getElementById("framework").value || "",
      subject: document.getElementById("subject").value || "",
      grade: document.getElementById("grade").value || ""
    };
    await setCfg(patch);
    alert("Saved!");
  });
})();
