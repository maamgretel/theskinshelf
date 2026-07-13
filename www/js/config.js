// js/config.js — single source of truth for the backend API base URL.
// Auto-detects local development vs. the deployed backend so the same code
// works in both places. When you move to a hosted backend (e.g. Aiven +
// Render), just update the production URL below.
(function () {
  var h = location.hostname;
  var isLocal =
    !h || h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:';
  window.API_BASE = isLocal
    ? 'http://localhost:5000'
    : 'https://backend-rj0a.onrender.com';
  // Back-compat alias used by some older scripts.
  window.BACKEND_URL = window.API_BASE;
})();
