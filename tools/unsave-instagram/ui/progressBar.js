(() => {
  const ns = window.__IG_UNSAVE__;
  if (!ns) throw new Error("Unsave Helper: config.js must load first.");

  let els = null;

  function mount(root) {
    if (!root) return;

    root.innerHTML = `
      <div class="iguh-progress-track">
        <div class="iguh-progress-fill"></div>
      </div>
      <div class="iguh-progress-text">0 / 0</div>
    `;

    els = {
      fill: root.querySelector(".iguh-progress-fill"),
      text: root.querySelector(".iguh-progress-text")
    };
  }

  function update(state) {
    if (!els) return;

    const total = Math.max(state.totalFound, state.processed);
    const processed = Math.min(state.processed, total);
    const percent = total ? Math.round((processed / total) * 100) : 0;

    els.fill.style.width = `${percent}%`;
    els.text.textContent =
      `${processed} / ${total} • ${percent}% • ` +
      `${state.unsaved} unsaved • ${state.failed} failed`;
  }

  ns.progressBar = {
    mount,
    update
  };
})();