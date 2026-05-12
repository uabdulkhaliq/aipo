window.getCurrentPageName = function() {
  return window.location.pathname.split('/').pop().replace('.html', '') || 'index';
};

window.getViewConfig = function(pageName) {
  var configMap = {
    index: { remove: 'full', renameCleanToFull: true },
    prerequisites: { remove: 'full', renameCleanToFull: true },
    checklist: { remove: 'full', renameCleanToFull: true },
    framework: { remove: 'clean', renameCleanToFull: false },
    details: { remove: 'full', renameCleanToFull: true },
    workflow: { remove: 'full', renameCleanToFull: true },
    maturity: { remove: 'full', renameCleanToFull: true },
    approaches: { remove: 'full', renameCleanToFull: true }
  };
  return configMap[pageName] || { remove: null, renameCleanToFull: false };
};

window.getAvailableViews = function(pageName) {
  var views = ['boxed', 'full', 'clean'];
  var config = getViewConfig(pageName);
  if (config.remove === 'full') {
    views = views.filter(function(v) { return v !== 'full'; });
  } else if (config.remove === 'clean') {
    views = views.filter(function(v) { return v !== 'clean'; });
  }
  return views;
};

window.getDefaultView = function(pageName) {
  var views = getAvailableViews(pageName);
  if (views.indexOf('full') !== -1) return 'full';
  if (views.indexOf('clean') !== -1) return 'clean';
  return 'boxed';
};

window.normalizeView = function(v, pageName) {
  var views = getAvailableViews(pageName);
  if (views.indexOf(v) !== -1) return v;
  if (v === 'full' && views.indexOf('clean') !== -1) return 'clean';
  if (v === 'clean' && views.indexOf('full') !== -1) return 'full';
  return getDefaultView(pageName);
};

window.applyHeaderViewConfig = function(pageName) {
  var config = getViewConfig(pageName);
  if (config.remove === 'full') {
    var fullBtn = document.getElementById('opt-full');
    if (fullBtn) fullBtn.remove();
  }
  if (config.remove === 'clean') {
    var cleanBtn = document.getElementById('opt-clean');
    if (cleanBtn) cleanBtn.remove();
  }
  if (config.renameCleanToFull) {
    var cleanLabelBtn = document.getElementById('opt-clean');
    if (cleanLabelBtn) cleanLabelBtn.textContent = 'Full Width';
  }
};

// Global view functions
window.applyView = function(v) {
  var pageName = getCurrentPageName();
  var resolvedView = normalizeView(v, pageName);
  document.body.className = document.body.className.replace(/view-\w+/g, '');
  document.body.classList.add('view-' + resolvedView);
  var l = document.getElementById('viewLabel');
  if (l) {
    var config = getViewConfig(pageName);
    var labels = {
      boxed: 'Boxed',
      full: 'Full Width',
      clean: config.renameCleanToFull ? 'Full Width' : 'List'
    };
    l.textContent = labels[resolvedView] || 'Boxed';
  }
  ['boxed', 'full', 'clean'].forEach(function(opt) {
    var btn = document.getElementById('opt-' + opt);
    if (btn) btn.classList.toggle('active', opt === resolvedView);
  });
};

window.setView = function(v) {
  var pageName = getCurrentPageName();
  var resolvedView = normalizeView(v, pageName);
  localStorage.setItem('aipo-view', resolvedView);
  applyView(resolvedView);
};

window.toggleView = function() {
  var pageName = getCurrentPageName();
  var current = normalizeView(localStorage.getItem('aipo-view') || getDefaultView(pageName), pageName);
  var views = getAvailableViews(pageName);
  var idx = views.indexOf(current);
  var next = views[(idx + 1) % views.length];
  setView(next);
};

// Load shared layout (header & sidebar) into all pages
(function() {
  // Determine the current page name for active nav highlighting
  var currentPage = getCurrentPageName();

  // Fetch and inject layout at the beginning of body
  fetch('layout.html')
    .then(response => response.text())
    .then(html => {
      // Create a temporary container to parse the HTML
      var temp = document.createElement('div');
      temp.innerHTML = html;

      // Insert header, then mobile nav strip, then sidebar (order matters for layout)
      var header = temp.querySelector('header');
      var navMobile = temp.querySelector('.site-nav-mobile');
      var sidebar = temp.querySelector('aside');

      if (header) {
        document.body.insertBefore(header, document.body.firstChild);
      }
      var insertAfter = document.querySelector('header.site-header') || document.body.firstChild;
      if (navMobile && insertAfter) {
        document.body.insertBefore(navMobile, insertAfter.nextSibling);
      }
      if (sidebar) {
        var navEl = document.querySelector('.site-nav-mobile');
        var anchor = navEl || document.querySelector('header.site-header');
        document.body.insertBefore(sidebar, anchor ? anchor.nextSibling : null);
      }

      function syncMobileNavSelect() {
        var sel = document.getElementById('aipo-nav-select');
        if (!sel) return;
        var page = getCurrentPageName();
        var opt = sel.querySelector('option[data-page="' + page + '"]');
        if (opt) sel.value = opt.value;
      }

      function wireMobileNav() {
        var sel = document.getElementById('aipo-nav-select');
        if (!sel || sel.getAttribute('data-aipo-wired') === '1') return;
        sel.setAttribute('data-aipo-wired', '1');
        sel.addEventListener('change', function () {
          var v = sel.value;
          if (!v) return;
          if (typeof window.loadAipoPage === 'function' && document.getElementById('aipo-content')) {
            window.loadAipoPage(v, {});
          } else {
            window.location.href = v;
          }
        });
      }

      wireMobileNav();

      // Configure view controls per page (remove/rename options)
      applyHeaderViewConfig(currentPage);

      // Set active nav item based on current page
      var navLink = document.querySelector('[data-page="' + currentPage + '"]');
      if (navLink) {
        document.querySelectorAll('.sn-item').forEach(function(el) {
          el.classList.remove('active');
        });
        navLink.classList.add('active');
      }

      syncMobileNavSelect();

      // Apply stored view preference
      var view = normalizeView(localStorage.getItem('aipo-view') || getDefaultView(currentPage), currentPage);
      localStorage.setItem('aipo-view', view);
      applyView(view);

      document.dispatchEvent(new CustomEvent('aipo:layout-ready', { bubbles: true }));
    })
    .catch(err => console.error('Failed to load layout:', err));
})();

