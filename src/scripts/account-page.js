import { getSession, signIn, signUp, requestPasswordReset, updateProfile } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';
import { trapFocus, releaseFocus } from './modal-a11y.js';
import { showToast, confirmDialog } from './ui-feedback.js';
import { initCategoryCombobox } from './category-combobox.js';

// DOM Elements
const authFormCard = document.getElementById('authFormCard');
const profileCard = document.getElementById('profileCard');
const headerLoggedInActions = document.getElementById('headerLoggedInActions');

// Tabs - Auth
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const tabReset = document.getElementById('tabReset');

// Views - Auth
const viewLogin = document.getElementById('viewLogin');
const viewRegister = document.getElementById('viewRegister');
const viewReset = document.getElementById('viewReset');

// Headers - Auth
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
const profileDisplayName = document.getElementById('profileDisplayName');
const profileDisplayEmail = document.getElementById('profileDisplayEmail');
const profName = document.getElementById('prof-name');
const profPhone = document.getElementById('prof-phone');
const profileForm = document.getElementById('profileForm');
const updateProfileBtn = document.getElementById('updateProfileBtn');
const logoutBtn = document.getElementById('logoutBtn');
const requestsTableContainer = document.getElementById('requestsTableContainer');
const userAvatarImg = document.getElementById('userAvatarImg');
const avatarWrapper = document.getElementById('avatarWrapper');
const avatarFileInput = document.getElementById('avatarFileInput');
const neighborhoodBadge = document.getElementById('neighborhoodBadge');
const profNeighborhood = document.getElementById('prof-neighborhood');

// Context Deck Elements
const contextNeighborhoodName = document.getElementById('contextNeighborhoodName');
const contextCalendarLink = document.getElementById('contextCalendarLink');
const contextDirectoryLink = document.getElementById('contextDirectoryLink');

// Vitality Stats
const statActiveRequests = document.getElementById('statActiveRequests');
const statFulfilledRequests = document.getElementById('statFulfilledRequests');
const statSavedProviders = document.getElementById('statSavedProviders');
const statReferrals = document.getElementById('statReferrals');

// Filter & Search Elements
const reqFilterRibbon = document.getElementById('reqFilterRibbon');
const reqSearchInput = document.getElementById('reqSearchInput');
const filterAllCount = document.getElementById('filterAllCount');
const filterActiveCount = document.getElementById('filterActiveCount');
const filterFulfilledCount = document.getElementById('filterFulfilledCount');

// Tab Navigation Badges
const requestsCountBadge = document.getElementById('requestsCountBadge');
const savedCountBadge = document.getElementById('savedCountBadge');
const referralsCountBadge = document.getElementById('referralsCountBadge');

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

// Modals - Aligned Request Modal
const openNewRequestModalBtn = document.getElementById('openNewRequestModalBtn');
const closeUserReqModalBtn = document.getElementById('closeUserReqModalBtn');
const closeUserReqModalBtnTop = document.getElementById('closeUserReqModalBtnTop');
const userNewRequestModal = document.getElementById('userNewRequestModal');
const userNewRequestForm = document.getElementById('userNewRequestForm');
const postModalTitle = document.getElementById('postModalTitle');
const usrCombobox = initCategoryCombobox({
  wrapper: document.getElementById('usrCategoryComboboxWrapper'),
  input: document.getElementById('usrReqCategoryInput'),
  hidden: document.getElementById('usrReqCategory'),
  listbox: document.getElementById('usrReqCategoryListbox'),
  toggleBtn: document.getElementById('usrCategoryToggleBtn'),
  otherWrapper: document.getElementById('usrReqCategoryOtherWrapper'),
  otherInput: document.getElementById('usrReqCategoryOther'),
  catalogScriptId: 'usr-categories-catalog',
});
const usrReqNeighborhood = document.getElementById('usrReqNeighborhood');
const usrReqDate = document.getElementById('usrReqDate');
const usrReqName = document.getElementById('usrReqName');
const usrReqPhone = document.getElementById('usrReqPhone');
const usrReqEmail = document.getElementById('usrReqEmail');
const usrReqNotes = document.getElementById('usrReqNotes');

