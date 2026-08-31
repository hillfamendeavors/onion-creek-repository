import { supabase } from '../lib/supabase.js';
import { getSession } from '../lib/auth.js';
import { getMonthMatrix, aggregateRequests } from '../lib/calendar.js';
import { trapFocus, releaseFocus } from './modal-a11y.js';
import { showToast, confirmDialog } from './ui-feedback.js';
import { initCategoryCombobox } from './category-combobox.js';

const main = document.querySelector('main[data-neighborhood]');
const neighborhood = main?.dataset?.neighborhood || '';
const neighborhoodName = main?.dataset?.neighborhoodName || neighborhood;

// Auth Notice Banner
const authPrompt = document.getElementById('requestsAuthPrompt');
const loginLink = document.getElementById('rpLoginLink');

// View Switcher & Month Navigation
const viewCalendarBtn = document.getElementById('viewCalendarBtn');
const viewListBtn = document.getElementById('viewListBtn');
const requestsCalendarView = document.getElementById('requestsCalendarView');
const requestsListView = document.getElementById('requestsListView');

const monthNav = document.getElementById('monthNav');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const currentMonthLabel = document.getElementById('currentMonthLabel');
const todayBtn = document.getElementById('todayBtn');

// Filter Elements
const filterMyRequestsBtn = document.getElementById('filterMyRequestsBtn');
const myReqCountBadge = document.getElementById('myReqCountBadge');
const filterPills = document.querySelectorAll('.filter-pill');

// Content Containers
const calendarGrid = document.getElementById('calendarGrid');
const requestsListContent = document.getElementById('requestsListContent');

// Post Request Trigger from Calendar
const openCalendarPostReqBtn = document.getElementById('openCalendarPostReqBtn');

// Modal Elements - Request Details
const requestDetailModal = document.getElementById('requestDetailModal');
const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
const modalDateTitle = document.getElementById('modalDateTitle');
const modalSubTitle = document.getElementById('modalSubTitle');
const modalBody = document.getElementById('modalBody');

// Admin In-Page Edit Modal Elements
const adminRequestEditModal = document.getElementById('adminRequestEditModal');
const adminRequestEditForm = document.getElementById('adminRequestEditForm');
const closeAdminEditBtn = document.getElementById('closeAdminEditBtn');
const closeAdminEditModalBtn = document.getElementById('closeAdminEditModalBtn');

// "Need a Service?" Modal Elements
const reqOverlay = document.getElementById('requestModalOverlay');
const reqOpenFab = document.getElementById('openRequestModal');
const reqCloseBtn = document.getElementById('closeRequestModal');
const reqSubmitBtn = document.getElementById('submitRequestBtn');
const reqAuthView = document.getElementById('requestAuthView');
const reqFormView = document.getElementById('requestFormView');
const reqThankYou = document.getElementById('requestThankYouView');
const requestLoginLink = document.getElementById('requestLoginLink');
const reqCombobox = initCategoryCombobox();
const rDateInput = document.getElementById('r-date');
const rNotesInput = document.getElementById('r-notes');
const rDisplayName = document.getElementById('r-display-name');
const rDisplayContact = document.getElementById('r-display-contact');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

let todayDate = new Date();
let currentYear = todayDate.getFullYear();
let currentMonth = todayDate.getMonth();

let isAuthenticated = false;
let currentUser = null;
let userIsAdmin = false;
let rawRequests = [];
let groupedMap = {};

let activeCategory = 'all';
let filterMyRequestsOnly = false;

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function formatNameTitle(str) {
  if (!str) return 'Resident';
  return str.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function formatUSPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isOwner(item) {
  if (!currentUser) return false;
  if (item.user_id && item.user_id === currentUser.id) return true;
  if (item.email && currentUser.email && item.email.toLowerCase() === currentUser.email.toLowerCase()) return true;
  return false;
}

function isPastDate(dateStr) {
  if (!dateStr) return false;
  const todayStr = new Date().toLocaleDateString('en-CA');
  return dateStr < todayStr;
}

function getFilteredRequests() {
  return rawRequests.filter((item) => {
    if (filterMyRequestsOnly && !isOwner(item)) {
      return false;
    }
    if (activeCategory !== 'all' && item.category !== activeCategory) {
      return false;
    }
    return true;
  });
}

function updateGroupedData() {
  const filtered = getFilteredRequests();
  groupedMap = aggregateRequests(filtered);
}

// Wire Category & My Requests Filters
filterPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    filterPills.forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');

    if (pill.dataset.my === 'true') {
      filterMyRequestsOnly = true;
      activeCategory = 'all';
    } else {
      filterMyRequestsOnly = false;
      activeCategory = pill.dataset.category || 'all';
    }

    updateGroupedData();
    renderCalendar();
    renderList();
  });
});

