import { supabase } from '../lib/supabase.js';
import { getSession } from '../lib/auth.js';
import { getMonthMatrix, aggregateRequests } from '../lib/calendar.js';

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

// Content Containers
const calendarGrid = document.getElementById('calendarGrid');
const requestsListContent = document.getElementById('requestsListContent');

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
let rawRequests = [];
let groupedMap = {};

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

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

// Modal Logic
function closeModal() {
  if (requestDetailModal) requestDetailModal.style.display = 'none';
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
    if (modalSubTitle) modalSubTitle.textContent = `🔒 ${neighborhoodName} Aggregate Demand Overview`;
    
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
        <a href="/login/?next=${encodeURIComponent(location.pathname)}" class="auth-banner-btn" style="display: inline-block; padding: 10px 24px; font-size: 0.95rem;">
          Log In or Register to Unlock
        </a>
      </div>
    `;
  } else {
    // Unlocked View for Authenticated Users
    if (modalSubTitle) modalSubTitle.textContent = `${dateData.items.length} Service Appointment ${dateData.items.length === 1 ? 'Request' : 'Requests'} in ${neighborhoodName}`;

    modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${dateData.items.map((item) => `
          <div class="request-card" style="margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
              <strong>${esc(item.category)}</strong>
              <span class="status-badge ${esc(item.status || 'new')}">${esc(item.status || 'new')}</span>
            </div>
            <p style="margin: 4px 0; color: #111827; font-size: 0.95rem;">
              <strong>${esc(item.name || 'Neighbor')}</strong>
            </p>
            <p style="margin: 4px 0; font-size: 0.9rem;">
              📞 <a href="tel:${esc(item.phone)}">${esc(item.phone)}</a>
              ${item.email ? ` &nbsp;·&nbsp; ✉️ <a href="mailto:${esc(item.email)}">${esc(item.email)}</a>` : ''}
            </p>
            ${item.notes ? `<p style="margin: 8px 0 0 0; background: #F9FAFB; padding: 10px; border-radius: 6px; font-size: 0.85rem; color: #4B5563;">"${esc(item.notes)}"</p>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  requestDetailModal.style.display = 'flex';
}

// Render Calendar Grid
function renderCalendar() {
  if (!currentMonthLabel || !calendarGrid) return;

  currentMonthLabel.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
  const days = getMonthMatrix(currentYear, currentMonth);

  calendarGrid.innerHTML = days.map((day) => {
    const dayData = groupedMap[day.dateStr];
    const totalCount = dayData ? dayData.totalCount : 0;

    let demandHTML = '';
    if (dayData && dayData.categories) {
      demandHTML = Object.entries(dayData.categories).map(([cat, count]) => `
        <div class="demand-pill ${!isAuthenticated ? 'locked' : ''}">
          <span>${!isAuthenticated ? '🔒 ' : ''}${esc(cat)}</span>
          <span>(${count})</span>
        </div>
      `).join('');
    }

    return `
      <div class="calendar-cell ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}" data-date="${day.dateStr}">
        <div class="cell-top">
          <span class="date-num">${day.dayNumber}</span>
          ${totalCount > 0 ? `<span class="cell-count-badge">${totalCount}</span>` : ''}
        </div>
        <div class="cell-demand-list">
          ${demandHTML}
        </div>
      </div>
    `;
  }).join('');

  // Add Cell Click Event Listeners
  calendarGrid.querySelectorAll('.calendar-cell').forEach((cell) => {
    const dateStr = cell.dataset.date;
    const dateData = groupedMap[dateStr];
    if (dateData && dateData.totalCount > 0) {
      cell.addEventListener('click', () => openDetailModal(dateStr, dateData));
    }
  });
}

// Render List View
function renderList() {
  if (!requestsListContent) return;

  if (rawRequests.length === 0) {
    requestsListContent.innerHTML = '<p class="request-loading">No open service requests right now.</p>';
    return;
  }

  if (!isAuthenticated) {
    // Public aggregate list
    requestsListContent.innerHTML = rawRequests
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
    requestsListContent.innerHTML = rawRequests.map((r) => `
      <div class="request-card">
        <strong>${esc(r.category)}</strong> needed — ${esc(r.date_needed)}
        <p style="margin: 6px 0 2px 0;">${esc(r.name)} — <a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>${r.email ? ` — <a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : ''}</p>
        ${r.notes ? `<p style="margin-top: 6px; font-size: 0.85rem; color: #4B5563;">"${esc(r.notes)}"</p>` : ''}
      </div>
    `).join('');
  }
}

// Data Loading Init
async function init() {
  const session = await getSession();
  isAuthenticated = !!session;

  if (isAuthenticated) {
    if (authPrompt) authPrompt.style.display = 'none';

    // Fetch full request details
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('neighborhood', neighborhood)
      .neq('status', 'closed')
      .order('date_needed', { ascending: true });

    if (!error && data) {
      rawRequests = data;
      groupedMap = aggregateRequests(data);
    }
  } else {
    if (authPrompt) authPrompt.style.display = 'flex';
    if (loginLink) {
      loginLink.href = `/login/?next=${encodeURIComponent(location.pathname)}`;
    }

    // Fetch aggregate public counts
    const { data, error } = await supabase
      .from('service_requests_public_counts')
      .select('*')
      .eq('neighborhood', neighborhood);

    if (!error && data) {
      rawRequests = data;
      groupedMap = aggregateRequests(data);
    }
  }

  renderCalendar();
  renderList();
}

init();
