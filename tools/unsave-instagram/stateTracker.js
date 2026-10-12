(() => {
  const ns = window.__IG_UNSAVE__;
  if (!ns) throw new Error("Unsave Helper: config.js must load first.");

  const emptyState = () => ({
    running: false,
    paused: false,
    startedAt: null,
    updatedAt: null,
    totalFound: 0,
    processed: 0,
    unsaved: 0,
    alreadyUnsaveable: 0,
    failed: 0,
    scanned: 0,
    currentUrl: "",
    failedUrls: [],
    processedUrls: []
  });

  let state = emptyState();

  function cleanUrl(url) {
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return String(url || "");
    }
  }

  async function load() {
    const result = await chrome.storage.local.get(ns.config.storageKey);
    if (result[ns.config.storageKey]) {
      state = {
        ...emptyState(),
        ...result[ns.config.storageKey]
      };
    }
    return get();
  }

  async function save() {
    state.updatedAt = Date.now();
    await chrome.storage.local.set({
      [ns.config.storageKey]: state
    });
    return get();
  }

  function get() {
    return JSON.parse(JSON.stringify(state));
  }

  function reset() {
    state = emptyState();
    return save();
  }

  function markRunning(value) {
    state.running = Boolean(value);
    if (value && !state.startedAt) state.startedAt = Date.now();
    return save();
  }

  function setPaused(value) {
    state.paused = Boolean(value);
    return save();
  }

  function setTotalFound(total) {
    state.totalFound = Math.max(state.totalFound, Number(total) || 0);
    return save();
  }

  function markScanned() {
    state.scanned += 1;
    return save();
  }

  function markProcessed(url, result) {
    const clean = cleanUrl(url);

    if (!state.processedUrls.includes(clean)) {
      state.processedUrls.push(clean);
    }

    state.processed += 1;
    state.currentUrl = clean;

    if (result === "unsaved") state.unsaved += 1;
    else if (result === "already-unsaveable") state.alreadyUnsaveable += 1;
    else if (result === "failed") {
      state.failed += 1;
      if (!state.failedUrls.includes(clean)) {
        state.failedUrls.push(clean);
      }
    }

    return save();
  }

  function isProcessed(url) {
    return state.processedUrls.includes(cleanUrl(url));
  }

  function getCleanUrl(url) {
    return cleanUrl(url);
  }

  ns.stateTracker = {
    load,
    save,
    reset,
    get,
    markRunning,
    setPaused,
    setTotalFound,
    markScanned,
    markProcessed,
    isProcessed,
    getCleanUrl
  };
})();