// View Switching
viewCalendarBtn?.addEventListener('click', () => {
  viewCalendarBtn.classList.add('active');
  viewListBtn?.classList.remove('active');
  if (requestsCalendarView) requestsCalendarView.style.display = 'block';
  if (requestsListView) requestsListView.style.display = 'none';
  if (monthNav) monthNav.style.display = 'flex';
});

viewListBtn?.addEventListener('click', () => {
  viewListBtn.classList.add('active');
  viewCalendarBtn?.classList.remove('active');
  if (requestsCalendarView) requestsCalendarView.style.display = 'none';
  if (requestsListView) requestsListView.style.display = 'block';
  if (monthNav) monthNav.style.display = 'none';
});

// Month Controls
prevMonthBtn?.addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
});

nextMonthBtn?.addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
});

todayBtn?.addEventListener('click', () => {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();
  renderCalendar();
});

// Modal Logic - Detail Modal
function closeModal() {
  if (requestDetailModal) requestDetailModal.style.display = 'none';
  releaseFocus();
}

function closeAdminModal() {
  if (adminRequestEditModal) adminRequestEditModal.style.display = 'none';
}

closeDetailModalBtn?.addEventListener('click', closeModal);
requestDetailModal?.addEventListener('click', (e) => {
  if (e.target === requestDetailModal) closeModal();
});

closeAdminEditBtn?.addEventListener('click', closeAdminModal);
closeAdminEditModalBtn?.addEventListener('click', closeAdminModal);
adminRequestEditModal?.addEventListener('click', (e) => {
  if (e.target === adminRequestEditModal) closeAdminModal();
});

// Admin In-Page Edit Form Submit
adminRequestEditForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('admEditId').value;
  const saveBtn = document.getElementById('saveAdminEditBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
  }

  const updates = {
    category: document.getElementById('admEditCategory').value.trim(),
    date_needed: document.getElementById('admEditDate').value,
    status: document.getElementById('admEditStatus').value,
    name: document.getElementById('admEditName').value.trim(),
    phone: document.getElementById('admEditPhone').value.trim(),
    email: document.getElementById('admEditEmail').value.trim(),
    notes: document.getElementById('admEditNotes').value.trim()
  };

  const { error } = await supabase.from('service_requests').update(updates).eq('id', id);

  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }

  if (error) {
    showToast('Failed to update request: ' + error.message, true);
    return;
  }

  closeAdminModal();
  closeModal();
  showToast('Service request updated!');
  await reloadData();
});

function openAdminEditModal(reqId) {
  const req = rawRequests.find((r) => String(r.id) === String(reqId));
  if (!req) return;

  document.getElementById('admEditId').value = req.id;
  document.getElementById('admEditCategory').value = req.category || '';
  document.getElementById('admEditDate').value = req.date_needed || '';
  document.getElementById('admEditStatus').value = req.status || 'new';
  document.getElementById('admEditName').value = req.name || '';
  document.getElementById('admEditPhone').value = req.phone || '';
  document.getElementById('admEditEmail').value = req.email || '';
  document.getElementById('admEditNotes').value = req.notes || '';

  if (adminRequestEditModal) adminRequestEditModal.style.display = 'flex';
}

