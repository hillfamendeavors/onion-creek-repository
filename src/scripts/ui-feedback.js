import { trapFocus, releaseFocus } from './modal-a11y.js';

let activeToastTimer = null;

// AdminLayout.astro renders a static #toast div styled by its own <style>
// block. Public pages (account.astro, the Directory layout) never rendered
// that markup, so every showToast() call there was a silent no-op — users
// got zero feedback on save/error. Creating the element on demand (with
// styling inline, not dependent on any page's stylesheet) makes this module
// work regardless of which page loads it.
function ensureToastEl() {
  let toast = document.getElementById('toast');
  if (toast) return toast;
  toast = document.createElement('div');
  toast.id = 'toast';
  toast.style.cssText = 'display:none; position:fixed; bottom:24px; right:24px; z-index:2200; padding:12px 20px; border-radius:8px; font-size:0.88rem; font-weight:600; box-shadow:0 10px 15px -3px rgba(0,0,0,0.15); max-width:360px; font-family:inherit;';
  document.body.appendChild(toast);
  return toast;
}

export function showToast(message, isError = false) {
  const toast = ensureToastEl();
  clearTimeout(activeToastTimer);
  toast.textContent = message;
  toast.className = isError ? 'toast toast-error' : 'toast toast-success';
  toast.style.background = isError ? '#DC2626' : '#059669';
  toast.style.color = '#FFFFFF';
  toast.style.display = 'block';
  activeToastTimer = setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

// Same reasoning as ensureToastEl(): degrade to a real styled dialog instead
// of the plain window.confirm() fallback on pages that never rendered
// AdminLayout's static #confirmDialog markup.
function ensureConfirmDialogEls() {
  let dialog = document.getElementById('confirmDialog');
  if (dialog) {
    return {
      dialog,
      messageEl: document.getElementById('confirmDialogMessage'),
      yesBtn: document.getElementById('confirmDialogYes'),
      noBtn: document.getElementById('confirmDialogNo'),
    };
  }

  dialog = document.createElement('div');
  dialog.id = 'confirmDialog';
  dialog.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2200; justify-content:center; align-items:center;';
  dialog.innerHTML = `
    <div style="max-width:420px; width:90%; padding:24px; background:#FFFFFF; border-radius:12px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.15); font-family:inherit;">
      <p id="confirmDialogMessage" style="margin:0 0 20px; font-size:0.95rem; color:#0F172A; line-height:1.4;"></p>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" id="confirmDialogNo" style="background:#FFFFFF; color:#334155; border:1px solid #E2E8F0; padding:8px 16px; border-radius:8px; font-weight:600; cursor:pointer; font-size:0.875rem;">Cancel</button>
        <button type="button" id="confirmDialogYes" style="background:#DC2626; color:#FFFFFF; border:none; padding:9px 18px; border-radius:8px; font-weight:600; cursor:pointer; font-size:0.88rem;">Confirm</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);

  return {
    dialog,
    messageEl: document.getElementById('confirmDialogMessage'),
    yesBtn: document.getElementById('confirmDialogYes'),
    noBtn: document.getElementById('confirmDialogNo'),
  };
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const { dialog, messageEl, yesBtn, noBtn } = ensureConfirmDialogEls();

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
