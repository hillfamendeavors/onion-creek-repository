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
const regPasswordConfirm = document.getElementById('reg-password-confirm');
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
  if (password !== regPasswordConfirm.value) {
    authError.textContent = 'Passwords do not match.';
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

// Profile & Dashboard Elements
const userAvatarImg = document.getElementById('userAvatarImg');
const avatarWrapper = document.getElementById('avatarWrapper');
const avatarFileInput = document.getElementById('avatarFileInput');
const neighborhoodBadge = document.getElementById('neighborhoodBadge');
const profNeighborhood = document.getElementById('prof-neighborhood');

// Account Sub-Tabs
const tabMyRequests = document.getElementById('tabMyRequests');
const tabMySaved = document.getElementById('tabMySaved');
const tabMyReferrals = document.getElementById('tabMyReferrals');
const tabMySettings = document.getElementById('tabMySettings');

// Account Sub-Views
const accViewRequests = document.getElementById('accViewRequests');
const accViewSaved = document.getElementById('accViewSaved');
const accViewReferrals = document.getElementById('accViewReferrals');
const accViewSettings = document.getElementById('accViewSettings');

// Modal Elements
const openNewRequestModalBtn = document.getElementById('openNewRequestModalBtn');
const closeUserReqModalBtn = document.getElementById('closeUserReqModalBtn');
const userNewRequestModal = document.getElementById('userNewRequestModal');
const userNewRequestForm = document.getElementById('userNewRequestForm');

// Wire Avatar File Upload Click & Input
avatarWrapper?.addEventListener('click', () => {
  avatarFileInput?.click();
});

avatarFileInput?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    const dataUrl = evt.target.result;
    if (userAvatarImg) userAvatarImg.src = dataUrl;

    const { error } = await updateProfile({ avatar_url: dataUrl });
    if (error) {
      showToast('Failed to update avatar.', true);
    } else {
      showToast('Profile photo updated successfully!');
    }
  };
  reader.readAsDataURL(file);
});

// Wire Sub-Tab Navigation
function switchAccTab(activeTab, viewToShow) {
  [tabMyRequests, tabMySaved, tabMyReferrals, tabMySettings].forEach((t) => t?.classList.remove('active'));
  [accViewRequests, accViewSaved, accViewReferrals, accViewSettings].forEach((v) => v ? (v.style.display = 'none') : null);

  activeTab?.classList.add('active');
  if (viewToShow) viewToShow.style.display = 'block';
}

tabMyRequests?.addEventListener('click', () => switchAccTab(tabMyRequests, accViewRequests));
tabMySaved?.addEventListener('click', () => {
  switchAccTab(tabMySaved, accViewSaved);
  if (currentUser) loadSavedListings(currentUser.email);
});
tabMyReferrals?.addEventListener('click', () => {
  switchAccTab(tabMyReferrals, accViewReferrals);
  if (currentUser) loadUserReferrals(currentUser.email);
});
tabMySettings?.addEventListener('click', () => switchAccTab(tabMySettings, accViewSettings));

// Profile Form Submit Action
profileForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!updateProfileBtn) return;
  
  withButtonLock(updateProfileBtn, 'Saving…', async () => {
    profileNotice.style.display = 'none';
    profileNotice.textContent = '';

    const name = profName.value.trim();
    const phone = profPhone.value.trim();
    const neighborhood = profNeighborhood ? profNeighborhood.value : 'onion-creek';

    const { error } = await updateProfile({ full_name: name, phone, neighborhood_slug: neighborhood });
    if (error) {
      profileNotice.textContent = 'Failed to update profile: ' + error.message;
      profileNotice.style.color = '#DC2626';
      profileNotice.style.background = '#FEF2F2';
      profileNotice.style.borderColor = '#FECACA';
      profileNotice.style.display = 'block';
      return;
    }

    profileNotice.textContent = 'Profile details updated successfully!';
    profileNotice.style.color = '';
    profileNotice.style.background = '';
    profileNotice.style.borderColor = '';
    profileNotice.style.display = 'block';
    if (profileDisplayName) profileDisplayName.textContent = name || 'Neighbor';
    if (neighborhoodBadge) {
      const neighLabel = {
        'onion-creek': 'Onion Creek',
        'avery-ranch': 'Avery Ranch',
        'circle-c': 'Circle C',
        'sunfield': 'Sunfield'
      }[neighborhood] || neighborhood;
      neighborhoodBadge.textContent = `Verified ${neighLabel} Neighbor`;
    }
  });
});

