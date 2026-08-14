import { supabase } from '../lib/supabase.js';
import { getSession } from '../lib/auth.js';
import { getMonthMatrix, aggregateRequests } from '../lib/calendar.js';
import { trapFocus, releaseFocus } from './modal-a11y.js';

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

// Modal Elements
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
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
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

// Wire Post Request Modal Trigger
openCalendarPostReqBtn?.addEventListener('click', () => {
  const openFab = document.getElementById('openRequestModal');
  if (openFab) {
    openFab.click();
  } else {
    const overlay = document.getElementById('requestModalOverlay');
    if (overlay) overlay.classList.add('open');
  }
});

// Modal Logic
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
    alert('Failed to update request: ' + error.message);
    return;
  }

  closeAdminModal();
  closeModal();
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
          const canManage = mine || userIsAdmin;
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
            <div class="request-card ${isCompleted ? 'is-completed' : ''}" style="margin-bottom: 0; ${mine && !isCompleted ? 'border-left: 4px solid #F59E0B; background: #FFFDF5;' : ''} ${isCompleted ? 'border-left: 4px solid #94A3B8 !important; background: #F8FAFC !important;' : ''}">
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
                    <button class="btn-owner-action reschedule" data-req-id="${item.id}" data-current-date="${item.date_needed}" type="button">
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
          alert('Please choose a date from today onward.');
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Rescheduling…';
        const { error } = await supabase.from('service_requests').update({ date_needed: newDate }).eq('id', id);
        if (error) {
          alert('Failed to reschedule: ' + error.message);
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
        if (confirm('Are you sure you want to cancel and remove this service request?')) {
          btn.disabled = true;
          btn.textContent = 'Cancelling…';
          await supabase.from('service_requests').update({ status: 'closed' }).eq('id', id);
          await reloadData();
          closeModal();
        }
      });
    });
  }

  requestDetailModal.style.display = 'flex';
  trapFocus(requestDetailModal, closeModal);
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

    let demandHTML = '';
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
    }

    const cellTag = isInteractive ? 'button' : 'div';
    const cellAttrs = isInteractive
      ? `type="button" class="calendar-cell ${hasMyReq ? 'has-my-req' : ''} ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}" data-date="${day.dateStr}"`
      : `class="calendar-cell not-interactive ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}" data-date="${day.dateStr}"`;

    return `
      <${cellTag} ${cellAttrs}>
        <div class="cell-top">
          <span class="date-num">${day.dayNumber}</span>
          ${totalCount > 0 ? `<span class="cell-count-badge ${hasMyReq ? 'my-badge' : ''}">${totalCount}</span>` : ''}
        </div>
        <div class="cell-demand-list">
          ${demandHTML}
        </div>
      </${cellTag}>
    `;
  }).join('');

  // Add Cell Click Event Listeners
  calendarGrid.querySelectorAll('button.calendar-cell').forEach((cell) => {
    const dateStr = cell.dataset.date;
    const dateData = groupedMap[dateStr];
    cell.addEventListener('click', () => openDetailModal(dateStr, dateData));
  });
}

