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
  const openReferralHandler = async () => {
    closeOtherModals();
    overlay.classList.add('open');
    if (formView) formView.style.display = 'block';
    
    // Autofill name if logged in
    const session = await getSession();
    if (session && session.user) {
      const refEl = document.getElementById('f-referrer');
      if (refEl && !refEl.value) {
        refEl.value = session.user.user_metadata?.full_name || '';
      }
    }
  };

  openBtn.addEventListener('click', openReferralHandler);
  document.getElementById('toolkitOpenReferralBtn')?.addEventListener('click', openReferralHandler);

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  const categorySelect = document.getElementById('f-category');
  const categoryOther = document.getElementById('f-category-other');
  if (categorySelect && categoryOther) {
    categorySelect.addEventListener('change', () => {
      categoryOther.style.display = categorySelect.value === 'Other' ? 'block' : 'none';
      if (categorySelect.value !== 'Other') categoryOther.value = '';
    });
  }

  submitBtn.addEventListener('click', async () => {
    const name = document.getElementById('f-name').value.trim();
    let phone = document.getElementById('f-phone').value.trim();
    let category = document.getElementById('f-category').value;
    const email = document.getElementById('f-email')?.value.trim();
    const website = document.getElementById('f-website')?.value.trim();
    const note = document.getElementById('f-note').value.trim();
    const referrer = document.getElementById('f-referrer').value.trim();

    if (category === 'Other') {
      const otherVal = document.getElementById('f-category-other')?.value.trim();
      if (otherVal) category = otherVal;
    }

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

    let finalNote = note;
    if (email) finalNote += `\nEmail: ${email}`;
    if (website) finalNote += `\nWebsite: ${website}`;

    try {
      await supabase.from('referral_suggestions').insert({
        neighborhood: overlay.dataset.neighborhood,
        name,
        phone,
        category: category || null,
        note: finalNote,
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
          note: finalNote,
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
  if(reqAuthView) reqAuthView.style.display = 'none';
  if(reqFormView) reqFormView.style.display = 'block';
  if(reqThankYou) reqThankYou.style.display = 'none';
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

  const openRequestHandler = async () => {
    closeOtherModals();
    reqOverlay.classList.add('open');

    const session = await getSession();
    if (!session || !session.user) {
      if (reqFormView) reqFormView.style.display = 'none';
      if (reqThankYou) reqThankYou.style.display = 'none';
      if (reqAuthView) reqAuthView.style.display = 'block';
      if (requestLoginLink) {
        requestLoginLink.href = `/account/?next=${encodeURIComponent(location.pathname)}`;
      }
    } else {
      if (reqAuthView) reqAuthView.style.display = 'none';
      if (reqThankYou) reqThankYou.style.display = 'none';
      if (reqFormView) reqFormView.style.display = 'block';

      // Populate verified resident pill from profile
      const rDisplayName = document.getElementById('r-display-name');
      const rDisplayContact = document.getElementById('r-display-contact');
      const resName = session.user.user_metadata?.full_name || 'Verified Resident';
      const resPhone = session.user.user_metadata?.phone || '';
      
      if (rDisplayName) rDisplayName.textContent = formatNameTitle(resName);
      if (rDisplayContact) {
        rDisplayContact.textContent = resPhone ? `${formatUSPhone(resPhone)} · ${session.user.email}` : (session.user.email || '');
      }

      const rDate = document.getElementById('r-date');
      const todayStr = new Date().toLocaleDateString('en-CA');
      if (rDate) {
        rDate.min = todayStr;
      }
    }
  };

  reqOpenBtn.addEventListener('click', openRequestHandler);
  document.getElementById('toolkitOpenRequestBtn')?.addEventListener('click', openRequestHandler);
  document.getElementById('noResultsReqBtn')?.addEventListener('click', openRequestHandler);

  reqCloseBtn.addEventListener('click', closeRequestModal);
  reqOverlay.addEventListener('click', (e) => { if (e.target === reqOverlay) closeRequestModal(); });

  const rCategorySelect = document.getElementById('r-category');
  const rCategoryOther = document.getElementById('r-category-other');
  if (rCategorySelect && rCategoryOther) {
    rCategorySelect.addEventListener('change', () => {
      rCategoryOther.style.display = rCategorySelect.value === 'Other' ? 'block' : 'none';
      if (rCategorySelect.value !== 'Other') rCategoryOther.value = '';
    });
  }

  reqSubmitBtn.addEventListener('click', async () => {
    const session = await getSession();
    if (!session || !session.user) {
      showToast('You must be logged in with a verified account to submit a service request.', 'warning');
      if (reqFormView) reqFormView.style.display = 'none';
      if (reqAuthView) reqAuthView.style.display = 'block';
      return;
    }

    let category = document.getElementById('r-category')?.value;
    const date_needed = document.getElementById('r-date')?.value;

    if (category === 'Other') {
      const otherVal = document.getElementById('r-category-other')?.value.trim();
      if (otherVal) category = otherVal;
    }
    
    const meta = session.user.user_metadata || {};
    const name = meta.full_name || 'Verified Resident';
    const phone = meta.phone ? formatUSPhone(meta.phone) : '—';
    const email = session.user.email;
    const notes = document.getElementById('r-notes')?.value.trim() || '';

    if (!category || !date_needed) {
      showToast('Please choose a category and date needed.', 'warning');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-CA');
    if (date_needed < todayStr) {
      showToast('Please choose a date from today onward.', 'warning');
      return;
    }

    reqSubmitBtn.textContent = 'Publishing…';
    reqSubmitBtn.disabled = true;

    const { error } = await supabase.from('service_requests').insert({
      neighborhood: reqOverlay.dataset.neighborhood,
      category,
      date_needed,
      name,
      phone,
      email: email || null,
      notes: notes || null,
      status: 'new'
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
    window.dispatchEvent(new CustomEvent('service-request-created'));
  });
}

// Initial state: "All" tab active (caps each table height via CSS).
syncAllTabClass();

// ── Top Bar Single Auth Status ──
function escStatus(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

const topBarAuthEl = document.getElementById('topBarAuth');

getSession().then((session) => {
  if (!topBarAuthEl) return;
  if (session?.user?.email) {
    const fullName = session.user.user_metadata?.full_name;
    const firstName = fullName ? fullName.split(' ')[0] : 'Neighbor';
    topBarAuthEl.innerHTML = `
      <span class="top-bar-user">Hi, <strong>${escStatus(firstName)}</strong></span>
      <span class="top-bar-sep">&middot;</span>
      <a href="/account/" class="top-bar-link">My Account</a>
      <span class="top-bar-sep">&middot;</span>
      <button id="topBarLogoutBtn" class="top-bar-logout-btn" type="button">Log Out</button>
    `;
    document.getElementById('topBarLogoutBtn')?.addEventListener('click', async () => {
      await supabase.auth.signOut();
      location.reload();
    });
  } else {
    topBarAuthEl.innerHTML = `
      <a href="/account/?next=${encodeURIComponent(location.pathname)}" class="top-bar-login">Log In / Register</a>
    `;
  }
});

// ── Dynamic Request Badge & Live Banner ──
const badgeBtn = document.getElementById('calendarBadgeBtn');
const badgeCount = document.getElementById('calendarBadgeCount');
const liveBanner = document.getElementById('liveRequestsBanner');
const liveReqCountText = document.getElementById('liveReqCountText');
const liveReqSummary = document.getElementById('liveReqSummary');

// Extract neighborhood slug from the URL path (e.g., /onion-creek/ -> onion-creek)
const pathParts = window.location.pathname.split('/').filter(Boolean);
const neighborhoodSlug = pathParts[0];

if (neighborhoodSlug) {
  supabase
    .from('service_requests')
    .select('category, notes', { count: 'exact' })
    .eq('neighborhood', neighborhoodSlug)
    .eq('status', 'new')
    .order('created_at', { ascending: false })
    .limit(3)
    .then(({ data, count, error }) => {
      if (!error && count > 0) {
        if (badgeCount && badgeBtn) {
          badgeCount.textContent = count > 99 ? '99+' : count;
          badgeCount.style.display = 'flex';
          badgeBtn.classList.add('show');
        }
        if (liveBanner) {
          if (liveReqCountText) liveReqCountText.textContent = `${count} ${count === 1 ? 'Request' : 'Requests'}`;
          if (liveReqSummary && data && data.length > 0) {
            const categories = data.map(d => d.category).filter(Boolean);
            const preview = categories.slice(0, 2).join(', ');
            liveReqSummary.textContent = `${count} ${count === 1 ? 'neighbor needs' : 'neighbors need'} assistance (${preview}${count > 2 ? ' + more' : ''})`;
          }
          liveBanner.style.display = 'flex';
        }
      }
    })
    .catch(err => console.warn('Failed to fetch request count for banner:', err));
}

// ── Neighborhood Switcher Dropdown Interaction ──
function initNeighborhoodSwitcher() {
  const btn = document.getElementById('switchDropdownBtn');
  const card = document.getElementById('switcherDropdownCard');
  if (!btn || !card) return;

  const toggleDropdown = (show) => {
    const isExpanded = show !== undefined ? show : card.style.display === 'none';
    card.style.display = isExpanded ? 'block' : 'none';
    btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !card.contains(e.target)) {
      toggleDropdown(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && card.style.display === 'block') {
      toggleDropdown(false);
      btn.focus();
    }
  });
}

initNeighborhoodSwitcher();

