import { getSession, signIn, signUp, requestPasswordReset, updateProfile } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

// DOM Elements
const mainContainer = document.getElementById('mainContainer');
const authFormCard = document.getElementById('authFormCard');
const profileCard = document.getElementById('profileCard');

// Tabs
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const tabReset = document.getElementById('tabReset');

// Views
const viewLogin = document.getElementById('viewLogin');
const viewRegister = document.getElementById('viewRegister');
const viewReset = document.getElementById('viewReset');

// Headers
const formTitle = document.getElementById('formTitle');
const formSub = document.getElementById('formSub');

// Inputs & Buttons - Login
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');

// Inputs & Buttons - Register
const regName = document.getElementById('reg-name');
const regEmail = document.getElementById('reg-email');
const regPhone = document.getElementById('reg-phone');
const regPassword = document.getElementById('reg-password');
const registerSubmitBtn = document.getElementById('registerSubmitBtn');

// Inputs & Buttons - Reset
const resetEmail = document.getElementById('reset-email');
const resetSubmitBtn = document.getElementById('resetSubmitBtn');

// Status messages
const authError = document.getElementById('authError');
const authNotice = document.getElementById('authNotice');

// Profile Elements
const userAvatar = document.getElementById('userAvatar');
const profileDisplayName = document.getElementById('profileDisplayName');
const profileDisplayEmail = document.getElementById('profileDisplayEmail');
const profName = document.getElementById('prof-name');
const profPhone = document.getElementById('prof-phone');
const profileForm = document.getElementById('profileForm');
const updateProfileBtn = document.getElementById('updateProfileBtn');
const profileNotice = document.getElementById('profileNotice');
const logoutBtn = document.getElementById('logoutBtn');
const requestsTableContainer = document.getElementById('requestsTableContainer');

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function nextUrl() {
  const next = new URLSearchParams(location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

function clearMessages() {
  authError.textContent = '';
  authNotice.style.display = 'none';
  authNotice.textContent = '';
}

function switchTab(activeTab, viewToShow, title, sub) {
  clearMessages();
  [tabLogin, tabRegister, tabReset].forEach((t) => t?.classList.remove('active'));
  [viewLogin, viewRegister, viewReset].forEach((v) => v ? (v.style.display = 'none') : null);

  activeTab?.classList.add('active');
  if (viewToShow) viewToShow.style.display = 'block';
  if (formTitle) formTitle.textContent = title;
  if (formSub) formSub.textContent = sub;
}

// Wire Tab Switches
tabLogin?.addEventListener('click', () => switchTab(tabLogin, viewLogin, 'Welcome Back', 'Manage your neighbor account & service requests'));
tabRegister?.addEventListener('click', () => switchTab(tabRegister, viewRegister, 'Create an Account', 'Join your local community directory'));
tabReset?.addEventListener('click', () => switchTab(tabReset, viewReset, 'Reset Password', 'Enter your email to receive a password reset link'));

// Helper for button loading state
async function withButtonLock(btn, text, fn) {
  if (!btn) return;
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = text;
  try {
    await fn();
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
}

// Log In Action
loginSubmitBtn?.addEventListener('click', () => withButtonLock(loginSubmitBtn, 'Logging in…', async () => {
  clearMessages();
  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  const { error } = await signIn(email, password);
  if (error) {
    authError.textContent = error.message;
    return;
  }

  const redirectPath = nextUrl();
  if (redirectPath) {
    location.href = redirectPath;
  } else {
    initPage();
  }
}));

// Register Action
registerSubmitBtn?.addEventListener('click', () => withButtonLock(registerSubmitBtn, 'Creating account…', async () => {
  clearMessages();
  const name = regName.value.trim();
  const email = regEmail.value.trim();
  const phone = regPhone.value.trim();
  const password = regPassword.value;

  if (!name) {
    authError.textContent = 'Please enter your full name.';
    return;
  }
  if (!email || !password) {
    authError.textContent = 'Please enter an email address and password.';
    return;
  }
  if (password.length < 6) {
    authError.textContent = 'Password must be at least 6 characters.';
    return;
  }

  const { data, error } = await signUp(email, password, { full_name: name, phone });
  if (error) {
    authError.textContent = error.message;
    return;
  }

  if (data?.user && !data.session) {
    authNotice.textContent = 'Registration successful! Please check your email to confirm your account, then log in.';
    authNotice.style.display = 'block';
  } else {
    initPage();
  }
}));

// Reset Password Action
resetSubmitBtn?.addEventListener('click', () => withButtonLock(resetSubmitBtn, 'Sending link…', async () => {
  clearMessages();
  const email = resetEmail.value.trim();
  if (!email) {
    authError.textContent = 'Please enter your email address.';
    return;
  }

  const { error } = await requestPasswordReset(email);
  if (error) {
    authError.textContent = error.message;
    return;
  }

  authNotice.textContent = 'Check your email for a password reset link.';
  authNotice.style.display = 'block';
}));

// Profile Form Submit Action
profileForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!updateProfileBtn) return;
  
  withButtonLock(updateProfileBtn, 'Saving…', async () => {
    profileNotice.style.display = 'none';
    profileNotice.textContent = '';

    const name = profName.value.trim();
    const phone = profPhone.value.trim();

    const { error } = await updateProfile({ full_name: name, phone });
    if (error) {
      alert('Failed to update profile: ' + error.message);
      return;
    }

    profileNotice.textContent = 'Profile details updated successfully!';
    profileNotice.style.display = 'block';
    if (profileDisplayName) profileDisplayName.textContent = name || 'Neighbor';
    if (userAvatar) userAvatar.textContent = (name || 'N')[0].toUpperCase();
  });
});

