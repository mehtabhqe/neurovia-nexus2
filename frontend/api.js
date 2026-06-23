/* ═══════════════════════════════════════════════════════════
   api.js — Neurovia Nexus Frontend ↔ Backend Connection
   Connects all forms to the Node.js backend API
   ═══════════════════════════════════════════════════════════ */

/* ── CONFIG ─────────────────────────────────────────────────
   Change this to your deployed backend URL when live.
   Examples:
     Local dev:  'http://localhost:3000'
     Railway:    'https://your-app-name.up.railway.app'
     Custom:     'https://api.neurovia.in'
   ─────────────────────────────────────────────────────────── */
// ── API BASE URL ─────────────────────────────────────────────
// Automatically uses the right backend depending on environment
// When deployed on Vercel this reads from NEXT_PUBLIC_API_URL
// or falls back to the Render URL you set below
const API_BASE = (() => {
  // If running locally
  if (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  // When live — replace this with your actual Render URL
  return 'https://neurovia-nexus-api.onrender.com';
})();

/* ═══════════════════════════════════════════════════════════
   UTILITY HELPERS
   ═══════════════════════════════════════════════════════════ */

// Generic fetch wrapper with error handling
async function apiCall(method, endpoint, body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const res  = await fetch(API_BASE + endpoint, options);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };

  } catch (err) {
    // Network error — backend not reachable
    console.error('API call failed:', err);
    return {
      ok: false,
      status: 0,
      data: { success: false, message: 'Could not connect to server. Please try again.' }
    };
  }
}

// Show message inside a form feedback element
function showMsg(elId, message, type = 'success') {
  const el = document.getElementById(elId);
  if (!el) return;
  const colors = {
    success: '#34D399',
    error:   '#F43F5E',
    info:    '#818CF8'
  };
  el.style.color = colors[type] || colors.info;
  el.textContent = message;
}

// Clear message
function clearMsg(elId) {
  const el = document.getElementById(elId);
  if (el) el.textContent = '';
}

// Set button to loading state
function setLoading(btnId, loading, originalText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.disabled    = true;
    btn.dataset.orig = btn.textContent;
    btn.textContent  = 'Please wait…';
    btn.style.opacity = '0.7';
  } else {
    btn.disabled    = false;
    btn.textContent  = originalText || btn.dataset.orig || 'Submit';
    btn.style.opacity = '1';
  }
}

// Basic email validator
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Basic phone validator (Indian format friendly)
function isValidPhone(phone) {
  return /^[+]?[\d\s\-()]{8,15}$/.test(phone.trim());
}

/* ═══════════════════════════════════════════════════════════
   1. TECHNICIAN REGISTRATION FORM
   Section: #technician
   ═══════════════════════════════════════════════════════════ */