function openDetailModal(dateStr, dateData) {
  if (!requestDetailModal || !dateData) return;

  const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  if (modalDateTitle) modalDateTitle.textContent = `Requests for ${formattedDate}`;

  if (!isAuthenticated) {
    // Locked View for Unauthenticated Users
    if (modalSubTitle) modalSubTitle.textContent = `🔒 ${neighborhoodName} Demand Overview`;
    
    const catSummary = Object.entries(dateData.categories)
      .map(([cat, count]) => `<strong>${count}</strong> ${esc(cat)}`)
      .join(', ');

    modalBody.innerHTML = `
      <div style="text-align: center; padding: 12px 0;">
        <div style="font-size: 2.5rem; margin-bottom: 8px;">🔒</div>
        <h4 style="margin: 0 0 8px 0; color: #064E3B; font-size: 1.1rem;">Neighbor Contact Details Locked</h4>
        <p style="color: #4B5563; font-size: 0.9rem; margin-bottom: 16px;">
          There ${dateData.totalCount === 1 ? 'is' : 'are'} <strong>${dateData.totalCount} open service request${dateData.totalCount === 1 ? '' : 's'}</strong> in ${esc(neighborhoodName)} on this date (${catSummary}).
        </p>
        <p style="color: #6B7280; font-size: 0.85rem; margin-bottom: 20px; background: #F9FAFB; padding: 12px; border-radius: 8px; border: 1px solid #E5E7EB;">
          Join your local directory or log in to view neighbor names, direct phone numbers, email addresses, and detailed appointment notes.
        </p>
        <a href="/account/?next=${encodeURIComponent(location.pathname)}" class="auth-banner-btn" style="display: inline-block; padding: 10px 24px; font-size: 0.95rem;">
          Log In or Register to Unlock
        </a>
      </div>
    `;
  } else {
    // Unlocked View for Authenticated Users
    if (modalSubTitle) modalSubTitle.textContent = `${dateData.items.length} Service Appointment ${dateData.items.length === 1 ? 'Request' : 'Requests'} in ${neighborhoodName}`;

    modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${dateData.items.map((item) => {
          const mine = isOwner(item);
          // No id means this row came from the anonymous aggregate view, not the
          // base table — never render write actions that would target `undefined`.
          const canManage = (mine || userIsAdmin) && item.id != null;
          const isCompleted = (item.status || '').toLowerCase() === 'completed';
          const isPast = isPastDate(item.date_needed);

          let statusBadgeHTML = '';
          if (isCompleted) {
            statusBadgeHTML = '<span class="status-badge completed">✓ Fulfilled</span>';
          } else if (isPast) {
            statusBadgeHTML = '<span class="status-badge past">⏰ Past Date</span>';
          } else {
            statusBadgeHTML = `<span class="status-badge ${esc(item.status || 'new')}">${esc(item.status || 'new')}</span>`;
          }

          return `
            <div class="request-card ${isCompleted ? 'is-completed' : ''}" style="margin-bottom: 0; ${mine && !isCompleted ? 'background: #FFFDF5; border-color: #FCD34D;' : ''} ${isCompleted ? 'background: #F8FAFC !important; border-color: #CBD5E1 !important;' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <strong class="${isCompleted ? 'strikethrough' : ''}" style="color: #064E3B; font-size: 1rem;">${esc(item.category)}</strong>
                  ${mine ? `<span class="owner-badge">🌟 Your Request</span>` : ''}
                  ${userIsAdmin ? `<span class="owner-badge" style="background:#EEF2FF; color:#4338CA; border-color:#C7D2FE;">🛡️ Admin</span>` : ''}
                </div>
                ${statusBadgeHTML}
              </div>
              <p class="${isCompleted ? 'strikethrough' : ''}" style="margin: 4px 0; color: #111827; font-size: 0.95rem;">
                <strong>${esc(item.name || 'Neighbor')}</strong>
              </p>
              <p class="${isCompleted ? 'strikethrough' : ''}" style="margin: 4px 0; font-size: 0.9rem;">
                📞 <a href="tel:${esc(item.phone)}" style="color: #047857; font-weight: 600;">${esc(item.phone)}</a>
                ${item.email ? ` &nbsp;·&nbsp; ✉️ <a href="mailto:${esc(item.email)}" style="color: #047857;">${esc(item.email)}</a>` : ''}
              </p>
              ${item.notes ? `<p class="${isCompleted ? 'strikethrough' : ''}" style="margin: 8px 0 0 0; background: #F8FAFC; padding: 10px 12px; border-radius: 6px; font-size: 0.88rem; color: #334155; border: 1px solid #E2E8F0;">"${esc(item.notes)}"</p>` : ''}
              
              ${canManage ? `
                <div class="owner-actions-row">
                  ${isCompleted ? `
                    <button class="btn-owner-action reopen" data-req-id="${item.id}" data-next-status="new" type="button" title="Reopen this service request">
                      ↺ Reopen Request
                    </button>
                  ` : `
                    <button class="btn-owner-action complete" data-req-id="${item.id}" data-next-status="completed" type="button">
                      ✓ Mark as Fulfilled
                    </button>
                    <button class="btn-owner-action reschedule" data-req-id="${item.id}" data-current-date="${esc(item.date_needed)}" type="button">
                      📅 Reschedule
                    </button>
                  `}
                  ${userIsAdmin ? `
                    <button class="btn-owner-action admin-edit" data-req-id="${item.id}" type="button">
                      🛡️ Admin Edit
                    </button>
                  ` : ''}
                  <button class="btn-owner-action cancel" data-req-id="${item.id}" type="button">
                    ✕ Cancel Request
                  </button>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Wire owner action buttons
    modalBody.querySelectorAll('.btn-owner-action.complete, .btn-owner-action.reopen').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.reqId;
        const nextStatus = btn.dataset.nextStatus || 'completed';
        btn.disabled = true;
        btn.textContent = 'Updating…';
        await supabase.from('service_requests').update({ status: nextStatus }).eq('id', id);
        await reloadData();
        closeModal();
      });
    });

    modalBody.querySelectorAll('.btn-owner-action.reschedule').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.reqId;
        const currentDate = btn.dataset.currentDate || '';
        const todayStr = new Date().toLocaleDateString('en-CA');
        const newDate = prompt(`Select new date for this service request (YYYY-MM-DD):`, currentDate > todayStr ? currentDate : todayStr);
        if (!newDate) return;
        if (newDate < todayStr) {
          showToast('Please choose a date from today onward.', true);
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Rescheduling…';
        const { error } = await supabase.from('service_requests').update({ date_needed: newDate }).eq('id', id);
        if (error) {
          showToast('Failed to reschedule: ' + error.message, true);
          btn.disabled = false;
          btn.textContent = '📅 Reschedule';
          return;
        }
        await reloadData();
        closeModal();
      });
    });

    modalBody.querySelectorAll('.btn-owner-action.admin-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        openAdminEditModal(btn.dataset.reqId);
      });
    });

    modalBody.querySelectorAll('.btn-owner-action.cancel').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.reqId;
        if (!(await confirmDialog('Permanently remove this service request?'))) return;
        btn.disabled = true;
        btn.textContent = 'Cancelling…';
        await supabase.from('service_requests').update({ status: 'closed' }).eq('id', id);
        await reloadData();
        closeModal();
      });
    });
  }

  requestDetailModal.style.display = 'flex';
  trapFocus(requestDetailModal, closeModal);
}

