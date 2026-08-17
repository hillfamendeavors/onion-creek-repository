// Searchable Category Combobox with live suggestions, keyboard nav, and custom "Other" fallback.

export function initCategoryCombobox(options = {}) {
  const {
    wrapper = document.getElementById('rCategoryComboboxWrapper'),
    input = document.getElementById('r-category-input'),
    hidden = document.getElementById('r-category'),
    listbox = document.getElementById('r-category-listbox'),
    toggleBtn = document.getElementById('rCategoryToggleBtn'),
    otherWrapper = document.getElementById('r-category-other-wrapper'),
    otherInput = document.getElementById('r-category-other'),
    catalogScriptId = 'r-categories-catalog',
    initialCatalog = null,
  } = options;

  if (!wrapper || !input || !hidden || !listbox) {
    return null;
  }

  let catalog = initialCatalog || [];
  if (!catalog.length) {
    const catalogEl = document.getElementById(catalogScriptId);
    if (catalogEl && catalogEl.textContent) {
      try {
        catalog = JSON.parse(catalogEl.textContent);
      } catch (e) {
        console.warn('Failed to parse category catalog:', e);
      }
    }
  }

  // Flatten catalog for fast search
  const flatCategories = [];
  catalog.forEach((group) => {
    const groupLabel = group.label || 'Services';
    const groupIcon = group.icon || '';
    (group.subcategories || []).forEach((subName) => {
      flatCategories.push({
        name: subName,
        group: groupLabel,
        icon: groupIcon,
      });
    });
  });

  let isOpen = false;
  let activeIndex = -1;
  let currentItems = [];

  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    const before = escapeHtml(text.slice(0, idx));
    const match = escapeHtml(text.slice(idx, idx + query.length));
    const after = escapeHtml(text.slice(idx + query.length));
    return `${before}<mark class="combobox-mark">${match}</mark>${after}`;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function renderDropdown(query = '') {
    query = query.trim().toLowerCase();
    activeIndex = -1;
    currentItems = [];

    let html = '';

    if (!query) {
      // Render full grouped list
      catalog.forEach((group, gIdx) => {
        if (!group.subcategories || !group.subcategories.length) return;
        html += `<div class="combobox-group-header" role="presentation">${group.icon ? group.icon + ' ' : ''}${escapeHtml(group.label)}</div>`;
        group.subcategories.forEach((subName) => {
          const itemIndex = currentItems.length;
          currentItems.push({ type: 'standard', name: subName, group: group.label });
          const isSelected = hidden.value.toLowerCase() === subName.toLowerCase();
          html += `
            <div class="combobox-option ${isSelected ? 'is-selected' : ''}" role="option" data-index="${itemIndex}" data-value="${escapeHtml(subName)}" id="combo-opt-${itemIndex}">
              <span class="combobox-option-text">${escapeHtml(subName)}</span>
              <span class="combobox-option-group">${escapeHtml(group.label)}</span>
            </div>
          `;
        });
      });

      // Always append "Other / Custom" at the end of full list
      const otherIndex = currentItems.length;
      currentItems.push({ type: 'other', name: 'Other', group: 'Custom' });
      html += `
        <div class="combobox-option combobox-other-option" role="option" data-index="${otherIndex}" data-value="Other" id="combo-opt-${otherIndex}">
          <span class="combobox-option-text">➕ <strong>Other</strong> (Not listed here / Custom service)</span>
          <span class="combobox-option-group">Custom</span>
        </div>
      `;
    } else {
      // Filter matching categories
      const matches = flatCategories.filter((cat) => {
        return cat.name.toLowerCase().includes(query) || cat.group.toLowerCase().includes(query);
      });

      if (matches.length > 0) {
        matches.forEach((cat) => {
          const itemIndex = currentItems.length;
          currentItems.push({ type: 'standard', name: cat.name, group: cat.group });
          const isSelected = hidden.value.toLowerCase() === cat.name.toLowerCase();
          html += `
            <div class="combobox-option ${isSelected ? 'is-selected' : ''}" role="option" data-index="${itemIndex}" data-value="${escapeHtml(cat.name)}" id="combo-opt-${itemIndex}">
              <span class="combobox-option-text">${highlightMatch(cat.name, query)}</span>
              <span class="combobox-option-group">${escapeHtml(cat.group)}</span>
            </div>
          `;
        });
      }

      // If user typed something not matching exactly, show dynamic "Use [typed text]"
      const exactMatch = flatCategories.some((c) => c.name.toLowerCase() === query);
      if (!exactMatch && query) {
        const customIndex = currentItems.length;
        currentItems.push({ type: 'custom', name: input.value.trim(), group: 'Custom' });
        html += `
          <div class="combobox-option combobox-custom-option" role="option" data-index="${customIndex}" data-value="${escapeHtml(input.value.trim())}" id="combo-opt-${customIndex}">
            <span class="combobox-option-text">✨ Use <strong>"${escapeHtml(input.value.trim())}"</strong> as custom category</span>
            <span class="combobox-option-badge">Custom</span>
          </div>
        `;
      }

      // Append explicit "Other" option
      const otherIndex = currentItems.length;
      currentItems.push({ type: 'other', name: 'Other', group: 'Custom' });
      html += `
        <div class="combobox-option combobox-other-option" role="option" data-index="${otherIndex}" data-value="Other" id="combo-opt-${otherIndex}">
          <span class="combobox-option-text">➕ <strong>Other</strong> (Specify custom category below)</span>
        </div>
      `;
    }

    listbox.innerHTML = html;
  }

  function openDropdown() {
    renderDropdown(input.value);
    listbox.style.display = 'block';
    wrapper.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
    isOpen = true;
  }

  function closeDropdown() {
    listbox.style.display = 'none';
    wrapper.classList.remove('is-open');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    isOpen = false;
    activeIndex = -1;
  }

  function selectItem(item) {
    if (!item) return;
    if (item.type === 'other') {
      input.value = 'Other';
      hidden.value = 'Other';
      if (otherWrapper) {
        otherWrapper.style.display = 'block';
        if (otherInput) {
          otherInput.focus();
          otherInput.required = true;
          otherInput.setAttribute('aria-required', 'true');
        }
      }
    } else if (item.type === 'custom') {
      input.value = item.name;
      hidden.value = item.name;
      if (otherWrapper) {
        otherWrapper.style.display = 'none';
        if (otherInput) {
          otherInput.value = '';
          otherInput.required = false;
        }
      }
    } else {
      input.value = item.name;
      hidden.value = item.name;
      if (otherWrapper) {
        otherWrapper.style.display = 'none';
        if (otherInput) {
          otherInput.value = '';
          otherInput.required = false;
        }
      }
    }
    closeDropdown();
  }

  function setActiveOption(index) {
    const options = listbox.querySelectorAll('.combobox-option');
    options.forEach((el, idx) => {
      if (idx === index) {
        el.classList.add('is-active');
        el.scrollIntoView({ block: 'nearest' });
        input.setAttribute('aria-activedescendant', el.id);
      } else {
        el.classList.remove('is-active');
      }
    });
    activeIndex = index;
  }

  // ── Input Events ──
  input.addEventListener('focus', () => {
    openDropdown();
  });

  input.addEventListener('input', () => {
    const val = input.value.trim();
    hidden.value = val;
    openDropdown();
    
    // Auto toggle other field if user explicitly typed "Other"
    if (val.toLowerCase() === 'other') {
      if (otherWrapper) otherWrapper.style.display = 'block';
    } else if (otherWrapper && otherWrapper.style.display === 'block' && hidden.value !== 'Other') {
      otherWrapper.style.display = 'none';
    }
  });

  input.addEventListener('keydown', (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openDropdown();
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentItems.length > 0) {
        const next = activeIndex < currentItems.length - 1 ? activeIndex + 1 : 0;
        setActiveOption(next);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentItems.length > 0) {
        const prev = activeIndex > 0 ? activeIndex - 1 : currentItems.length - 1;
        setActiveOption(prev);
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault();
        if (activeIndex >= 0 && currentItems[activeIndex]) {
          selectItem(currentItems[activeIndex]);
        } else if (input.value.trim()) {
          // If no item highlighted, use what user typed
          const typed = input.value.trim();
          const match = flatCategories.find((c) => c.name.toLowerCase() === typed.toLowerCase());
          if (match) {
            selectItem({ type: 'standard', name: match.name, group: match.group });
          } else {
            selectItem({ type: 'custom', name: typed, group: 'Custom' });
          }
        }
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        closeDropdown();
      }
    } else if (e.key === 'Tab') {
      if (isOpen) {
        if (activeIndex >= 0 && currentItems[activeIndex]) {
          selectItem(currentItems[activeIndex]);
        } else if (input.value.trim()) {
          const typed = input.value.trim();
          const match = flatCategories.find((c) => c.name.toLowerCase() === typed.toLowerCase());
          if (match) {
            selectItem({ type: 'standard', name: match.name, group: match.group });
          } else {
            selectItem({ type: 'custom', name: typed, group: 'Custom' });
          }
        }
        closeDropdown();
      }
    }
  });

  // ── Toggle Button ──
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen) {
        closeDropdown();
      } else {
        input.focus();
        openDropdown();
      }
    });
  }

  // ── Click Selection on Listbox (Event Delegation) ──
  listbox.addEventListener('click', (e) => {
    const opt = e.target.closest('.combobox-option');
    if (!opt) return;
    const index = parseInt(opt.dataset.index, 10);
    if (!isNaN(index) && currentItems[index]) {
      selectItem(currentItems[index]);
    }
  });

  // ── Close on Click Outside ──
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      if (isOpen) {
        // Sync typed value before closing
        const typed = input.value.trim();
        if (typed) {
          const match = flatCategories.find((c) => c.name.toLowerCase() === typed.toLowerCase());
          hidden.value = match ? match.name : typed;
        } else {
          hidden.value = '';
        }
        closeDropdown();
      }
    }
  });

  return {
    setValue(val) {
      if (!val) {
        input.value = '';
        hidden.value = '';
        if (otherWrapper) otherWrapper.style.display = 'none';
        if (otherInput) otherInput.value = '';
        return;
      }
      const match = flatCategories.find((c) => c.name.toLowerCase() === val.toLowerCase());
      if (match) {
        selectItem({ type: 'standard', name: match.name, group: match.group });
      } else if (val === 'Other') {
        selectItem({ type: 'other', name: 'Other', group: 'Custom' });
      } else {
        selectItem({ type: 'custom', name: val, group: 'Custom' });
      }
    },
    getValue() {
      if (hidden.value === 'Other' && otherInput && otherInput.value.trim()) {
        return otherInput.value.trim();
      }
      return hidden.value || input.value.trim();
    },
    reset() {
      input.value = '';
      hidden.value = '';
      if (otherWrapper) otherWrapper.style.display = 'none';
      if (otherInput) otherInput.value = '';
      closeDropdown();
    },
  };
}
