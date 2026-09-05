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
  const rawPanel   = document.getElementById('rawPanel');
  const rawJson    = document.getElementById('rawJson');
  const checkedAt  = document.getElementById('checkedAt');
  const responseInfo = document.getElementById('responseInfo');
  const apiStatus  = document.getElementById('apiStatus');
  const lookupSpeed = document.getElementById('lookupSpeed');
  const statusText = document.getElementById('statusText');
  const responseState = document.getElementById('responseState');
  const statusHero = document.getElementById('statusHero');
  const statusIcon = document.getElementById('statusIcon');
  const statusMessage = document.getElementById('statusMessage');
  const nicknameEl = document.getElementById('nickname');
  const regionEl = document.getElementById('region');
  const checkBtnDefaultLabel = checkBtn ? checkBtn.textContent : 'CHECK ACCOUNT';

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
    if (responseState) responseState.textContent = 'Loading';

    let response;
    let data;

    try {
      const startMs = Date.now();

      response = await fetch(`/bancheck?uid=${encodeURIComponent(uid)}`);

      const latencyMs = Date.now() - startMs;
      data = await response.json();

      /* Update technical strip */
      if (responseInfo) responseInfo.textContent = data.AccountLevel != null ? String(data.AccountLevel) : 'N/A';
      if (lookupSpeed) lookupSpeed.textContent = latencyMs < 1200 ? 'Fast Lookup' : 'Lookup Active';
      if (apiStatus) apiStatus.textContent = response.ok ? 'Operational' : 'Error';
      if (responseState) responseState.textContent = data.status || (data.is_banned === true ? 'BANNED' : data.is_banned === false ? 'OK' : (response.ok ? 'Unknown' : `HTTP ${response.status}`));

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
      if (responseState) responseState.textContent = 'Network Error';
      if (apiStatus) apiStatus.textContent = 'Unavailable';
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
    setText('region',    data.region);

    /* Last login — prefer relative string, fall back to raw date */
    const lastLoginVal = data.Last_Login || data.AccountLastLogin || null;
    if (checkedAt) checkedAt.textContent = lastLoginVal || 'Not available';
    if (statusText) statusText.textContent = data.uid || 'N/A';
    if (responseInfo) responseInfo.textContent = data.AccountLevel != null ? String(data.AccountLevel) : 'N/A';

    /* Ban status — the primary verdict */
    if (statusBadge) {
      statusBadge.className = 'status-badge';
      if (statusHero) statusHero.className = 'status-hero';

      if (data.is_banned === true) {
        statusBadge.textContent = 'ACCOUNT BANNED';
        statusBadge.classList.add('is-banned');
        if (statusHero) statusHero.classList.add('state-banned');
        if (statusIcon) statusIcon.textContent = '⊘';
        if (statusMessage) statusMessage.textContent = 'This account appears to be banned.';
      } else if (data.is_banned === false) {
        statusBadge.textContent = 'ACCOUNT CLEAN';
        statusBadge.classList.add('is-clean');
        if (statusHero) statusHero.classList.add('state-clean');
        if (statusIcon) statusIcon.textContent = '✓';
        if (statusMessage) statusMessage.textContent = 'No ban detected for this account.';
      } else {
        /* is_banned is null/undefined — check if there's a status field */
        if (data.status && data.status.toUpperCase() === 'BANNED') {
          statusBadge.textContent = 'ACCOUNT BANNED';
          statusBadge.classList.add('is-banned');
          if (statusHero) statusHero.classList.add('state-banned');
          if (statusIcon) statusIcon.textContent = '⊘';
          if (statusMessage) statusMessage.textContent = 'This account appears to be banned.';
        } else {
          statusBadge.textContent = 'UNKNOWN';
          statusBadge.classList.add('is-unknown');
          if (statusHero) statusHero.classList.add('state-unknown');
          if (statusIcon) statusIcon.textContent = '?';
          if (statusMessage) statusMessage.textContent = 'Ban status is not available for this lookup.';
        }
      }
    }

    if (nicknameEl) {
      nicknameEl.classList.remove('is-clean', 'is-banned', 'is-unknown');
      if (data.is_banned === true || (data.status && data.status.toUpperCase() === 'BANNED')) {
        nicknameEl.classList.add('is-banned');
      } else if (data.is_banned === false) {
        nicknameEl.classList.add('is-clean');
      } else {
        nicknameEl.classList.add('is-unknown');
      }
    }

    if (statusText) {
      statusText.textContent = data.uid || 'N/A';
    }
  }

  /* ── Helper: safe text setter ──────────────────────────── */
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value != null && value !== '' ? value : 'N/A';
  }

  /* ── Helper: clear result on error / retry ─────────────── */
  function clearResult() {
    setText('nickname',   null);
    setText('region',     null);
    if (statusBadge) {
      statusBadge.textContent = 'UNKNOWN';
      statusBadge.className  = 'status-badge';
    }
    if (statusHero) {
      statusHero.className = 'status-hero state-unknown';
    }
    if (statusIcon) {
      statusIcon.textContent = '?';
    }
    if (statusMessage) {
      statusMessage.textContent = 'Ban status is not available for this lookup.';
    }
    if (nicknameEl) {
      nicknameEl.classList.remove('is-clean', 'is-banned', 'is-unknown');
      nicknameEl.classList.add('is-unknown');
    }

    if (checkedAt)    checkedAt.textContent    = 'Not available';
    if (responseInfo) responseInfo.textContent = 'N/A';
    if (statusText)   statusText.textContent   = 'N/A';
    if (responseState) responseState.textContent = 'Idle';
    if (lookupSpeed) lookupSpeed.textContent = 'Fast Lookup';
    if (rawJson)     rawJson.textContent      = '{}';
    if (rawPanel)    rawPanel.hidden          = true;

    const rawToggleBtn = document.querySelector('.accordion-btn[aria-controls="rawPanel"]');
    if (rawToggleBtn) rawToggleBtn.setAttribute('aria-expanded', 'false');
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

    const rawToggleBtn = document.querySelector('.accordion-btn[aria-controls="rawPanel"]');
    if (rawToggleBtn) rawToggleBtn.setAttribute('aria-expanded', 'true');
  }

  /* ══════════════════════════════════════════════════════════
     LOADING STATE
     ══════════════════════════════════════════════════════════ */

  function setLoading(on) {
    if (checkBtn) {
      checkBtn.disabled = on;
      checkBtn.textContent = on ? 'CHECKING...' : checkBtnDefaultLabel;
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
    let text = codeEl ? codeEl.textContent : '';

    if (!text && button) {
      const endpointRow = button.closest('.endpoint-row');
      const endpointCode = endpointRow ? endpointRow.querySelector('code') : null;
      text = endpointCode ? endpointCode.textContent : '';
    }

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

  }

  /* ══════════════════════════════════════════════════════════
     INITIALISE
     ══════════════════════════════════════════════════════════ */

  function init() {
    initNav();
    initKeyboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── Expose for inline onclick handlers in HTML ───────── */
  window.performCheck = performCheck;
  window.toggleRaw   = toggleRaw;
  window.copyCode    = copyCode;

})();
