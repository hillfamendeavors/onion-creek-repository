// Client interactivity for a neighborhood directory page.
//
// The listings are already pre-rendered into the HTML at build time (good for
// crawlers / AI readers). This script never rebuilds the list — it only
// shows/hides the existing DOM for category-tab filtering and search, plus the
// collapse, copy-phone, and "Suggest a Referral" behaviors.

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

if (overlay && openBtn && closeBtn) {
  openBtn.addEventListener('click', () => overlay.classList.add('open'));
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
      alert('Please fill in your name, the business name, phone, and recommendation fields.');
      return;
    }
    if (phoneDigits.length !== 10) {
      alert('Please enter a 10-digit phone number in the format (512) 555-0000.');
      return;
    }
    phone = formatUSPhone(phoneDigits);

    submitBtn.textContent = 'Submitting…';
    submitBtn.disabled = true;

    const formspreeId = overlay.dataset.formspree;
    const subject = `${overlay.dataset.subject || 'New Referral'}: ${name}`;

    try {
      await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name, phone, category, note, referrer, _subject: subject }),
      });
    } catch (e) {}

    formView.style.display = 'none';
    thankYou.style.display = 'block';
    submitBtn.textContent = 'Submit Referral';
    submitBtn.disabled = false;
  });
}

// ── Phone input live formatting ──
const phoneEl = document.getElementById('f-phone');
if (phoneEl) {
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

// Initial state: "All" tab active (caps each table height via CSS).
syncAllTabClass();
