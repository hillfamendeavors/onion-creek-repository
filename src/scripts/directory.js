// Client interactivity for a neighborhood directory page.
//
// The listings are already pre-rendered into the HTML at build time (good for
// crawlers / AI readers). This script never rebuilds the list — it only
// shows/hides the existing DOM for category-tab filtering and search, plus the
// collapse, copy-phone, "Suggest a Referral", and "Need a Service?" behaviors.

import { supabase } from '../lib/supabase.js';
import { getSession } from '../lib/auth.js';

export function showToast(message, type = 'info', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconMap = {
    success: '✅',
    error: '⚠️',
    warning: '⚡',
    info: 'ℹ️',
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || 'ℹ️'}</span>
    <span class="toast-body">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(16px) scale(0.95)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

const pillsEl = document.getElementById('groupPills');
const container = document.getElementById('listingsContainer');
const searchEl = document.getElementById('search');
const noResults = document.getElementById('no-results');

let activeGroup = 'all';
let searchQuery = '';

function syncAllTabClass() {
  document.body.classList.toggle('all-tab-active', activeGroup === 'all');
}

function countLabel(n) {
  return `${n} listing${n !== 1 ? 's' : ''}`;
}

function applyFilter() {
  const q = searchQuery;
  let anyVisible = false;

  container.querySelectorAll('.group-block').forEach((block) => {
    const gid = block.dataset.gid;
    const groupLabel = block.dataset.label || '';
    const tabOk = activeGroup === 'all' || activeGroup === gid;

    let groupHasVisible = false;

    block.querySelectorAll('.subcategory').forEach((sub) => {
      const subName = sub.dataset.subname || '';
      const subMatch = !q || subName.includes(q) || groupLabel.includes(q);
      const table = sub.querySelector('.listings-table');
      const isEmpty = table && table.dataset.empty === 'true';

      let visibleRows = 0;
      if (!isEmpty) {
        sub.querySelectorAll('.listing-row').forEach((row) => {
          const text = row.dataset.search || '';
          const rowMatch = subMatch || text.includes(q);
          row.style.display = rowMatch ? '' : 'none';
          if (rowMatch) visibleRows++;
        });
      }

      const showSub = !q || subMatch || visibleRows > 0;
      sub.style.display = showSub && tabOk ? '' : 'none';

      const countEl = sub.querySelector('.subcat-count');
      if (countEl) {
        const full = parseInt(countEl.dataset.full || '0', 10);
        const shown = !q ? full : subMatch ? full : visibleRows;
        countEl.textContent = countLabel(shown);
      }

      if (showSub && tabOk) groupHasVisible = true;
    });

    const showBlock = tabOk && groupHasVisible;
    block.style.display = showBlock ? '' : 'none';
    if (showBlock) anyVisible = true;
  });

  noResults.style.display = anyVisible ? 'none' : 'block';
}

// ── Category tabs ──
if (pillsEl) {
  pillsEl.addEventListener('click', (e) => {
    const tab = e.target.closest('.nav-tab');
    if (!tab) return;
    pillsEl.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    activeGroup = tab.dataset.gid;
    syncAllTabClass();
    applyFilter();
  });
}

// ── Search ──
if (searchEl) {
  searchEl.addEventListener('input', () => {
    searchQuery = searchEl.value.toLowerCase();
    applyFilter();
  });
}

// ── Collapse / expand subcategories (event delegation) ──
if (container) {
  container.addEventListener('click', (e) => {
    const header = e.target.closest('.subcat-header');
    if (!header || !container.contains(header)) return;
    const table = header.nextElementSibling;
    const arrow = header.querySelector('.subcat-arrow');
    const isOpening = table.classList.contains('collapsed');
    table.classList.toggle('collapsed');
    if (arrow) arrow.classList.toggle('open');
    if (isOpening) {
      setTimeout(() => header.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
  });

  // ── Copy-to-clipboard phone buttons (event delegation) ──
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-phone-btn');
    if (!btn) return;
    const phone = btn.dataset.phone;
    const doConfirm = () => {
      btn.classList.add('copied');
      setTimeout(() => btn.classList.remove('copied'), 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(phone).then(doConfirm).catch(() => fallbackCopy(phone, doConfirm));
    } else {
      fallbackCopy(phone, doConfirm);
    }
  });
}

function fallbackCopy(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); cb(); } catch (_) {}
  document.body.removeChild(ta);
}

