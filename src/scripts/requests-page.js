import { supabase } from '../lib/supabase.js';
import { getSession } from '../lib/auth.js';

const main = document.querySelector('main[data-neighborhood]');
const neighborhood = main.dataset.neighborhood;

const authPrompt = document.getElementById('requestsAuthPrompt');
const countsEl = document.getElementById('requestsCounts');
const fullEl = document.getElementById('requestsFull');
const loginLink = document.getElementById('rpLoginLink');

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function renderCounts() {
  countsEl.innerHTML = '<p class="request-loading">Loading…</p>';
  const { data, error } = await supabase
    .from('service_requests_public_counts')
    .select('*')
    .eq('neighborhood', neighborhood);

  if (error) {
    countsEl.innerHTML = '<p>Something went wrong loading requests. Please refresh the page.</p>';
    return;
  }
  if (!data || data.length === 0) {
    countsEl.innerHTML = '<p>No open requests right now.</p>';
    return;
  }

  countsEl.innerHTML = data
    .sort((a, b) => (a.date_needed < b.date_needed ? -1 : 1))
    .map((r) => `<div class="request-count-row">${esc(r.category)} needed — ${esc(r.date_needed)} — ${r.count} request${r.count === 1 ? '' : 's'}</div>`)
    .join('');
}

async function renderFullList() {
  fullEl.innerHTML = '<p class="request-loading">Loading…</p>';
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('neighborhood', neighborhood)
    .neq('status', 'closed')
    .order('date_needed', { ascending: true });

  if (error) {
    fullEl.innerHTML = '<p>Something went wrong loading requests. Please refresh the page.</p>';
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
    if (loginLink) {
      loginLink.href = `/login/?next=${encodeURIComponent(location.pathname)}`;
    }
    await renderCounts();
  }
}

render();
