document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const frameworkSel = document.getElementById("standardsFramework");
  const subjectInput = document.getElementById("subject");
  const gradeInput = document.getElementById("gradeLevel");
  const saveBtn = document.getElementById("saveKey");
  const status = document.getElementById("status");

  chrome.storage.local.get(["openai_api_key","standardsFramework","subject","gradeLevel"], (res) => {
    if (res.openai_api_key) apiKeyInput.value = res.openai_api_key;
    if (res.standardsFramework) frameworkSel.value = res.standardsFramework;
    if (res.subject) subjectInput.value = res.subject;
    if (res.gradeLevel) gradeInput.value = res.gradeLevel;
  });

  saveBtn.addEventListener("click", () => {
    chrome.storage.local.set({
      openai_api_key: apiKeyInput.value.trim(),
      standardsFramework: frameworkSel.value,
      subject: subjectInput.value.trim(),
      gradeLevel: gradeInput.value.trim()
    }, () => {
      status.textContent = "Settings saved!";
      setTimeout(()=> status.textContent = "", 1500);
    });
  });
});