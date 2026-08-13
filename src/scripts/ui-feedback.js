import { trapFocus, releaseFocus } from './modal-a11y.js';

let activeToastTimer = null;

export function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  clearTimeout(activeToastTimer);
  toast.textContent = message;
  toast.className = isError ? 'toast toast-error' : 'toast toast-success';
  toast.style.display = 'block';
  activeToastTimer = setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const dialog = document.getElementById('confirmDialog');
    const messageEl = document.getElementById('confirmDialogMessage');
    const yesBtn = document.getElementById('confirmDialogYes');
    const noBtn = document.getElementById('confirmDialogNo');
    if (!dialog || !messageEl || !yesBtn || !noBtn) {
      resolve(window.confirm(message));
      return;
    }

    messageEl.textContent = message;
    dialog.style.display = 'flex';

    function cleanup(result) {
      dialog.style.display = 'none';
      releaseFocus();
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      resolve(result);
    }

    trapFocus(dialog, () => cleanup(false));

    function onYes() { cleanup(true); }
    function onNo() { cleanup(false); }

    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
  });
}
