import { supabase } from '../lib/supabase.js';

const usersBody = document.getElementById('usersBody');
let loaded = false;

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

window.addEventListener('users-tab-shown', async () => {
  if (loaded) return;
  loaded = true;
  await loadUsers();
});

async function loadUsers() {
  if (!usersBody) return;
  usersBody.innerHTML = `<tr><td colspan="5">Loading users…</td></tr>`;

  const [profilesRes, requestsRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('service_requests').select('email, category, date_needed'),
  ]);

  if (profilesRes.error) {
    usersBody.innerHTML = `<tr><td colspan="5">Failed to load users: ${esc(profilesRes.error.message)}</td></tr>`;
    return;
  }

  const profiles = profilesRes.data || [];
  const requests = requestsRes.data || [];

  if (profiles.length === 0) {
    usersBody.innerHTML = `<tr><td colspan="5">No registered users yet.</td></tr>`;
    return;
  }

  usersBody.innerHTML = profiles.map((p) => {
    const theirRequests = requests.filter((r) => r.email === p.email);
    const requestsHtml = theirRequests.length === 0
      ? '<span style="color:#9CA3AF;">None yet</span>'
      : theirRequests.map((r) => `
          <span style="display:inline-block; background:#F3F4F6; border-radius:12px; padding:3px 10px; font-size:0.78rem; font-weight:600; color:#374151; margin:2px 4px 2px 0;">
            ${esc(r.category)} <span style="color:#9CA3AF;">(${esc(r.date_needed)})</span>
          </span>
        `).join('');

    return `
      <tr>
        <td>${esc(p.full_name) || '<span style="color:#9CA3AF;">—</span>'}</td>
        <td>${esc(p.email)}</td>
        <td>${esc(p.phone) || '<span style="color:#9CA3AF;">—</span>'}</td>
        <td>${esc(new Date(p.created_at).toLocaleDateString())}</td>
        <td>${requestsHtml}</td>
      </tr>
    `;
  }).join('');
}