// ── Phone formatting helper ──
function formatUSPhone(digits) {
  digits = (digits || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

// ── Suggest-a-Referral modal ──
const overlay = document.getElementById('modalOverlay');
const openBtn = document.getElementById('openModal');
const closeBtn = document.getElementById('closeModal');
const submitBtn = document.getElementById('submitBtn');
const formView = document.getElementById('formView');
const thankYou = document.getElementById('thankYouView');

function closeModal() {
  overlay.classList.remove('open');
  setTimeout(() => {
    formView.style.display = 'block';
    thankYou.style.display = 'none';
    ['f-name', 'f-phone', 'f-category', 'f-note', 'f-referrer'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }, 300);
}

function closeOtherModals() {
  document.querySelectorAll('.modal-overlay.open').forEach((m) => m.classList.remove('open'));
}

if (overlay && openBtn && closeBtn) {
  const referralAuthView = document.getElementById('referralAuthView');
  const referralLoginLink = document.getElementById('referralLoginLink');

  openBtn.addEventListener('click', async () => {
    closeOtherModals();
    overlay.classList.add('open');
    const session = await getSession();
    if (session && session.user) {
      if (referralAuthView) referralAuthView.style.display = 'none';
      if (formView) formView.style.display = 'block';
      const refEl = document.getElementById('f-referrer');
      if (refEl && !refEl.value) {
        refEl.value = session.user.user_metadata?.full_name || '';
      }
    } else {
      if (referralLoginLink) {
        referralLoginLink.href = `/login/?next=${encodeURIComponent(location.pathname)}`;
      }
      if (referralAuthView) referralAuthView.style.display = 'block';
      if (formView) formView.style.display = 'none';
    }
  });
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  submitBtn.addEventListener('click', async () => {
    const name = document.getElementById('f-name').value.trim();
    let phone = document.getElementById('f-phone').value.trim();
    const category = document.getElementById('f-category').value;
    const note = document.getElementById('f-note').value.trim();
    const referrer = document.getElementById('f-referrer').value.trim();

    const phoneDigits = phone.replace(/\D/g, '');
    if (!name || !phoneDigits || !note || !referrer) {
      showToast('Please fill in your name, the business name, phone, and recommendation fields.', 'warning');
      return;
    }
    if (phoneDigits.length !== 10) {
      showToast('Please enter a 10-digit phone number in the format (512) 555-0000.', 'warning');
      return;
    }
    phone = formatUSPhone(phoneDigits);

    submitBtn.textContent = 'Submitting…';
    submitBtn.disabled = true;

    const session = await getSession();
    const referrerEmail = session?.user?.email || null;

    try {
      await supabase.from('referral_suggestions').insert({
        neighborhood: overlay.dataset.neighborhood,
        name,
        phone,
        category: category || null,
        note,
        referrer,
        referrer_email: referrerEmail,
        status: 'new'
      });
    } catch (e) {
      console.warn('Supabase referral_suggestions insert notice:', e);
    }

    try {
      await fetch('/.netlify/functions/notify-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          category,
          note,
          referrer,
          referrer_email: referrerEmail,
          neighborhood: overlay.dataset.neighborhood,
          subjectPrefix: overlay.dataset.subject,
        }),
      });
    } catch (e) {}

    formView.style.display = 'none';
    thankYou.style.display = 'block';
    submitBtn.textContent = 'Submit Referral';
    submitBtn.disabled = false;
  });
}

// ── Phone input live formatting ──
function wirePhoneFormatting(phoneEl) {
  if (!phoneEl) return;
  phoneEl.addEventListener('input', () => {
    phoneEl.value = formatUSPhone(phoneEl.value.replace(/\D/g, ''));
  });
  phoneEl.addEventListener('blur', () => {
    const digits = phoneEl.value.replace(/\D/g, '');
    if (!digits) return;
    if (digits.length !== 10) {
      alert('Please enter a 10-digit phone number (e.g. (512) 555-0000).');
      phoneEl.focus();
    } else {
      phoneEl.value = formatUSPhone(digits);
    }
  });
  phoneEl.addEventListener('paste', (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text') || '';
    phoneEl.value = formatUSPhone(paste.replace(/\D/g, '').slice(0, 10));
  });
}
wirePhoneFormatting(document.getElementById('f-phone'));
wirePhoneFormatting(document.getElementById('r-phone'));

