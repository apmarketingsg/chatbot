/*
 * Ryan chat widget engine. Reads the flows from flows.js and talks to the
 * back office through api.js. Most changes should be made in flows.js.
 */
(function () {
  const F = window.RYAN_FLOWS;
  const API = window.RYAN_API;

  let ctx;           // everything Ryan knows in this chat
  let current;       // id of the node being shown
  let busy = false;  // true while Ryan is "typing"

  // ---- Build the widget ----------------------------------------------------
  const root = document.createElement('div');
  root.className = 'ryan';
  root.innerHTML = `
    <button class="ryan-launcher" aria-label="Chat with ${F.botName}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>
    </button>
    <section class="ryan-panel" role="dialog" aria-label="Chat with ${F.botName}" hidden>
      <header class="ryan-header">
        <div class="ryan-avatar" aria-hidden="true">${F.botName[0]}</div>
        <div class="ryan-title"><strong>${F.botName}</strong><span>${F.company} Support</span></div>
        <button class="ryan-icon ryan-restart" title="Start again" aria-label="Start again">&#8635;</button>
        <button class="ryan-icon ryan-close" title="Close" aria-label="Close">&times;</button>
      </header>
      <div class="ryan-log" aria-live="polite"></div>
      <div class="ryan-options"></div>
      <form class="ryan-input">
        <input type="text" autocomplete="off" maxlength="500" />
        <button type="submit">Send</button>
      </form>
    </section>`;
  document.body.appendChild(root);

  const panel = root.querySelector('.ryan-panel');
  const log = root.querySelector('.ryan-log');
  const optionsEl = root.querySelector('.ryan-options');
  const form = root.querySelector('.ryan-input');
  const input = form.querySelector('input');

  root.querySelector('.ryan-launcher').addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden && !current) start();
    if (!panel.hidden) input.focus();
  });
  root.querySelector('.ryan-close').addEventListener('click', () => { panel.hidden = true; });
  root.querySelector('.ryan-restart').addEventListener('click', () => { if (!busy) start(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    onTyped(text);
  });

  // ---- Helpers ---------------------------------------------------------------
  function fill(text) {
    return text.replace(/\{(\w+)\}/g, (m, key) => {
      if (ctx[key] != null) return ctx[key];
      if (F[key] != null) return F[key];
      return m;
    });
  }

  function addMessage(who, text) {
    const el = document.createElement('div');
    el.className = 'ryan-msg ryan-' + who;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    ctx.transcript.push({ from: who === 'bot' ? F.botName : 'Customer', text, at: new Date().toISOString() });
  }

  async function bot(text) {
    busy = true;
    const typing = document.createElement('div');
    typing.className = 'ryan-msg ryan-bot ryan-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;
    await new Promise((r) => setTimeout(r, Math.min(400 + text.length * 8, 1200)));
    typing.remove();
    addMessage('bot', text);
    busy = false;
  }

  function setInput(enabled, placeholder) {
    input.disabled = !enabled;
    input.placeholder = enabled ? (placeholder || 'Type a message') : 'Please choose an option above';
    if (enabled) input.focus();
  }

  function showOptions(options) {
    optionsEl.innerHTML = '';
    options.forEach((opt) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = opt.label;
      b.addEventListener('click', () => pick(opt));
      optionsEl.appendChild(b);
    });
    currentOptions = options;
    log.scrollTop = log.scrollHeight;
  }
  let currentOptions = [];

  function clearOptions() {
    optionsEl.innerHTML = '';
    currentOptions = [];
  }

  function pick(opt) {
    if (busy) return;
    addMessage('user', opt.label);
    clearOptions();
    if (opt.run) opt.run(); else go(opt.next);
  }

  // ---- Typed input -----------------------------------------------------------
  const VALIDATORS = {
    name: (t) => /^[\p{L} .'-]{2,60}$/u.test(t),
    billing: (t) => /^\d{6,12}$/.test(t.replace(/\s/g, '')),
    phone: (t) => /^\+?\d{8,15}$/.test(t.replace(/[\s-]/g, '')),
    text: (t) => t.length >= 2,
  };
  const CLEAN = {
    name: (t) => t.trim().replace(/\s+/g, ' ').replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase()),
    billing: (t) => t.replace(/\s/g, ''),
    phone: (t) => t.replace(/[\s-]/g, ''),
  };

  function onTyped(text) {
    const node = F.nodes[current];
    if (node && node.type === 'ask') {
      addMessage('user', text);
      if (node.validate && !VALIDATORS[node.validate](text)) { bot(node.invalid); return; }
      ctx[node.field] = CLEAN[node.validate] ? CLEAN[node.validate](text) : text;
      go(node.next);
      return;
    }

    addMessage('user', text);
    const lower = text.toLowerCase();

    // 1. Does the text match one of the buttons on screen? ("yes", "no", ...)
    const byLabel = currentOptions.find((o) => {
      const label = o.label.toLowerCase();
      return label === lower || label.split(/[ ,]/)[0] === lower;
    });
    if (byLabel) { clearOptions(); if (byLabel.run) byLabel.run(); else go(byLabel.next); return; }

    // 2. Keyword match on the problem, once the customer is verified.
    if (ctx.verified) {
      const hit = matchKeywords(lower);
      if (hit) { clearOptions(); go(hit); return; }
    }

    const options = currentOptions;
    bot("Sorry, I didn't quite get that. Please choose one of the options below.").then(() => showOptions(options));
  }

  function matchKeywords(lower) {
    let best = null, bestScore = 0;
    F.keywords.forEach((k) => {
      const score = k.words.filter((w) => lower.includes(w)).length;
      if (score > bestScore) { best = k.node; bestScore = score; }
    });
    return best;
  }

  // ---- Behind the scenes actions -------------------------------------------
  const ACTIONS = {
    async verifyAccount() {
      const acc = await API.lookupAccount(ctx.billingNumber, ctx.name);
      if (!acc) {
        ctx.attempts += 1;
        return ctx.attempts >= 2 ? 'verify_failed_final' : 'verify_failed';
      }
      ctx.verified = true;
      ctx.account = acc;
      ctx.firstName = acc.name.split(' ')[0];
      ctx.plan = acc.plan;
      ctx.area = acc.area;
      ctx.phoneLast4 = acc.phone.slice(-4);
      return 'check_status';
    },

    async checkAccountStatus() {
      const s = await API.getServiceStatus(ctx.account);
      ctx.lineStatus = s.lineStatus;
      if (s.suspended) return 'account_suspended';
      if (s.outage) {
        ctx.outageMessage = s.outage.message;
        ctx.outageEta = s.outage.eta;
        return 'outage';
      }
      return 'main_menu';
    },

    async routeNoInternet() {
      return ctx.lineStatus === 'down' ? 'no_internet_line_down' : 'no_internet_line_up';
    },

    async createTicket() {
      const phone = ctx.contactPhone || ctx.account.phone;
      ctx.contactDisplay = ctx.contactPhone ? ctx.contactPhone : 'the number ending in ' + ctx.phoneLast4;
      try {
        const res = await API.createTicket({
          billingNumber: ctx.account.billingNumber,
          customerName: ctx.account.name,
          contactPhone: phone,
          issue: ctx.issue || 'Not specified',
          stepsTried: ctx.stepsTried,
          description: ctx.description || '',
          lineStatus: ctx.lineStatus,
          transcript: ctx.transcript,
          createdAt: new Date().toISOString(),
        });
        ctx.ticketId = res.id;
        ctx.stepsTried = [];
        ctx.contactPhone = null;
        return 'ticket_done';
      } catch (e) {
        console.error('[Ryan] Ticket failed', e);
        return 'ticket_error';
      }
    },

    async restart() {
      start();
      return null;
    },
  };

  // ---- Flow runner -----------------------------------------------------------
  async function go(id) {
    const node = F.nodes[id];
    if (!node) { console.error('[Ryan] Unknown node', id); return; }
    current = id;
    clearOptions();
    setInput(false);
    if (node.issue) ctx.issue = node.issue;

    if (node.type === 'say') {
      await bot(fill(node.text));
      if (node.options) {
        const opts = typeof node.options === 'string' ? F.menus[node.options] : node.options;
        showOptions(opts);
        if (ctx.verified) setInput(true, 'Choose an option or type your problem');
      } else if (node.next) {
        go(node.next);
      }
    } else if (node.type === 'ask') {
      await bot(fill(node.text));
      setInput(true, node.placeholder);
    } else if (node.type === 'action') {
      if (node.text) await bot(fill(node.text));
      busy = true;
      const next = await ACTIONS[node.run](node);
      busy = false;
      if (next) go(next);
    } else if (node.type === 'steps') {
      if (node.text) await bot(fill(node.text));
      showStep(node, 0);
    }
  }

  async function showStep(node, i) {
    const step = node.steps[i];
    await bot(`Step ${i + 1} of ${node.steps.length}: ${step.title}\n${step.detail}\n\nDid that fix it?`);
    showOptions([
      { label: "Yes, it's working now", run: () => go(node.onFixed || 'resolved') },
      {
        label: 'No, still not working',
        run: () => {
          ctx.stepsTried.push(step.title);
          if (i + 1 < node.steps.length) showStep(node, i + 1);
          else go(node.onNotFixed || 'ticket_offer');
        },
      },
    ]);
  }

  function start() {
    ctx = { attempts: 0, verified: false, stepsTried: [], transcript: [] };
    log.innerHTML = '';
    go(F.start);
  }

  // Open automatically when the page URL has #chat (handy for testing).
  if (location.hash === '#chat') { panel.hidden = false; start(); }
})();