const rescheduleModal = document.getElementById('rescheduleModal');
const rescheduleDatePicker = document.getElementById('rescheduleDatePicker');
const rescheduleReqId = document.getElementById('rescheduleReqId');
const closeRescheduleModalBtn = document.getElementById('closeRescheduleModalBtn');
const closeRescheduleModalBtnTop = document.getElementById('closeRescheduleModalBtnTop');
const saveRescheduleBtn = document.getElementById('saveRescheduleBtn');

let currentUser = null;
let userRequestsCache = [];
let currentFilter = 'all';
let currentSearchQuery = '';

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function formatNeighborhood(slug) {
  if (!slug) return '—';
  const map = {
    'onion-creek': 'Onion Creek',
    'circle-c': 'Circle C',
    'avery-ranch': 'Avery Ranch',
    'sunfield': 'Sunfield'
  };
  return map[slug] || slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatNameTitle(str) {
  if (!str) return 'Resident';
  return str.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function formatUSPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function wirePhoneFormatting(phoneEl) {
  if (!phoneEl) return;
  phoneEl.addEventListener('input', () => {
    const digits = phoneEl.value.replace(/\D/g, '').slice(0, 10);
    phoneEl.value = formatUSPhone(digits);
  });
}

wirePhoneFormatting(regPhone);
wirePhoneFormatting(profPhone);
wirePhoneFormatting(usrReqPhone);

function nextUrl() {
  const next = new URLSearchParams(location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

function clearMessages() {
  if (authError) authError.textContent = '';
  if (authNotice) {
    authNotice.style.display = 'none';
    authNotice.textContent = '';
  }
}

function switchTab(activeTab, viewToShow, title, sub) {
  clearMessages();
  [tabLogin, tabRegister, tabReset].forEach((t) => {
    t?.classList.remove('active');
    t?.setAttribute('aria-selected', 'false');
  });
  [viewLogin, viewRegister, viewReset].forEach((v) => v ? (v.style.display = 'none') : null);

  activeTab?.classList.add('active');
  activeTab?.setAttribute('aria-selected', 'true');
  if (viewToShow) viewToShow.style.display = 'block';
  if (formTitle) formTitle.textContent = title;
  if (formSub) formSub.textContent = sub;
}

// Wire Tab Switches
tabLogin?.addEventListener('click', () => switchTab(tabLogin, viewLogin, 'Resident Sign In', 'Sign in to coordinate neighborhood service appointments and access saved recommendations'));
tabRegister?.addEventListener('click', () => switchTab(tabRegister, viewRegister, 'Create Resident Account', 'Join your neighborhood service directory'));
tabReset?.addEventListener('click', () => switchTab(tabReset, viewReset, 'Reset Password', 'Enter your email to receive a password reset link'));

// Password Visibility Toggles
document.querySelectorAll('.pwd-toggle-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
  });
});

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
loginSubmitBtn?.addEventListener('click', () => withButtonLock(loginSubmitBtn, 'Signing in…', async () => {
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
registerSubmitBtn?.addEventListener('click', () => withButtonLock(registerSubmitBtn, 'Creating Account…', async () => {
  clearMessages();
  const name = regName.value.trim();
  const email = regEmail.value.trim();
  const phone = regPhone.value.trim();
  const password = regPassword.value;
  const confirmPassword = regPasswordConfirm.value;

  if (!name || !email || !password) {
    authError.textContent = 'Please fill out all required fields.';
    return;
  }

  if (password !== confirmPassword) {
    authError.textContent = 'Passwords do not match.';
    return;
  }

  const { error } = await signUp(email, password, { full_name: name, phone });
  if (error) {
    authError.textContent = error.message;
    return;
  }

  authNotice.textContent = 'Account created! Check your email inbox to confirm your address.';
  authNotice.style.display = 'block';
}));

// Reset Password Action
resetSubmitBtn?.addEventListener('click', () => withButtonLock(resetSubmitBtn, 'Sending Link…', async () => {
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

  authNotice.textContent = 'Password reset instructions have been sent to your email.';
  authNotice.style.display = 'block';
}));

// Sub-Tab Navigation
function switchAccTab(activeTab, viewToShow) {
  [tabMyRequests, tabMySaved, tabMyReferrals, tabMySettings].forEach((t) => {
    t?.classList.remove('active');
    t?.setAttribute('aria-selected', 'false');
  });
  [accViewRequests, accViewSaved, accViewReferrals, accViewSettings].forEach((v) => v ? (v.style.display = 'none') : null);

  activeTab?.classList.add('active');
  activeTab?.setAttribute('aria-selected', 'true');
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

// Avatar Upload
avatarWrapper?.addEventListener('click', () => avatarFileInput?.click());
avatarWrapper?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    avatarFileInput?.click();
  }
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
      showToast('Failed to update avatar: ' + error.message, true);
    } else {
      showToast('Profile photo updated successfully!');
    }
  };
  reader.readAsDataURL(file);
});