// Logout Action
logoutBtn?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.href = '/login/';
});

// Fetch User's Service Requests
async function loadUserServiceRequests(userEmail) {
  if (!requestsTableContainer) return;
  requestsTableContainer.innerHTML = '<div class="empty-requests">Loading your service requests…</div>';

  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('email', userEmail)
    .order('created_at', { ascending: false });

  if (error) {
    requestsTableContainer.innerHTML = '<div class="empty-requests">Failed to load service requests.</div>';
    return;
  }

  if (!data || data.length === 0) {
    requestsTableContainer.innerHTML = `
      <div class="empty-requests">
        <p>You haven't submitted any service requests yet.</p>
        <p style="margin-top: 8px;"><a href="/">Browse directories to request a service</a></p>
      </div>
    `;
    return;
  }

  requestsTableContainer.innerHTML = `
    <table class="requests-table">
      <thead>
        <tr>
          <th>Submitted</th>
          <th>Neighborhood</th>
          <th>Category</th>
          <th>Date Needed</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((r) => `
          <tr>
            <td>${esc(new Date(r.created_at).toLocaleDateString())}</td>
            <td>${esc(r.neighborhood)}</td>
            <td>${esc(r.category)}</td>
            <td>${esc(r.date_needed)}</td>
            <td><span class="status-badge ${esc(r.status || 'new')}">${esc(r.status || 'new')}</span></td>
            <td>
              <button class="toggle-request-btn ${r.status === 'closed' ? 'reopen' : 'complete'}" data-id="${r.id}" data-status="${r.status || 'new'}">
                ${r.status === 'closed' ? '↺ Reopen' : '✓ Mark Completed'}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  requestsTableContainer.querySelectorAll('.toggle-request-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      const currentStatus = btn.dataset.status;
      const newStatus = currentStatus === 'closed' ? 'new' : 'closed';

      btn.disabled = true;
      btn.textContent = 'Updating…';

      const { error } = await supabase
        .from('service_requests')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('email', userEmail);

      if (error) {
        alert('Failed to update status: ' + error.message);
        btn.disabled = false;
        btn.textContent = currentStatus === 'closed' ? '↺ Reopen' : '✓ Mark Completed';
        return;
      }

      await loadUserServiceRequests(userEmail);
    });
  });
}

// Page Initialization
async function initPage() {
  // Check URL hash for confirmation token or password reset
  if (window.location.hash.includes('access_token=') || window.location.search.includes('code=')) {
    if (authNotice) {
      authNotice.style.display = 'block';
      authNotice.textContent = 'Verifying your account session…';
    }
  }

  const session = await getSession();

  if (session && session.user) {
    // Show Profile Card
    if (mainContainer) mainContainer.classList.add('wide');
    if (authFormCard) authFormCard.style.display = 'none';
    if (profileCard) profileCard.style.display = 'block';

    const user = session.user;
    const meta = user.user_metadata || {};
    const name = meta.full_name || '';
    const phone = meta.phone || '';

    if (profileDisplayName) profileDisplayName.textContent = name || 'Neighbor';
    if (profileDisplayEmail) profileDisplayEmail.textContent = user.email || '';
    if (userAvatar) userAvatar.textContent = (name || user.email || 'N')[0].toUpperCase();
    if (profName) profName.value = name;
    if (profPhone) profPhone.value = phone;

    loadUserServiceRequests(user.email);
  } else {
    // Show Auth Form Card
    if (mainContainer) mainContainer.classList.remove('wide');
    if (authFormCard) authFormCard.style.display = 'block';
    if (profileCard) profileCard.style.display = 'none';
  }
}

// React to auth state changes dynamically
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
    initPage();
  } else if (event === 'SIGNED_OUT') {
    initPage();
  }
});

initPage();