const CATEGORY_ICONS = {
  'Plumbing': '🪠',
  'Electrical': '⚡',
  'Handyman': '🔨',
  'Landscaping & Tree Care': '🌳',
  'Roofing & Gutters': '🏠',
  'HVAC & AC': '❄️',
  'House Cleaning': '🧹',
  'Pest Control': '🐜',
  'Painting': '🎨',
  'Auto Care': '🚗',
  'Pet Care': '🐾',
  'Other': '📦'
};

function getCategoryIcon(cat) {
  if (!cat) return '🛠️';
  return CATEGORY_ICONS[cat] || '🛠️';
}

// Render Calendar Grid
function renderCalendar() {
  if (!currentMonthLabel || !calendarGrid) return;

  currentMonthLabel.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
  const days = getMonthMatrix(currentYear, currentMonth);
  const todayStr = new Date().toLocaleDateString('en-CA');

  calendarGrid.innerHTML = days.map((day) => {
    const dayData = groupedMap[day.dateStr];
    const totalCount = dayData ? dayData.totalCount : 0;
    const isInteractive = totalCount > 0;
    const hasMyReq = dayData?.items?.some((item) => isOwner(item));
    const isToday = day.isCurrentMonth && day.dateStr === todayStr;

    let demandHTML = '';
    let mobileDemandHTML = '';
    if (dayData && dayData.categories) {
      demandHTML = Object.entries(dayData.categories).map(([cat, count]) => {
        const isMyCat = dayData.items?.some((it) => isOwner(it) && it.category === cat);
        const catItems = dayData.items?.filter((it) => it.category === cat) || [];
        const isCatCompleted = catItems.length > 0 && catItems.every((it) => (it.status || '').toLowerCase() === 'completed');
        const isCatPast = day.dateStr < todayStr && !isCatCompleted;
        return `
          <div class="demand-pill ${!isAuthenticated ? 'locked' : ''} ${isMyCat ? 'is-mine' : ''} ${isCatCompleted ? 'is-completed' : ''} ${isCatPast ? 'is-past' : ''}">
            <span class="${isCatCompleted ? 'pill-strikethrough' : ''}">${!isAuthenticated ? '🔒 ' : (isMyCat ? '🌟 ' : '')}${isCatPast ? '⏰ ' : ''}${esc(cat)}</span>
            <span class="${isCatCompleted ? 'pill-strikethrough' : ''}">(${count})</span>
            ${isCatCompleted ? `<span class="pill-check">✓</span>` : ''}
          </div>
        `;
      }).join('');

      if (totalCount > 0) {
        const topCat = Object.keys(dayData.categories)[0] || '';
        const topIcon = getCategoryIcon(topCat);
        mobileDemandHTML = `
          <div class="mobile-demand-indicator ${!isAuthenticated ? 'locked' : ''} ${hasMyReq ? 'is-mine' : ''}">
            <span class="mobile-cat-icon">${topIcon}</span>
            <span class="mobile-demand-count">${totalCount}</span>
          </div>
        `;
      }
    }

    const cellTag = isInteractive ? 'button' : 'div';
    const cellAttrs = isInteractive
      ? `type="button" class="calendar-cell ${hasMyReq ? 'has-my-req' : ''} ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${totalCount > 0 ? 'has-demand' : ''}" data-date="${day.dateStr}" aria-label="${day.dateStr}: ${totalCount} request${totalCount === 1 ? '' : 's'}"`
      : `class="calendar-cell not-interactive ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${day.dateStr}"`;

    return `
      <${cellTag} ${cellAttrs}>
        <div class="cell-top">
          <span class="date-num">${day.dayNumber}</span>
          ${totalCount > 0 ? `<span class="cell-count-badge ${hasMyReq ? 'my-badge' : ''}">${totalCount}</span>` : ''}
        </div>
        ${demandHTML ? `<div class="cell-demand-list">${demandHTML}</div>` : ''}
        ${mobileDemandHTML}
      </${cellTag}>
    `;
  }).join('');

  // Wire day click
  calendarGrid.querySelectorAll('button.calendar-cell').forEach((cell) => {
    const handleOpen = () => {
      const dStr = cell.dataset.date;
      if (dStr && groupedMap[dStr]) {
        openDetailModal(dStr, groupedMap[dStr]);
      }
    };
    cell.addEventListener('click', handleOpen);
  });
}