// Profile Form Submit
profileForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!updateProfileBtn) return;

  withButtonLock(updateProfileBtn, 'Saving…', async () => {
    const name = profName.value.trim();
    const phone = profPhone.value.trim();
    const neighborhood = profNeighborhood ? profNeighborhood.value : 'onion-creek';

    const { error } = await updateProfile({ full_name: name, phone, neighborhood_slug: neighborhood });
    if (error) {
      showToast('Failed to update profile: ' + error.message, true);
      return;
    }

    if (profileDisplayName) profileDisplayName.textContent = formatNameTitle(name) || 'Neighbor';
    updateNeighborhoodContext(neighborhood);
    showToast('Profile settings saved successfully!');
  });
});

function updateNeighborhoodContext(slug) {
  const name = formatNeighborhood(slug);
  if (neighborhoodBadge) {
    neighborhoodBadge.innerHTML = `
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      Verified ${esc(name)} Resident
    `;
  }
  if (contextNeighborhoodName) contextNeighborhoodName.textContent = name;
  if (contextCalendarLink) contextCalendarLink.href = `/${slug}/requests/`;
  if (contextDirectoryLink) contextDirectoryLink.href = `/${slug}/`;
}

// Post Service Request Modal (Automatic Profile Integration)
function openNewRequestModal(prefill = null) {
  const todayStr = new Date().toLocaleDateString('en-CA');
  if (usrReqDate) {
    usrReqDate.min = todayStr;
  }

  // Pre-fill user contact banner from session
  if (currentUser) {
    const meta = currentUser.user_metadata || {};
    const resName = meta.full_name || profileDisplayName?.textContent || 'Verified Resident';
    const resPhone = meta.phone || (profPhone ? profPhone.value.trim() : '');
    const modalResidentName = document.getElementById('modalResidentName');
    const modalResidentContact = document.getElementById('modalResidentContact');

    if (modalResidentName) modalResidentName.textContent = formatNameTitle(resName);
    if (modalResidentContact) {
      modalResidentContact.textContent = resPhone ? `${formatUSPhone(resPhone)} · ${currentUser.email}` : (currentUser.email || '');
    }

    if (usrReqNeighborhood && !usrReqNeighborhood.value) {
      usrReqNeighborhood.value = meta.neighborhood_slug || (profNeighborhood ? profNeighborhood.value : 'onion-creek');
    }
  }

  if (prefill) {
    if (postModalTitle) postModalTitle.textContent = 'Post Repeat Service Request';
    if (usrReqNeighborhood) usrReqNeighborhood.value = prefill.neighborhood || 'onion-creek';
    if (usrReqNotes) usrReqNotes.value = prefill.notes || '';

    // Handle category matching via combobox
    if (prefill.category) {
      usrCombobox?.setValue(prefill.category);
    } else {
      usrCombobox?.reset();
    }

    if (usrReqDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      usrReqDate.value = tomorrow.toLocaleDateString('en-CA');
    }
  } else {
    if (postModalTitle) postModalTitle.textContent = 'Post Service Request';
    usrCombobox?.reset();
    if (usrReqNotes) usrReqNotes.value = '';
    if (usrReqDate) usrReqDate.value = '';
  }

  if (userNewRequestModal) {
    userNewRequestModal.style.display = 'flex';
    trapFocus(userNewRequestModal, closeNewReqModal);
  }
}

openNewRequestModalBtn?.addEventListener('click', () => openNewRequestModal());

function closeNewReqModal() {
  if (userNewRequestModal) userNewRequestModal.style.display = 'none';
  usrCombobox?.reset();
  releaseFocus();
}

closeUserReqModalBtn?.addEventListener('click', closeNewReqModal);
closeUserReqModalBtnTop?.addEventListener('click', closeNewReqModal);
userNewRequestModal?.addEventListener('click', (e) => {
  if (e.target === userNewRequestModal) closeNewReqModal();
});

userNewRequestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const neighborhood = usrReqNeighborhood ? usrReqNeighborhood.value : 'onion-creek';
  let category = usrCombobox ? usrCombobox.getValue() : (document.getElementById('usrReqCategory')?.value || document.getElementById('usrReqCategoryInput')?.value?.trim());
  if (category === 'Other') {
    const otherVal = document.getElementById('usrReqCategoryOther')?.value?.trim();
    if (otherVal) category = otherVal;
  }

  const date_needed = usrReqDate ? usrReqDate.value : '';
  const meta = currentUser.user_metadata || {};
  const name = meta.full_name || (profileDisplayName ? profileDisplayName.textContent : 'Verified Resident');
  const phone = meta.phone || (profPhone ? profPhone.value.trim() : '') || '—';
  const email = currentUser.email;
  const notes = usrReqNotes ? usrReqNotes.value.trim() : '';

  if (!category || !date_needed) {
    showToast('Please select a service category and target date.', true);
    return;
  }

  const todayStr = new Date().toLocaleDateString('en-CA');
  if (date_needed < todayStr) {
    showToast('Please select a date from today onward.', true);
    return;
  }

  const submitBtn = document.getElementById('submitUserReqBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing…';
  }

  const newRecord = {
    neighborhood,
    category,
    date_needed,
    notes,
    name,
    email,
    phone,
    status: 'new'
  };

  const { data, error } = await supabase
    .from('service_requests')
    .insert(newRecord)
    .select()
    .single();

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publish to Calendar';
  }

  if (error) {
    showToast('Failed to post request: ' + error.message, true);
    return;
  }

  try {
    const notifySession = await getSession();
    fetch('/.netlify/functions/notify-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${notifySession?.access_token}`,
      },
      body: JSON.stringify({
        category,
        date_needed,
        name,
        phone,
        email,
        notes,
        neighborhood
      })
    }).catch(() => {});
  } catch (e) {}

  window.dispatchEvent(new CustomEvent('service-request-created'));

  closeNewReqModal();
  userNewRequestForm.reset();
  showToast('Service request published to community calendar!');

  // Add to local cache and re-render instantly
  if (data) {
    userRequestsCache.unshift(data);
    updateVitalityStats();
    renderRequestsTable();
  } else {
    loadUserServiceRequests(currentUser.email);
  }
});

// Reschedule Modal Handlers
function openRescheduleModal(id, currentDate) {
  if (!rescheduleModal) return;
  rescheduleReqId.value = id;
  const todayStr = new Date().toLocaleDateString('en-CA');
  rescheduleDatePicker.min = todayStr;
  rescheduleDatePicker.value = currentDate >= todayStr ? currentDate : todayStr;
  rescheduleModal.style.display = 'flex';
  trapFocus(rescheduleModal, closeRescheduleModal);
}

function closeRescheduleModal() {
  if (rescheduleModal) rescheduleModal.style.display = 'none';
  releaseFocus();
}

closeRescheduleModalBtn?.addEventListener('click', closeRescheduleModal);
closeRescheduleModalBtnTop?.addEventListener('click', closeRescheduleModal);
rescheduleModal?.addEventListener('click', (e) => {
  if (e.target === rescheduleModal) closeRescheduleModal();
});

saveRescheduleBtn?.addEventListener('click', async () => {
  const id = Number(rescheduleReqId.value);
  const newDate = rescheduleDatePicker.value;
  const todayStr = new Date().toLocaleDateString('en-CA');

  if (!newDate || newDate < todayStr) {
    showToast('Please select a valid future date.', true);
    return;
  }

  saveRescheduleBtn.disabled = true;
  saveRescheduleBtn.textContent = 'Updating…';

  // Optimistic UI update
  const item = userRequestsCache.find((r) => r.id === id);
  const oldDate = item ? item.date_needed : null;
  const oldStatus = item ? item.status : null;
  if (item) {
    item.date_needed = newDate;
    item.status = 'new';
    renderRequestsTable();
  }

  const { error } = await supabase
    .from('service_requests')
    .update({ date_needed: newDate, status: 'new' })
    .eq('id', id)
    .eq('email', currentUser.email);

  saveRescheduleBtn.disabled = false;
  saveRescheduleBtn.textContent = 'Update Date';

  if (error) {
    if (item && oldDate) {
      item.date_needed = oldDate;
      item.status = oldStatus;
      renderRequestsTable();
    }
    showToast('Failed to reschedule: ' + error.message, true);
    return;
  }

  closeRescheduleModal();
  showToast('Target date updated on community calendar!');
  updateVitalityStats();
});

