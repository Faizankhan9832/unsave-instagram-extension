(() => {
  const ns = window.__IG_UNSAVE__;
  if (!ns) throw new Error("Unsave Helper: modules did not load in order.");

  let initialized = false;
  let running = false;
  let posts = [];

  function refreshUI(status) {
    const state = ns.stateTracker.get();
    ns.uiPanel?.update(state);
    if (status) ns.uiPanel?.setStatus(status);
  }

  async function init() {
    if (initialized) return;
    initialized = true;

    await ns.stateTracker.load();
    ns.panel.mount();
    refreshUI("Ready. Open Instagram Saved posts and scan.");

    // Re-render-safe observer: Instagram is an SPA and replaces DOM nodes often.
    const observer = new MutationObserver(() => {
      if (!document.getElementById("iguh-panel")) {
        ns.panel.mount();
        refreshUI();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    ns.app = {
      scan,
      run,
      togglePause,
      reset,
      destroy: () => observer.disconnect()
    };
  }

  async function scan() {
    if (running) return;

    try {
      refreshUI("Scanning visible and lazily-loaded posts...");
      posts = await ns.scanner.collectPosts(total => {
        refreshUI(`Scanning... found ${total} posts`);
      });

      const pending = ns.scanner.getPendingPosts(posts);

      refreshUI(
        `Scan complete. Found ${posts.length}; ${pending.length} pending.`
      );
    } catch (error) {
      ns.error("Scan failed:", error);
      refreshUI(`Scan failed: ${error.message}`);
    }
  }

  async function run() {
    if (running) return;

    if (!posts.length) {
      await scan();
    }

    posts = posts.length
      ? posts
      : ns.scanner.getPostLinks();

    let pending = ns.scanner.getPendingPosts(posts);

    if (!pending.length) {
      refreshUI("Nothing pending.");
      return;
    }

    const max = Math.min(
      pending.length,
      ns.config.limits.maxActionsPerRun
    );

    running = true;
    await ns.stateTracker.markRunning(true);
    ns.uiPanel.setBusy(true);

    try {
      for (let i = 0; i < max; i++) {
        while (ns.stateTracker.get().paused) {
          refreshUI("Paused");
          await ns.rateLimiter.sleep(500);
        }

        const post = pending[i];
        refreshUI(`Processing ${i + 1} / ${max}`);

        if (ns.stateTracker.isProcessed(post.href)) {
          continue;
        }

        const result = await ns.actions.unsavePost(post);

        await ns.stateTracker.markProcessed(post.href, result);
        refreshUI(
          result === "unsaved"
            ? "Unsaved successfully."
            : result === "already-unsaveable"
              ? "Already not saved."
              : "Failed — continuing."
        );
      }

      refreshUI(
        max < pending.length
          ? `Stopped at safety limit (${max}). Run again to continue.`
          : "Run complete."
      );
    } finally {
      running = false;
      await ns.stateTracker.markRunning(false);
      ns.uiPanel.setBusy(false);
      refreshUI();
    }
  }

  async function togglePause() {
    const paused = ns.stateTracker.get().paused;
    await ns.stateTracker.setPaused(!paused);
    refreshUI(!paused ? "Paused" : "Resuming...");
  }

  async function reset() {
    if (running) return;

    if (!confirm("Reset saved progress? This does not re-save any Instagram posts.")) {
      return;
    }

    await ns.stateTracker.reset();
    posts = [];
    refreshUI("Progress reset.");
  }

  function destroy() {
    ns.app?.destroy?.();
    initialized = false;
  }

  // Instagram can replace the document body during navigation.
  const boot = () => {
    if (document.body) init().catch(ns.error);
    else setTimeout(boot, 250);
  };

  boot();

  ns.appInit = init;
  ns.appDestroy = destroy;
})();