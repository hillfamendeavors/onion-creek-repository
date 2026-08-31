import { supabase } from '../lib/supabase.js';
import { showToast } from './ui-feedback.js';

// The Directory CMS and the Referrals "Approve & Publish" flow both write
// straight to Supabase, but the public site is static HTML rebuilt at
// deploy time — nothing was ever calling `netlify/functions/trigger-rebuild.js`,
// so a successful save looked done in the admin table while the live site
// quietly stayed stale. This gives that rebuild a real trigger (a topbar
// button) and a pending indicator so an admin can tell a save hasn't gone
// live yet.

const PENDING_KEY = 'tn_publish_pending';

function setPending(value) {
  try {
    if (value) sessionStorage.setItem(PENDING_KEY, '1');
    else sessionStorage.removeItem(PENDING_KEY);
  } catch (e) {
    // sessionStorage unavailable (private browsing, etc.) — the dot just won't show.
  }
  refreshPublishIndicator();
}

// Call after any write that changes what the public site should show
// (add/edit/delete a listing, approve a referral, toggle featured, reorder).
export function markPublishPending() {
  setPending(true);
}

export function refreshPublishIndicator() {
  const dot = document.getElementById('publishPendingDot');
  if (!dot) return;
  let pending = false;
  try {
    pending = sessionStorage.getItem(PENDING_KEY) === '1';
  } catch (e) {
    // ignore
  }
  dot.style.display = pending ? 'inline-block' : 'none';
}

async function publishSite(btn) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    showToast('You must be logged in to publish.', true);
    return;
  }

  const originalLabel = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Publishing…';

  try {
    const res = await fetch('/.netlify/functions/trigger-rebuild', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.status === 500) {
      showToast("Publish isn't configured yet — ask Seth to set NETLIFY_BUILD_HOOK_URL in Netlify.", true);
      return;
    }

    if (!res.ok) {
      showToast('Failed to start rebuild: ' + (await res.text()), true);
      return;
    }

    setPending(false);
    showToast('Site rebuild started — live in ~2 minutes.');
  } catch (e) {
    showToast('Failed to reach the publish function: ' + e.message, true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalLabel;
  }
}

// Attaches the click handler for the topbar Publish button. Caller is
// expected to guard this with bindOnce() since the button may live on a
// persisted node.
export function wirePublishButton(btn) {
  if (!btn) return;
  btn.addEventListener('click', () => publishSite(btn));
}
