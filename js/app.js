/*
  Kova Wallet prototype: optional JavaScript
  FINT109 Mobile Web App Development, Aleck Joaquin T. Abacan

  Every page works without this file. When it loads, it adds:
  - friendlier form validation with an error summary
  - live fee estimates on the Send money and Add money forms
  - a transfer that carries from Send to Review to Activity
  - top-ups with payment steps for QR, bank transfer, card and cash
  - balance hiding, greetings and activity filters
  - a light and dark mode switch (the only thing kept after the tab closes)

  Nothing leaves the browser. Transfers and top-ups are kept in
  sessionStorage, so they disappear when the tab is closed or the
  user signs out.
*/
(function () {
  'use strict';

  // ---------- Settings (fictional figures) ----------
  const RATES = { USD: 1, PHP: 57, AED: 3.67, INR: 83.1, EUR: 0.92, THB: 35.8 };
  const SEND_FEE = 0.5;          // flat transfer fee in USDC
  const CONVERSION = 0.005;      // 0.5% conversion fee
  const START_BALANCE = 1250;    // demo balance in USDC
  const DEMO = { login: 'maria@kova.example', password: 'kova2026' };

  const DELIVERY = {
    ewallet: { label: 'E-wallet', time: 'within 5 minutes' },
    kova: { label: 'Kova wallet', time: 'instantly' },
    bank: { label: 'Bank account', time: 'within 1 business day' }
  };

  const SAVED_RECIPIENTS = {
    rosa: { name: 'Mama Rosa Santos', mobile: '+63 917 555 0142', currency: 'PHP', delivery: 'ewallet' },
    arjun: { name: 'Arjun Mehta', mobile: '+91 98765 43210', currency: 'INR', delivery: 'bank' }
  };

  // Ways to add money: fee, limit per top-up (USDC) and wording
  const TOPUP_METHODS = {
    qr: { title: 'QR top-up', label: 'Bank app QR', phrase: 'bank app QR', feeLabel: 'QR fee', limit: 5000, arrives: 'Instantly' },
    bank: { title: 'Bank top-up', label: 'Bank transfer', phrase: 'bank transfer', feeLabel: 'Bank transfer fee', limit: 10000, arrives: 'Within 1 business day' },
    card: { title: 'Card top-up', label: 'Card', phrase: 'card', feeLabel: 'Card fee (1.5%)', limit: 2000, arrives: 'Instantly' },
    cash: { title: 'Cash top-up', label: 'Partner store', phrase: 'cash', feeLabel: 'Cash fee', limit: 1000, arrives: 'As soon as you pay' }
  };
  // How a top-up is named mid-sentence: "your QR top-up", "your bank top-up"
  const topupName = (m) => (m === 'qr' ? 'QR top-up' : TOPUP_METHODS[m].title.toLowerCase());
  const TOPUP_MIN = 10;            // USDC
  const SOURCE_OF_FUNDS_FROM = 1000; // USDC; larger top-ups need a source of funds
  const QUICK_AMOUNTS = {
    AED: [100, 250, 500, 1000],
    USD: [25, 50, 100, 250],
    PHP: [1000, 2500, 5000, 10000],
    EUR: [25, 50, 100, 250],
    INR: [2000, 5000, 10000, 20000]
  };
  const CARDS = { 'visa-4821': 'Visa debit ending 4821', 'mc-1055': 'Mastercard credit ending 1055' };

  const svg = (paths) => '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + paths + '</svg>';
  const ICONS = {
    send: svg('<path d="M21 3 10.5 13.5"/><path d="M21 3l-6.5 18-4-7.5L3 9.5 21 3z"/>'),
    calendar: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    qr: svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2M20 14v6h-6"/>'),
    bank: svg('<path d="M3 10 12 4l9 6"/><path d="M5.5 10v7.5M10 10v7.5M14 10v7.5M18.5 10v7.5M3 20h18"/>'),
    card: svg('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 14.5h3"/>'),
    cash: svg('<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5h16a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 9.5z"/><path d="M5.5 12v8h13v-8M10 20v-4.5h4V20"/>'),
    x: svg('<path d="M6 6l12 12M18 6 6 18"/>')
  };

  const SOURCE_LABELS = { salary: 'Salary or wages', savings: 'Savings', business: 'Business or freelance income', family: 'Money from family', other: 'Something else' };

  // Receipts for the sample rows already in the Activity table (fictional).
  // Amounts are worked out from these with the same fee rules as a real transfer or top-up.
  const ROSA = { name: 'Mama Rosa Santos', mobile: '+63 917 555 0142', delivery: 'ewallet', amount: 200, currency: 'PHP' };
  const SAMPLES = {
    'KV-20261023-3307': Object.assign({ kind: 'sent', date: '2026-10-23', status: 'Scheduled' }, ROSA),
    'KV-20261008-5530': Object.assign({ kind: 'sent', date: '2026-10-08', status: 'Done' }, ROSA),
    'KVP-20261008-2214': { kind: 'payment', title: 'Corner Market, Dubai', how: 'QR payment', currency: 'AED', local: 67.57, date: '2026-10-08', status: 'Done' },
    'KVT-261007-318': { kind: 'topup', title: 'Card top-up', method: 'card', card: 'visa-4821', currency: 'USD', pay: 507.61, date: '2026-10-07', status: 'Done' },
    'KVP-20261007-0961': { kind: 'payment', title: 'Metro card reload, Dubai', how: 'Kova card, online', currency: 'AED', local: 50, date: '2026-10-07', status: 'Done' },
    'KVR-20261006-7745': { kind: 'received', title: 'Received from Arjun', from: 'Arjun Mehta', amount: 75, date: '2026-10-06', status: 'Done' },
    'KV-20261002-1408': Object.assign({ kind: 'sent', date: '2026-10-02', status: 'Done' }, ROSA),
    'KVT-260930-552': { kind: 'topup', title: 'Salary top-up', method: 'bank', currency: 'USD', pay: 1000, source: 'salary', date: '2026-09-30', status: 'Done' },
    'KV-20260924-8862': Object.assign({ kind: 'sent', date: '2026-09-24', status: 'Done' }, ROSA),
    'KVP-20260918-4410': { kind: 'payment', title: 'Night market, Bangkok', how: 'QR payment', currency: 'THB', local: 420, date: '2026-09-18', status: 'Done' }
  };

  // ---------- Small helpers ----------
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  // sessionStorage can be blocked (private mode, strict settings), so every call is wrapped.
  const store = {
    get(key, fallback) {
      try {
        const value = sessionStorage.getItem('kova.' + key);
        return value === null ? fallback : JSON.parse(value);
      } catch (error) {
        return fallback;
      }
    },
    set(key, value) {
      try { sessionStorage.setItem('kova.' + key, JSON.stringify(value)); } catch (error) { /* ignore */ }
    },
    remove(key) {
      try { sessionStorage.removeItem('kova.' + key); } catch (error) { /* ignore */ }
    },
    clearAll() {
      try {
        Object.keys(sessionStorage)
          .filter((key) => key.indexOf('kova.') === 0)
          .forEach((key) => sessionStorage.removeItem(key));
      } catch (error) { /* ignore */ }
    }
  };

  const money = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const whole = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseIso = (s) => { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  const longDate = (s) => parseIso(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const shortDate = (s) => parseIso(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const monthLabel = (s) => parseIso(s + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  // Smooth scrolling, unless the person asked their device for less motion
  const scrollBehavior = () => (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  const randomDigits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
  // "Mama Rosa Santos" becomes "Mama Rosa"; "Arjun Mehta" becomes "Arjun"
  const firstName = (name) => {
    const parts = name.split(' ');
    return /^(Mama|Papa|Tita|Tito|Lola|Lolo|Ate|Kuya)$/i.test(parts[0]) && parts[1] ? parts[0] + ' ' + parts[1] : parts[0];
  };

  function todayIso() {
    return isoDate(new Date());
  }

  function addDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return isoDate(d);
  }

  function rateText(currency) {
    return '1 USDC = ' + money(RATES[currency]) + ' ' + currency;
  }

  // Works out the fees and what the recipient gets.
  // Each fee is rounded to the cent first and the total comes from those rounded fees,
  // so the fee lines on screen always add up to what they receive.
  function quote(amount, currency) {
    const afterFee = Math.max(round2(amount - SEND_FEE), 0);
    const conversion = round2(afterFee * CONVERSION);
    return {
      conversion: conversion,
      fees: round2(SEND_FEE + conversion),
      rate: RATES[currency],
      receive: round2((afterFee - conversion) * RATES[currency])
    };
  }

  // Works out what a top-up adds to the balance, with the same rounding rule
  function topupQuote(pay, currency, method) {
    const value = round2(pay / RATES[currency]);
    const conversion = currency === 'USD' ? 0 : round2(value * CONVERSION);
    const methodFee = method === 'card' ? round2(value * 0.015) : method === 'cash' ? 1 : 0;
    return {
      value: value,
      conversion: conversion,
      methodFee: methodFee,
      get: Math.max(round2(value - conversion - methodFee), 0)
    };
  }

  // A card or QR payment in another currency: the local price plus a 0.5% conversion fee
  function paymentQuote(local, currency) {
    const base = round2(local / RATES[currency]);
    const conversion = round2(base * CONVERSION);
    return { base: base, conversion: conversion, total: round2(base + conversion) };
  }

  const sentTransfers = () => store.get('sent', []);
  const topups = () => store.get('topups', []);
  const cancelledSamples = () => store.get('cancelled', []);
  const isCancelled = (t) => t.status === 'Cancelled';

  function currentBalance() {
    const spent = sentTransfers().filter((t) => !isCancelled(t)).reduce((sum, t) => sum + t.amount, 0);
    const added = topups().filter((t) => t.status === 'Done').reduce((sum, t) => sum + t.get, 0);
    // The sample scheduled transfer is already taken out of the starting balance; cancelling it gives it back
    const refunded = cancelledSamples().reduce((sum, ref) => sum + (SAMPLES[ref] && SAMPLES[ref].kind === 'sent' ? SAMPLES[ref].amount : 0), 0);
    return round2(START_BALANCE - spent + added + refunded);
  }

  // Change the status of a transfer or top-up made in this session
  function setStatus(listKey, reference, status) {
    const list = store.get(listKey, []).map((t) => (t.reference === reference ? Object.assign(t, { status: status }) : t));
    store.set(listKey, list);
  }

  // Copy buttons: data-copy names the element whose text is copied
  function wireCopyButton(button) {
    button.addEventListener('click', () => {
      const text = document.getElementById(button.dataset.copy).textContent.trim();
      const label = button.querySelector('span');
      const confirmCopied = () => {
        label.textContent = 'Copied';
        button.classList.add('is-copied');
        announce('Copied ' + text);
        setTimeout(() => { label.textContent = 'Copy'; button.classList.remove('is-copied'); }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(confirmCopied, () => announce('Copy failed. Select the text instead.'));
      } else {
        announce('Copy is not available here. Select the text instead.');
      }
    });
  }

  // Everything done in this session, oldest first
  function sessionActivity() {
    return sentTransfers().map((t) => Object.assign({ kind: 'sent' }, t))
      .concat(topups().map((t) => Object.assign({ kind: 'topup' }, t)))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }

  // One polite live region per page for short announcements
  let liveRegion;
  function announce(message) {
    if (!liveRegion) {
      liveRegion = document.createElement('p');
      liveRegion.className = 'visually-hidden';
      liveRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = '';
    setTimeout(() => { liveRegion.textContent = message; }, 50);
  }

  // ---------- Form errors (shared by every form) ----------
  // Each check returns an error message, or an empty string when the field is fine.
  function createValidator(form, checks) {
    const summary = $('#error-summary');
    const list = $('#error-list');

    function showFieldError(check, message) {
      const wrapper = document.getElementById(check.field);
      const error = document.getElementById(check.error);
      const inputs = check.inputs();
      if (message) {
        error.textContent = message;
        error.hidden = false;
        wrapper.classList.add('has-error');
        inputs.forEach((input) => input.setAttribute('aria-invalid', 'true'));
      } else {
        error.textContent = '';
        error.hidden = true;
        wrapper.classList.remove('has-error');
        inputs.forEach((input) => input.removeAttribute('aria-invalid'));
      }
    }

    function renderSummary(errors, moveFocus) {
      list.textContent = '';
      errors.forEach((item) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#' + item.check.field;
        link.textContent = item.message;
        link.addEventListener('click', (event) => {
          event.preventDefault();
          const target = item.check.inputs()[0];
          target.focus();
          target.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
        });
        li.appendChild(link);
        list.appendChild(li);
      });
      summary.hidden = errors.length === 0;
      if (errors.length && moveFocus) {
        summary.focus();
        summary.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
      }
    }

    function validateAll() {
      const errors = [];
      checks.forEach((check) => {
        const message = check.test();
        showFieldError(check, message);
        if (message) errors.push({ check: check, message: message });
      });
      renderSummary(errors, true);
      return errors.length === 0;
    }

    function refresh(check) {
      const wrapper = document.getElementById(check.field);
      if (!wrapper.classList.contains('has-error')) return;
      showFieldError(check, check.test());
      if (!summary.hidden) {
        const remaining = checks
          .filter((c) => document.getElementById(c.field).classList.contains('has-error'))
          .map((c) => ({ check: c, message: document.getElementById(c.error).textContent }));
        renderSummary(remaining, false);
      }
    }

    // After a field shows an error, re-check it as the user fixes it
    checks.forEach((check) => {
      check.inputs().forEach((input) => {
        ['input', 'change'].forEach((type) => input.addEventListener(type, () => refresh(check)));
      });
    });

    function reset() {
      checks.forEach((check) => showFieldError(check, ''));
      renderSummary([], false);
    }

    function showGeneral(check, message) {
      renderSummary([{ check: check, message: message }], true);
    }

    form.noValidate = true; // our messages replace the browser's pop-ups
    return { validateAll: validateAll, reset: reset, showGeneral: showGeneral, refreshAll: () => checks.forEach(refresh) };
  }

  // ---------- Light and dark mode ----------
  // js/theme.js already picked the theme before the page drew; this wires up the switch.
  function initTheme() {
    const root = document.documentElement;
    const toggles = $$('[data-theme-toggle]');
    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const saved = () => { try { return localStorage.getItem('kova.theme'); } catch (error) { return null; } };
    const sync = () => toggles.forEach((button) => button.setAttribute('aria-pressed', String(root.dataset.theme === 'dark')));

    if (!root.dataset.theme) root.dataset.theme = media && media.matches ? 'dark' : 'light';
    sync();

    toggles.forEach((button) => {
      button.addEventListener('click', () => {
        root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem('kova.theme', root.dataset.theme); } catch (error) { /* ignore */ }
        sync();
      });
    });

    // Until the person picks a theme, follow the device when it changes (for example at sunset)
    if (media && media.addEventListener) {
      media.addEventListener('change', (event) => {
        if (saved()) return;
        root.dataset.theme = event.matches ? 'dark' : 'light';
        sync();
      });
    }
  }

  // ---------- Every page ----------
  function initCommon() {
    document.documentElement.classList.add('js');
    $$('[data-js-only]').forEach((el) => { el.hidden = false; });
    initTheme();

    $$('[data-sign-out]').forEach((link) => {
      link.addEventListener('click', () => {
        store.clearAll();
        try { localStorage.removeItem('kova.remember'); } catch (error) { /* ignore */ }
      });
    });

    $$('.copy-button').forEach(wireCopyButton);
  }

  // ---------- Sign in ----------
  function initSignIn() {
    const form = $('#sign-in-form');
    const login = $('#login');
    const password = $('#password');
    const toggle = $('#toggle-password');

    const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    const isMobile = (v) => /^\+?\d{10,15}$/.test(v.replace(/[\s-]/g, ''));

    const loginCheck = {
      field: 'field-login',
      error: 'login-error',
      inputs: () => [login],
      test() {
        const v = login.value.trim();
        if (!v) return 'Enter your email or mobile number.';
        if (!isEmail(v) && !isMobile(v)) return 'Enter an email like name@example.com, or a mobile number with the country code.';
        return '';
      }
    };

    const passwordCheck = {
      field: 'field-password',
      error: 'password-error',
      inputs: () => [password],
      test() {
        if (!password.value) return 'Enter your password.';
        if (password.value.length < 8) return 'Your password has at least 8 characters. Check it and try again.';
        return '';
      }
    };

    const validator = createValidator(form, [loginCheck, passwordCheck]);

    // Sent here from a signed-in page: say why, and go back there afterwards.
    // Only Kova's own pages are allowed, so the link can't send anyone elsewhere.
    const next = new URLSearchParams(window.location.search).get('next') || '';
    const safeNext = /^(dashboard|top-up|send|confirm|activity)\.html(\?[\w=&%.-]*)?$/.test(next) ? next : '';
    if (safeNext) $('#sign-in-needed').hidden = false;

    $('#fill-demo').addEventListener('click', () => {
      login.value = DEMO.login;
      password.value = DEMO.password;
      validator.reset();
      form.querySelector('[type="submit"]').focus();
    });

    toggle.addEventListener('click', () => {
      const show = password.type === 'password';
      password.type = show ? 'text' : 'password';
      toggle.firstChild.textContent = show ? 'Hide' : 'Show';
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!validator.validateAll()) return;

      const matches = login.value.trim().toLowerCase() === DEMO.login && password.value === DEMO.password;
      if (!matches) {
        validator.showGeneral(loginCheck, "We couldn't find an account with those details. Check them, or use the demo account above.");
        return;
      }
      store.set('signedIn', true);
      // "Keep me signed in" survives closing the browser; Sign out clears it
      try {
        if ($('#remember').checked) localStorage.setItem('kova.remember', 'true');
        else localStorage.removeItem('kova.remember');
      } catch (error) { /* storage blocked: stay signed in for this visit only */ }
      window.location.href = safeNext || 'dashboard.html';
    });
  }

  // ---------- Dashboard ----------
  function initDashboard() {
    const hour = new Date().getHours();
    $('#greeting').textContent = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    // Balance after any transfers and top-ups made in this session
    const balance = currentBalance();
    $('#balance-usdc').textContent = money(balance);
    $('#balance-php').textContent = 'PHP ' + money(balance * RATES.PHP);

    // Hide or show the balance (remembered for this session)
    const card = $('#balance-card');
    const toggle = $('#balance-toggle');
    const hiddenNote = document.createElement('p');
    hiddenNote.className = 'visually-hidden';
    hiddenNote.textContent = 'Balance hidden';
    card.appendChild(hiddenNote);

    function setHidden(hide) {
      card.classList.toggle('is-hidden', hide);
      $$('.balance-value', card).forEach((el) => {
        if (hide) el.setAttribute('aria-hidden', 'true'); else el.removeAttribute('aria-hidden');
      });
      hiddenNote.hidden = !hide;
      toggle.querySelector('span').textContent = hide ? 'Show' : 'Hide';
      store.set('hideBalance', hide);
    }
    setHidden(store.get('hideBalance', false));
    toggle.addEventListener('click', () => setHidden(!card.classList.contains('is-hidden')));

    // New items go to the top of Recent activity and Coming up
    const today = todayIso();
    const recent = $('#recent-list');
    const upcomingEmpty = $('#upcoming-empty');
    const comingUp = upcomingEmpty ? upcomingEmpty.parentNode : null;

    // The sample scheduled transfer disappears once it's cancelled
    $$('.scheduled[data-ref]').forEach((item) => {
      if (cancelledSamples().indexOf(item.dataset.ref) !== -1) item.remove();
    });

    // Each item is a link: a scheduled transfer opens its receipt, a top-up its payment details
    function addComingUp(iconHtml, title, detail, href) {
      if (!comingUp) return;
      const item = document.createElement('a');
      item.className = 'scheduled';
      item.href = href;
      item.innerHTML = iconHtml + '<p><b></b><br></p>';
      $('b', item).textContent = title;
      $('p', item).appendChild(document.createTextNode(detail));
      comingUp.insertBefore(item, $('.scheduled', comingUp) || upcomingEmpty);
    }

    // Oldest first, each placed on top, so the newest ends up first
    sessionActivity().forEach((t) => {
      const li = document.createElement('li');
      li.className = 'tx';
      li.innerHTML = '<span class="tx-icon"></span><span class="tx-what"><b></b><small></small></span><span class="tx-amount"><span></span><small></small></span>';
      const cancelled = isCancelled(t);

      if (t.kind === 'sent') {
        const scheduled = t.date > today;
        $('.tx-icon', li).innerHTML = ICONS.send;
        $('b', li).textContent = 'Sent to ' + firstName(t.name);
        $('.tx-what small', li).textContent = (cancelled ? 'Cancelled · ' : scheduled ? 'Scheduled for ' : '') + shortDate(t.date) + ' · ' + DELIVERY[t.delivery].label;
        $('.tx-amount span', li).textContent = '−' + money(t.amount);
        $('.tx-amount small', li).textContent = cancelled ? 'Cancelled' : t.currency + ' ' + money(t.receive);
        if (scheduled && !cancelled) {
          addComingUp(ICONS.calendar, firstName(t.name) + ', ' + money(t.amount) + ' USDC',
            'Scheduled for ' + shortDate(t.date) + ', to their ' + DELIVERY[t.delivery].label.toLowerCase(),
            'activity.html?ref=' + encodeURIComponent(t.reference));
        }
      } else {
        const pending = t.status === 'Pending';
        $('.tx-icon', li).innerHTML = ICONS[t.method];
        $('b', li).textContent = TOPUP_METHODS[t.method].title;
        $('.tx-what small', li).textContent = shortDate(t.date) + ' · ' + (cancelled ? 'Cancelled' : pending ? 'Waiting for payment' : TOPUP_METHODS[t.method].label);
        $('.tx-amount span', li).textContent = '+' + money(t.get);
        $('.tx-amount small', li).textContent = cancelled ? 'Cancelled' : pending ? 'Pending' : 'USDC';
        if (t.status === 'Done') $('.tx-amount', li).classList.add('amount-in');
        if (pending) {
          addComingUp(ICONS.clock, TOPUP_METHODS[t.method].title + ', ' + money(t.get) + ' USDC',
            'Waiting for your ' + t.currency + ' ' + money(t.pay) + ' payment',
            'top-up.html?ref=' + encodeURIComponent(t.reference));
        }
      }
      if (cancelled) li.classList.add('is-cancelled');
      $('b', li).insertAdjacentHTML('beforeend', '<span class="badge-new">New</span>');
      recent.insertBefore(li, recent.firstChild);
    });

    if (upcomingEmpty) upcomingEmpty.hidden = !!$('.scheduled', comingUp);

    // Keep the list short on the dashboard
    $$('.tx', recent).slice(4).forEach((li) => li.remove());
  }

  // ---------- Send money ----------
  function initSend() {
    const form = $('#send-form');
    const name = $('#recipient-name');
    const mobile = $('#recipient-mobile');
    const email = $('#recipient-email');
    const amount = $('#amount');
    const currency = $('#currency');
    const date = $('#send-date');
    const confirmBox = $('#confirm-details');
    const radios = $$('input[name="delivery"]');
    const chips = $$('#quick-pick .chip');

    const balance = currentBalance();
    const today = todayIso();
    const lastDay = addDays(30);

    $('#available-balance').textContent = money(balance);
    amount.max = balance;
    date.min = today;
    date.max = lastDay;
    if (!date.value) date.value = today;

    let liveTimer;

    function updateQuote() {
      const n = parseFloat(amount.value);
      const cur = currency.value;
      $('#fee-rate').textContent = rateText(cur);

      if (isNaN(n) || n < 1) {
        $('#fee-send').textContent = '0.00 USDC';
        $('#fee-conversion').textContent = '0.00 USDC';
        $('#fee-receive').textContent = '—';
        $('#receive-inline').textContent = '—';
        $('#fee-note').textContent = 'Enter an amount of at least 1 USDC to see what they receive.';
        return;
      }
      const q = quote(n, cur);
      $('#fee-send').textContent = money(n) + ' USDC';
      $('#fee-conversion').textContent = money(q.conversion) + ' USDC';
      $('#fee-receive').textContent = cur + ' ' + money(q.receive);
      $('#receive-inline').textContent = cur + ' ' + money(q.receive);
      $('#fee-note').textContent = 'Figures update as you type. All rates are fictional.';

      // Announce the result once typing stops, not on every key press
      clearTimeout(liveTimer);
      liveTimer = setTimeout(() => {
        announce('They receive ' + cur + ' ' + money(q.receive) + ' after ' + money(q.fees) + ' USDC in fees.');
      }, 700);
    }

    function fillRecipient(key) {
      chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.recipient === key)));
      if (key === 'new') {
        name.value = '';
        mobile.value = '';
        email.value = '';
        name.focus();
        return;
      }
      const r = SAVED_RECIPIENTS[key];
      if (!r) return;
      name.value = r.name;
      mobile.value = r.mobile;
      email.value = '';
      currency.value = r.currency;
      radios.forEach((radio) => { radio.checked = radio.value === r.delivery; });
      [name, mobile, email, currency].forEach((el) => el.dispatchEvent(new Event('change')));
      updateQuote();
    }

    chips.forEach((chip) => {
      chip.addEventListener('click', () => fillRecipient(chip.dataset.recipient));
    });

    // Typing a different name or number releases the saved-recipient chip
    [name, mobile].forEach((input) => {
      input.addEventListener('input', () => {
        chips.forEach((chip) => {
          const r = SAVED_RECIPIENTS[chip.dataset.recipient];
          if (chip.getAttribute('aria-pressed') === 'true' && r && (name.value !== r.name || mobile.value !== r.mobile)) {
            chip.setAttribute('aria-pressed', 'false');
          }
        });
      });
    });

    amount.addEventListener('input', updateQuote);
    currency.addEventListener('change', updateQuote);

    // Validation rules, in the same order as the form
    const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

    const checks = [
      {
        field: 'field-name', error: 'recipient-name-error', inputs: () => [name],
        test() {
          const v = name.value.trim();
          if (!v) return "Enter the recipient's full name.";
          if (v.length < 2) return "Enter the recipient's full name, at least 2 letters.";
          if (/\d/.test(v)) return 'Names can only include letters, spaces, hyphens and apostrophes.';
          return '';
        }
      },
      {
        field: 'field-mobile', error: 'recipient-mobile-error', inputs: () => [mobile],
        test() {
          const v = mobile.value.trim();
          const compact = v.replace(/[\s-]/g, '');
          if (!v) return "Enter the recipient's mobile number.";
          if (compact.charAt(0) !== '+') return 'Start with + and the country code, like +63 917 555 0142.';
          if (!/^\+\d{10,15}$/.test(compact)) return 'Enter a mobile number with the country code, like +63 917 555 0142.';
          return '';
        }
      },
      {
        field: 'field-email', error: 'recipient-email-error', inputs: () => [email],
        test() {
          const v = email.value.trim();
          if (v && !isEmail(v)) return 'Enter an email address like name@example.com, or leave it blank.';
          return '';
        }
      },
      {
        field: 'field-amount', error: 'amount-error', inputs: () => [amount],
        test() {
          if (amount.validity.badInput) return 'Enter the amount as a number, like 200 or 200.50.';
          const raw = amount.value.trim();
          if (!raw) return 'Enter an amount to send.';
          const n = parseFloat(raw);
          if (n < 1) return 'The smallest amount you can send is 1 USDC.';
          if (n > balance) return 'You can send up to your balance of ' + money(balance) + ' USDC. Add money first if you need more.';
          if (/\.\d{3,}$/.test(raw)) return 'Use up to two decimal places.';
          return '';
        }
      },
      {
        field: 'field-date', error: 'send-date-error', inputs: () => [date],
        test() {
          const v = date.value;
          if (!v) return 'Choose a send date.';
          if (v < today) return 'Choose today or a later date.';
          if (v > lastDay) return 'Choose a date within the next 30 days.';
          return '';
        }
      },
      {
        field: 'field-delivery', error: 'delivery-error', inputs: () => radios,
        test() {
          return radios.some((r) => r.checked) ? '' : 'Choose how they will receive the money.';
        }
      },
      {
        field: 'field-confirm', error: 'confirm-details-error', inputs: () => [confirmBox],
        test() {
          return confirmBox.checked ? '' : "Tick the box to confirm the recipient's details.";
        }
      }
    ];

    const validator = createValidator(form, checks);

    // Coming back from Review with "Edit details" refills the form
    const saved = store.get('transfer', null);
    const preset = new URLSearchParams(window.location.search).get('to');
    if (saved) {
      name.value = saved.name;
      mobile.value = saved.mobile;
      email.value = saved.email || '';
      amount.value = saved.amount;
      currency.value = saved.currency;
      date.value = saved.date < today ? today : saved.date;
      radios.forEach((radio) => { radio.checked = radio.value === saved.delivery; });
      confirmBox.checked = true;
      chips.forEach((chip) => {
        const r = SAVED_RECIPIENTS[chip.dataset.recipient];
        chip.setAttribute('aria-pressed', String(!!r && r.name === saved.name && r.mobile === saved.mobile));
      });
    } else if (preset && SAVED_RECIPIENTS[preset]) {
      fillRecipient(preset);
    }
    updateQuote();

    form.addEventListener('reset', () => {
      // Let the browser clear the fields first, then tidy up
      setTimeout(() => {
        date.value = today;
        chips.forEach((chip) => chip.setAttribute('aria-pressed', 'false'));
        validator.reset();
        store.remove('transfer');
        updateQuote();
        name.focus();
      }, 0);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!validator.validateAll()) return;

      const n = round2(parseFloat(amount.value));
      const cur = currency.value;
      const q = quote(n, cur);
      store.set('transfer', {
        name: name.value.trim().replace(/\s+/g, ' '),
        mobile: mobile.value.trim().replace(/\s+/g, ' '),
        email: email.value.trim(),
        amount: n,
        currency: cur,
        rate: q.rate,
        fees: round2(q.fees),
        receive: round2(q.receive),
        date: date.value,
        delivery: radios.find((r) => r.checked).value
      });
      window.location.href = 'confirm.html';
    });
  }

  // ---------- Add money ----------
  function initTopUp() {
    const form = $('#topup-form');
    const radios = $$('input[name="method"]');
    const amount = $('#topup-amount');
    const currency = $('#pay-currency');
    const cardField = $('#field-card');
    const cardChoice = $('#card-choice');
    const sourceField = $('#field-source');
    const source = $('#source-funds');
    const ownMoney = $('#own-money');
    const chipBox = $('#amount-chips');
    const done = $('#topup-done');
    const balance = currentBalance();
    let liveTimer;
    let current = null; // the top-up shown in the result panel

    const method = () => (radios.find((r) => r.checked) || {}).value;
    const payAmount = () => parseFloat(amount.value);

    function renderChips() {
      const cur = currency.value;
      chipBox.textContent = '';
      QUICK_AMOUNTS[cur].forEach((value) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip chip-plain';
        chip.dataset.amount = value;
        chip.textContent = cur + ' ' + whole(value);
        chip.setAttribute('aria-pressed', String(payAmount() === value));
        chip.addEventListener('click', () => {
          amount.value = value;
          amount.dispatchEvent(new Event('input'));
        });
        chipBox.appendChild(chip);
      });
    }

    function update() {
      const m = method() || 'qr';
      const cur = currency.value;
      const n = payAmount();
      const info = TOPUP_METHODS[m];

      $('#pay-addon').textContent = cur;
      $('#topup-limit').textContent = whole(info.limit);
      $('#tu-rate').textContent = cur === 'USD' ? '1 USDC = 1.00 USD' : rateText(cur);
      $('#tu-method-label').textContent = info.feeLabel;
      $('#tu-arrives').textContent = info.arrives;
      cardField.hidden = m !== 'card';
      $$('.chip', chipBox).forEach((chip) => chip.setAttribute('aria-pressed', String(+chip.dataset.amount === n)));

      if (isNaN(n) || n <= 0) {
        ['#tu-pay', '#tu-get', '#topup-inline', '#tu-balance'].forEach((id) => { $(id).textContent = '—'; });
        $('#tu-conversion').textContent = '0.00 USDC';
        $('#tu-method-fee').textContent = '—';
        $('#tu-note').textContent = 'Enter an amount to see what you get.';
        sourceField.hidden = true;
        return;
      }

      const q = topupQuote(n, cur, m);
      $('#tu-pay').textContent = cur + ' ' + money(n);
      $('#tu-conversion').textContent = cur === 'USD' ? 'None' : money(q.conversion) + ' USDC';
      $('#tu-method-fee').textContent = q.methodFee ? money(q.methodFee) + ' USDC' : 'Free';
      $('#tu-get').textContent = money(q.get) + ' USDC';
      $('#topup-inline').textContent = money(q.get) + ' USDC';
      $('#tu-balance').textContent = money(balance + q.get) + ' USDC';
      $('#tu-note').textContent = 'Figures update as you type. All rates are fictional.';
      sourceField.hidden = q.value < SOURCE_OF_FUNDS_FROM;

      clearTimeout(liveTimer);
      liveTimer = setTimeout(() => {
        announce('You get ' + money(q.get) + ' USDC. ' + (q.methodFee || q.conversion ? 'Fees ' + money(q.methodFee + q.conversion) + ' USDC.' : 'No fees.'));
      }, 700);
    }

    // Validation rules, in the same order as the form
    const checks = [
      {
        field: 'field-method', error: 'method-error', inputs: () => radios,
        test() {
          return method() ? '' : 'Choose how you want to add money.';
        }
      },
      {
        field: 'field-card', error: 'card-choice-error', inputs: () => [cardChoice],
        test() {
          return method() === 'card' && !cardChoice.value ? 'Choose which card to use.' : '';
        }
      },
      {
        field: 'field-topup-amount', error: 'topup-amount-error', inputs: () => [amount],
        test() {
          if (amount.validity.badInput) return 'Enter the amount as a number, like 500 or 500.50.';
          const raw = amount.value.trim();
          if (!raw) return 'Enter how much you want to add.';
          const cur = currency.value;
          const value = parseFloat(raw) / RATES[cur];
          const info = TOPUP_METHODS[method() || 'qr'];
          if (value < TOPUP_MIN) return 'The smallest top-up is ' + TOPUP_MIN + ' USDC (about ' + cur + ' ' + money(TOPUP_MIN * RATES[cur]) + ').';
          if (value > info.limit) {
            return 'The most you can add by ' + info.phrase + ' in one go is ' + whole(info.limit) + ' USDC (about ' + cur + ' ' + money(info.limit * RATES[cur]) + ').' +
              (info.limit < 10000 ? ' Try a bank transfer for more.' : '');
          }
          if (/\.\d{3,}$/.test(raw)) return 'Use up to two decimal places.';
          return '';
        }
      },
      {
        field: 'field-source', error: 'source-funds-error', inputs: () => [source],
        test() {
          return !sourceField.hidden && !source.value ? 'Tell us where this money is from. We ask for top-ups of 1,000 USDC or more.' : '';
        }
      },
      {
        field: 'field-own', error: 'own-money-error', inputs: () => [ownMoney],
        test() {
          return ownMoney.checked ? '' : 'Tick the box to confirm the money is yours.';
        }
      }
    ];

    const validator = createValidator(form, checks);

    radios.forEach((radio) => radio.addEventListener('change', () => { update(); validator.refreshAll(); }));
    amount.addEventListener('input', () => { update(); validator.refreshAll(); });
    currency.addEventListener('change', () => { renderChips(); update(); validator.refreshAll(); });

    // Open with a method picked from a link, like top-up.html?method=bank
    const preset = new URLSearchParams(window.location.search).get('method');
    if (TOPUP_METHODS[preset]) radios.forEach((radio) => { radio.checked = radio.value === preset; });

    renderChips();
    update();

    form.addEventListener('reset', () => {
      setTimeout(() => {
        validator.reset();
        renderChips();
        update();
      }, 0);
    });

    // ----- Result panel -----
    function setPanel(iconName, state, title, message) {
      const icon = $('#topup-done-icon');
      icon.innerHTML = ICONS[iconName];
      icon.classList.toggle('is-pending', state === 'pending');
      icon.classList.toggle('is-cancelled', state === 'cancelled');
      $('#topup-done-title').textContent = title;
      $('#topup-done-message').textContent = message;
      document.title = title + ' | Kova Wallet';
    }

    // Once a top-up is paid or cancelled, the payment steps and buttons go away
    function closePayment() {
      $$('.pay-box', done).forEach((box) => { box.hidden = true; });
      $('#simulate-paid').hidden = true;
      $('#cancel-topup').hidden = true;
      $('#cancel-topup-confirm').hidden = true;
      $('#topup-reference-block').hidden = false;
    }

    function showPaid(t) {
      setPanel('check', 'done', 'Money added',
        money(t.get) + ' USDC is now in your balance' + (t.method === 'card' ? '. We charged ' + t.currency + ' ' + money(t.pay) + ' to your ' + CARDS[t.card] + '.' : '.'));
      closePayment();
    }

    function showCancelled(t) {
      setPanel('x', 'cancelled', 'Top-up cancelled',
        'This ' + topupName(t.method) + ' of ' + t.currency + ' ' + money(t.pay) + ' is cancelled. Don\'t pay it. Nothing was added to your balance.');
      closePayment();
      announce('Top-up cancelled.');
    }

    function showResult(t) {
      current = t;
      const payText = t.currency + ' ' + money(t.pay);
      $$('.pay-box', done).forEach((box) => { box.hidden = box.id !== 'pay-' + t.method; });
      $('#topup-reference').textContent = t.reference;
      $('#topup-reference-block').hidden = t.method === 'bank'; // bank details already show it
      $('#topup-sample-note').hidden = true;
      $('#pending-topup').hidden = true;
      $('#simulate-paid').hidden = t.status !== 'Pending';
      $('#cancel-topup').hidden = t.status !== 'Pending';

      if (t.status === 'Cancelled') {
        showCancelled(t);
      } else if (t.status === 'Done') {
        showPaid(t);
      } else if (t.method === 'qr') {
        $('#qr-amount').textContent = payText;
        setPanel('qr', 'pending', 'Scan to pay from your bank app',
          'Pay ' + payText + ' in your bank app. ' + money(t.get) + ' USDC lands in your balance as soon as you approve it.');
      } else if (t.method === 'bank') {
        $('#bank-amount').textContent = payText;
        $('#bank-reference').textContent = t.reference;
        setPanel('bank', 'pending', 'Send the bank transfer to finish',
          'Send exactly ' + payText + ' from a bank account in your name. We\'ll add ' + money(t.get) + ' USDC within 1 business day of receiving it.');
      } else {
        $('#cash-amount').textContent = payText;
        $('#cash-code').textContent = t.cashCode;
        setPanel('cash', 'pending', 'Pay in cash to finish',
          'Pay ' + payText + ' at a partner store. ' + money(t.get) + ' USDC lands in your balance as soon as you pay.');
      }

      form.hidden = true;
      $('#ways').hidden = true;
      $('.page-head p').hidden = true;
      done.classList.add('is-visible');
      done.focus();
      window.scrollTo(0, 0);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!validator.validateAll()) return;

      const m = method();
      const cur = currency.value;
      const pay = round2(payAmount());
      const q = topupQuote(pay, cur, m);
      const now = new Date();
      const t = {
        reference: 'KVT-' + isoDate(now).slice(2).replace(/-/g, '') + '-' + randomDigits(3),
        method: m,
        currency: cur,
        pay: pay,
        get: round2(q.get),
        fees: round2(q.conversion + q.methodFee),
        card: m === 'card' ? cardChoice.value : null,
        source: sourceField.hidden ? null : source.value,
        cashCode: m === 'cash' ? randomDigits(4) + ' ' + randomDigits(4) + ' ' + randomDigits(2) : null,
        status: m === 'card' ? 'Done' : 'Pending',
        date: isoDate(now),
        createdAt: now.getTime()
      };
      const list = topups();
      list.push(t);
      store.set('topups', list);
      showResult(t);
    });

    // Prototype shortcut: mark a pending top-up as paid so testers can see the balance change
    $('#simulate-paid').addEventListener('click', () => {
      if (!current) return;
      setStatus('topups', current.reference, 'Done');
      current.status = 'Done';
      showPaid(current);
      done.focus();
    });

    // Cancel a top-up that's still waiting for payment (asks once before cancelling)
    const cancelButton = $('#cancel-topup');
    const cancelBox = $('#cancel-topup-confirm');
    function askCancel(open) {
      cancelBox.hidden = !open;
      cancelButton.setAttribute('aria-expanded', String(open));
      if (open) $('#cancel-topup-yes').focus();
    }
    cancelButton.addEventListener('click', () => askCancel(cancelBox.hidden));
    $('#cancel-topup-no').addEventListener('click', () => { askCancel(false); cancelButton.focus(); });
    $('#cancel-topup-yes').addEventListener('click', () => {
      if (!current) return;
      setStatus('topups', current.reference, 'Cancelled');
      current.status = 'Cancelled';
      askCancel(false);
      showCancelled(current);
      done.focus();
    });

    // Reopen a top-up from Home or Activity: top-up.html?ref=KVT-...
    const params = new URLSearchParams(window.location.search);
    const reopened = topups().find((t) => t.reference === params.get('ref'));
    if (reopened) {
      showResult(reopened);
    } else {
      // Otherwise, point out a top-up that is still waiting for payment
      const waiting = topups().filter((t) => t.status === 'Pending').pop();
      if (waiting) {
        $('#pending-topup-text').textContent = 'Your ' + topupName(waiting.method) + ' of ' +
          waiting.currency + ' ' + money(waiting.pay) + ' is still waiting for payment.';
        $('#pending-topup-link').href = 'top-up.html?ref=' + encodeURIComponent(waiting.reference);
        $('#pending-topup').hidden = false;
      }
    }
  }

  // ---------- Review and confirm ----------
  function initConfirm() {
    const t = store.get('transfer', null);
    const today = todayIso();
    const scheduled = t && t.date > today;

    // Nothing waiting to be reviewed (already sent, or opened with Back or a bookmark):
    // show that instead of a sample with a live Confirm button.
    // Without JavaScript the sample stays, so the page can still be shown in a demo.
    if (!t) {
      $('.send-layout').hidden = true;
      $('#review-head p').hidden = true;
      $('#no-transfer').hidden = false;
      document.title = 'No transfer to review | Kova Wallet';
      return;
    }

    if (t) {
      $('#s-name').textContent = t.name;
      $('#s-mobile').textContent = t.mobile;
      if (t.email) {
        $('#s-email').textContent = t.email;
        $('#s-email-row').hidden = false;
      }
      $('#s-delivery').textContent = DELIVERY[t.delivery].label + ', ' + DELIVERY[t.delivery].time;
      $('#s-date').textContent = scheduled ? longDate(t.date) : 'Today, ' + longDate(t.date);
      $('#s-amount').textContent = money(t.amount) + ' USDC';
      $('#s-fees').textContent = money(t.fees) + ' USDC';
      $('#s-rate').textContent = rateText(t.currency);
      $('#s-receive').textContent = (scheduled ? 'About ' : '') + t.currency + ' ' + money(t.receive);
      $('#sample-note').hidden = true;
      if (scheduled) $('#confirm-button').textContent = 'Confirm and schedule';
    }

    $('#confirm-button').addEventListener('click', (event) => {
      event.preventDefault();

      const now = new Date();
      const reference = 'KV-' + isoDate(now).replace(/-/g, '') + '-' + randomDigits(4);

      if (t) {
        const sent = sentTransfers();
        sent.push(Object.assign({}, t, { reference: reference, status: scheduled ? 'Scheduled' : 'Done', createdAt: now.getTime() }));
        store.set('sent', sent);
        store.remove('transfer');

        $('#done-title').textContent = scheduled ? 'Transfer scheduled' : 'Money sent';
        $('#done-message').textContent = scheduled
          ? 'We\'ll send ' + money(t.amount) + ' USDC to ' + t.name + ' on ' + longDate(t.date) + '. They\'ll get about ' + t.currency + ' ' + money(t.receive) + '.'
          : t.name + ' will receive ' + t.currency + ' ' + money(t.receive) + ' ' + DELIVERY[t.delivery].time + '.' + (t.email ? ' We\'ve emailed them a receipt.' : '');
      }
      $('#done-reference').textContent = reference;
      $('#done-activity').href = 'activity.html?ref=' + encodeURIComponent(reference);

      // Move the progress steps on and swap the review for the success panel
      const steps = $$('.progress li');
      steps.forEach((step, i) => {
        step.classList.toggle('done', i < 2);
        if (i === 2) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
      });
      $('#review-head h1').textContent = scheduled ? 'Transfer scheduled' : 'Transfer complete';
      $('#review-head p').hidden = true;
      $('.send-layout').hidden = true;
      document.title = (scheduled ? 'Transfer scheduled' : 'Money sent') + ' | Kova Wallet';

      const done = $('#done');
      done.classList.add('is-visible');
      done.focus();
      window.scrollTo(0, 0);
    });
  }

  // ---------- Activity ----------
  // A receipt for any row: a transfer, top-up, payment or money received
  function receiptFor(record) {
    const lines = [];
    const add = (label, value, total) => lines.push({ label: label, value: value, total: !!total });
    const scheduled = record.status === 'Scheduled';
    let kicker = 'Receipt';
    let title = record.title || '';
    let amountText = '';
    let action = null;

    if (record.kind === 'sent') {
      // Transfers made in this session keep their own figures; samples are worked out the same way
      const q = quote(record.amount, record.currency);
      const conversion = record.fees !== undefined ? round2(record.fees - SEND_FEE) : q.conversion;
      const receive = record.receive !== undefined ? record.receive : q.receive;
      kicker = 'Transfer receipt';
      title = 'Sent to ' + firstName(record.name);
      amountText = '−' + money(record.amount) + ' USDC';
      add('To', record.name);
      add('Mobile', record.mobile);
      if (record.email) add('Email receipt', record.email);
      add('Delivery', DELIVERY[record.delivery].label + ', ' + DELIVERY[record.delivery].time);
      add(scheduled ? 'Send date' : 'Sent on', longDate(record.date));
      add('You send', money(record.amount) + ' USDC');
      add('Transfer fee', money(SEND_FEE) + ' USDC');
      add('Conversion fee (0.5%)', money(conversion) + ' USDC');
      add('Exchange rate', rateText(record.currency));
      add(scheduled ? 'They\'ll receive about' : 'They received', record.currency + ' ' + money(receive), true);
      if (scheduled) action = 'cancel-transfer';
    } else if (record.kind === 'topup') {
      const info = TOPUP_METHODS[record.method];
      const q = topupQuote(record.pay, record.currency, record.method);
      const get = record.get !== undefined ? record.get : q.get;
      kicker = 'Top-up receipt';
      title = title || info.title;
      amountText = '+' + money(get) + ' USDC';
      add('Method', info.label + (record.card ? ', ' + CARDS[record.card] : ''));
      add(record.status === 'Done' ? 'Added on' : 'Started on', longDate(record.date));
      add('You pay', record.currency + ' ' + money(record.pay));
      if (record.currency !== 'USD') add('Exchange rate', rateText(record.currency));
      add('Conversion fee (0.5%)', record.currency === 'USD' ? 'None' : money(q.conversion) + ' USDC');
      add(info.feeLabel, q.methodFee ? money(q.methodFee) + ' USDC' : 'Free');
      if (record.source) add('Where the money is from', SOURCE_LABELS[record.source] || record.source);
      add(record.status === 'Done' ? 'You got' : 'You get', money(get) + ' USDC', true);
      if (record.status === 'Pending') action = 'pending-topup';
    } else if (record.kind === 'payment') {
      const q = paymentQuote(record.local, record.currency);
      kicker = 'Payment receipt';
      amountText = '−' + money(q.total) + ' USDC';
      add('Paid at', record.title);
      add('Paid with', record.how);
      add('Paid on', longDate(record.date));
      add('Price', record.currency + ' ' + money(record.local));
      add('Exchange rate', rateText(record.currency));
      add('Conversion fee (0.5%)', money(q.conversion) + ' USDC');
      add('Total', money(q.total) + ' USDC', true);
    } else {
      kicker = 'Money received';
      amountText = '+' + money(record.amount) + ' USDC';
      add('From', record.from);
      add('Received on', longDate(record.date));
      add('Into', 'Your Kova wallet');
      add('Fee', 'None');
      add('You received', money(record.amount) + ' USDC', true);
    }
    return { kicker: kicker, title: title, amountText: amountText, lines: lines, action: action };
  }

  function initActivity() {
    const body = $('#activity-body');
    const month = $('#month');
    const chips = $$('#filters .chip');
    const dialog = $('#receipt');
    const today = todayIso();
    const items = sessionActivity();
    const records = {}; // reference -> details for the receipt
    let type = 'all';

    function setRowStatus(row, status) {
      const badge = $('.status', row);
      badge.textContent = status;
      badge.classList.toggle('pending', status === 'Scheduled' || status === 'Pending');
      badge.classList.toggle('cancelled', status === 'Cancelled');
      row.classList.toggle('is-cancelled', status === 'Cancelled');
      if (status === 'Cancelled') row.dataset.cancelled = 'true'; else delete row.dataset.cancelled;
    }

    // Sample rows already in the page
    $$('tr[data-ref]', body).forEach((row) => {
      const sample = SAMPLES[row.dataset.ref];
      if (!sample) return;
      records[row.dataset.ref] = Object.assign({ reference: row.dataset.ref, sample: true }, sample);
      if (cancelledSamples().indexOf(row.dataset.ref) !== -1) {
        records[row.dataset.ref].status = 'Cancelled';
        setRowStatus(row, 'Cancelled');
      }
    });

    // Add this session's transfers and top-ups to the top of the table
    items.forEach((t) => {
      const row = document.createElement('tr');
      row.dataset.month = t.date.slice(0, 7);
      row.dataset.ref = t.reference;
      row.innerHTML =
        '<th scope="row"></th>' +
        '<td class="col-date"><time datetime="' + t.date + '">' + longDate(t.date) + '</time></td>' +
        '<td class="col-type"></td>' +
        '<td class="col-amount num"></td>' +
        '<td class="col-local num"></td>' +
        '<td class="col-status"><span class="status"></span></td>';
      let status;

      if (t.kind === 'sent') {
        status = isCancelled(t) ? 'Cancelled' : (t.status === 'Scheduled' || t.date > today) ? 'Scheduled' : 'Done';
        row.dataset.type = 'sent';
        $('th', row).textContent = 'Sent to ' + firstName(t.name);
        $('.col-type', row).textContent = 'Sent';
        $('.col-amount', row).textContent = '−' + money(t.amount);
        $('.col-local', row).textContent = t.currency + ' ' + money(t.receive);
      } else {
        status = t.status;
        row.dataset.type = 'topup';
        if (status === 'Pending') row.dataset.pending = 'true';
        $('th', row).textContent = TOPUP_METHODS[t.method].title;
        $('.col-type', row).textContent = 'Top-up';
        $('.col-amount', row).textContent = '+' + money(t.get);
        $('.col-amount', row).classList.toggle('amount-in', status === 'Done');
        $('.col-local', row).textContent = t.currency + ' ' + money(t.pay);
      }
      setRowStatus(row, status);
      records[t.reference] = Object.assign({}, t, { status: status });
      $('th', row).insertAdjacentHTML('beforeend', '<span class="badge-new">New</span>');
      body.insertBefore(row, body.firstChild);

      // Make sure the month exists in the filter
      if (!$('option[value="' + row.dataset.month + '"]', month)) {
        const option = new Option(monthLabel(row.dataset.month), row.dataset.month);
        month.insertBefore(option, month.options[1]);
      }
    });

    // Open on the month of the newest item
    if (items.length) month.value = items[items.length - 1].date.slice(0, 7);

    const typeLabels = { all: 'All transactions', sent: 'Money sent', received: 'Money received', payment: 'Payments', topup: 'Top-ups' };

    function amountOf(row) {
      // Pending top-ups don't change the balance yet, and cancelled items never do
      if (row.dataset.pending || row.dataset.cancelled) return 0;
      const text = $('.col-amount', row).textContent.replace('−', '-').replace(/[+,]/g, '');
      return parseFloat(text) || 0;
    }

    function apply() {
      let count = 0;
      let net = 0;
      $$('tr', body).forEach((row) => {
        const show = (type === 'all' || row.dataset.type === type) &&
                     (month.value === 'all' || row.dataset.month === month.value);
        row.hidden = !show;
        if (show) {
          count += 1;
          net += amountOf(row);
        }
      });
      net = round2(net);
      const when = month.value === 'all' ? 'all months' : monthLabel(month.value);
      $('#activity-caption').textContent = typeLabels[type] + ', ' + when + ' (fictional)';
      $('#net-total').textContent = (net < 0 ? '−' : '+') + money(Math.abs(net));
      $('#results-count').textContent = 'Showing ' + count + (count === 1 ? ' transaction' : ' transactions') + ' for ' + when + '.';
      $('#empty-state').hidden = count > 0;
      $('#activity-table').hidden = count === 0;
    }

    function setType(next) {
      type = next;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === next)));
    }

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        setType(chip.dataset.filter);
        apply();
      });
    });
    month.addEventListener('change', apply);
    $('#filters').addEventListener('submit', (event) => event.preventDefault());

    // ----- Receipts -----
    const cancelButton = $('#receipt-cancel');
    const confirmBox = $('#receipt-confirm');
    const continueLink = $('#receipt-continue');
    let openRef = null;
    let opener = null;

    function askCancel(open) {
      confirmBox.hidden = !open;
      cancelButton.setAttribute('aria-expanded', String(open));
      if (open) $('#receipt-confirm-yes').focus();
    }

    function renderReceipt(ref) {
      const record = records[ref];
      const r = receiptFor(record);
      $('#receipt-kicker').textContent = r.kicker;
      $('#receipt-title').textContent = r.title;
      $('#receipt-amount').textContent = r.amountText;
      const badge = $('#receipt-status');
      badge.textContent = record.status;
      badge.classList.toggle('pending', record.status === 'Scheduled' || record.status === 'Pending');
      badge.classList.toggle('cancelled', record.status === 'Cancelled');
      const list = $('#receipt-list');
      list.textContent = '';
      r.lines.forEach((line) => {
        const div = document.createElement('div');
        if (line.total) div.className = 'summary-total';
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = line.label;
        dd.textContent = line.value;
        div.appendChild(dt);
        div.appendChild(dd);
        list.appendChild(div);
      });
      $('#receipt-ref').textContent = ref;

      continueLink.hidden = r.action !== 'pending-topup';
      continueLink.href = 'top-up.html?ref=' + encodeURIComponent(ref);
      cancelButton.hidden = !r.action;
      cancelButton.textContent = r.action === 'pending-topup' ? 'Cancel top-up' : 'Cancel transfer';
      if (r.action === 'pending-topup') $('#receipt-confirm-text').textContent = 'Cancel this top-up? Don\'t pay it after you cancel.';
      if (r.action === 'cancel-transfer') $('#receipt-confirm-text').textContent = 'Cancel this transfer? ' + money(record.amount) + ' USDC goes back to your balance.';
      $('#receipt-confirm-yes').textContent = r.action === 'pending-topup' ? 'Yes, cancel top-up' : 'Yes, cancel transfer';
      askCancel(false);
    }

    function openReceipt(ref, from) {
      if (!records[ref]) return;
      openRef = ref;
      opener = from || null;
      renderReceipt(ref);
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.classList.add('is-fallback'); // older browsers: shown on top, without the dimmed backdrop
        dialog.setAttribute('open', '');
      }
      $('#receipt-title').focus();
    }

    function closeReceipt() {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }

    dialog.addEventListener('close', () => {
      if (opener && document.contains(opener)) opener.focus();
    });
    $('#receipt-close').addEventListener('click', closeReceipt);
    // A click on the dimmed area around the receipt closes it
    dialog.addEventListener('click', (event) => { if (event.target === dialog) closeReceipt(); });

    cancelButton.addEventListener('click', () => askCancel(confirmBox.hidden));
    $('#receipt-confirm-no').addEventListener('click', () => { askCancel(false); cancelButton.focus(); });
    $('#receipt-confirm-yes').addEventListener('click', () => {
      const record = records[openRef];
      if (record.sample) {
        store.set('cancelled', cancelledSamples().concat(openRef));
      } else {
        setStatus(record.kind === 'sent' ? 'sent' : 'topups', openRef, 'Cancelled');
      }
      record.status = 'Cancelled';
      setRowStatus($('tr[data-ref="' + openRef + '"]', body), 'Cancelled');
      apply();
      renderReceipt(openRef);
      announce(record.kind === 'sent'
        ? 'Transfer cancelled. ' + money(record.amount) + ' USDC is back in your balance.'
        : 'Top-up cancelled.');
      $('#receipt-close').focus();
    });

    // Every row opens its receipt: the description becomes a button (keyboard and screen readers),
    // and a tap anywhere on the row does the same
    $$('tr', body).forEach((row) => {
      const ref = row.dataset.ref;
      if (!records[ref]) return;
      const th = $('th', row);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'row-open';
      button.setAttribute('aria-haspopup', 'dialog');
      while (th.firstChild) button.appendChild(th.firstChild);
      th.appendChild(button);
      button.addEventListener('click', () => openReceipt(ref, button));
      row.addEventListener('click', (event) => {
        if (event.target.closest('button, a')) return;
        openReceipt(ref, button);
      });
    });

    // Opened from Home or a confirmation: activity.html?ref=KV-...
    const wanted = new URLSearchParams(window.location.search).get('ref');
    const wantedRow = wanted && records[wanted] ? $('tr[data-ref="' + wanted + '"]', body) : null;
    if (wantedRow) {
      setType('all');
      month.value = wantedRow.dataset.month;
    }
    apply();
    if (wantedRow) openReceipt(wanted, $('.row-open', wantedRow));
  }

  // ---------- Help ----------
  function initHelp() {
    function openFromHash() {
      const id = window.location.hash.slice(1);
      const target = id && document.getElementById(id);
      if (target && target.tagName === 'DETAILS') {
        target.open = true;
        target.querySelector('summary').focus();
      }
    }
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
  }

  // ---------- Start ----------
  const pages = {
    'sign-in': initSignIn,
    dashboard: initDashboard,
    send: initSend,
    'top-up': initTopUp,
    confirm: initConfirm,
    activity: initActivity,
    help: initHelp
  };

  initCommon();
  const start = pages[document.body.dataset.page];
  if (start) start();
})();
