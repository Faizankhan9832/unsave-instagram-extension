(() => {
  const ns = window.__IG_UNSAVE__;
  if (!ns) throw new Error("Unsave Helper: config.js must load first.");

  let root = null;
  let els = null;

  function mount() {
    if (document.getElementById("iguh-panel")) return;

    root = document.createElement("div");
    root.id = "iguh-panel";

    root.innerHTML = `
      <div class="iguh-header">
        <strong>Instagram Unsave Helper</strong>
        <button class="iguh-minimize" type="button" title="Minimize">−</button>
      </div>

      <div class="iguh-body">
        <div class="iguh-status">Ready</div>

        <div class="iguh-progress"></div>

        <div class="iguh-stats">
          <span>Found: <b data-k="totalFound">0</b></span>
          <span>Done: <b data-k="processed">0</b></span>
          <span>Failed: <b data-k="failed">0</b></span>
        </div>

        <div class="iguh-current" data-k="currentUrl">No post processed yet.</div>

        <div class="iguh-actions">
          <button class="iguh-primary" data-action="scan">Scan saved posts</button>
          <button data-action="run">Unsave all found</button>
          <button data-action="pause" disabled>Pause</button>
          <button data-action="reset">Reset progress</button>
        </div>

        <div class="iguh-note">
          Keep Instagram open and do not navigate away while a run is active.
        </div>
      </div>
    `;

    document.body.appendChild(root);

    els = {
      body: root.querySelector(".iguh-body"),
      status: root.querySelector(".iguh-status"),
      progress: root.querySelector(".iguh-progress"),
      totalFound: root.querySelector('[data-k="totalFound"]'),
      processed: root.querySelector('[data-k="processed"]'),
      failed: root.querySelector('[data-k="failed"]'),
      currentUrl: root.querySelector('[data-k="currentUrl"]'),
      scan: root.querySelector('[data-action="scan"]'),
      run: root.querySelector('[data-action="run"]'),
      pause: root.querySelector('[data-action="pause"]'),
      reset: root.querySelector('[data-action="reset"]'),
      minimize: root.querySelector(".iguh-minimize")
    };

    ns.progressBar.mount(els.progress);

    els.minimize.addEventListener("click", () => {
      root.classList.toggle("iguh-collapsed");
      els.minimize.textContent =
        root.classList.contains("iguh-collapsed") ? "+" : "−";
    });

    els.scan.addEventListener("click", () => ns.app?.scan());
    els.run.addEventListener("click", () => ns.app?.run());
    els.pause.addEventListener("click", () => ns.app?.togglePause());
    els.reset.addEventListener("click", () => ns.app?.reset());

    ns.uiPanel = {
      update,
      setBusy,
      setStatus
    };
  }

  function setStatus(text) {
    if (els) els.status.textContent = text;
  }

  function setBusy(busy) {
    if (!els) return;

    els.scan.disabled = busy;
    els.run.disabled = busy;
    els.reset.disabled = busy;
    els.pause.disabled = !busy;
    els.pause.textContent = "Pause";
  }

  function update(state) {
    if (!els) return;

    els.totalFound.textContent = state.totalFound;
    els.processed.textContent = state.processed;
    els.failed.textContent = state.failed;
    els.currentUrl.textContent =
      state.currentUrl || "No post processed yet.";

    ns.progressBar.update(state);
  }

  ns.panel = {
    mount
  };
})();