// Logout Action
logoutBtn?.addEventListener('click', async () => {
  sessionStorage.removeItem('tn_admin_verified_email');
  await supabase.auth.signOut();
  location.href = '/account/';
});

// Global Keyboard Shortcut: Escape closes modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (userNewRequestModal && userNewRequestModal.style.display === 'flex') {
      closeNewReqModal();
    }
    if (rescheduleModal && rescheduleModal.style.display === 'flex') {
      closeRescheduleModal();
    }
  }
});

// Wire Filter & Search
document.querySelectorAll('.tbl-filter-pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.tbl-filter-pill').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.dataset.filter || 'all';
    renderRequestsTable();
  });
});

reqSearchInput?.addEventListener('input', (e) => {
  currentSearchQuery = e.target.value.toLowerCase().trim();
  renderRequestsTable();
});

function updateVitalityStats() {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const activeReqs = userRequestsCache.filter((r) => r.status !== 'completed' && r.status !== 'closed' && r.date_needed >= todayStr);
  const fulfilledReqs = userRequestsCache.filter((r) => r.status === 'completed' || r.status === 'closed');

  if (requestsCountBadge) requestsCountBadge.textContent = userRequestsCache.length;
  if (statActiveRequests) statActiveRequests.textContent = activeReqs.length;
  if (statFulfilledRequests) statFulfilledRequests.textContent = fulfilledReqs.length;

  if (filterAllCount) filterAllCount.textContent = userRequestsCache.length;
  if (filterActiveCount) filterActiveCount.textContent = activeReqs.length;
  if (filterFulfilledCount) filterFulfilledCount.textContent = fulfilledReqs.length;
}

