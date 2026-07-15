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

  // Self-contained image placeholder (no external service to fail on).
  window.TSS_PLACEHOLDER =
    "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='400'%3E%3Crect%20width='400'%20height='400'%20fill='%23efe8df'/%3E%3Ctext%20x='200'%20y='250'%20font-size='170'%20text-anchor='middle'%3E%F0%9F%A7%B4%3C/text%3E%3C/svg%3E";
})();
