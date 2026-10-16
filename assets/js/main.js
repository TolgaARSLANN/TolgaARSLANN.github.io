(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  /* =====================================================
     Language
     ===================================================== */
  var DICT = window.I18N || { en: {}, tr: {} };
  var textNodes = $$('[data-i18n]');
  var ariaNodes = $$('[data-i18n-aria]');
  var metaDesc = $('meta[name="description"]');
  var langBtn = $('#lang-toggle');
  var cvLink = $('#cv-link');
  var lang = 'en';
  var langListeners = [];

  // English originals come from the HTML itself.
  var EN = DICT.en;
  EN['meta.title'] = document.title;
  EN['meta.description'] = metaDesc ? metaDesc.content : '';
  EN['aria.lang'] = 'Türkçe\'ye geç';
  textNodes.forEach(function (el) { EN[el.dataset.i18n] = el.innerHTML; });
  ariaNodes.forEach(function (el) { EN[el.dataset.i18nAria] = el.getAttribute('aria-label'); });

  function t(key) {
    var d = DICT[lang] || EN;
    return d[key] != null ? d[key] : EN[key];
  }

  function setLang(next) {
    lang = next === 'tr' ? 'tr' : 'en';
    textNodes.forEach(function (el) { el.innerHTML = t(el.dataset.i18n); });
    ariaNodes.forEach(function (el) { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    root.lang = lang;
    document.title = t('meta.title');
    if (metaDesc) metaDesc.content = t('meta.description');
    langBtn.querySelector('.lang-on').textContent = lang.toUpperCase();
    langBtn.querySelector('.lang-off').textContent = lang === 'tr' ? 'EN' : 'TR';
    langBtn.setAttribute('aria-label', t('aria.lang'));
    cvLink.href = 'assets/cv/Tolga_Arslan_CV_' + (lang === 'tr' ? 'TR' : 'EN') + '.pdf';
    store.set('lang', lang);
    langListeners.forEach(function (fn) { fn(); });
  }

  function initialLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'tr' || q === 'en') return q;
    var saved = store.get('lang');
    if (saved === 'tr' || saved === 'en') return saved;
    return (navigator.language || '').toLowerCase().indexOf('tr') === 0 ? 'tr' : 'en';
  }
  langBtn.addEventListener('click', function () { setLang(lang === 'tr' ? 'en' : 'tr'); });

  /* =====================================================
     Theme (dark by default)
     ===================================================== */
  function toggleTheme() {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    $('meta[name="theme-color"]').content = next === 'light' ? '#f2f1ec' : '#08090b';
    store.set('theme', next);
  }
  $('#theme-toggle').addEventListener('click', toggleTheme);

  /* =====================================================
     Toast
     ===================================================== */
  var toastEl = $('#toast');
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  /* =====================================================
     Copy email
     ===================================================== */
  var EMAIL = 'tolgaarslan.dev@gmail.com';
  function copyEmail() {
    var done = function () { toast(t('js.copied')); };
    var fail = function () {
      var r = document.createRange();
      r.selectNodeContents($('.mail-big'));
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      toast(t('js.copyFail'));
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(EMAIL).then(done, fail);
    else fail();
  }
  $('#copy-email').addEventListener('click', copyEmail);

  /* =====================================================
     Istanbul clock
     ===================================================== */
  var clockEl = $('#clock');
  var clockFmt;
  try {
    clockFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
  } catch (e) { clockFmt = null; }
  function tick() {
    if (clockFmt) clockEl.textContent = clockFmt.format(new Date());
  }
  tick();
  setInterval(tick, 15000);
  langListeners.push(function () { clockEl.setAttribute('aria-label', t('js.clock')); });

  /* =====================================================
     Terminal typer
     ===================================================== */
  var typerEl = $('#typer');
  var cmds = ['npm run test', 'pytest -q', 'docker compose up -d', 'git push origin main'];
  if (reduceMotion.matches) {
    typerEl.textContent = cmds[0];
  } else {
    (function typeLoop(i, pos, deleting) {
      var word = cmds[i % cmds.length];
      typerEl.textContent = word.slice(0, pos);
      var delay = deleting ? 32 : 70 + Math.random() * 60;
      if (!deleting && pos === word.length) { delay = 1800; deleting = true; }
      else if (deleting && pos === 0) { deleting = false; i++; delay = 380; }
      else pos += deleting ? -1 : 1;
      setTimeout(function () { typeLoop(i, pos, deleting); }, delay);
    })(0, 0, false);
  }

  /* =====================================================
     CI pipeline widget
     ===================================================== */
  var pipe = $('#pipeline');
  var steps = $$('.step', pipe);
  var resultEl = $('#pipe-result');
  var pipeState = 'idle';
  var pipeRun = 0;

  function renderPipeResult() {
    resultEl.textContent = pipeState === 'done' ? '✓ ' + t('js.pipe.ok') : t('js.pipe.running');
    resultEl.classList.toggle('ok', pipeState === 'done');
  }
  langListeners.push(renderPipeResult);

  function runPipeline() {
    var run = ++pipeRun;
    pipeState = 'running';
    renderPipeResult();
    steps.forEach(function (s) { s.className = 'step'; $('.time', s).textContent = ''; });

    if (reduceMotion.matches) {
      steps.forEach(function (s) {
        s.classList.add('done');
        $('.time', s).textContent = (s.dataset.ms / 1000).toFixed(1) + 's';
      });
      pipeState = 'done'; renderPipeResult();
      return;
    }
    (function next(i) {
      if (run !== pipeRun) return;
      if (i >= steps.length) { pipeState = 'done'; renderPipeResult(); return; }
      var s = steps[i];
      var ms = +s.dataset.ms;
      s.classList.add('running');
      setTimeout(function () {
        if (run !== pipeRun) return;
        s.classList.remove('running');
        s.classList.add('done');
        $('.time', s).textContent = (ms / 1000).toFixed(1) + 's';
        next(i + 1);
      }, ms);
    })(0);
  }
  $('#pipe-rerun').addEventListener('click', runPipeline);

  /* =====================================================
     Count-up numbers
     ===================================================== */
  var counters = $$('[data-count]');
  function formatCount(el, value) {
    var dec = +(el.dataset.decimals || 0);
    var n = new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
      minimumFractionDigits: dec, maximumFractionDigits: dec
    }).format(value);
    return (el.dataset['fmt' + (lang === 'tr' ? 'Tr' : 'En')] || '{n}').replace('{n}', n);
  }
  function countUp(el) {
    var target = +el.dataset.count;
    el.dataset.done = '1';
    if (reduceMotion.matches) { el.textContent = formatCount(el, target); return; }
    var start = performance.now(), dur = 1400;
    (function frame(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = formatCount(el, target * eased);
      if (p < 1) requestAnimationFrame(frame);
    })(start);
  }
  langListeners.push(function () {
    counters.forEach(function (el) { if (el.dataset.done) el.textContent = formatCount(el, +el.dataset.count); });
  });

  /* =====================================================
     Reveal on scroll (+ triggers for pipeline & counters)
     ===================================================== */
  // Stagger siblings that reveal together.
  $$('[data-reveal]').forEach(function (el) {
    var sibs = $$(':scope > [data-reveal]', el.parentElement);
    var i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms');
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add('in');
        if (el === pipe) setTimeout(runPipeline, 500);
        $$('[data-count]', el).forEach(function (c) { if (!c.dataset.done) countUp(c); });
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    $$('[data-reveal]').forEach(function (el) { io.observe(el); });
  } else {
    $$('[data-reveal]').forEach(function (el) { el.classList.add('in'); });
    runPipeline();
    counters.forEach(countUp);
  }

  /* =====================================================
     Pointer effects: ambient spotlight, card spotlight, magnetic buttons
     ===================================================== */
  if (finePointer.matches && !reduceMotion.matches) {
    var spot = $('.spotlight');
    var raf = 0, mx = 0, my = 0;
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(function () {
        spot.style.setProperty('--mx', mx + 'px');
        spot.style.setProperty('--my', my + 'px');
        raf = 0;
      });
    }, { passive: true });

    $$('[data-spot]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--x', (e.clientX - r.left) + 'px');
        el.style.setProperty('--y', (e.clientY - r.top) + 'px');
      });
    });

    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.18;
        var y = (e.clientY - r.top - r.height / 2) * 0.28;
        el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* =====================================================
     Header state, progress bar, active section
     ===================================================== */
  var header = $('.site-header');
  var bar = $('#progress-bar');
  var navLinks = $$('.nav-links a');
  var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); });
  var scrollRaf = 0;

  function onScroll() {
    scrollRaf = 0;
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle('scrolled', y > 12);
    bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    var probe = y + window.innerHeight * 0.4;
    var active = -1;
    sections.forEach(function (s, i) { if (s && s.offsetTop <= probe) active = i; });
    if (y >= max - 4) active = sections.length - 1;
    navLinks.forEach(function (a, i) {
      a.classList.toggle('active', i === active);
      if (i === active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', function () {
    if (!scrollRaf) scrollRaf = requestAnimationFrame(onScroll);
  }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* =====================================================
     Command palette
     ===================================================== */
  var pal = $('#palette');
  var palInput = $('#pal-input');
  var palList = $('#pal-list');
  var openBtn = $('#cmdk-open');
  var items = [];
  var sel = 0;

  $$('.kbd-hint').forEach(function (k) { k.textContent = isMac ? '⌘ K' : 'Ctrl K'; });

  function scrollToId(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }
  function openUrl(url) { window.open(url, '_blank', 'noopener'); }

  function commands() {
    var go = t('js.pal.go');
    return [
      { group: go, icon: 'i-arrow-down', label: t('nav.about'), hint: '01', run: function () { scrollToId('about'); } },
      { group: go, icon: 'i-arrow-down', label: t('nav.projects'), hint: '02', run: function () { scrollToId('projects'); } },
      { group: go, icon: 'i-arrow-down', label: t('nav.skills'), hint: '03', run: function () { scrollToId('skills'); } },
      { group: go, icon: 'i-arrow-down', label: t('nav.experience'), hint: '04', run: function () { scrollToId('experience'); } },
      { group: go, icon: 'i-arrow-down', label: t('nav.contact'), hint: '05', run: function () { scrollToId('contact'); } },
      { group: t('js.pal.actions'), icon: 'i-copy', label: t('js.pal.copy'), hint: EMAIL, run: copyEmail },
      { group: t('js.pal.actions'), icon: 'i-download', label: t('js.pal.cv'), hint: lang.toUpperCase(), run: function () { cvLink.click(); } },
      { group: t('js.pal.actions'), icon: root.getAttribute('data-theme') === 'light' ? 'i-moon' : 'i-sun', label: t('js.pal.theme'), run: toggleTheme },
      { group: t('js.pal.actions'), icon: 'i-search', label: t('js.pal.lang'), hint: lang === 'tr' ? 'EN' : 'TR', run: function () { setLang(lang === 'tr' ? 'en' : 'tr'); } },
      { group: t('js.pal.links'), icon: 'i-github', label: 'GitHub', hint: 'TolgaARSLANN', run: function () { openUrl('https://github.com/TolgaARSLANN'); } },
      { group: t('js.pal.links'), icon: 'i-linkedin', label: 'LinkedIn', hint: 'tolga-arslan-dev', run: function () { openUrl('https://linkedin.com/in/tolga-arslan-dev'); } },
      { group: t('js.pal.links'), icon: 'i-arrow-up-right', label: t('js.pal.demo1'), run: function () { openUrl('https://pawfect-care-inky.vercel.app'); } },
      { group: t('js.pal.links'), icon: 'i-arrow-up-right', label: t('js.pal.demo3'), run: function () { openUrl('https://card-fraud-detection-demo.streamlit.app'); } },
      { group: t('js.pal.links'), icon: 'i-mail', label: t('js.pal.mail'), run: function () { location.href = 'mailto:' + EMAIL; } }
    ];
  }

  function norm(s) { return s.toLocaleLowerCase(lang === 'tr' ? 'tr-TR' : 'en-US'); }

  function renderPalette() {
    var q = norm(palInput.value.trim());
    items = commands().filter(function (c) {
      return !q || norm(c.label + ' ' + (c.hint || '') + ' ' + c.group).indexOf(q) !== -1;
    });
    sel = Math.min(sel, Math.max(items.length - 1, 0));
    palList.innerHTML = '';
    if (!items.length) {
      palList.innerHTML = '<li class="pal-empty" role="presentation">' + t('js.pal.empty') + '</li>';
      palInput.removeAttribute('aria-activedescendant');
      return;
    }
    var lastGroup = null;
    items.forEach(function (c, i) {
      if (c.group !== lastGroup) {
        var g = document.createElement('li');
        g.className = 'pal-group'; g.setAttribute('role', 'presentation');
        g.textContent = c.group;
        palList.appendChild(g);
        lastGroup = c.group;
      }
      var li = document.createElement('li');
      li.className = 'pal-item';
      li.id = 'pal-opt-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === sel));
      li.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#' + c.icon + '"/></svg><span></span>' +
        (c.hint ? '<span class="hint"></span>' : '');
      li.children[1].textContent = c.label;
      if (c.hint) li.children[2].textContent = c.hint;
      li.addEventListener('mousemove', function () { if (sel !== i) { sel = i; mark(); } });
      li.addEventListener('click', function () { runItem(i); });
      palList.appendChild(li);
    });
    mark();
  }

  function mark() {
    $$('.pal-item', palList).forEach(function (li, i) { li.setAttribute('aria-selected', String(i === sel)); });
    var cur = $('#pal-opt-' + sel);
    if (cur) {
      palInput.setAttribute('aria-activedescendant', cur.id);
      cur.scrollIntoView({ block: 'nearest' });
    }
  }

  function runItem(i) {
    var c = items[i];
    if (!c) return;
    closePalette();
    setTimeout(c.run, 60);
  }

  function openPalette() {
    if (pal.open) return;
    palInput.value = '';
    palInput.placeholder = t('js.pal.placeholder');
    sel = 0;
    renderPalette();
    if (typeof pal.showModal === 'function') pal.showModal(); else pal.setAttribute('open', '');
    palInput.focus();
  }
  function closePalette() {
    if (!pal.open) return;
    if (typeof pal.close === 'function') pal.close(); else pal.removeAttribute('open');
  }

  openBtn.addEventListener('click', openPalette);
  pal.addEventListener('close', function () { openBtn.focus({ preventScroll: true }); });
  pal.addEventListener('click', function (e) { if (e.target === pal) closePalette(); });
  palInput.addEventListener('input', function () { sel = 0; renderPalette(); });
  palInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) { sel = (sel + 1) % items.length; mark(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) { sel = (sel - 1 + items.length) % items.length; mark(); } }
    else if (e.key === 'Enter') { e.preventDefault(); runItem(sel); }
  });

  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    var typing = /input|textarea|select/i.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && k === 'k') {
      e.preventDefault();
      if (pal.open) closePalette(); else openPalette();
    } else if (k === '/' && !typing && !pal.open) {
      e.preventDefault();
      openPalette();
    }
  });

  /* =====================================================
     Boot
     ===================================================== */
  setLang(initialLang());
  $('meta[name="theme-color"]').content = root.getAttribute('data-theme') === 'light' ? '#f2f1ec' : '#08090b';
  $('#year').textContent = new Date().getFullYear();
  onScroll();

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 800); })]).then(function () {
    setTimeout(function () { root.classList.add('loaded'); }, 30);
  });
})();
