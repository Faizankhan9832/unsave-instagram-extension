(() => {
  const ns = window.__IG_UNSAVE__;
  if (!ns) throw new Error("Unsave Helper: config.js must load first.");

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function getLabel(el) {
    return [
      el.getAttribute?.("aria-label"),
      el.getAttribute?.("title"),
      el.textContent
    ]
      .filter(Boolean)
      .map(normalizeText)
      .join(" | ");
  }

  function isVisible(el) {
    if (!el) return false;

    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  /*
   * IMPORTANT:
   *
   * Instagram currently uses more than one representation for the
   * bookmark state. In particular, the bookmark SVG can use:
   *
   *     aria-label="Remove"
   *
   * when the post IS saved.
   *
   * Older/other layouts can expose:
   *
   *     aria-label="Remove from saved"
   *
   * So we check BOTH the actual button and SVG/icon descendants.
   */

  function isSavedLabel(label) {
    const text = normalizeText(label);

    return (
      text.includes("remove from saved") ||
      text.includes("remove from save") ||
      text === "remove" ||
      text.includes("| remove |") ||
      text.includes("unsave")
    );
  }

  function isUnsavedLabel(label) {
    const text = normalizeText(label);

    return (
      text === "save" ||
      text === "add to saved" ||
      text === "add to saved |" ||
      text.includes("add to saved") ||
      text.includes("save post")
    );
  }

  function getDialog() {
    return document.querySelector('div[role="dialog"]');
  }

  function getRoot(root) {
    return root || getDialog() || document;
  }

  function getButtons(root) {
    const scope = getRoot(root);

    return [
      ...scope.querySelectorAll(
        'button, [role="button"]'
      )
    ].filter(isVisible);
  }

  function getBookmarkIcons(root) {
    const scope = getRoot(root);

    return [
      ...scope.querySelectorAll(
        'svg[aria-label], [role="img"][aria-label]'
      )
    ].filter(isVisible);
  }

  /*
   * Find the actual clickable element associated with an icon.
   *
   * Instagram frequently puts aria-label="Remove" on the SVG rather
   * than on the button itself.
   */
  function clickableParent(element) {
    if (!element) return null;

    const parent =
      element.closest("button,[role='button']");

    if (parent && isVisible(parent)) {
      return parent;
    }

    return isVisible(element) ? element : null;
  }

  function findSavedButton(root = getDialog() || document) {
    const scope = getRoot(root);

    /*
     * 1. Most reliable current Instagram case:
     *
     *     <svg aria-label="Remove">
     *
     * inside the bookmark button.
     */
    const removeIcon = [
      ...scope.querySelectorAll(
        'svg[aria-label="Remove"], [role="img"][aria-label="Remove"]'
      )
    ].find(isVisible);

    if (removeIcon) {
      const button = clickableParent(removeIcon);
      if (button) {
        return button;
      }
    }

    /*
     * 2. Explicit "Remove from saved" label.
     */
    const buttons = getButtons(scope);

    const explicitSaved = buttons.find(button =>
      isSavedLabel(getLabel(button))
    );

    if (explicitSaved) {
      return explicitSaved;
    }

    /*
     * 3. The aria-label may be attached to a nested SVG or span.
     */
    for (const icon of getBookmarkIcons(scope)) {
      if (isSavedLabel(icon.getAttribute("aria-label"))) {
        const button = clickableParent(icon);

        if (button) {
          return button;
        }
      }
    }

    return null;
  }

  function findUnsavedButton(root = getDialog() || document) {
    const scope = getRoot(root);

    /*
     * Current Instagram can expose:
     *
     *     <svg aria-label="Save">
     *
     * when the post is no longer saved.
     */
    const saveIcon = [
      ...scope.querySelectorAll(
        'svg[aria-label="Save"], [role="img"][aria-label="Save"]'
      )
    ].find(isVisible);

    if (saveIcon) {
      const button = clickableParent(saveIcon);
      if (button) return button;
    }

    const buttons = getButtons(scope);

    const explicitUnsaved = buttons.find(button =>
      isUnsavedLabel(getLabel(button))
    );

    if (explicitUnsaved) {
      return explicitUnsaved;
    }

    for (const icon of getBookmarkIcons(scope)) {
      if (isUnsavedLabel(icon.getAttribute("aria-label"))) {
        const button = clickableParent(icon);

        if (button) {
          return button;
        }
      }
    }

    return null;
  }

  function getButtonDiagnostics(root) {
    const scope = getRoot(root);

    const buttons = getButtons(scope).map(el => ({
      tag: el.tagName,
      aria: el.getAttribute("aria-label"),
      title: el.getAttribute("title"),
      text: (el.textContent || "").trim().slice(0, 100),
      html: el.innerHTML.slice(0, 300)
    }));

    const icons = getBookmarkIcons(scope).map(el => ({
      tag: el.tagName,
      aria: el.getAttribute("aria-label"),
      parent: el.parentElement?.tagName,
      parentAria: el.parentElement?.getAttribute("aria-label")
    }));

    return {
      buttons,
      icons
    };
  }

  async function waitForDialog() {
    const deadline = Date.now() + 10000;

    while (Date.now() < deadline) {
      const dialog = getDialog();

      if (dialog && isVisible(dialog)) {
        return dialog;
      }

      await ns.rateLimiter.sleep(250);
    }

    return null;
  }

  async function waitForSavedState(root) {
    const deadline = Date.now() + 7000;

    while (Date.now() < deadline) {
      const savedButton = findSavedButton(root);

      if (savedButton) {
        return {
          type: "saved",
          element: savedButton
        };
      }

      const unsavedButton = findUnsavedButton(root);

      if (unsavedButton) {
        return {
          type: "already-unsaved",
          element: unsavedButton
        };
      }

      await ns.rateLimiter.sleep(300);
    }

    return null;
  }

  function clickElement(element) {
    if (!element) {
      throw new Error("Cannot click a missing element.");
    }

    element.scrollIntoView({
      block: "center",
      inline: "center"
    });

    /*
     * Use a real sequence of mouse events plus click.
     * This works better with React-style event handlers than
     * relying on only dispatchEvent().
     */
    element.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );

    element.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );

    element.click();
  }

  async function openPost(url) {
    const cleanTarget = ns.stateTracker.getCleanUrl(url);
    const cleanCurrent = ns.stateTracker.getCleanUrl(location.href);

    if (
      cleanTarget === cleanCurrent &&
      getDialog()
    ) {
      return getDialog();
    }

    const link = [
      ...document.querySelectorAll(
        ns.config.selectors.postLinks.join(",")
      )
    ].find(a =>
      ns.stateTracker.getCleanUrl(a.href) === cleanTarget
    );

    if (link) {
      clickElement(link);
    } else {
      /*
       * This is only a fallback. Normally the saved-page card
       * link should exist in the DOM.
       */
      location.href = url;
    }

    return await waitForDialog();
  }

  async function closePostView() {
    const dialog = getDialog();

    if (!dialog) {
      return true;
    }

    const closeButtons = [
      ...dialog.querySelectorAll(
        ns.config.selectors.closeButtons.join(",")
      )
    ].filter(isVisible);

    if (closeButtons.length) {
      clickElement(closeButtons[0]);
    } else {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true
        })
      );
    }

    const deadline = Date.now() + 5000;

    while (Date.now() < deadline) {
      if (!getDialog()) {
        return true;
      }

      await ns.rateLimiter.sleep(250);
    }

    return !getDialog();
  }

  async function unsavePost(post) {
    const url =
      typeof post === "string"
        ? post
        : post?.href;

    if (!url) {
      throw new Error("Post URL is missing.");
    }

    await ns.rateLimiter.waitForNextAction();

    let dialog = null;

    try {
      dialog = await openPost(url);

      if (!dialog) {
        throw new Error("Could not open post dialog.");
      }

      await ns.rateLimiter.sleep(
        ns.config.delays.afterOpenPost
      );

      const state = await waitForSavedState(dialog);

      if (!state) {
        /*
         * This is now MUCH more useful than the previous diagnostic.
         *
         * It prints both buttons AND SVG aria-labels, which tells us
         * exactly how Instagram represented the bookmark.
         */
        ns.log(
          "Bookmark diagnostics:",
          getButtonDiagnostics(dialog)
        );

        throw new Error(
          "Could not find the Saved/bookmark button."
        );
      }

      /*
       * If we already see "Save", the post isn't saved anymore.
       */
      if (state.type === "already-unsaved") {
        await closePostView();

        return "already-unsaveable";
      }

      /*
       * We found the saved bookmark.
       */
      clickElement(state.element);

      await ns.rateLimiter.sleep(
        ns.config.delays.afterClick
      );

      /*
       * Verify that Instagram changed the icon from Remove -> Save.
       *
       * We don't count the post as unsaved merely because .click()
       * returned. We verify the DOM state.
       */
      const verificationDeadline =
        Date.now() + 7000;

      while (Date.now() < verificationDeadline) {
        dialog = getDialog() || dialog;

        if (findUnsavedButton(dialog)) {
          await closePostView();

          return "unsaved";
        }

        /*
         * If the dialog was re-rendered, search again.
         */
        const newSavedButton =
          findSavedButton(dialog);

        if (!newSavedButton) {
          /*
           * The saved button disappeared during the React
           * re-render. Give Instagram a little time before
           * deciding whether the click worked.
           */
          await ns.rateLimiter.sleep(300);

          if (findUnsavedButton(dialog)) {
            await closePostView();

            return "unsaved";
          }
        }

        await ns.rateLimiter.sleep(300);
      }

      ns.log(
        "Verification diagnostics:",
        getButtonDiagnostics(dialog)
      );

      throw new Error(
        "Bookmark click happened, but Instagram did not show the unsaved state."
      );

    } catch (error) {
      ns.error(
        "FAILED:",
        url,
        error?.message || error
      );

      try {
        await closePostView();
      } catch {}

      return "failed";
    }
  }

  ns.actions = {
    unsavePost,
    closePostView,
    findSavedButton,
    findUnsavedButton,
    getButtonDiagnostics,
    isVisible
  };
})();