async function submitTechForm() {
  clearMsg('tech-msg');

  // Gather values
  const full_name  = (document.getElementById('tech-name')?.value      || '').trim();
  const phone      = (document.getElementById('tech-phone')?.value     || '').trim();
  const city       = (document.getElementById('tech-city')?.value      || '').trim();
  const experience = (document.getElementById('tech-exp')?.value       || '').trim();
  const expertise  = (document.getElementById('tech-expertise')?.value || '').trim();

  // Client-side validation
  if (!full_name) {
    showMsg('tech-msg', '⚠ Please enter your full name.', 'error');
    return;
  }
  if (!phone || !isValidPhone(phone)) {
    showMsg('tech-msg', '⚠ Please enter a valid phone number.', 'error');
    return;
  }
  if (!city) {
    showMsg('tech-msg', '⚠ Please enter your city.', 'error');
    return;
  }
  if (!expertise) {
    showMsg('tech-msg', '⚠ Please select your primary expertise.', 'error');
    return;
  }

  setLoading('tech-submit-btn', true);

  const { ok, data } = await apiCall('POST', '/api/technician/register', {
    full_name,
    phone,
    city,
    experience,
    expertise
  });

  setLoading('tech-submit-btn', false, 'Submit application →');

  if (ok && data.success) {
    showMsg('tech-msg', '✅ ' + data.message, 'success');
    // Clear form
    ['tech-name','tech-phone','tech-city','tech-exp'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const sel = document.getElementById('tech-expertise');
    if (sel) sel.selectedIndex = 0;
  } else {
    // Show first validation error or general message
    const msg = data.errors?.[0]?.message || data.message || 'Something went wrong.';
    showMsg('tech-msg', '✗ ' + msg, 'error');
  }
}

/* ═══════════════════════════════════════════════════════════
   2. CONSUMER BOOKING FORM
   Section: #consumer
   ═══════════════════════════════════════════════════════════ */
async function submitBookingForm() {
  clearMsg('book-msg');

  const issue_desc   = (document.getElementById('book-desc')?.value    || '').trim();
  const service_type = (document.getElementById('book-service')?.value || '').trim();

  // Client-side validation
  if (!issue_desc || issue_desc.length < 10) {
    showMsg('book-msg', '⚠ Please describe your issue in at least 10 characters.', 'error');
    return;
  }
  if (!service_type) {
    showMsg('book-msg', '⚠ Please select a service type.', 'error');
    return;
  }

  setLoading('book-submit-btn', true);

  const { ok, data } = await apiCall('POST', '/api/booking/submit', {
    issue_desc,
    service_type
  });

  setLoading('book-submit-btn', false, 'Find Technician →');

  if (ok && data.success) {
    showMsg('book-msg', `✅ ${data.message} (Ref #${data.booking_id})`, 'success');
    // Clear form
    const desc = document.getElementById('book-desc');
    const svc  = document.getElementById('book-service');
    if (desc) desc.value = '';
    if (svc)  svc.selectedIndex = 0;
  } else {
    const msg = data.errors?.[0]?.message || data.message || 'Something went wrong.';
    showMsg('book-msg', '✗ ' + msg, 'error');
  }
}

/* ═══════════════════════════════════════════════════════════
   3. NADT WAITLIST FORM
   Section: #nadt
   ═══════════════════════════════════════════════════════════ */
async function submitWaitlist() {
  clearMsg('wl-msg');

  const email = (document.getElementById('wl-email')?.value || '').trim();

  // Client-side validation
  if (!email) {
    showMsg('wl-msg', '⚠ Please enter your email address.', 'error');
    return;
  }
  if (!isValidEmail(email)) {
    showMsg('wl-msg', '⚠ Please enter a valid email address.', 'error');
    return;
  }

  setLoading('wl-btn', true);

  const { ok, data } = await apiCall('POST', '/api/waitlist/join', { email });

  setLoading('wl-btn', false, 'Notify me →');

  if (ok && data.success) {
    // Clear input
    const inp = document.getElementById('wl-email');
    if (inp) inp.value = '';

    if (data.already_joined) {
      showMsg('wl-msg', "✅ You're already on the list! We'll notify you at launch.", 'info');
    } else {
      showMsg('wl-msg', "✅ You're on the list! We'll email you when NADT launches.", 'success');
      // Update live count
      if (data.total_count) {
        const countEl = document.getElementById('wl-count');
        if (countEl) {
          countEl.innerHTML = `<strong>${data.total_count} businesses</strong> already on the waitlist`;
        }
      }
    }
  } else {
    const msg = data.errors?.[0]?.message || data.message || 'Something went wrong.';
    showMsg('wl-msg', '✗ ' + msg, 'error');
  }
}

/* ═══════════════════════════════════════════════════════════
   4. LOAD LIVE WAITLIST COUNT ON PAGE LOAD
   Shows real number from DB instead of hardcoded 247
   ═══════════════════════════════════════════════════════════ */
async function loadWaitlistCount() {
  const { ok, data } = await apiCall('GET', '/api/waitlist/count');
  if (ok && data.success && data.count > 0) {
    const countEl = document.getElementById('wl-count');
    if (countEl) {
      countEl.innerHTML = `<strong>${data.count} ${data.count === 1 ? 'business' : 'businesses'}</strong> already on the waitlist`;
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   5. KEYBOARD SUPPORT — submit on Enter key
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Waitlist — press Enter to submit
  const wlInput = document.getElementById('wl-email');
  if (wlInput) {
    wlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') submitWaitlist();
    });
  }

  // Load live waitlist count
  loadWaitlistCount();
});