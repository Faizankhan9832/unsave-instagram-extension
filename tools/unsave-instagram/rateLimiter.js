(() => {
  const ns = window.__IG_UNSAVE__;
  if (!ns) throw new Error("Unsave Helper: config.js must load first.");

  function randomBetween(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  let lastActionAt = 0;

  async function waitForNextAction() {
    const cfg = ns.config.delays;
    const now = Date.now();
    const minimumGap = randomBetween(
      cfg.betweenActionsMin,
      cfg.betweenActionsMax
    );

    const elapsed = now - lastActionAt;
    if (elapsed < minimumGap) {
      await sleep(minimumGap - elapsed);
    }

    lastActionAt = Date.now();
  }

  ns.rateLimiter = {
    sleep,
    waitForNextAction,
    randomBetween
  };
})();