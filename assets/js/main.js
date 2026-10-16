(function () {
  'use strict';

  var root = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Language ---------- */
  var TR = window.I18N_TR || {};
  var textNodes = document.querySelectorAll('[data-i18n]');
  var ariaNodes = document.querySelectorAll('[data-i18n-aria]');
  var metaDesc = document.querySelector('meta[name="description"]');
  var langBtn = document.getElementById('lang-toggle');
  var cvLink = document.getElementById('cv-link');

  // Keep the English originals so we can switch back without a second dictionary.
  var EN = {
    'meta.title': document.title,
    'meta.description': metaDesc ? metaDesc.content : '',
    'aria.lang': 'Türkçe\'ye geç'
  };
  textNodes.forEach(function (el) { EN[el.dataset.i18n] = el.innerHTML; });
  ariaNodes.forEach(function (el) { EN[el.dataset.i18nAria] = el.getAttribute('aria-label'); });

  function setLang(lang) {
    var dict = lang === 'tr' ? TR : EN;
    var pick = function (k) { return dict[k] != null ? dict[k] : EN[k]; };

    textNodes.forEach(function (el) { el.innerHTML = pick(el.dataset.i18n); });
    ariaNodes.forEach(function (el) { el.setAttribute('aria-label', pick(el.dataset.i18nAria)); });

    root.lang = lang;
    document.title = pick('meta.title');
    if (metaDesc) metaDesc.content = pick('meta.description');

    langBtn.textContent = lang === 'tr' ? 'EN' : 'TR';
    langBtn.setAttribute('aria-label', pick('aria.lang'));
    if (cvLink) cvLink.href = 'assets/cv/Tolga_Arslan_CV_' + (lang === 'tr' ? 'TR' : 'EN') + '.pdf';

    store.set('lang', lang);
  }

  function initialLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'tr' || q === 'en') return q;
    var saved = store.get('lang');
    if (saved === 'tr' || saved === 'en') return saved;
    return (navigator.language || '').toLowerCase().indexOf('tr') === 0 ? 'tr' : 'en';
  }

  langBtn.addEventListener('click', function () {
    setLang(root.lang === 'tr' ? 'en' : 'tr');
  });
  setLang(initialLang());

  /* ---------- Theme ---------- */
  var themeBtn = document.getElementById('theme-toggle');
  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  function currentTheme() {
    return root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light');
  }
  themeBtn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('theme', next);
  });

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById('menu-toggle');
  var navLinks = document.getElementById('nav-links');

  function closeMenu() {
    navLinks.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  menuBtn.addEventListener('click', function () {
    var open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  navLinks.addEventListener('click', function (e) {
    if (e.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------- Active section + reveal ---------- */
  var header = document.querySelector('.site-header');
  var links = navLinks.querySelectorAll('a');
  var sections = Array.prototype.map.call(links, function (a) {
    return document.querySelector(a.getAttribute('href'));
  });

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 8);
    var y = window.scrollY + window.innerHeight * 0.35;
    var active = -1;
    sections.forEach(function (s, i) { if (s && s.offsetTop <= y) active = i; });
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) active = sections.length - 1;
    links.forEach(function (a, i) { a.classList.toggle('active', i === active); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.section, .project, .tl-item, .skill-group').forEach(function (el) {
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  document.getElementById('year').textContent = new Date().getFullYear();
})();
