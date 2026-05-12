/**
 * Wires selects with [data-jump]: option value = element id to scroll to.
 * Runs on load and after SPA content swaps.
 */
(function () {
  'use strict';

  function wireSelect(sel) {
    if (!sel || sel.getAttribute('data-jump-wired') === '1') return;
    sel.setAttribute('data-jump-wired', '1');
    sel.addEventListener('change', function () {
      var id = sel.value;
      if (!id) return;
      var el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  function wireAll() {
    document.querySelectorAll('select.page-section-jump-select[data-jump]').forEach(wireSelect);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireAll);
  } else {
    wireAll();
  }

  document.addEventListener('aipo:content-loaded', wireAll);
})();
