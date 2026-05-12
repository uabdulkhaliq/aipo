/**
 * Client-side navigation: swaps #aipo-content only; header/sidebar stay mounted.
 * Requires each page to wrap main markup in <div id="aipo-content">...</div>.
 */
(function () {
  'use strict';

  function documentHtmlUrl(href) {
    try {
      var u = new URL(href, window.location.href);
      return u.origin === window.location.origin && /\.html$/i.test(u.pathname);
    } catch (e) {
      return false;
    }
  }

  function extractPayload(htmlText) {
    var doc = new DOMParser().parseFromString(htmlText, 'text/html');
    var mount = doc.getElementById('aipo-content');
    if (!mount) return null;
    return {
      html: mount.innerHTML,
      title: doc.title || '',
      bodyClass: doc.body.className || ''
    };
  }

  function mergeBodyClasses(fetchedClass) {
    var pageParts = (fetchedClass || '').split(/\s+/).filter(function (c) {
      return c && !/^view-/.test(c);
    });
    var views = (document.body.className.match(/\bview-\w+\b/g) || []).join(' ');
    document.body.className = (pageParts.join(' ') + ' ' + views).trim().replace(/\s+/g, ' ');
  }

  function activateScripts(root) {
    var scripts = root.querySelectorAll('script');
    scripts.forEach(function (oldScript) {
      var s = document.createElement('script');
      Array.from(oldScript.attributes).forEach(function (attr) {
        s.setAttribute(attr.name, attr.value);
      });
      s.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(s, oldScript);
    });
  }

  function pageNameFromUrl(urlStr) {
    var u = new URL(urlStr, window.location.origin);
    var seg = u.pathname.split('/').pop() || '';
    return seg.replace(/\.html$/i, '') || 'index';
  }

  function updateNavActive(pageName) {
    document.querySelectorAll('.sn-item.active').forEach(function (el) {
      el.classList.remove('active');
    });
    var link =
      document.querySelector('.sn-item[data-page="' + pageName + '"]') ||
      (pageName === 'index'
        ? document.querySelector('.sn-item[href*="index.html"]')
        : document.querySelector('.sn-item[href="' + pageName + '.html"]'));
    if (link) link.classList.add('active');

    var sel = document.getElementById('aipo-nav-select');
    if (sel) {
      var opt = sel.querySelector('option[data-page="' + pageName + '"]');
      if (opt) sel.value = opt.value;
    }
  }

  var navigating = false;

  window.loadAipoPage = function (urlStr, opts) {
    opts = opts || {};
    var mount = document.getElementById('aipo-content');
    if (!mount || navigating) {
      if (!mount) window.location.href = urlStr;
      return;
    }

    navigating = true;
    document.dispatchEvent(new CustomEvent('aipo:content-unload', { bubbles: true }));

    fetch(urlStr, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('fetch');
        return r.text();
      })
      .then(function (htmlText) {
        var payload = extractPayload(htmlText);
        if (!payload) {
          window.location.href = urlStr;
          return;
        }

        var resolved = new URL(urlStr, window.location.origin);
        var pathForHistory = resolved.pathname + resolved.search + resolved.hash;
        var pageName = pageNameFromUrl(urlStr);

        mount.innerHTML = payload.html;
        if (payload.title) document.title = payload.title;
        mergeBodyClasses(payload.bodyClass);

        if (!opts.skipHistory && history.pushState) {
          history.pushState({ aipo: true }, '', pathForHistory);
        }

        activateScripts(mount);

        if (typeof window.applyHeaderViewConfig === 'function') {
          window.applyHeaderViewConfig(pageName);
        }

        var pref = localStorage.getItem('aipo-view') || '';
        if (typeof window.normalizeView === 'function' && typeof window.applyView === 'function') {
          var v = window.normalizeView(pref, pageName);
          localStorage.setItem('aipo-view', v);
          window.applyView(v);
        }

        updateNavActive(pageName);

        window.scrollTo(0, 0);
        document.dispatchEvent(new CustomEvent('aipo:content-loaded', { bubbles: true }));
      })
      .catch(function () {
        window.location.href = urlStr;
      })
      .finally(function () {
        navigating = false;
      });
  };

  document.addEventListener('aipo:content-unload', function () {
    document.querySelectorAll('.ep-overlay, .ep-panel').forEach(function (el) {
      el.remove();
    });
  });

  document.body.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var a = e.target.closest('a[href]');
    if (!a || a.hasAttribute('download')) return;
    if (a.target === '_blank') return;

    var raw = a.getAttribute('href');
    if (!raw || raw.indexOf('mailto:') === 0 || raw.indexOf('tel:') === 0) return;

    var urlObj = new URL(raw, window.location.href);
    if (!documentHtmlUrl(urlObj.href)) return;

    if (
      urlObj.pathname === window.location.pathname &&
      urlObj.search === window.location.search &&
      urlObj.hash
    ) {
      return;
    }

    if (
      urlObj.pathname === window.location.pathname &&
      !urlObj.hash &&
      !urlObj.search
    ) {
      e.preventDefault();
      return;
    }

    if (!document.getElementById('aipo-content')) return;

    e.preventDefault();
    window.loadAipoPage(urlObj.pathname + urlObj.search + urlObj.hash, {});
  });

  window.addEventListener('popstate', function () {
    window.loadAipoPage(window.location.pathname + window.location.search + window.location.hash, {
      skipHistory: true
    });
  });

  if (history.replaceState && document.getElementById('aipo-content')) {
    history.replaceState({ aipo: true }, '', window.location.href);
  }
})();
