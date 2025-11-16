// set the tooltip offset from the button
const TOOLTIP_OFFSET = 8;

// attach enter to save formula
function attachEnterToSave(tooltip, ta) {
  if (ta.dataset.formulaEnterAttached) return;
  ta.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      const actionBtn = tooltip.querySelector('.ql-action');
      if (actionBtn && typeof actionBtn.click === 'function') {
        actionBtn.click();
      }
    }
  });
  ta.dataset.formulaEnterAttached = 'true';
}

function positionTooltipByButton(tooltip, btn, quill, {
  offset = TOOLTIP_OFFSET,
  defaultWidth = 520,
  defaultHeight = 56,
} = {}) {
  try {
    // Ensure layout to measure tooltip
    tooltip.style.position = 'fixed';
    tooltip.style.visibility = 'hidden';
    tooltip.style.left = '0px';
    tooltip.style.top = '0px';
    const tWidth = tooltip.offsetWidth || defaultWidth;
    const tHeight = tooltip.offsetHeight || defaultHeight;

    if (btn && typeof btn.getBoundingClientRect === 'function') {
      const brect = btn.getBoundingClientRect();
      let left = brect.left;
      let top = brect.bottom + offset;
      // Clamp to viewport
      left = Math.min(Math.max(left, offset), window.innerWidth - tWidth - offset);
      top = Math.min(Math.max(top, offset), window.innerHeight - tHeight - offset);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      tooltip.style.visibility = '';
    } else if (quill) {
      positionTooltipNearSelection(tooltip, quill, { offset });
    }
  } catch (_) {}
}

