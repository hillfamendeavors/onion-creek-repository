const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let previouslyFocused = null;
let activeModal = null;
let activeOnClose = null;

function handleKeydown(e) {
  if (!activeModal) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    activeOnClose?.();
    return;
  }

  if (e.key !== 'Tab') return;

  const focusable = Array.from(activeModal.querySelectorAll(FOCUSABLE_SELECTOR));
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

document.addEventListener('keydown', handleKeydown);

export function trapFocus(modalEl, onClose) {
  previouslyFocused = document.activeElement;
  activeModal = modalEl;
  activeOnClose = onClose;

  const focusable = modalEl.querySelector(FOCUSABLE_SELECTOR);
  focusable?.focus();
}

export function releaseFocus() {
  activeModal = null;
  activeOnClose = null;
  previouslyFocused?.focus();
  previouslyFocused = null;
}