// Render Requests Table
function renderRequestsTable() {
  if (!requestsTableContainer) return;

  if (userRequestsCache.length === 0) {
    if (reqFilterRibbon) reqFilterRibbon.style.display = 'none';
    requestsTableContainer.innerHTML = `
      <div class="portal-empty-state">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
        <h3>No Service Requests Found</h3>
        <p>
          Need a trusted local plumber, electrician, or handyman? Post a request to schedule on your neighborhood service calendar.
        </p>
        <button class="auth-btn-primary" onclick="document.getElementById('openNewRequestModalBtn').click()" style="width:auto; padding:8px 20px; margin:0 auto;">
          + Post First Service Request
        </button>
      </div>
    `;
    return;
  }

  if (reqFilterRibbon) reqFilterRibbon.style.display = 'flex';

  const todayStr = new Date().toLocaleDateString('en-CA');

  // Filter & Search Logic
  const filtered = userRequestsCache.filter((r) => {
    const isCompleted = r.status === 'completed' || r.status === 'closed';
    const isPast = r.date_needed < todayStr && !isCompleted;
    const isUpcomingActive = !isCompleted && !isPast;

    if (currentFilter === 'active' && !isUpcomingActive) return false;
    if (currentFilter === 'fulfilled' && !isCompleted) return false;

    if (currentSearchQuery) {
      const matchCat = (r.category || '').toLowerCase().includes(currentSearchQuery);
      const matchNote = (r.notes || '').toLowerCase().includes(currentSearchQuery);
      const matchNeigh = (r.neighborhood || '').toLowerCase().includes(currentSearchQuery);
      if (!matchCat && !matchNote && !matchNeigh) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    requestsTableContainer.innerHTML = `
      <div class="portal-empty-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <h3>No Matching Requests</h3>
        <p>No service requests matched your active filter or search keywords.</p>
      </div>
    `;
    return;
  }

  requestsTableContainer.innerHTML = `
    <div class="portal-table-shell">
      <table class="portal-clean-table">
        <thead>
          <tr>
            <th style="width:115px;">Submitted</th>
            <th style="width:140px;">Category</th>
            <th style="width:130px;">Neighborhood</th>
            <th style="width:140px;">Target Date</th>
            <th style="min-width:200px;">Service Notes</th>
            <th style="width:140px;">Calendar Status</th>
            <th style="width:230px; text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((r) => {
            const isCompleted = r.status === 'completed' || r.status === 'closed';
            const isPast = r.date_needed < todayStr && !isCompleted;
            const isUpcomingActive = !isCompleted && !isPast;

            let statusBadge = '';
            let actionButtonsHtml = '';

            if (isCompleted) {
              statusBadge = `
                <span class="status-pill fulfilled" title="Fulfilled and archived from active calendar">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Fulfilled
                </span>
              `;
              actionButtonsHtml = `
                <button class="btn-action-pill accent re-request-btn" data-id="${r.id}" title="Repeat this request on a new calendar date">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  Request Again
                </button>
                <button class="btn-action-pill danger-icon delete-request-btn" data-id="${r.id}" title="Delete request">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              `;
            } else if (isPast) {
              statusBadge = `
                <span class="status-pill expired" title="Target date has passed. Pick a new date to republish.">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Needs Date
                </span>
              `;
              actionButtonsHtml = `
                <button class="btn-action-pill accent reschedule-btn" data-id="${r.id}" data-date="${esc(r.date_needed)}" title="Move to a future date">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Set New Date
                </button>
                <button class="btn-action-pill primary toggle-fulfill-btn" data-id="${r.id}" title="Mark as fulfilled">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Mark Done
                </button>
                <button class="btn-action-pill danger-icon delete-request-btn" data-id="${r.id}" title="Delete">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              `;
            } else {
              statusBadge = `
                <span class="status-pill active" title="Active on community service calendar">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
                  Live on Calendar
                </span>
              `;
              actionButtonsHtml = `
                <button class="btn-action-pill primary toggle-fulfill-btn" data-id="${r.id}" title="Mark completed">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Mark Done
                </button>
                <button class="btn-action-pill reschedule-btn" data-id="${r.id}" data-date="${esc(r.date_needed)}" title="Reschedule date">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Reschedule
                </button>
                <a href="/${r.neighborhood}/requests/" class="btn-action-pill" target="_blank" rel="noopener noreferrer" title="View on community service calendar">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Calendar ↗
                </a>
                <button class="btn-action-pill danger-icon delete-request-btn" data-id="${r.id}" title="Delete">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              `;
            }

            return `
            <tr style="${isCompleted ? 'background:#FAF9F5;' : ''}">
              <td><span style="font-weight:600; color:#64748B; font-size:0.84rem;">${esc(formatDate(r.created_at))}</span></td>
              <td><strong style="color:var(--masters-green); font-size:0.92rem;">${esc(r.category)}</strong></td>
              <td><span style="font-size:0.86rem; color:#475569;">${esc(formatNeighborhood(r.neighborhood))}</span></td>
              <td>
                <span style="font-weight:700; color:#1E293B; font-size:0.86rem; display:inline-flex; align-items:center; gap:6px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  ${esc(formatDate(r.date_needed))}
                </span>
              </td>
              <td>
                <div style="max-width:240px; font-size:0.84rem; color:#475569; line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="${esc(r.notes || '')}">
                  ${esc(r.notes || '—')}
                </div>
              </td>
              <td>${statusBadge}</td>
              <td style="text-align:right;">
                <div style="display:inline-flex; gap:6px; justify-content:flex-end; align-items:center; flex-wrap:wrap;">
                  ${actionButtonsHtml}
                </div>
              </td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Wire Mark Fulfilled Action with Optimistic UI
  requestsTableContainer.querySelectorAll('.toggle-fulfill-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      const item = userRequestsCache.find((r) => r.id === id);
      const oldStatus = item ? item.status : 'new';

      // Optimistic update
      if (item) {
        item.status = 'completed';
        renderRequestsTable();
        updateVitalityStats();
      }

      const { error } = await supabase
        .from('service_requests')
        .update({ status: 'completed' })
        .eq('id', id)
        .eq('email', currentUser.email);

      if (error) {
        if (item) {
          item.status = oldStatus;
          renderRequestsTable();
          updateVitalityStats();
        }
        showToast('Failed to mark as fulfilled: ' + error.message, true);
        return;
      }

      showToast('Service marked as Fulfilled!');
    });
  });

  // Wire Request Again Action
  requestsTableContainer.querySelectorAll('.re-request-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const req = userRequestsCache.find((x) => x.id === id);
      if (req) {
        openNewRequestModal({
          neighborhood: req.neighborhood,
          category: req.category,
          notes: req.notes
        });
      }
    });
  });

  // Wire Reschedule Action
  requestsTableContainer.querySelectorAll('.reschedule-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const curDate = btn.dataset.date || '';
      openRescheduleModal(id, curDate);
    });
  });

  // Wire Delete Request Action with Optimistic UI
  requestsTableContainer.querySelectorAll('.delete-request-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      if (!(await confirmDialog('Permanently remove this service request?'))) return;

      const idx = userRequestsCache.findIndex((r) => r.id === id);
      const removedItem = userRequestsCache[idx];

      // Optimistic delete
      if (idx !== -1) {
        userRequestsCache.splice(idx, 1);
        renderRequestsTable();
        updateVitalityStats();
      }

      const { error } = await supabase
        .from('service_requests')
        .delete()
        .eq('id', id)
        .eq('email', currentUser.email);

      if (error) {
        if (removedItem) {
          userRequestsCache.splice(idx, 0, removedItem);
          renderRequestsTable();
          updateVitalityStats();
        }
        showToast('Failed to delete request: ' + error.message, true);
        return;
      }

      showToast('Service request deleted.');
    });
  });
}

