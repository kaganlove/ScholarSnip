# ScholarSnip

Chrome extension that summarizes YouTube videos into timestamped study notes.

## How to Run Locally

1. Open Chrome and go to `chrome://extensions`
2. Enable Developer Mode (top right)
3. Click "Load unpacked"
4. Select the `ScholarSnip` folder
5. Navigate to any YouTube video
6. Click the extension icon and "Summarize This Video"

The extension currently only shows a test alert. Transcript extraction and AI summarization will come next.

## Repo Structure

- `manifest.json` - Chrome extension config
- `popup.html` / `popup.js` - Extension popup UI
- `content.js` - Script that will run on YouTube pages
- `background.js` - Service worker for later API calls
- `style.css` - Basic styling for popup

---

Phase 1 MVP: YouTube support with transcript + AI summary.