// Render List View
function renderList() {
  if (!requestsListContent) return;

  const filtered = getFilteredRequests();
  const todayStr = new Date().toLocaleDateString('en-CA');

  if (filtered.length === 0) {
    requestsListContent.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; background: #fff; border: 1px solid #E2E8F0; border-radius: 12px;">
        <div style="font-size: 2.2rem; margin-bottom: 10px;">📋</div>
        <h4 style="color: #064E3B; font-size: 1.1rem; margin-bottom: 6px;">No Service Requests Found</h4>
        <p style="color: #64748B; font-size: 0.9rem; max-width: 360px; margin: 0 auto 16px auto;">
          ${filterMyRequestsOnly ? "You haven't posted any service requests yet." : "No upcoming service requests match the selected filter."}
        </p>
        <button class="btn-post-calendar-req" onclick="document.getElementById('openCalendarPostReqBtn')?.click()">
          + Post a Request Now
        </button>
      </div>
    `;
    return;
  }

  if (!isAuthenticated) {
    // Public aggregate list
    requestsListContent.innerHTML = filtered
      .sort((a, b) => (a.date_needed < b.date_needed ? -1 : 1))
      .map((r) => `
        <div class="request-count-row">
          <div>
            <strong>${esc(r.category)}</strong> needed — ${esc(r.date_needed)}
          </div>
          <div style="font-weight: 600; color: #064E3B;">
            ${r.count || 1} request${(r.count || 1) === 1 ? '' : 's'}
          </div>
        </div>
      `).join('');
  } else {
    // Authenticated detailed list organized into Upcoming and Past
    const upcomingList = filtered
      .filter((r) => r.date_needed >= todayStr)
      .sort((a, b) => a.date_needed.localeCompare(b.date_needed));

    const pastList = filtered
      .filter((r) => r.date_needed < todayStr)
      .sort((a, b) => b.date_needed.localeCompare(a.date_needed));

    const renderCard = (r) => {
      const mine = isOwner(r);
      const canManage = mine || userIsAdmin;
      const isCompleted = (r.status || '').toLowerCase() === 'completed';
      const isPast = r.date_needed < todayStr;

      let statusBadge = '';
      if (isCompleted) {
        statusBadge = '<span class="status-badge completed">✓ Fulfilled</span>';
      } else if (isPast) {
        statusBadge = '<span class="status-badge past">⏰ Past Date</span>';
      } else {
        statusBadge = `<span class="status-badge ${esc(r.status || 'new')}">${esc(r.status || 'new')}</span>`;
      }

      return `
        <div class="request-card ${isCompleted ? 'is-completed' : ''}" style="${mine && !isCompleted ? 'border-left: 4px solid #F59E0B; background: #FFFDF5;' : ''} ${isCompleted ? 'border-left: 4px solid #94A3B8 !important; background: #F8FAFC !important;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong class="${isCompleted ? 'strikethrough' : ''}" style="color: #064E3B; font-size: 1rem;">${esc(r.category)}</strong>
              ${mine ? `<span class="owner-badge">🌟 Your Request</span>` : ''}
              ${userIsAdmin ? `<span class="owner-badge" style="background:#EEF2FF; color:#4338CA; border-color:#C7D2FE;">🛡️ Admin</span>` : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${statusBadge}
              <span style="font-size: 0.85rem; color: #64748B; font-weight: 600;">📅 ${esc(r.date_needed)}</span>
            </div>
          </div>
          <p class="${isCompleted ? 'strikethrough' : ''}" style="margin: 4px 0 2px 0; color: #111827; font-size: 0.95rem;">
            <strong>${esc(r.name)}</strong> — <a href="tel:${esc(r.phone)}" style="color: #047857; font-weight: 600;">${esc(r.phone)}</a>${r.email ? ` — <a href="mailto:${esc(r.email)}" style="color: #047857;">${esc(r.email)}</a>` : ''}
          </p>
          ${r.notes ? `<p class="${isCompleted ? 'strikethrough' : ''}" style="margin-top: 8px; font-size: 0.88rem; color: #334155; background: #F8FAFC; padding: 10px 12px; border-radius: 6px; border: 1px solid #E2E8F0;">"${esc(r.notes)}"</p>` : ''}
          
          ${canManage ? `
            <div class="owner-actions-row">
              ${isCompleted ? `
                <button class="btn-owner-action reopen" data-req-id="${r.id}" data-next-status="new" type="button" title="Reopen this service request">
                  ↺ Reopen Request
                </button>
              ` : `
                <button class="btn-owner-action complete" data-req-id="${r.id}" data-next-status="completed" type="button">
                  ✓ Mark as Fulfilled
                </button>
                <button class="btn-owner-action reschedule" data-req-id="${r.id}" data-current-date="${r.date_needed}" type="button">
                  📅 Reschedule
                </button>
              `}
              ${userIsAdmin ? `
                <button class="btn-owner-action admin-edit" data-req-id="${r.id}" type="button">
                  🛡️ Admin Edit
                </button>
              ` : ''}
              <button class="btn-owner-action cancel" data-req-id="${r.id}" type="button">
                ✕ Cancel Request
              </button>
            </div>
          ` : ''}
        </div>
      `;
    };

    let html = '';
    if (upcomingList.length > 0) {
      html += `
        <div class="requests-section-heading">
          <span>🌟 Upcoming Requests</span>
          <span class="requests-section-badge">${upcomingList.length}</span>
        </div>
        ${upcomingList.map(renderCard).join('')}
      `;
    }
    if (pastList.length > 0) {
      html += `
        <div class="requests-section-heading">
          <span>📜 Past &amp; Previous Requests</span>
          <span class="requests-section-badge">${pastList.length}</span>
        </div>
        ${pastList.map(renderCard).join('')}
      `;
    }
    requestsListContent.innerHTML = html;

    // Wire list owner buttons
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
          alert('Please choose a date from today onward.');
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Rescheduling…';
        const { error } = await supabase.from('service_requests').update({ date_needed: newDate }).eq('id', id);
        if (error) {
          alert('Failed to reschedule: ' + error.message);
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
        if (confirm('Are you sure you want to cancel and remove this service request?')) {
          btn.disabled = true;
          btn.textContent = 'Cancelling…';
          await supabase.from('service_requests').update({ status: 'closed' }).eq('id', id);
          await reloadData();
        }
      });
    });
  }
}

// Reload Data Helper
async function reloadData() {
  if (isAuthenticated) {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('neighborhood', neighborhood)
      .neq('status', 'closed')
      .order('date_needed', { ascending: true });

    if (!error && data) {
      rawRequests = data;
    }
  } else {
    const { data, error } = await supabase
      .from('service_requests_public_counts')
      .select('*')
      .eq('neighborhood', neighborhood);

    if (!error && data) {
      rawRequests = data;
    }
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

// Data Loading Init
async function init() {
  const session = await getSession();
  isAuthenticated = !!session;
  currentUser = session?.user || null;

  if (isAuthenticated && currentUser?.email) {
    if (authPrompt) authPrompt.style.display = 'none';
    const { data: adminRow } = await supabase
      .from('admins')
      .select('email')
      .eq('email', currentUser.email)
      .maybeSingle();
    userIsAdmin = !!adminRow;
  } else {
    userIsAdmin = false;
    if (authPrompt) authPrompt.style.display = 'flex';
    if (loginLink) {
      loginLink.href = `/account/?next=${encodeURIComponent(location.pathname)}`;
    }
  }

  await reloadData();
}

init();

// Auto-reload calendar when user submits a new request
window.addEventListener('service-request-created', () => {
  reloadData();
});