// Fetch User's Service Requests
async function loadUserServiceRequests(userEmail) {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('email', userEmail)
    .order('created_at', { ascending: false });

  if (error) {
    if (requestsTableContainer) {
      requestsTableContainer.innerHTML = '<div class="portal-empty-state">Failed to load service requests.</div>';
    }
    return;
  }

  userRequestsCache = data || [];
  updateVitalityStats();
  renderRequestsTable();
}

// Fetch User's Referral Suggestions
async function loadUserReferrals(userEmail) {
  const referralsContainer = document.getElementById('referralsTableContainer');

  const { data, error } = await supabase
    .from('referral_suggestions')
    .select('*')
    .eq('referrer_email', userEmail)
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    if (referralsCountBadge) referralsCountBadge.textContent = '0';
    if (statReferrals) statReferrals.textContent = '0';
    if (referralsContainer) {
      referralsContainer.innerHTML = `
        <div class="portal-empty-state">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
          <h3>No Referral Suggestions Yet</h3>
          <p>
            Know a trusted local handyman, plumber, or contractor? Recommend them to your neighbors from any neighborhood directory page.
          </p>
          <a href="/" class="auth-btn-primary" style="text-decoration:none; display:inline-flex; width:auto; padding:8px 20px; margin:0 auto;">
            Browse Directory to Recommend ↗
          </a>
        </div>
      `;
    }
    return;
  }

  if (referralsCountBadge) referralsCountBadge.textContent = data.length;
  if (statReferrals) statReferrals.textContent = data.length;

  if (referralsContainer) {
    referralsContainer.innerHTML = `
      <div class="portal-table-shell">
        <table class="portal-clean-table">
          <thead>
            <tr>
              <th style="width:115px;">Submitted</th>
              <th style="width:200px;">Business / Pro Name</th>
              <th style="width:140px;">Neighborhood</th>
              <th style="width:140px;">Category</th>
              <th style="min-width:200px;">Recommendation Note</th>
              <th style="width:130px;">Review Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((r) => {
              let statusPill = '<span class="status-pill expired">Under Review</span>';
              if (r.status === 'approved') {
                statusPill = '<span class="status-pill active"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Published</span>';
              } else if (r.status === 'rejected') {
                statusPill = '<span class="status-pill fulfilled">Declined</span>';
              }

              return `
              <tr>
                <td><span style="font-weight:600; color:#64748B; font-size:0.84rem;">${esc(formatDate(r.created_at))}</span></td>
                <td><strong style="color:var(--masters-green); font-size:0.92rem;">${esc(r.name)}</strong></td>
                <td><span style="font-size:0.86rem; color:#475569;">${esc(formatNeighborhood(r.neighborhood))}</span></td>
                <td><span style="font-size:0.86rem; color:#475569;">${esc(r.category || 'General')}</span></td>
                <td>
                  <div style="font-size:0.84rem; color:#475569; line-height:1.45; max-width:280px;" title="${esc(r.notes || '')}">
                    ${esc(r.notes || '—')}
                  </div>
                </td>
                <td>${statusPill}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

// Saved Listings Manager
async function loadSavedListings(userEmail) {
  const container = document.getElementById('savedContainer');

  const savedIds = JSON.parse(localStorage.getItem(`saved_listings_${userEmail}`) || '[]');
  if (savedIds.length === 0) {
    if (savedCountBadge) savedCountBadge.textContent = '0';
    if (statSavedProviders) statSavedProviders.textContent = '0';
    if (container) {
      container.innerHTML = `
        <div class="portal-empty-state">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          <h3>No Saved Providers</h3>
          <p>
            Bookmark top-rated local professionals while exploring your neighborhood directory for quick one-tap access here.
          </p>
          <a href="/" class="auth-btn-primary" style="text-decoration:none; display:inline-flex; width:auto; padding:8px 20px; margin:0 auto;">
            Explore Neighborhood Directories ↗
          </a>
        </div>
      `;
    }
    return;
  }

  const { data } = await supabase.from('listings').select('*').in('id', savedIds);
  if (!data || data.length === 0) {
    if (savedCountBadge) savedCountBadge.textContent = '0';
    if (statSavedProviders) statSavedProviders.textContent = '0';
    if (container) {
      container.innerHTML = `
        <div class="portal-empty-state">
          <h3>No matching saved recommendations found.</h3>
        </div>
      `;
    }
    return;
  }

  if (savedCountBadge) savedCountBadge.textContent = data.length;
  if (statSavedProviders) statSavedProviders.textContent = data.length;

  if (container) {
    container.innerHTML = `
      <div class="saved-grid-deck">
        ${data.map((l) => `
          <div class="saved-provider-card">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <h4 style="font-family:'EB Garamond', serif; margin:0; font-size:1.3rem; color:var(--masters-green); font-weight:600;">${esc(l.name)}</h4>
                <span class="status-pill active">${esc(formatNeighborhood(l.neighborhood_slug))}</span>
              </div>
              <p style="font-size:0.86rem; color:#475569; margin:0 0 16px 0; line-height:1.45;">${esc(l.note || 'Verified local service provider.')}</p>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #E2E8F0; padding-top:14px;">
              <div style="display:flex; gap:6px;">
                ${l.phone ? `
                  <a href="tel:${esc(l.phone)}" class="btn-action-pill primary">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    ${esc(l.phone)}
                  </a>
                ` : ''}
                ${l.website ? `
                  <a href="${esc(l.website)}" target="_blank" rel="noopener noreferrer" class="btn-action-pill" title="Open website">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>
                  </a>
                ` : ''}
              </div>
              <button class="btn-action-pill danger-icon remove-saved-btn" data-id="${l.id}" title="Remove bookmark">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
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
        showToast('Removed from saved recommendations.');
        loadSavedListings(userEmail);
      });
    });
  }
}