// Modal Controls for + Post Service Request
openNewRequestModalBtn?.addEventListener('click', () => {
  if (userNewRequestModal) userNewRequestModal.style.display = 'flex';
});

closeUserReqModalBtn?.addEventListener('click', () => {
  if (userNewRequestModal) userNewRequestModal.style.display = 'none';
});

userNewRequestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const neighborhood = document.getElementById('usrReqNeighborhood').value;
  const category = document.getElementById('usrReqCategory').value.trim();
  const date_needed = document.getElementById('usrReqDate').value;
  const notes = document.getElementById('usrReqNotes').value.trim();
  const phone = profPhone ? profPhone.value.trim() : '';

  const { error } = await supabase.from('service_requests').insert({
    neighborhood,
    category,
    date_needed,
    notes,
    name: profileDisplayName.textContent || 'Neighbor',
    email: currentUser.email,
    phone,
    status: 'new'
  });

  if (error) {
    alert('Failed to post request: ' + error.message);
    return;
  }

  if (userNewRequestModal) userNewRequestModal.style.display = 'none';
  userNewRequestForm.reset();
  loadUserServiceRequests(currentUser.email);
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
        <p style="margin-top: 12px;"><button class="btn-submit" onclick="document.getElementById('openNewRequestModalBtn').click()" style="width:auto; padding:8px 20px; font-size:0.875rem;">+ Post Your First Service Request</button></p>
      </div>
    `;
    return;
  }

  requestsTableContainer.innerHTML = `
    <div class="table-scroll-wrapper">
      <table class="requests-table">
        <thead>
          <tr>
            <th>Submitted</th>
            <th>Neighborhood</th>
            <th>Category</th>
            <th>Date Needed</th>
            <th>Status</th>
            <th style="text-align:right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((r) => `
            <tr>
              <td><span style="font-weight:500; color:#475569; font-size:0.85rem;">${esc(new Date(r.created_at).toLocaleDateString())}</span></td>
              <td><span class="status-badge" style="background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0;">${esc(r.neighborhood)}</span></td>
              <td><span class="status-badge" style="background:#EFF6FF; color:#1E40AF; border:1px solid #BFDBFE;">${esc(r.category)}</span></td>
              <td><span style="font-weight:600; color:#0F172A;">${esc(r.date_needed)}</span></td>
              <td><span class="status-badge ${esc(r.status || 'new')}">${esc(r.status || 'new')}</span></td>
              <td style="text-align:right;">
                <button class="toggle-request-btn ${r.status === 'closed' ? 'reopen' : 'complete'}" data-id="${r.id}" data-status="${r.status || 'new'}">
                  ${r.status === 'closed' ? '↺ Reopen' : '✓ Mark Completed'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
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
        btn.disabled = false;
        btn.textContent = currentStatus === 'closed' ? '↺ Reopen' : '✓ Mark Completed';
        return;
      }

      await loadUserServiceRequests(userEmail);
    });
  });
}

// Fetch User's Referral Suggestions
async function loadUserReferrals(userEmail) {
  const referralsContainer = document.getElementById('referralsTableContainer');
  if (!referralsContainer) return;
  referralsContainer.innerHTML = '<div class="empty-requests">Loading your referral suggestions…</div>';

  const { data, error } = await supabase
    .from('referral_suggestions')
    .select('*')
    .eq('referrer_email', userEmail)
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    referralsContainer.innerHTML = `
      <div class="empty-requests">
        <p>You haven't submitted any business referral suggestions yet.</p>
        <p style="margin-top: 12px;"><a href="/">Browse directory to suggest a recommended business</a></p>
      </div>
    `;
    return;
  }

  referralsContainer.innerHTML = `
    <div class="table-scroll-wrapper">
      <table class="requests-table">
        <thead>
          <tr>
            <th>Submitted</th>
            <th>Business / Person</th>
            <th>Neighborhood</th>
            <th>Category</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((r) => `
            <tr>
              <td><span style="font-weight:500; color:#475569; font-size:0.85rem;">${esc(new Date(r.created_at).toLocaleDateString())}</span></td>
              <td><strong style="color:#0F172A;">${esc(r.name)}</strong></td>
              <td><span class="status-badge" style="background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0;">${esc(r.neighborhood || 'N/A')}</span></td>
              <td><span class="status-badge" style="background:#EFF6FF; color:#1E40AF; border:1px solid #BFDBFE;">${esc(r.category || 'General')}</span></td>
              <td><span class="status-badge ${esc(r.status || 'new')}">${esc(r.status || 'new')}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Saved Listings Manager
