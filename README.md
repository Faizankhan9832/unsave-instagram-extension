# Instagram Saved Posts Unsave Helper

## Folder

This package is intended to be placed in a Chrome extension project as:

tools/unsave-instagram/

The manifest included here loads the files in dependency order because Chrome
content scripts are classic scripts, not ES modules.

## What it does

1. Adds a floating control panel on Instagram.
2. Scans post/reel links while scrolling the page.
3. Opens each post.
4. Finds the actual Instagram "Remove from saved" button by accessible label,
   rather than relying on fragile CSS class names.
5. Clicks it.
6. Verifies that the state changed to "Save".
7. Closes the post.
8. Waits a randomized delay before the next action.
9. Saves progress in chrome.storage.local.
10. Continues after failures instead of stopping the entire run.

## Install

1. Put this folder in your extension project.
2. Make sure manifest.json is at the extension root.
3. Open chrome://extensions.
4. Enable Developer mode.
5. Click Load unpacked.
6. Select the extension root.
7. Open Instagram.
8. Open your Saved page.
9. Use "Scan saved posts".
10. After scanning, use "Unsave all found".

## Important

Instagram changes its DOM frequently. This version deliberately avoids
Instagram's generated CSS class names and prefers aria-label/title/text signals.

The most important diagnostic is printed to DevTools if the saved button cannot
be found:

[Unsave Helper] Visible button labels: ...

If Instagram changes the accessible label again, update only config.js labels.

Do not run this at very high speed. The included delays are intentionally
conservative.

## Current project structure

tools/unsave-instagram/
├── index.js
├── scanner.js
├── actions.js
├── rateLimiter.js
├── stateTracker.js
├── ui/
│   ├── panel.js
│   ├── panel.css
│   └── progressBar.js
└── config.js
