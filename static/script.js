/* ============================================================
   TSun BanCheck — Frontend Logic
   No backend changes. No API contract changes.
   ============================================================ */

(function () {
  'use strict';

  /* ── Element references ─────────────────────────────────── */
  const uidInput    = document.getElementById('uidInput');
  const checkBtn   = document.getElementById('checkBtn');
  const loader     = document.getElementById('loader');
  const errorMsg   = document.getElementById('errorMessage');
  const statusBadge = document.getElementById('statusBadge');
  const resultPanel = document.getElementById('check');
  const resultContainer = document.getElementById('resultContainer');
  const rawPanel   = document.getElementById('rawPanel');
  const rawJson    = document.getElementById('rawJson');
  const checkedAt  = document.getElementById('checkedAt');
  const responseInfo = document.getElementById('responseInfo');
  const apiStatus  = document.getElementById('apiStatus');
  const tryUidInput = document.getElementById('tryUid');
  const tryBtnTry  = document.getElementById('tryBtn');
  const tryResult  = document.getElementById('tryResult');

  /* ── State ────────────────────────────────────────────── */
  let isChecking = false;

  /* ══════════════════════════════════════════════════════════
     CORE: performCheck — main lookup
     ══════════════════════════════════════════════════════════ */

  async function performCheck() {
    if (isChecking) return;

    const uid = uidInput ? uidInput.value.trim() : '';

    /* Client-side validation */
    if (!uid) {
      showError('Please enter a Player UID.');
      return;
    }
    if (!/^\d+$/.test(uid)) {
      showError('Invalid UID format. UID must contain numbers only.');
      return;
    }

    hideError();
    clearResult();
    setLoading(true);
    isChecking = true;

    let response;
    let data;

    try {
      const startMs = Date.now();

      response = await fetch(`/bancheck?uid=${encodeURIComponent(uid)}`);

      const latencyMs = Date.now() - startMs;
      data = await response.json();

      /* Update technical strip */
      if (responseInfo) responseInfo.textContent = `${latencyMs}ms`;
      if (apiStatus) apiStatus.textContent = response.ok ? 'REACHED' : 'ERROR';

      /* 2xx → full success; 400 → bad uid; 503/500 → show available partial data + error note; anything else → error */
      if (response.ok) {
        if (data.error) {
          /* Upstream had issues but returned 200 — show what we got */
          updateUI(data);
          showRaw(data);
          /* Prepend error note to the error message region so it's visible but doesn't block results */
          showError(data.error + ' (partial results shown above)');
          return;
        }
        updateUI(data);
        showRaw(data);
      } else if (response.status === 400) {
        showError(data.error || 'Invalid UID. Please check and try again.');
      } else if (response.status === 503 || response.status === 500) {
        /* 503/500 may contain partial data from the combined endpoint — show it */
        updateUI(data);
        showRaw(data);
        showError((data.error || 'One or more upstream services are temporarily unavailable.') + ' (partial results shown above)');
      } else {
        showError(data.error || `Unexpected error (HTTP ${response.status}). Please try again.`);
      }
    } catch (err) {
      /* Network failure, JSON parse error, etc. */
      console.error('[TSun] Lookup failed:', err);
      showError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
      isChecking = false;
    }
  }

  /* ══════════════════════════════════════════════════════════
     UI: updateUI
     Populates result fields from /bancheck response
     ══════════════════════════════════════════════════════════ */

  function updateUI(data) {
    /* Text fields */
    setText('nickname',  data.nickname);
    setText('uidValue',  data.uid);
    setText('region',    data.region);
    setText('level',     data.AccountLevel != null ? String(data.AccountLevel) : null);

    /* Last login — prefer relative string, fall back to raw date */
    const lastLoginVal = data.Last_Login || data.AccountLastLogin || null;
    setText('lastLogin', lastLoginVal);

    /* Ban status — the primary verdict */
    if (statusBadge) {
      statusBadge.className = 'status-badge';

      if (data.is_banned === true) {
        statusBadge.textContent = 'ACCOUNT BANNED';
        statusBadge.classList.add('is-banned');
      } else if (data.is_banned === false) {
        statusBadge.textContent = 'ACCOUNT CLEAN';
        statusBadge.classList.add('is-clean');
      } else {
        /* is_banned is null/undefined — check if there's a status field */
        if (data.status && data.status.toUpperCase() === 'BANNED') {
          statusBadge.textContent = 'ACCOUNT BANNED';
          statusBadge.classList.add('is-banned');
        } else {
          statusBadge.textContent = 'UNKNOWN';
          statusBadge.classList.add('is-unknown');
        }
      }
    }

    /* Timestamp */
    if (checkedAt) {
      checkedAt.textContent = new Date().toLocaleTimeString();
    }

    /* Reveal result panel */
    if (resultPanel) {
      resultPanel.hidden = false;
      resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /* ── Helper: safe text setter ──────────────────────────── */
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value != null && value !== '' ? value : '—';
  }

  /* ── Helper: clear result on error / retry ─────────────── */
  function clearResult() {
    setText('nickname',   null);
    setText('uidValue',   null);
    setText('region',     null);
    setText('level',      null);
    setText('lastLogin',  null);
    if (statusBadge) {
      statusBadge.textContent = '—';
      statusBadge.className  = 'status-badge';
    }
    if (checkedAt)    checkedAt.textContent    = '—';
    if (responseInfo) responseInfo.textContent = '—';
    if (rawJson)     rawJson.textContent      = '{}';
    if (rawPanel)    rawPanel.hidden          = true;
  }

  /* ══════════════════════════════════════════════════════════
     UI: showRaw
     Shows formatted JSON in the collapsible panel
     ══════════════════════════════════════════════════════════ */

  function showRaw(data) {
    if (!rawJson) return;
    try {
      rawJson.textContent = JSON.stringify(data, null, 2);
    } catch {
      rawJson.textContent = String(data);
    }
    if (rawPanel) rawPanel.hidden = false;
  }

  /* ══════════════════════════════════════════════════════════
     LOADING STATE
     ══════════════════════════════════════════════════════════ */

  function setLoading(on) {
    if (checkBtn) {
      checkBtn.disabled = on;
      checkBtn.textContent = on ? 'CHECKING ACCOUNT...' : 'CHECK ACCOUNT';
    }
    if (loader) {
      loader.hidden = !on;
    }
    if (uidInput) {
      uidInput.disabled = on;
    }
  }

  /* ══════════════════════════════════════════════════════════
     ERROR HANDLING
     ══════════════════════════════════════════════════════════ */

  function showError(message) {
    if (!errorMsg) return;
    errorMsg.textContent = message;
    errorMsg.hidden = false;
  }

  function hideError() {
    if (!errorMsg) return;
    errorMsg.textContent = '';
    errorMsg.hidden = true;
  }

  /* ══════════════════════════════════════════════════════════
     TRY API (docs section)
     ══════════════════════════════════════════════════════════ */

  async function tryAPI() {
    const uid = tryUidInput ? tryUidInput.value.trim() : '';

    if (!uid) {
      if (tryResult) {
        tryResult.textContent = 'Please enter a UID to try.';
        tryResult.style.color = 'var(--danger)';
      }
      return;
    }

    if (!/^\d+$/.test(uid)) {
      if (tryResult) {
        tryResult.textContent = 'Invalid UID format. Enter numbers only.';
        tryResult.style.color = 'var(--danger)';
      }
      return;
    }

    if (tryBtnTry) {
      tryBtnTry.disabled = true;
      tryBtnTry.textContent = 'Loading…';
    }
    if (tryResult) {
      tryResult.textContent = 'Fetching…';
      tryResult.style.color = 'var(--text-muted)';
    }

    try {
      const response = await fetch(`/bancheck?uid=${encodeURIComponent(uid)}`);
      const data = await response.json();

      if (tryResult) {
        tryResult.textContent = JSON.stringify(data, null, 2);
        tryResult.style.color = response.ok ? 'var(--text-secondary)' : 'var(--danger)';
      }
    } catch (err) {
      console.error('[TSun] Try API failed:', err);
      if (tryResult) {
        tryResult.textContent = `Error: ${err.message}`;
        tryResult.style.color = 'var(--danger)';
      }
    } finally {
      if (tryBtnTry) {
        tryBtnTry.disabled = false;
        tryBtnTry.textContent = 'Try';
      }
    }
  }

  /* ══════════════════════════════════════════════════════════
     RAW JSON ACCORDION
     ══════════════════════════════════════════════════════════ */

  function toggleRaw() {
    if (!rawPanel) return;
    const isOpen = !rawPanel.hidden;
    rawPanel.hidden = isOpen;

    /* Keep the accordion button in sync */
    const btn = rawPanel.previousElementSibling;
    if (btn && btn.classList.contains('accordion-btn')) {
      btn.setAttribute('aria-expanded', String(!isOpen));
    }
  }

  /* ══════════════════════════════════════════════════════════
     COPY TO CLIPBOARD
     ══════════════════════════════════════════════════════════ */

  function copyCode(button) {
    const codeBlock = button ? button.closest('.code-block') : null;
    const codeEl    = codeBlock ? codeBlock.querySelector('code') : null;
    const text      = codeEl ? codeEl.textContent : '';

    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        flashCopyButton(button, 'Copied!');
      }).catch(function () {
        flashCopyButton(button, 'Failed');
      });
    } else {
      /* Fallback for environments without Clipboard API */
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        flashCopyButton(button, 'Copied!');
      } catch {
        flashCopyButton(button, 'Failed');
      }
    }
  }

  function flashCopyButton(button, label) {
    if (!button) return;
    const orig = button.textContent;
    button.textContent = label;
    setTimeout(function () { if (button) button.textContent = orig; }, 1800);
  }

  /* ══════════════════════════════════════════════════════════
     NAVIGATION: smooth scroll + active state
     ══════════════════════════════════════════════════════════ */

  function initNav() {
    /* Smooth scroll for all anchor links that point to ids on this page */
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     KEYBOARD INTERACTION
     ══════════════════════════════════════════════════════════ */

  function initKeyboard() {
    /* Enter key submits main lookup */
    if (uidInput) {
      uidInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          performCheck();
        }
      });
    }

    /* Enter key submits Try API */
    if (tryUidInput) {
      tryUidInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          tryAPI();
        }
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     THEME PREFERENCE (optional — dark-first, persisted)
     Only activates if a .theme-toggle element exists.
     ══════════════════════════════════════════════════════════ */

  function initTheme() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    const STORAGE_KEY = 'tsun-theme';
    const DARK_THEME  = 'dark';

    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (_) {}

    function applyTheme(name) {
      if (name === DARK_THEME) {
        document.documentElement.setAttribute('data-theme', DARK_THEME);
        toggle.setAttribute('aria-pressed', 'true');
      } else {
        document.documentElement.removeAttribute('data-theme');
        toggle.setAttribute('aria-pressed', 'false');
      }
      try { localStorage.setItem(STORAGE_KEY, name); } catch (_) {}
    }

    /* Default: system preference or dark */
    var initial = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : DARK_THEME);
    applyTheme(initial);

    toggle.addEventListener('click', function () {
      var current = document.documentElement.hasAttribute('data-theme') ? DARK_THEME : 'light';
      applyTheme(current === DARK_THEME ? 'light' : DARK_THEME);
    });
  }

  /* ══════════════════════════════════════════════════════════
     INITIALISE
     ══════════════════════════════════════════════════════════ */

  function init() {
    initNav();
    initKeyboard();
    initTheme();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── Expose for inline onclick handlers in HTML ───────── */
  window.performCheck = performCheck;
  window.tryAPI      = tryAPI;
  window.toggleRaw   = toggleRaw;
  window.copyCode    = copyCode;

})();
