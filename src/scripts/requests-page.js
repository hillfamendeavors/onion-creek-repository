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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

let todayDate = new Date();
let currentYear = todayDate.getFullYear();
let currentMonth = todayDate.getMonth();

let isAuthenticated = false;
let currentUser = null;
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

closeDetailModalBtn?.addEventListener('click', closeModal);
requestDetailModal?.addEventListener('click', (e) => {
  if (e.target === requestDetailModal) closeModal();
});

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
          return `
            <div class="request-card" style="margin-bottom: 0; ${mine ? 'border-left: 4px solid #F59E0B; background: #FFFDF5;' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <strong style="color: #064E3B; font-size: 1rem;">${esc(item.category)}</strong>
                  ${mine ? `<span class="owner-badge">🌟 Your Request</span>` : ''}
                </div>
                <span class="status-badge ${esc(item.status || 'new')}">${esc(item.status || 'new')}</span>
              </div>
              <p style="margin: 4px 0; color: #111827; font-size: 0.95rem;">
                <strong>${esc(item.name || 'Neighbor')}</strong>
              </p>
              <p style="margin: 4px 0; font-size: 0.9rem;">
                📞 <a href="tel:${esc(item.phone)}" style="color: #047857; font-weight: 600;">${esc(item.phone)}</a>
                ${item.email ? ` &nbsp;·&nbsp; ✉️ <a href="mailto:${esc(item.email)}" style="color: #047857;">${esc(item.email)}</a>` : ''}
              </p>
              ${item.notes ? `<p style="margin: 8px 0 0 0; background: #F8FAFC; padding: 10px 12px; border-radius: 6px; font-size: 0.88rem; color: #334155; border: 1px solid #E2E8F0;">"${esc(item.notes)}"</p>` : ''}
              
              ${mine ? `
                <div class="owner-actions-row">
                  <button class="btn-owner-action complete" data-req-id="${item.id}" type="button">
                    ✓ Mark as Fulfilled
                  </button>
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
    modalBody.querySelectorAll('.btn-owner-action.complete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.reqId;
        btn.disabled = true;
        btn.textContent = 'Updating…';
        await supabase.from('service_requests').update({ status: 'completed' }).eq('id', id);
        await reloadData();
        closeModal();
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

  calendarGrid.innerHTML = days.map((day) => {
    const dayData = groupedMap[day.dateStr];
    const totalCount = dayData ? dayData.totalCount : 0;
    const isInteractive = totalCount > 0;
    const hasMyReq = dayData?.items?.some((item) => isOwner(item));

    let demandHTML = '';
    if (dayData && dayData.categories) {
      demandHTML = Object.entries(dayData.categories).map(([cat, count]) => {
        const isMyCat = dayData.items?.some((it) => isOwner(it) && it.category === cat);
        return `
          <div class="demand-pill ${!isAuthenticated ? 'locked' : ''} ${isMyCat ? 'is-mine' : ''}">
            <span>${!isAuthenticated ? '🔒 ' : (isMyCat ? '🌟 ' : '')}${esc(cat)}</span>
            <span>(${count})</span>
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
    // Authenticated detailed list
    requestsListContent.innerHTML = filtered.map((r) => {
      const mine = isOwner(r);
      return `
        <div class="request-card" style="${mine ? 'border-left: 4px solid #F59E0B; background: #FFFDF5;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="color: #064E3B; font-size: 1rem;">${esc(r.category)}</strong>
              ${mine ? `<span class="owner-badge">🌟 Your Request</span>` : ''}
            </div>
            <span style="font-size: 0.85rem; color: #64748B; font-weight: 600;">📅 ${esc(r.date_needed)}</span>
          </div>
          <p style="margin: 4px 0 2px 0; color: #111827; font-size: 0.95rem;">
            <strong>${esc(r.name)}</strong> — <a href="tel:${esc(r.phone)}" style="color: #047857; font-weight: 600;">${esc(r.phone)}</a>${r.email ? ` — <a href="mailto:${esc(r.email)}" style="color: #047857;">${esc(r.email)}</a>` : ''}
          </p>
          ${r.notes ? `<p style="margin-top: 8px; font-size: 0.88rem; color: #334155; background: #F8FAFC; padding: 10px 12px; border-radius: 6px; border: 1px solid #E2E8F0;">"${esc(r.notes)}"</p>` : ''}
          
          ${mine ? `
            <div class="owner-actions-row">
              <button class="btn-owner-action complete" data-req-id="${r.id}" type="button">
                ✓ Mark as Fulfilled
              </button>
              <button class="btn-owner-action cancel" data-req-id="${r.id}" type="button">
                ✕ Cancel Request
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Wire list owner buttons
    requestsListContent.querySelectorAll('.btn-owner-action.complete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.reqId;
        btn.disabled = true;
        btn.textContent = 'Updating…';
        await supabase.from('service_requests').update({ status: 'completed' }).eq('id', id);
        await reloadData();
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

  if (isAuthenticated) {
    if (authPrompt) authPrompt.style.display = 'none';
  } else {
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