// Render Traditional List View
function renderList() {
  if (!requestsListContent) return;

  const filtered = getFilteredRequests();
  const todayStr = new Date().toLocaleDateString('en-CA');

  if (filtered.length === 0) {
    requestsListContent.innerHTML = `
      <div class="no-requests-placeholder">
        <p>No open service requests match the selected filter in ${esc(neighborhoodName)}.</p>
      </div>
    `;
    return;
  }

  // Sort by date ascending
  const sorted = [...filtered].sort((a, b) => (a.date_needed || '').localeCompare(b.date_needed || ''));

  if (!isAuthenticated) {
    // Locked List View
    requestsListContent.innerHTML = sorted.map((item) => {
      const isPast = isPastDate(item.date_needed);
      const isCompleted = (item.status || '').toLowerCase() === 'completed';

      return `
        <div class="request-card ${isCompleted ? 'is-completed' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <strong style="color: #064E3B; font-size: 1.05rem;">${esc(item.category)}</strong>
            <span class="status-badge ${isCompleted ? 'completed' : (isPast ? 'past' : 'new')}">
              ${isCompleted ? '✓ Fulfilled' : (isPast ? '⏰ Past Date' : 'Target Date: ' + esc(item.date_needed))}
            </span>
          </div>
          <p style="color: #6B7280; font-size: 0.9rem; margin: 4px 0;">
            🔒 Log in to view requester contact details and appointment notes.
          </p>
        </div>
      `;
    }).join('');
  } else {
    // Unlocked List View
    requestsListContent.innerHTML = sorted.map((item) => {
      const mine = isOwner(item);
      const canManage = (mine || userIsAdmin) && item.id != null;
      const isCompleted = (item.status || '').toLowerCase() === 'completed';
      const isPast = isPastDate(item.date_needed);

      let statusBadgeHTML = '';
      if (isCompleted) {
        statusBadgeHTML = '<span class="status-badge completed">✓ Fulfilled</span>';
      } else if (isPast) {
        statusBadgeHTML = '<span class="status-badge past">⏰ Past Date</span>';
      } else {
        statusBadgeHTML = `<span class="status-badge ${esc(item.status || 'new')}">${esc(item.status || 'new')}</span>`;
      }

      return `
        <div class="request-card ${isCompleted ? 'is-completed' : ''}" style="${mine && !isCompleted ? 'background: #FFFDF5; border-color: #FCD34D;' : ''} ${isCompleted ? 'background: #F8FAFC !important; border-color: #CBD5E1 !important;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong class="${isCompleted ? 'strikethrough' : ''}" style="color: #064E3B; font-size: 1.05rem;">${esc(item.category)}</strong>
              ${mine ? `<span class="owner-badge">🌟 Your Request</span>` : ''}
              ${userIsAdmin ? `<span class="owner-badge" style="background:#EEF2FF; color:#4338CA; border-color:#C7D2FE;">🛡️ Admin</span>` : ''}
            </div>
            ${statusBadgeHTML}
          </div>
          <p class="${isCompleted ? 'strikethrough' : ''}" style="margin: 4px 0; font-size: 0.95rem; color: #111827;">
            <strong>${esc(item.name || 'Neighbor')}</strong>
          </p>
          <p class="${isCompleted ? 'strikethrough' : ''}" style="margin: 4px 0; font-size: 0.9rem;">
            📅 Target Date: <strong>${esc(item.date_needed)}</strong>
          </p>
          <p class="${isCompleted ? 'strikethrough' : ''}" style="margin: 4px 0; font-size: 0.9rem;">
            📞 <a href="tel:${esc(item.phone)}" style="color: #047857; font-weight: 600;">${esc(item.phone)}</a>
            ${item.email ? ` &nbsp;·&nbsp; ✉️ <a href="mailto:${esc(item.email)}" style="color: #047857;">${esc(item.email)}</a>` : ''}
          </p>
          ${item.notes ? `<p class="${isCompleted ? 'strikethrough' : ''}" style="margin: 8px 0 0 0; background: #F8FAFC; padding: 10px 12px; border-radius: 6px; font-size: 0.88rem; color: #334155; border: 1px solid #E2E8F0;">"${esc(item.notes)}"</p>` : ''}
          
          ${canManage ? `
            <div class="owner-actions-row">
              ${isCompleted ? `
                <button class="btn-owner-action reopen list-action" data-req-id="${item.id}" data-next-status="new" type="button" title="Reopen this service request">
                  ↺ Reopen Request
                </button>
              ` : `
                <button class="btn-owner-action complete list-action" data-req-id="${item.id}" data-next-status="completed" type="button">
                  ✓ Mark as Fulfilled
                </button>
                <button class="btn-owner-action reschedule list-action" data-req-id="${item.id}" data-current-date="${esc(item.date_needed)}" type="button">
                  📅 Reschedule
                </button>
              `}
              ${userIsAdmin ? `
                <button class="btn-owner-action admin-edit list-action" data-req-id="${item.id}" type="button">
                  🛡️ Admin Edit
                </button>
              ` : ''}
              <button class="btn-owner-action cancel list-action" data-req-id="${item.id}" type="button">
                ✕ Cancel Request
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Wire actions in list view
    requestsListContent.querySelectorAll('.btn-owner-action.complete, .btn-owner-action.reopen').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.reqId;
        const nextStatus = btn.dataset.nextStatus || 'completed';
        btn.disabled = true;
        btn.textContent = 'Updating…';
        await supabase.from('service_requests').update({ status: nextStatus }).eq('id', id);
        await reloadData();
      });
    });

    requestsListContent.querySelectorAll('.btn-owner-action.reschedule').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.reqId;
        const currentDate = btn.dataset.currentDate || '';
        const todayStr = new Date().toLocaleDateString('en-CA');
        const newDate = prompt(`Select new date for this service request (YYYY-MM-DD):`, currentDate > todayStr ? currentDate : todayStr);
        if (!newDate) return;
        if (newDate < todayStr) {
          showToast('Please choose a date from today onward.', true);
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Rescheduling…';
        const { error } = await supabase.from('service_requests').update({ date_needed: newDate }).eq('id', id);
        if (error) {
          showToast('Failed to reschedule: ' + error.message, true);
          btn.disabled = false;
          btn.textContent = '📅 Reschedule';
          return;
        }
        await reloadData();
      });
    });

    requestsListContent.querySelectorAll('.btn-owner-action.admin-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        openAdminEditModal(btn.dataset.reqId);
      });
    });

    requestsListContent.querySelectorAll('.btn-owner-action.cancel').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.reqId;
        if (!(await confirmDialog('Permanently remove this service request?'))) return;
        btn.disabled = true;
        btn.textContent = 'Cancelling…';
        await supabase.from('service_requests').update({ status: 'closed' }).eq('id', id);
        await reloadData();
      });
    });
  }
}

