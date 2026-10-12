(() => {
  const ns = window.__IG_UNSAVE__ ||= {};

  ns.config = {
    version: 1,

    // Keep delays conservative. Instagram can change DOM/state while we work.
    delays: {
      betweenActionsMin: 1800,
      betweenActionsMax: 3200,
      afterOpenPost: 900,
      afterClick: 900,
      afterClosePost: 700,
      scanIdleWait: 1200,
      scrollStep: 650,
      scrollWait: 1200
    },

    limits: {
      maxActionsPerRun: 500,
      maxScanRoundsWithoutNewPost: 6,
      maxOpenRetries: 3,
      maxUnsaveRetries: 2
    },

    selectors: {
      postLinks: [
        'a[href*="/p/"]',
        'a[href*="/reel/"]',
        'a[href*="/tv/"]'
      ],

      dialog: [
        'div[role="dialog"]'
      ],

      closeButtons: [
        'button[aria-label="Close"]',
        'div[role="dialog"] button[aria-label="Close"]',
        'div[role="dialog"] [role="button"][aria-label="Close"]'
      ],

      actionButtons: [
        'button',
        '[role="button"]'
      ]
    },

    labels: {
      saved: [
        "Remove",
        "Remove from saved",
        "Remove from Saved",
        "Unsave"
      ],
      unsaved: [
        "Save",
        "Add to saved",
        "Add to Saved"
      ]
    },

    storageKey: "igUnsaveHelperStateV1"
  };

  ns.log = (...args) => console.log("[Unsave Helper]", ...args);
  ns.warn = (...args) => console.warn("[Unsave Helper]", ...args);
  ns.error = (...args) => console.error("[Unsave Helper]", ...args);
})();