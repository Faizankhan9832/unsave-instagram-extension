(() => {
  const ns = window.__IG_UNSAVE__;
  if (!ns) throw new Error("Unsave Helper: config.js must load first.");

  function cleanUrl(url) {
    return ns.stateTracker.getCleanUrl(url);
  }

  function getPostLinks() {
    const nodes = [
      ...document.querySelectorAll(ns.config.selectors.postLinks.join(","))
    ];

    const seen = new Set();
    const posts = [];

    for (const node of nodes) {
      const href = node.href;
      if (!href) continue;

      const clean = cleanUrl(href);
      if (!/^https:\/\/www\.instagram\.com\/(p|reel|tv)\//.test(clean)) {
        continue;
      }

      if (seen.has(clean)) continue;
      seen.add(clean);

      posts.push({
        href: clean,
        element: node
      });
    }

    return posts;
  }

  async function collectPosts(onUpdate) {
    const all = new Map();
    let stagnantRounds = 0;

    for (let round = 0; round < 100; round++) {
      const before = all.size;

      for (const post of getPostLinks()) {
        all.set(post.href, post);
      }

      const added = all.size - before;
      if (added === 0) stagnantRounds += 1;
      else stagnantRounds = 0;

      await ns.stateTracker.setTotalFound(all.size);
      onUpdate?.(all.size);

      if (stagnantRounds >= ns.config.limits.maxScanRoundsWithoutNewPost) {
        break;
      }

      const scrollHeightBefore = document.documentElement.scrollHeight;
      window.scrollBy(0, ns.config.delays.scrollStep);
      await ns.rateLimiter.sleep(ns.config.delays.scrollWait);

      const scrollHeightAfter = document.documentElement.scrollHeight;

      if (
        scrollHeightAfter === scrollHeightBefore &&
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 20
      ) {
        // One extra wait catches late-loading cards.
        await ns.rateLimiter.sleep(ns.config.delays.scanIdleWait);
      }
    }

    return [...all.values()];
  }

  function getPendingPosts(posts) {
    return posts.filter(post => !ns.stateTracker.isProcessed(post.href));
  }

  ns.scanner = {
    getPostLinks,
    collectPosts,
    getPendingPosts
  };
})();