// Page Initialization with Concurrent Parallel Data Loading
async function initPage() {
  const session = await getSession();

  if (session && session.user) {
    currentUser = session.user;
    if (authFormCard) authFormCard.style.display = 'none';
    if (profileCard) profileCard.style.display = 'block';
    if (headerLoggedInActions) headerLoggedInActions.style.display = 'flex';

    const user = session.user;
    const meta = user.user_metadata || {};
    const name = meta.full_name || '';
    const phone = meta.phone || '';
    const avatarUrl = meta.avatar_url || '/images/default-avatar.jpg';
    const neighborhood = meta.neighborhood_slug || 'onion-creek';

    if (profileDisplayName) profileDisplayName.textContent = formatNameTitle(name) || 'Neighbor';
    if (profileDisplayEmail) profileDisplayEmail.textContent = user.email || '';
    if (userAvatarImg) userAvatarImg.src = avatarUrl;
    if (profName) profName.value = name;
    if (profPhone) profPhone.value = phone;
    if (profNeighborhood) profNeighborhood.value = neighborhood;

    updateNeighborhoodContext(neighborhood);

    // Parallel concurrent loading for peak performance
    await Promise.all([
      loadUserServiceRequests(user.email),
      loadSavedListings(user.email),
      loadUserReferrals(user.email)
    ]);
  } else {
    currentUser = null;
    if (authFormCard) authFormCard.style.display = 'block';
    if (profileCard) profileCard.style.display = 'none';
    if (headerLoggedInActions) headerLoggedInActions.style.display = 'none';
    clearMessages();
  }
}

// Auth State Listener
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
    initPage();
  }
});

initPage();
