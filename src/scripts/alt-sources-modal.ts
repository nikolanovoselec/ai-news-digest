// Implements REQ-READ-002 — alt-sources modal open/close.
// Extracted from src/components/AltSourcesModal.astro. The site CSP `script-src 'self'` silently
// blocks the inline bundle Astro would otherwise produce for a small
// page-level script; importing this module forces an external emit.

// Implements REQ-READ-002 — modal open/close wiring.
//
// Opens the <dialog> via showModal() when a `[data-alt-sources-trigger]`
// element is clicked anywhere on the page. Closes on:
//   - Escape (handled natively by <dialog>)
//   - Click on the close (×) button
//   - Click on the backdrop (event.target === dialog)
//
// Re-initialises on astro:page-load (View Transitions) and tears down
// listeners on astro:before-swap so navigating between articles
// doesn't accumulate stale bindings.

function getDialog(): HTMLDialogElement | null {
  return document.querySelector<HTMLDialogElement>('[data-alt-sources-modal]');
}

function onTriggerClick(event: Event): void {
  const dialog = getDialog();
  if (dialog === null) return;
  event.preventDefault();
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  }
}

function onCloseClick(event: Event): void {
  const dialog = getDialog();
  if (dialog === null) return;
  event.preventDefault();
  if (typeof dialog.close === 'function') {
    dialog.close();
  }
}

function onDialogClick(event: MouseEvent): void {
  const dialog = getDialog();
  if (dialog === null) return;
  // Clicking the backdrop dispatches a click whose target is the
  // dialog itself (the content sits in an inner wrapper).
  if (event.target === dialog) {
    dialog.close();
  }
}

function initModal(): void {
  const dialog = getDialog();
  if (dialog === null) return;
  if (dialog.dataset['bound'] === '1') return;
  dialog.dataset['bound'] = '1';

  const triggers = document.querySelectorAll<HTMLElement>(
    '[data-alt-sources-trigger]',
  );
  triggers.forEach((t) => {
    t.addEventListener('click', onTriggerClick);
  });

  const closeBtn = dialog.querySelector<HTMLElement>('[data-alt-sources-close]');
  if (closeBtn !== null) {
    closeBtn.addEventListener('click', onCloseClick);
  }

  dialog.addEventListener('click', onDialogClick);
}

function teardownModal(): void {
  const dialog = getDialog();
  if (dialog === null) return;

  const triggers = document.querySelectorAll<HTMLElement>(
    '[data-alt-sources-trigger]',
  );
  triggers.forEach((t) => {
    t.removeEventListener('click', onTriggerClick);
  });

  const closeBtn = dialog.querySelector<HTMLElement>('[data-alt-sources-close]');
  if (closeBtn !== null) {
    closeBtn.removeEventListener('click', onCloseClick);
  }

  dialog.removeEventListener('click', onDialogClick);
  dialog.dataset['bound'] = '0';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModal, { once: true });
} else {
  initModal();
}
document.addEventListener('astro:page-load', initModal);
document.addEventListener('astro:before-swap', teardownModal);
