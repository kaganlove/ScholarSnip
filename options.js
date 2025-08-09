document.addEventListener("DOMContentLoaded", () => {
  const saveButton = document.getElementById("saveKey");
  const apiKeyInput = document.getElementById("apiKey");
  const statusText = document.getElementById("status");

  saveButton.addEventListener("click", () => {
    const key = apiKeyInput.value;
    chrome.storage.local.set({ openai_api_key: key }, () => {
      statusText.textContent = "API key saved successfully!";
      setTimeout(() => statusText.textContent = "", 3000);
    });
  });
});