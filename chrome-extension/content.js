/**
 * Content Script — Job Description Scraper + Skill Filter/Sort
 * Runs on LinkedIn job pages:
 *   - injects skill-based filtering toolbar into job lists
 *   - exposes EXTRACT_JD for popup-triggered analysis
 */

(function () {
  'use strict';

  // ─── Selectors ─────────────────────────────────────────────
  const JD_SELECTORS = [
    // LinkedIn
    '.jobs-description__content', '.jobs-description-content__text', '.jobs-box__html-content', '#job-details',
    '.jobs-search__job-details--wrapper', 'section.job-details',
    // Internshala
    '.detail_view', '.internship_details',
    // Naukri
    '.job-desc', '.danger-html',
    // YC
    '.job-description',
    // Glassdoor
    '#JobDescriptionContainer',
    // Generic
    'article', 'main', '.description__text', '.description', '#description'
  ];

  const JOB_LIST_SELECTORS = [
    '.jobs-search-results__list', '.scaffold-layout__list', '.jobs-search-results-list',
    '.jobs-search__results-list', '.jobs-search-results-list__list',
    '.internship_list_container', '#internship_list_container', '.list_container',
    '.list', '.srp-jobtuple-wrapper', '.job-results',
    '.react-job-listing-container', '#MainCol'
  ];
  const JOB_CARD_SELECTORS = [
    'li.jobs-search-results__list-item', 'li.scaffold-layout__list-item', 'div.job-card-container',
    '[class*="job-card-container"]', '.job-card-list__entity-lockup',
    '.individual_internship', '.internship_meta',
    '.jobTuple', '.srp-jobtuple-wrapper', 'article.jobTuple',
    '.job-item',
    '.react-job-listing', 'li.react-job-listing'
  ];

  let filterToolbarInjected = false;
  let userSkills = [];
  let filterActive = false;

  // ─── Fetch user skills from background ─────────────────────
  function loadUserSkills(callback) {
    chrome.runtime.sendMessage({ type: 'GET_USER_SKILLS' }, (response) => {
      if (response && response.skills) {
        userSkills = response.skills;
      }
      if (callback) callback();
    });
  }

  // ─── Message Listener for Popup Extraction ─────────────────
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTRACT_JD') {
      const text = getJobDescription();
      sendResponse(text);
      return false; // sync response
    }
  });

  // ─── Job Description helpers (detail page) ─────────────────
  function getJobDescription() {
    for (const selector of JD_SELECTORS) {
      const el = document.querySelector(selector);
      if (el && el.innerText.trim().length > 50) {
        return el.innerText.trim();
      }
    }
    
    // Fallback: finding largest text block
    let bestNode = document.body;
    let maxLen = 0;
    const candidates = document.querySelectorAll('div, section, article, main');
    candidates.forEach(el => {
      // Exclude script/style contents
      const clone = el.cloneNode(true);
      clone.querySelectorAll('script, style').forEach(s => s.remove());
      const text = clone.innerText || '';
      if (text.length > maxLen && text.length < 50000) { // arbitrary upper bound
        maxLen = text.length;
        bestNode = el;
      }
    });

    return bestNode.innerText || document.body.innerText;
  }

  // ─── Count how many user skills appear in a text block ─────
  function countSkillMatches(text) {
    if (!text || userSkills.length === 0) return 0;
    const lower = text.toLowerCase();
    return userSkills.filter((skill) => lower.includes(skill.toLowerCase())).length;
  }

  // ─── Get the text content of a single job card ─────────────
  function getCardText(card) {
    return card.innerText || '';
  }

  // ─── Find or create a match-count badge on a card ──────────
  function getOrCreateBadge(card) {
    let badge = card.querySelector('.ai-resume-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'ai-resume-badge';
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 20px;
        margin-top: 4px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        pointer-events: none;
      `;
      // Try to append near the card footer or just append to card
      const footer = card.querySelector('.job-card-list__footer-wrapper, .job-card-container__footer-wrapper, .artdeco-entity-lockup__caption');
      if (footer) {
        footer.appendChild(badge);
      } else {
        card.style.position = 'relative';
        card.appendChild(badge);
      }
    }
    return badge;
  }

  function setBadge(card, count) {
    const badge = getOrCreateBadge(card);
    // Deep text shades: these badges sit on the host site's (light) job cards,
    // where the old 400-weight colors were close to unreadable.
    if (count === 0) {
      badge.textContent = '✗ 0 skill matches';
      badge.style.background = 'rgba(239,68,68,0.08)';
      badge.style.color = '#991b1b';
      badge.style.border = '1px solid rgba(239,68,68,0.25)';
    } else {
      badge.textContent = `✓ ${count} skill match${count !== 1 ? 'es' : ''}`;
      badge.style.background = count >= 3 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)';
      badge.style.color = count >= 3 ? '#065f46' : '#92400e';
      badge.style.border = count >= 3
        ? '1px solid rgba(16,185,129,0.3)'
        : '1px solid rgba(245,158,11,0.3)';
    }
  }

  // ─── Apply badges + filtering + sorting to all cards ───────
  function applyFilterAndSort() {
    const list = findJobList();
    if (!list) return;

    const cards = findJobCards(list);
    if (cards.length === 0) return;

    // Score and badge every card
    cards.forEach((card) => {
      const text = getCardText(card);
      const count = countSkillMatches(text);
      card.dataset.skillMatchCount = count;
      setBadge(card, count);

      // Filter: hide/show
      if (filterActive) {
        if (count === 0) {
          card.dataset.aiHidden = 'true';
          card.style.setProperty('display', 'none', 'important');
        } else {
          card.dataset.aiHidden = '';
          card.style.display = '';
        }
      } else {
        card.dataset.aiHidden = '';
        card.style.display = '';
      }
    });

    // Sort visible cards by descending match count using DOM manipulation
    sortCardsByMatchCount(list, cards);
  }

  function sortCardsByMatchCount(list, cards) {
    if (cards.length === 0) return;

    const sorted = Array.from(cards).sort((a, b) => {
      return parseInt(b.dataset.skillMatchCount || '0', 10) -
             parseInt(a.dataset.skillMatchCount || '0', 10);
    });

    // Find the common parent of the cards (may be a UL or a wrapper div inside the list)
    const parent = sorted[0].parentNode;
    if (!parent) return;

    // Re-insert in sorted order using DOM methods only (no innerHTML manipulation)
    sorted.forEach((card) => {
      parent.appendChild(card); // moves to end, building sorted list from best→worst
    });
  }

  function findJobList() {
    for (const sel of JOB_LIST_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function findJobCards(container) {
    for (const sel of JOB_CARD_SELECTORS) {
      const cards = container.querySelectorAll(sel);
      if (cards.length > 0) return Array.from(cards);
    }
    return [];
  }

  // ─── Inject Filter Toolbar ──────────────────────────────────
  function injectFilterToolbar() {
    if (filterToolbarInjected) return;
    if (userSkills.length === 0) return;

    const list = findJobList();
    if (!list) return;

    // Build toolbar container
    const toolbar = document.createElement('div');
    toolbar.id = 'ai-resume-filter-toolbar';
    toolbar.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 14px;
      margin-bottom: 12px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(0, 0, 0, 0.07);
      border-radius: 14px;
      font-family: 'Sora', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      backdrop-filter: blur(20px);
      position: relative;
      z-index: 9999;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      flex-shrink: 0;
    `;

    const leftGroup = document.createElement('div');
    leftGroup.style.cssText = `display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; flex: 1 1 auto;`;

    const rightGroup = document.createElement('div');
    rightGroup.style.cssText = `display: flex; align-items: center; gap: 6px; flex-shrink: 0;`;

    // Label
    const label = document.createElement('div');
    label.style.cssText = `
      font-size: 13px;
      font-weight: 700;
      color: #1d4ed8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    label.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      CareerPilot AI
    `;

    // Skill count badge
    const skillBadge = document.createElement('div');
    skillBadge.style.cssText = `
      font-size: 11px;
      font-weight: 500;
      color: #374151;
      background: rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 999px;
      padding: 3px 10px;
    `;
    skillBadge.textContent = userSkills.length + ' skills';

    // Divider
    const divider = document.createElement('div');
    divider.style.cssText = 'width: 1px; height: 20px; background: rgba(0,0,0,0.1); margin: 0 4px;';

    // Filter toggle button
    const filterBtn = document.createElement('button');
    filterBtn.id = 'ai-resume-filter-btn';
    filterBtn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid rgba(59, 130, 246, 0.3);
      background: rgba(59, 130, 246, 0.1);
      color: #1d4ed8;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: inherit;
      outline: none;
    `;
    const filterDefaultHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Filter Matches';
    const filterActiveHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Filtering Active';
    filterBtn.innerHTML = filterDefaultHTML;

    filterBtn.addEventListener('mouseenter', () => {
      filterBtn.style.transform = 'translateY(-1px)';
      filterBtn.style.background = filterActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)';
      filterBtn.style.boxShadow = filterActive ? '0 4px 12px rgba(16, 185, 129, 0.15)' : '0 4px 12px rgba(59, 130, 246, 0.15)';
    });
    filterBtn.addEventListener('mouseleave', () => {
      filterBtn.style.transform = 'translateY(0)';
      filterBtn.style.background = filterActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.1)';
      filterBtn.style.boxShadow = 'none';
    });
    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      filterActive = !filterActive;
      if (filterActive) {
        filterBtn.style.background = 'rgba(16, 185, 129, 0.15)';
        filterBtn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        filterBtn.style.color = '#065f46';
        filterBtn.innerHTML = filterActiveHTML;
      } else {
        filterBtn.style.background = 'rgba(59, 130, 246, 0.1)';
        filterBtn.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        filterBtn.style.color = '#1d4ed8';
        filterBtn.innerHTML = filterDefaultHTML;
      }
      applyFilterAndSort();
    });

    // Sort button
    const sortBtn = document.createElement('button');
    sortBtn.id = 'ai-resume-sort-btn';
    sortBtn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid rgba(167, 139, 250, 0.3);
      background: rgba(167, 139, 250, 0.1);
      color: #6b21a8;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: inherit;
      outline: none;
    `;
    sortBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> Sort Best';
    sortBtn.addEventListener('mouseenter', () => {
      sortBtn.style.transform = 'translateY(-1px)';
      sortBtn.style.background = 'rgba(167, 139, 250, 0.2)';
      sortBtn.style.boxShadow = '0 4px 12px rgba(167, 139, 250, 0.15)';
    });
    sortBtn.addEventListener('mouseleave', () => {
      sortBtn.style.transform = 'translateY(0)';
      sortBtn.style.background = 'rgba(167, 139, 250, 0.1)';
      sortBtn.style.boxShadow = 'none';
    });
    sortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      applyFilterAndSort();
      sortBtn.style.background = 'rgba(16, 185, 129, 0.2)';
      sortBtn.style.color = '#065f46';
      sortBtn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      setTimeout(() => {
        sortBtn.style.background = 'rgba(167, 139, 250, 0.1)';
        sortBtn.style.color = '#6b21a8';
        sortBtn.style.borderColor = 'rgba(167, 139, 250, 0.3)';
      }, 1000);
    });

    // Refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.title = 'Refresh skills from your profile';
    refreshBtn.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.09);
      background: rgba(0, 0, 0, 0.03);
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    `;
    refreshBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
    refreshBtn.addEventListener('mouseenter', () => {
       refreshBtn.style.background = 'rgba(0, 0, 0, 0.06)';
       refreshBtn.style.color = '#111827';
    });
    refreshBtn.addEventListener('mouseleave', () => {
       refreshBtn.style.background = 'rgba(0, 0, 0, 0.03)';
       refreshBtn.style.color = '#6b7280';
    });
    refreshBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const svg = refreshBtn.querySelector('svg');
      if (svg) {
        svg.style.transition = 'transform 0.4s ease';
        svg.style.transform = 'rotate(180deg)';
      }
      refreshBtn.style.color = '#3b82f6';
      loadUserSkills(() => {
        applyFilterAndSort();
        skillBadge.textContent = userSkills.length + ' skills';
        setTimeout(() => { 
          refreshBtn.style.color = '#6b7280'; 
          if (svg) svg.style.transform = 'rotate(0deg)';
        }, 800);
      });
    });

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.title = 'Close AI Toolbar';
    closeBtn.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    `;
    closeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    closeBtn.addEventListener('mouseenter', () => {
       closeBtn.style.background = 'rgba(239, 68, 68, 0.1)';
       closeBtn.style.color = '#ef4444';
    });
    closeBtn.addEventListener('mouseleave', () => {
       closeBtn.style.background = 'transparent';
       closeBtn.style.color = '#64748b';
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      toolbar.remove();
      filterToolbarInjected = false;
      filterActive = false;
      // Undo filter constraints on cards so they display normally
      const listContainer = findJobList();
      if (listContainer) {
        const resetCards = findJobCards(listContainer);
        resetCards.forEach(c => {
           c.style.display = '';
           c.dataset.aiHidden = '';
        });
      }
    });

    leftGroup.appendChild(label);
    leftGroup.appendChild(skillBadge);
    leftGroup.appendChild(divider);
    leftGroup.appendChild(filterBtn);
    leftGroup.appendChild(sortBtn);

    rightGroup.appendChild(refreshBtn);
    rightGroup.appendChild(closeBtn);

    toolbar.appendChild(leftGroup);
    toolbar.appendChild(rightGroup);

    list.parentNode.insertBefore(toolbar, list);
    filterToolbarInjected = true;

    // Initial badge pass
    applyFilterAndSort();

    // ─── Responsive: collapse to icon-only when narrow ─────────
    const filterBtnEl = toolbar.querySelector('#ai-resume-filter-btn');
    const sortBtnEl   = toolbar.querySelector('#ai-resume-sort-btn');
    const labelEl     = toolbar.querySelector('div[style*="text-transform: uppercase"]');

    function setCompactMode(isCompact) {
      if (isCompact) {
        // Icon-only: hide text nodes by changing padding/font-size
        if (filterBtnEl) {
          filterBtnEl.dataset.label = filterBtnEl.textContent.trim();
          filterBtnEl.style.padding = '6px 8px';
          // Keep inner SVG, hide trailing text node
          const textNodes = Array.from(filterBtnEl.childNodes).filter(n => n.nodeType === 3);
          textNodes.forEach(n => n.textContent = '');
        }
        if (sortBtnEl) {
          sortBtnEl.dataset.label = sortBtnEl.textContent.trim();
          sortBtnEl.style.padding = '6px 8px';
          const textNodes = Array.from(sortBtnEl.childNodes).filter(n => n.nodeType === 3);
          textNodes.forEach(n => n.textContent = '');
        }
        if (labelEl) labelEl.style.display = 'none';
      } else {
        if (filterBtnEl) {
          filterBtnEl.style.padding = '6px 14px';
        }
        if (sortBtnEl) {
          sortBtnEl.style.padding = '6px 14px';
        }
        if (labelEl) labelEl.style.display = '';
      }
    }

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          setCompactMode(entry.contentRect.width < 380);
        }
      });
      ro.observe(toolbar);
    }
  }

  // ─── Init ───────────────────────────────────────────────────
  function init() {
    const host = window.location.hostname;
    const isJobBoard = host.includes('linkedin.com') || 
                       host.includes('internshala.com') || 
                       host.includes('naukri.com') || 
                       host.includes('workatastartup.com') || 
                       host.includes('glassdoor');

    if (isJobBoard) {
      loadUserSkills(() => {
        const tryInject = setInterval(() => {
          if (findJobList()) {
            clearInterval(tryInject);
            injectFilterToolbar();
          }
        }, 1000);
        setTimeout(() => clearInterval(tryInject), 15000);
      });
    }
  }

  // ─── SPA navigation support ─────────────────────────────────
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      filterToolbarInjected = false;
      filterActive = false;

      const toolbar = document.getElementById('ai-resume-filter-toolbar');
      if (toolbar) toolbar.remove();

      init();
    }
  }).observe(document.body, { subtree: true, childList: true });

  init();
})();