// ── "Need a Service?" modal ──
const reqOverlay = document.getElementById('requestModalOverlay');
const reqOpenBtn = document.getElementById('openRequestModal');
const reqCloseBtn = document.getElementById('closeRequestModal');
const reqSubmitBtn = document.getElementById('submitRequestBtn');
const reqAuthView = document.getElementById('requestAuthView');
const reqFormView = document.getElementById('requestFormView');
const reqThankYou = document.getElementById('requestThankYouView');
const requestLoginLink = document.getElementById('requestLoginLink');

function showRequestForm() {
  reqAuthView.style.display = 'none';
  reqFormView.style.display = 'block';
  reqThankYou.style.display = 'none';
}

function showAuthView() {
  reqAuthView.style.display = 'block';
  reqFormView.style.display = 'none';
  reqThankYou.style.display = 'none';
}

function closeRequestModal() {
  reqOverlay.classList.remove('open');
  setTimeout(() => {
    reqThankYou.style.display = 'none';
    ['r-category', 'r-date', 'r-name', 'r-phone', 'r-email', 'r-notes'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }, 300);
}

if (reqOverlay && reqOpenBtn && reqCloseBtn) {
  const dateEl = document.getElementById('r-date');
  if (dateEl) dateEl.min = new Date().toISOString().split('T')[0];

  reqOpenBtn.addEventListener('click', async () => {
    closeOtherModals();
    reqOverlay.classList.add('open');
    const session = await getSession();
    if (session) {
      showRequestForm();
    } else {
      if (requestLoginLink) {
        requestLoginLink.href = `/login/?next=${encodeURIComponent(location.pathname)}`;
      }
      showAuthView();
    }
  });
  reqCloseBtn.addEventListener('click', closeRequestModal);
  reqOverlay.addEventListener('click', (e) => { if (e.target === reqOverlay) closeRequestModal(); });

  reqSubmitBtn.addEventListener('click', async () => {
    const category = document.getElementById('r-category').value;
    const date_needed = document.getElementById('r-date').value;
    const name = document.getElementById('r-name').value.trim();
    let phone = document.getElementById('r-phone').value.trim();
    const email = document.getElementById('r-email').value.trim();
    const notes = document.getElementById('r-notes').value.trim();

    const phoneDigits = phone.replace(/\D/g, '');
    if (!category || !date_needed || !name || !phoneDigits) {
      showToast('Please fill in the category, date needed, your name, and phone fields.', 'warning');
      return;
    }
    if (phoneDigits.length !== 10) {
      showToast('Please enter a 10-digit phone number in the format (512) 555-0000.', 'warning');
      return;
    }
    phone = formatUSPhone(phoneDigits);

    reqSubmitBtn.textContent = 'Submitting…';
    reqSubmitBtn.disabled = true;

    const { error } = await supabase.from('service_requests').insert({
      neighborhood: reqOverlay.dataset.neighborhood,
      category,
      date_needed,
      name,
      phone,
      email: email || null,
      notes: notes || null,
    });

    try {
      await fetch('/.netlify/functions/notify-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          date_needed,
          name,
          phone,
          email,
          notes,
          neighborhood: reqOverlay.dataset.neighborhood,
        }),
      });
    } catch (e) {}

    reqSubmitBtn.textContent = 'Submit Request';
    reqSubmitBtn.disabled = false;

    if (error) {
      showToast('Something went wrong submitting your request. Please try again.', 'error');
      return;
    }

    reqFormView.style.display = 'none';
    reqThankYou.style.display = 'block';
  });
}

// Initial state: "All" tab active (caps each table height via CSS).
syncAllTabClass();

// ── Site-wide login status ──
function escStatus(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

const authStatusEl = document.getElementById('authStatus');
if (authStatusEl) {
  getSession().then((session) => {
    if (session?.user?.email) {
      const displayName = session.user.user_metadata?.full_name || session.user.email;
      authStatusEl.innerHTML = `Logged in as <strong>${escStatus(displayName)}</strong> &middot; <a href="/login/" style="color:var(--masters-green);font-weight:600;text-decoration:underline;">My Account</a> &middot; <button id="authStatusLogout" style="background:none;border:none;color:inherit;font-family:inherit;cursor:pointer;text-decoration:underline;padding:0;">Log out</button>`;
      document.getElementById('authStatusLogout')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        location.reload();
      });
    } else {
      authStatusEl.innerHTML = `<a href="/login/?next=${encodeURIComponent(location.pathname)}">Log in</a>`;
    }
    authStatusEl.classList.add('visible');
  });
}