// ── "Need a Service?" Modal Integration for Service Calendar ──
function openServiceRequestModal() {
  if (!reqOverlay) return;
  reqOverlay.classList.add('open');

  if (!currentUser) {
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

    const meta = currentUser.user_metadata || {};
    const resName = meta.full_name || 'Verified Resident';
    const resPhone = meta.phone || '';

    if (rDisplayName) rDisplayName.textContent = formatNameTitle(resName);
    if (rDisplayContact) {
      rDisplayContact.textContent = resPhone ? `${formatUSPhone(resPhone)} · ${currentUser.email}` : (currentUser.email || '');
    }

    const todayStr = new Date().toLocaleDateString('en-CA');
    if (rDateInput) {
      rDateInput.min = todayStr;
    }
  }
}

function closeServiceRequestModal() {
  if (!reqOverlay) return;
  reqOverlay.classList.remove('open');
  setTimeout(() => {
    if (reqThankYou) reqThankYou.style.display = 'none';
    reqCombobox?.reset();
    if (rDateInput) rDateInput.value = '';
    if (rNotesInput) rNotesInput.value = '';
  }, 250);
}

// Wire modal triggers
openCalendarPostReqBtn?.addEventListener('click', () => openServiceRequestModal());
reqOpenFab?.addEventListener('click', () => openServiceRequestModal());
reqCloseBtn?.addEventListener('click', closeServiceRequestModal);
reqOverlay?.addEventListener('click', (e) => {
  if (e.target === reqOverlay) closeServiceRequestModal();
});

