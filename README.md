# Instagram Saved Posts Unsave Helper

A Chrome extension (Manifest V3) that scans your Instagram saved posts and unsaves them one by one, with throttling and progress tracking.

> **Disclaimer:** This is an unofficial tool and is not affiliated with or endorsed by Instagram or Meta. Automating actions on Instagram may go against its Terms of Use. Use it only on your own account and at your own risk.

## What it does

1. Adds a floating control panel on Instagram.
2. Scans post/reel links while scrolling your Saved page.
3. Opens each post.
4. Finds the bookmark ("Remove" / "Remove from saved") button using accessible labels instead of fragile CSS class names.
5. Clicks it and verifies the state changed to "Save".
6. Closes the post.
7. Waits a randomized delay (about 1.8-3.2 seconds) before the next action.
8. Saves progress in `chrome.storage.local`, so a run can be resumed.
9. Continues after failures instead of stopping the whole run.

A single run is capped at 500 posts as a safety limit. Run it again to continue.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the repository folder (the one containing `manifest.json`).
5. Open Instagram and go to your **Saved** page.
6. In the floating panel, click **Scan saved posts**.
7. When the scan finishes, click **Unsave all found**.

The panel also has **Pause** and **Reset progress** buttons. Resetting only clears the extension's own progress. It does not re-save anything on Instagram.

## Project structure

```
manifest.json
tools/unsave-instagram/
├── config.js        # delays, limits, selectors
├── rateLimiter.js   # randomized delays between actions
├── stateTracker.js  # progress saved in chrome.storage.local
├── actions.js       # opens posts, finds and clicks the bookmark button
├── scanner.js       # scrolls the page and collects post links
├── index.js         # ties everything together
└── ui/
    ├── panel.js
    ├── panel.css
    └── progressBar.js
```

Content scripts in Chrome are classic scripts, not ES modules, so `manifest.json` loads the files in dependency order.

## Troubleshooting

Instagram changes its page structure often. If the extension can't find the bookmark button, open DevTools (F12) and look in the Console for messages starting with `[Unsave Helper]`. A "Bookmark diagnostics" entry lists the buttons and icons it saw. The label matching lives in `tools/unsave-instagram/actions.js`, and delays and limits are in `config.js`.

Please don't lower the delays too far. They are intentionally conservative.
