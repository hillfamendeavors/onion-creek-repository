import { supabase } from '../lib/supabase.js';
import { getSession, signIn, signUp, requestPasswordReset } from '../lib/auth.js';

const main = document.querySelector('main[data-neighborhood]');
const neighborhood = main.dataset.neighborhood;

const authPrompt = document.getElementById('requestsAuthPrompt');
const countsEl = document.getElementById('requestsCounts');
const fullEl = document.getElementById('requestsFull');
const authEmailEl = document.getElementById('rp-auth-email');
const authPasswordEl = document.getElementById('rp-auth-password');
const authErrorEl = document.getElementById('rpAuthError');
const signupNoticeEl = document.getElementById('rpSignupNotice');
const resetNoticeEl = document.getElementById('rpResetNotice');

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function renderCounts() {
  const { data, error } = await supabase
    .from('service_requests_public_counts')
    .select('*')
    .eq('neighborhood', neighborhood);

  if (error || !data || data.length === 0) {
    countsEl.innerHTML = '<p>No open requests right now.</p>';
    return;
  }

  countsEl.innerHTML = data
    .sort((a, b) => (a.date_needed < b.date_needed ? -1 : 1))
    .map((r) => `<div class="request-count-row">${esc(r.category)} needed — ${esc(r.date_needed)} — ${r.count} request${r.count === 1 ? '' : 's'}</div>`)
    .join('');
}

async function renderFullList() {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('neighborhood', neighborhood)
    .neq('status', 'closed')
    .order('date_needed', { ascending: true });

  if (error) {
    fullEl.innerHTML = '<p>Failed to load requests.</p>';
    return;
  }
  if (data.length === 0) {
    fullEl.innerHTML = '<p>No open requests right now.</p>';
    return;
  }

  fullEl.innerHTML = data.map((r) => `
    <div class="request-card">
      <strong>${esc(r.category)}</strong> needed — ${esc(r.date_needed)}
      <p>${esc(r.name)} — <a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>${r.email ? ` — <a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : ''}</p>
      ${r.notes ? `<p>${esc(r.notes)}</p>` : ''}
    </div>
  `).join('');
}

async function render() {
  const session = await getSession();
  if (session) {
    authPrompt.style.display = 'none';
    countsEl.style.display = 'none';
    fullEl.style.display = 'block';
    await renderFullList();
  } else {
    authPrompt.style.display = 'block';
    fullEl.style.display = 'none';
    countsEl.style.display = 'block';
    await renderCounts();
  }
}

document.getElementById('rpSignInBtn').addEventListener('click', async () => {
  authErrorEl.textContent = '';
  const { error } = await signIn(authEmailEl.value.trim(), authPasswordEl.value);
  if (error) {
    authErrorEl.textContent = error.message;
    return;
  }
  render();
});

document.getElementById('rpSignUpBtn').addEventListener('click', async () => {
  authErrorEl.textContent = '';
  const { error } = await signUp(authEmailEl.value.trim(), authPasswordEl.value);
  if (error) {
    authErrorEl.textContent = error.message;
    return;
  }
  signupNoticeEl.style.display = 'block';
});

document.getElementById('rpForgotBtn').addEventListener('click', async () => {
  authErrorEl.textContent = '';
  const { error } = await requestPasswordReset(authEmailEl.value.trim());
  if (error) {
    authErrorEl.textContent = error.message;
    return;
  }
  resetNoticeEl.style.display = 'block';
});

render();