// Wire Submit Service Request on Calendar
reqSubmitBtn?.addEventListener('click', async () => {
  if (!currentUser) {
    showToast('You must be logged in with a verified account to submit a service request.', true);
    if (reqFormView) reqFormView.style.display = 'none';
    if (reqAuthView) reqAuthView.style.display = 'block';
    return;
  }

  let category = reqCombobox ? reqCombobox.getValue() : (document.getElementById('r-category')?.value || document.getElementById('r-category-input')?.value?.trim());
  if (category === 'Other') {
    const otherVal = document.getElementById('r-category-other')?.value?.trim();
    if (otherVal) category = otherVal;
  }

  const date_needed = rDateInput ? rDateInput.value : '';
  const notes = rNotesInput ? rNotesInput.value.trim() : '';

  if (!category || !date_needed) {
    showToast('Please specify what service you need and date needed.', true);
    return;
  }

  const todayStr = new Date().toLocaleDateString('en-CA');
  if (date_needed < todayStr) {
    showToast('Please choose a date from today onward.', true);
    return;
  }

  reqSubmitBtn.disabled = true;
  reqSubmitBtn.textContent = 'Publishing…';

  const meta = currentUser.user_metadata || {};
  const name = meta.full_name || 'Verified Resident';
  const phone = meta.phone ? formatUSPhone(meta.phone) : '—';
  const email = currentUser.email;

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

  const { data, error } = await supabase.from('service_requests').insert(newRecord).select().single();

  reqSubmitBtn.disabled = false;
  reqSubmitBtn.textContent = 'Publish to Calendar';

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

  if (reqFormView) reqFormView.style.display = 'none';
  if (reqThankYou) reqThankYou.style.display = 'block';

  // Optimistic calendar update
  if (data) {
    rawRequests.push(data);
    updateGroupedData();
    renderCalendar();
    renderList();
  } else {
    reloadData();
  }

  showToast('Service request published to community calendar!');
});