function addFormulaBtnToToolbar(toolbar) {
  /* Override Quill toolbar to include a formula button, for every text box on the page */

  // Check if the toolbar exists
  if (!toolbar) return;
  
  // Locate or create a formula button
  let button = toolbar.querySelector('button.ql-formula');
  const created = !button;
  if (!button) {
    button = document.createElement('button');
    button.className = 'ql-formula';
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<svg viewBox="0 0 18 18"><path class="ql-fill" d="M11.759,2.482a2.561,2.561,0,0,0-3.53.607A7.656,7.656,0,0,0,6.8,6.2C6.109,9.188,5.275,14.677,4.15,14.927a1.545,1.545,0,0,0-1.3-.933A0.922,0.922,0,0,0,2,15.036S1.954,16,4.119,16s3.091-2.691,3.7-5.553c0.177-.826.36-1.726,0.554-2.6L8.775,6.2c0.381-1.421.807-2.521,1.306-2.676a1.014,1.014,0,0,0,1.02.56A0.966,0.966,0,0,0,11.759,2.482Z"></path><rect class="ql-fill" height="1.6" rx="0.8" ry="0.8" width="5" x="5.15" y="6.2"></rect><path class="ql-fill" d="M13.663,12.027a1.662,1.662,0,0,1,.266-0.276q0.193,0.069.456,0.138a2.1,2.1,0,0,0,.535.069,1.075,1.075,0,0,0,.767-0.3,1.044,1.044,0,0,0,.314-0.8,0.84,0.84,0,0,0-.238-0.619,0.8,0.8,0,0,0-.594-0.239,1.154,1.154,0,0,0-.781.3,4.607,4.607,0,0,0-.781,1q-0.091.15-.218,0.346l-0.246.38c-0.068-.288-0.137-0.582-0.212-0.885-0.459-1.847-2.494-.984-2.941-0.8-0.482.2-.353,0.647-0.094,0.529a0.869,0.869,0,0,1,1.281.585c0.217,0.751.377,1.436,0.527,2.038a5.688,5.688,0,0,1-.362.467,2.69,2.69,0,0,1-.264.271q-0.221-.08-0.471-0.147a2.029,2.029,0,0,0-.522-0.066,1.079,1.079,0,0,0-.768.3A1.058,1.058,0,0,0,9,15.131a0.82,0.82,0,0,0,.832.852,1.134,1.134,0,0,0,.787-0.3,5.11,5.11,0,0,0,.776-0.993q0.141-.219.215-0.34c0.046-.076.122-0.194,0.223-0.346a2.786,2.786,0,0,0,.918,1.726,2.582,2.582,0,0,0,2.376-.185c0.317-.181.212-0.565,0-0.494A0.807,0.807,0,0,1,14.176,15a5.159,5.159,0,0,1-.913-2.446l0,0Q13.487,12.24,13.663,12.027Z"></path></svg>`;
  }
  
  // Use Quill's default tooltip in formula mode, then enhance it
  const handleFormulaClick = function(e) {
    if (toolbar.dataset.formulaEnhancing === 'true') return;
    toolbar.dataset.formulaEnhancing = 'true';
    // Let Quill's native handler run first, then enhance the UI
    requestAnimationFrame(() => {
      const tooltip = toolbar.parentElement.querySelector('.ql-tooltip');
      if (!tooltip) { delete toolbar.dataset.formulaEnhancing; return; }
      tooltip.classList.remove('ql-hidden');
      tooltip.classList.add('ql-editing');
      tooltip.dataset.mode = 'formula';
      if (button) {
        button.setAttribute('aria-pressed', 'true');
      }

      // Prefer initial position below the formula button, then fallback to selection
      const q = getQuillFromToolbar(toolbar);
      positionTooltipByButton(tooltip, button, q, {
        offset: TOOLTIP_OFFSET,
        defaultWidth: 520,
        defaultHeight: 56,
      });

      // Record anchor for top-left for resize anchoring
      const rect = tooltip.getBoundingClientRect();
      tooltip.dataset.anchorLeft = String(Math.round(rect.left));
      tooltip.dataset.anchorTop = String(Math.round(rect.top));

      // Keep native input for Quill, add synced textarea for multiline editing
      const input = tooltip.querySelector('input[data-formula]');
      if (input) {
        let ta = tooltip.querySelector('textarea[data-formula-editor]');
        if (!ta) {
          ta = document.createElement('textarea');
          ta.setAttribute('data-formula-editor', '');
          ta.setAttribute('rows', '2');
          ta.placeholder = 'e=mc^2';
          ta.style.display = 'block';
          ta.style.width = '100%';
          ta.value = input.value || '';
          input.insertAdjacentElement('afterend', ta);
          // Sync changes both ways (attach once)
          if (!input.dataset.formulaSyncAttached) {
            input.addEventListener('input', () => { ta.value = input.value; });
            input.dataset.formulaSyncAttached = 'true';
          }
          if (!ta.dataset.formulaSyncAttached) {
            ta.addEventListener('input', () => { input.value = ta.value; });
            ta.dataset.formulaSyncAttached = 'true';
          }
          // Enter to Save (Shift+Enter for newline)
          attachEnterToSave(tooltip, ta);
        } else {
          ta.style.display = 'block';
          ta.value = input.value || '';
          // Ensure Enter-to-save is attached if textarea pre-existed
          attachEnterToSave(tooltip, ta);
        }
        // Focus textarea
        ta.focus();
        try { ta.select(); } catch (_) {}
      }

      makeTooltipDraggable(tooltip);
      attachTooltipOutsideClose(tooltip, [button]);
      delete toolbar.dataset.formulaEnhancing;
    });
  };

  // Attach handler to existing or newly created button (once)
  if (!button.dataset.formulaHandlerAttached) {
    // Direct handler (in case Quill doesn't re-render the toolbar)
    button.addEventListener('click', handleFormulaClick, { capture: true });
    // Delegated handler on the toolbar to survive any DOM changes
    if (!toolbar.dataset.formulaDelegateAttached) {
      toolbar.addEventListener(
        'click',
        (evt) => {
          const target = evt.target.closest && evt.target.closest('button.ql-formula');
          if (target) {
            handleFormulaClick(evt);
          }
        },
        { capture: true }
      );
      // Also handle mousedown early to preempt Quill's default handler
      toolbar.addEventListener(
        'mousedown',
        (evt) => {
          const target = evt.target.closest && evt.target.closest('button.ql-formula');
          if (target) {
            handleFormulaClick(evt);
          }
        },
        { capture: true }
      );
      toolbar.dataset.formulaDelegateAttached = 'true';
    }
    button.dataset.formulaHandlerAttached = 'true';
  }

  // Only insert if we created a new button
  if (created) {
    const codeblockBtn = toolbar.querySelector('button.ql-code-block, button.ql-codeblock');
    if (codeblockBtn) {
      const parentSpan = codeblockBtn.closest('span.ql-formats');
      if (parentSpan) {
        if (codeblockBtn.nextSibling) {
          parentSpan.insertBefore(button, codeblockBtn.nextSibling);
        } else {
          parentSpan.appendChild(button);
        }
      } else {
        toolbar.appendChild(button);
      }
    } else {
      toolbar.appendChild(button);
    }
  }

  // Ensure the Quill link button switches the shared tooltip to link mode
  if (!toolbar.dataset.linkHandlerAttached) {
    const linkBtn = toolbar.querySelector('button.ql-link');
    if (linkBtn) {
      linkBtn.addEventListener('click', () => {
        requestAnimationFrame(() => {
          const tooltip = toolbar.parentElement.querySelector('.ql-tooltip');
          if (!tooltip) return;

          // switch to link mode and reset any formula-specific inline positioning/UI
          tooltip.dataset.mode = 'link';
          tooltip.style.position = '';
          tooltip.style.left = '';
          tooltip.style.top = '';
          tooltip.style.width = '';
          tooltip.style.height = '';
          delete tooltip.dataset.anchorLeft;
          delete tooltip.dataset.anchorTop;

          // remove any formula-enhanced UI
          const ta = tooltip.querySelector('textarea[data-formula-editor]');
          if (ta && ta.parentElement) ta.parentElement.removeChild(ta);
          const finput = tooltip.querySelector('input[data-formula]');
          if (finput) finput.style.display = '';

          // ensure tooltip is visible
          tooltip.classList.remove('ql-hidden');
          tooltip.classList.add('ql-editing');

          // prefer initial position below the link button; fallback to selection
          const q = getQuillFromToolbar(toolbar);
          positionTooltipByButton(tooltip, linkBtn, q, {
            offset: TOOLTIP_OFFSET,
            defaultWidth: 360,
            defaultHeight: 56,
          });

          // attach outside-click to close and clamp/resizing behavior like formula mode does
          attachTooltipOutsideClose(tooltip, [linkBtn]);
          makeTooltipDraggable(tooltip);
        });
      });
      toolbar.dataset.linkHandlerAttached = 'true';
    }
  }
}

function clampTooltipToViewport(tooltip, offset = TOOLTIP_OFFSET) {
  try {
    const rect = tooltip.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;
    const tWidth = rect.width;
    const tHeight = rect.height;
    left = Math.min(Math.max(left, offset), window.innerWidth - tWidth - offset);
    top = Math.min(Math.max(top, offset), window.innerHeight - tHeight - offset);
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  } catch (_) {}
}

function makeTooltipDraggable(tooltip) {
  if (tooltip.dataset.draggableAttached === 'true') return;

  let dragging = false;
  let startX = 0, startY = 0, origLeft = 0, origTop = 0;

  const onMouseDown = (e) => {
    // Only allow dragging while in formula mode
    if (tooltip.dataset.mode !== 'formula') return;
    if (e.button !== 0) return;
    if (e.target.closest('input, textarea, button, a')) return;
    // Ignore mousedown in the resize grip area (bottom-right ~16px)
    const r = tooltip.getBoundingClientRect();
    if (e.clientX >= r.right - 16 && e.clientY >= r.bottom - 16) return;
    dragging = true;
    const rect = tooltip.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    origLeft = rect.left;
    origTop = rect.top;
    startX = e.clientX;
    startY = e.clientY;
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
    const prev = document.body.style.userSelect;
    document.body.dataset.prevUserSelect = prev;
    document.body.style.userSelect = 'none';
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    let left = origLeft + (e.clientX - startX);
    let top = origTop + (e.clientY - startY);
    const tWidth = tooltip.offsetWidth;
    const tHeight = tooltip.offsetHeight;
    left = Math.min(Math.max(left, TOOLTIP_OFFSET), window.innerWidth - tWidth - TOOLTIP_OFFSET);
    top = Math.min(Math.max(top, TOOLTIP_OFFSET), window.innerHeight - tHeight - TOOLTIP_OFFSET);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    // Update anchor so future resizes keep this top-left fixed
    tooltip.dataset.anchorLeft = String(Math.round(left));
    tooltip.dataset.anchorTop = String(Math.round(top));
  };

  const onMouseUp = () => {
    dragging = false;
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    if ('prevUserSelect' in document.body.dataset) {
      document.body.style.userSelect = document.body.dataset.prevUserSelect || '';
      delete document.body.dataset.prevUserSelect;
    }
  };

  tooltip.addEventListener('mousedown', onMouseDown, true);
  tooltip.dataset.draggableAttached = 'true';

  // Clamp when the element is resized by the user
  if (window.ResizeObserver && !tooltip.__resizeObserver) {
    const ro = new ResizeObserver(() => {
      // Keep top-left anchored for formula mode
      if (tooltip.dataset.mode === 'formula') {
        const aL = Number(tooltip.dataset.anchorLeft || 0);
        const aT = Number(tooltip.dataset.anchorTop || 0);
        if (!Number.isNaN(aL) && !Number.isNaN(aT)) {
          tooltip.style.position = 'fixed';
          tooltip.style.left = `${aL}px`;
          tooltip.style.top = `${aT}px`;
        }
      }
      clampTooltipToViewport(tooltip, TOOLTIP_OFFSET);
    });
    ro.observe(tooltip);
    tooltip.__resizeObserver = ro;
  }
}

function attachTooltipOutsideClose(tooltip, openerElems = []) {
  if (tooltip.dataset.closeAttached === 'true') return;

  const cleanup = () => {
    document.removeEventListener('mousedown', onDocMouseDown, true);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', onResize, true);
    if (tooltip.__resizeObserver && typeof tooltip.__resizeObserver.disconnect === 'function') {
      tooltip.__resizeObserver.disconnect();
      delete tooltip.__resizeObserver;
    }
    delete tooltip.dataset.closeAttached;
  };

  const hide = () => {
    tooltip.classList.remove('ql-editing');
    tooltip.classList.add('ql-hidden');
    openerElems.forEach((opener) => {
      if (opener && opener.classList && opener.classList.contains('ql-formula')) {
        opener.setAttribute('aria-pressed', 'false');
      }
    });
    // Reset inline styles and anchors so future non-formula tooltips (e.g. link/Visit URL)
    // are not affected by previous formula-specific layout or user resizing.
    tooltip.style.position = '';
    tooltip.style.left = '';
    tooltip.style.top = '';
    tooltip.style.width = '';
    tooltip.style.height = '';
    delete tooltip.dataset.anchorLeft;
    delete tooltip.dataset.anchorTop;
    cleanup();
  };

  const onDocMouseDown = (e) => {
    // Ignore clicks inside the tooltip or on opener buttons
    if (tooltip.contains(e.target)) return;
    for (const opener of openerElems) {
      if (opener && opener.contains && opener.contains(e.target)) return;
    }
    hide();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') hide();
  };

  const onResize = () => {
    clampTooltipToViewport(tooltip, TOOLTIP_OFFSET);
  };

  document.addEventListener('mousedown', onDocMouseDown, true);
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('resize', onResize, true);

  // Also close when clicking Apply/Cancel inside the tooltip
  tooltip.querySelectorAll('.ql-action, .ql-cancel').forEach((el) => {
    el.addEventListener('click', hide, { once: true });
  });

  tooltip.dataset.closeAttached = 'true';
}

function getQuillFromToolbar(toolbar) {
  try {
    const root = toolbar.closest && toolbar.closest('.quill')
      ? toolbar.closest('.quill')
      : (toolbar.parentElement || document);
    const editorEl =
      root.querySelector('.ql-container .ql-editor') ||
      root.querySelector('.ql-editor');
    if (editorEl && window.Quill && typeof window.Quill.find === 'function') {
      return window.Quill.find(editorEl);
    }
  } catch (_) {}
  return null;
}

/**
 * Position a Quill tooltip near the current selection/caret using getBounds.
 * Falls back and clamps within viewport.
 */
function positionTooltipNearSelection(tooltip, quill, { offset = TOOLTIP_OFFSET } = {}) {
  try {
    const sel = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
    const bounds = quill.getBounds(sel.index + sel.length);
    const container = quill.root.parentElement; // .ql-container
    const crect = container.getBoundingClientRect();

    // Ensure layout for measurements
    tooltip.style.position = 'fixed';
    tooltip.style.visibility = 'hidden';
    tooltip.style.left = '0px';
    tooltip.style.top = '0px';
    // force layout
    const tWidth = tooltip.offsetWidth || 520;
    const tHeight = tooltip.offsetHeight || 80;

    let left = crect.left + bounds.left;
    let top = crect.top + bounds.bottom + offset;

    // If doesn't fit below, place above
    if (top + tHeight > window.innerHeight - offset) {
      top = crect.top + bounds.top - tHeight - offset;
    }
    // Clamp to viewport
    left = Math.min(Math.max(left, offset), window.innerWidth - tWidth - offset);
    top = Math.min(Math.max(top, offset), window.innerHeight - tHeight - offset);

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.visibility = '';
  } catch (_) {
    // Best-effort fallback
    tooltip.style.position = 'fixed';
    tooltip.style.left = '24px';
    tooltip.style.top = '24px';
  }
}

// Ensure unique tooltip styles for each button
function ensureTooltipStyles() {
  if (document.getElementById('quill-tooltip-mode-styles')) return;
  const style = document.createElement('style');
  style.id = 'quill-tooltip-mode-styles';
  style.textContent = `
    /* Formula mode (styling applied to default Quill tooltip when in formula mode) */
    .quill .ql-tooltip[data-mode="formula"] {
      box-sizing: border-box;
      padding: 8px;
      background: #fff;
      color: #111;
      border: 1px solid rgba(0,0,0,.08);
      box-shadow: 0 4px 16px rgba(0,0,0,.08);
      border-radius: 8px;
      z-index: 1000;
      width: auto;
      min-width: 360px; /* original Quill tooltip width */
      max-width: 800px;
      min-height: 80px; /* original Quill tooltip height */
      max-height: 50vh;
      overflow: auto; /* scrolling container for sticky buttons */
      resize: both; /* Container resizable */
      cursor: default;
    }
    .quill .ql-tooltip[data-mode="formula"]:not(.ql-hidden) {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .quill .ql-tooltip[data-mode="formula"] textarea[data-formula-editor] {
      width: 100%;
      box-sizing: border-box;
      flex: 1 1 auto;
      min-height: 48px; /* below container min-height to avoid forcing larger container */
      resize: none; /* Textarea follows container, does not extend individually */
      padding: 6px 12px; /* extra left/right padding for comfort */
      height: auto;
      max-height: 100%;
      max-width: 100%;
      min-width: 0;
      cursor: text;
    }
    /* Hide the formula editor textarea in non-formula modes even if still present in the DOM */
    .quill .ql-tooltip:not([data-mode="formula"]) textarea[data-formula-editor] {
      display: none !important;
    }
    /* Keep action buttons visible (not covered/hidden) while moving/resizing/scrolling */
    .quill .ql-tooltip[data-mode="formula"] .ql-action,
    .quill .ql-tooltip[data-mode="formula"] .ql-cancel {
      position: sticky;
      bottom: 0;
      display: inline-block;
      background: #fff;
      z-index: 2;
      margin-top: 4px;
    }
    .quill .ql-tooltip[data-mode="formula"] input[data-formula] { display: none; }
    .quill .ql-tooltip:not([data-mode="formula"]) input[data-formula] { display: inline-block; }

    /* Link mode: use Quill's native styling (no overrides) */

    /* Always hide tooltip when ql-hidden is present */
    .quill .ql-tooltip.ql-hidden { display: none !important; visibility: hidden !important; opacity: 0 !important; }
    
  `;
  document.head.appendChild(style);
}

ensureTooltipStyles();

// run
const observer = new MutationObserver(() => {
  document.querySelectorAll('.quill .ql-toolbar').forEach((toolbar) => {
    addFormulaBtnToToolbar(toolbar);
  });
});
observer.observe(document.body, { childList: true, subtree: true });