async function loadSavedListings(userEmail) {
  const container = document.getElementById('savedContainer');
  if (!container) return;
  container.innerHTML = '<div class="empty-requests">Loading your saved recommendations…</div>';

  const savedIds = JSON.parse(localStorage.getItem(`saved_listings_${userEmail}`) || '[]');
  if (savedIds.length === 0) {
    container.innerHTML = `
      <div class="empty-requests">
        <p>You haven't saved any recommendations yet.</p>
        <p style="margin-top: 8px;"><a href="/">Browse your neighborhood directory and click ⭐ to save providers!</a></p>
      </div>
    `;
    return;
  }

  const { data } = await supabase.from('listings').select('*').in('id', savedIds);
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="empty-requests">No saved recommendations found.</div>';
    return;
  }

  container.innerHTML = `
    <div class="saved-grid">
      ${data.map((l) => `
        <div class="saved-card">
          <div>
            <div class="saved-card-title">${esc(l.name)}</div>
            <div class="saved-card-sub">${esc(l.neighborhood_slug)} · ${esc(l.phone)}</div>
            <p style="font-size:0.85rem; color:#475569; margin:0;">${esc(l.note || 'Recommended Local Provider')}</p>
          </div>
          <div class="saved-card-actions">
            <a href="tel:${esc(l.phone)}" class="toggle-request-btn complete" style="text-decoration:none;">📞 Call</a>
            <button class="toggle-request-btn reopen remove-saved-btn" data-id="${l.id}">Remove</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.remove-saved-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const updated = savedIds.filter((sId) => sId !== id);
      localStorage.setItem(`saved_listings_${userEmail}`, JSON.stringify(updated));
      loadSavedListings(userEmail);
    });
  });
}

let currentUser = null;

// Page Initialization
async function initPage() {
  if (window.location.hash.includes('access_token=') || window.location.search.includes('code=')) {
    if (authNotice) {
      authNotice.style.display = 'block';
      authNotice.textContent = 'Verifying your account session…';
    }
  }

  const session = await getSession();

  if (session && session.user) {
    currentUser = session.user;
    if (mainContainer) mainContainer.classList.add('wide');
    if (authFormCard) authFormCard.style.display = 'none';
    if (profileCard) profileCard.style.display = 'block';

    const user = session.user;
    const meta = user.user_metadata || {};
    const name = meta.full_name || '';
    const phone = meta.phone || '';
    const avatarUrl = meta.avatar_url || '/images/default-avatar.jpg';
    const neighborhood = meta.neighborhood_slug || 'onion-creek';

    if (profileDisplayName) profileDisplayName.textContent = name || 'Neighbor';
    if (profileDisplayEmail) profileDisplayEmail.textContent = user.email || '';
    if (userAvatarImg) userAvatarImg.src = avatarUrl;
    if (profName) profName.value = name;
    if (profPhone) profPhone.value = phone;
    if (profNeighborhood) profNeighborhood.value = neighborhood;

    if (neighborhoodBadge) {
      const neighLabel = {
        'onion-creek': 'Onion Creek',
        'avery-ranch': 'Avery Ranch',
        'circle-c': 'Circle C',
        'sunfield': 'Sunfield'
      }[neighborhood] || neighborhood;
      neighborhoodBadge.textContent = `Verified ${neighLabel} Neighbor`;
    }

    loadUserServiceRequests(user.email);
  } else {
    currentUser = null;
    if (mainContainer) mainContainer.classList.remove('wide');
    if (authFormCard) authFormCard.style.display = 'block';
    if (profileCard) profileCard.style.display = 'none';
    clearMessages();
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