// Reload Data Helper with Cache-First Performance
async function reloadData() {
  const query = isAuthenticated
    ? supabase.from('service_requests').select('*').eq('neighborhood', neighborhood).neq('status', 'closed').order('date_needed', { ascending: true })
    : supabase.from('service_requests_public_counts').select('*').eq('neighborhood', neighborhood);

  const { data, error } = await query;

  if (!error && data) {
    rawRequests = data;
    try {
      sessionStorage.setItem(`cal_cache_${neighborhood}_${isAuthenticated ? 'auth' : 'anon'}`, JSON.stringify(data));
    } catch (e) {}
  }

  // Count user's own requests
  if (isAuthenticated && currentUser) {
    const myCount = rawRequests.filter((it) => isOwner(it)).length;
    if (myReqCountBadge) myReqCountBadge.textContent = myCount;
    if (filterMyRequestsBtn) {
      filterMyRequestsBtn.style.display = myCount > 0 ? 'inline-flex' : 'none';
    }
  }

  updateGroupedData();
  renderCalendar();
  renderList();
}

// Data Loading Init with SWR and Concurrent Parallelization
async function init() {
  renderCalendar();

  // 1. Resolve the session BEFORE touching data. Both reloadData()'s query and
  //    every render branch on `isAuthenticated`; running them in parallel with
  //    getSession() meant reloadData() always fetched the anonymous aggregate
  //    view (neighborhood/category/date_needed/count only), which the logged-in
  //    template then rendered as "Neighbor" with a blank phone and no row id.
  const session = await getSession();
  isAuthenticated = !!session;
  currentUser = session?.user || null;

  if (isAuthenticated && currentUser?.email) {
    if (authPrompt) authPrompt.style.display = 'none';
  } else {
    userIsAdmin = false;
    if (authPrompt) authPrompt.style.display = 'flex';
    if (loginLink) {
      loginLink.href = `/account/?next=${encodeURIComponent(location.pathname)}`;
    }
  }

  // 2. Instant render from the cache that matches this auth state (0ms latency).
  //    Only ever read the matching key — anonymous aggregate rows and full rows
  //    are different shapes, so crossing them is what produced the bug above.
  try {
    if (!isAuthenticated) sessionStorage.removeItem(`cal_cache_${neighborhood}_auth`);
    const cachedData = sessionStorage.getItem(
      `cal_cache_${neighborhood}_${isAuthenticated ? 'auth' : 'anon'}`
    );
    if (cachedData) {
      rawRequests = JSON.parse(cachedData);
      updateGroupedData();
      renderCalendar();
      renderList();
    }
  } catch (e) {}

  // 3. Fresh data and the admin check can run concurrently — the admin flag only
  //    affects which buttons render, not which rows are fetched.
  const adminCheck = isAuthenticated && currentUser?.email
    ? supabase.from('admins').select('email').eq('email', currentUser.email).maybeSingle()
    : Promise.resolve({ data: null });

  const [, { data: adminRow }] = await Promise.all([reloadData(), adminCheck]);
  userIsAdmin = !!adminRow;

  renderCalendar();
  renderList();
}

init();

// Auto-reload calendar when user submits a new request
window.addEventListener('service-request-created', () => {
  reloadData();
});

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

