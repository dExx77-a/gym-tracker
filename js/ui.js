/* ==========================================================
   ui.js — tiny helpers for building the screens.
   h()      creates HTML elements:  h('div', {class:'card'}, 'Hello')
   icon()   returns an SVG line icon from the sprite in index.html
   toast()  small message at the top
   modal()  bottom sheet dialog; confirm() / prompt() are built on it
   ========================================================== */
GT.ui = {
  /**
   * Create an element.
   * attrs: { class, onclick, oninput, value, ... }  (keys starting with "on" become event listeners)
   * children: strings, numbers, elements, arrays, or null (ignored)
   */
  h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else if (k === 'value' || k === 'checked' || k === 'selected') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    children.flat(Infinity).forEach(c => {
      if (c == null || c === false) return;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return el;
  },

  /** SVG icon, e.g. icon('check') or icon('flame', 'icon-lg') */
  icon(name, extraClass) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'icon' + (extraClass ? ' ' + extraClass : ''));
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(NS, 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  },

  /** Short message at the top. kind: '' | 'good' | 'gold' */
  toast(msg, kind) {
    const el = GT.ui.h('div', { class: 'toast ' + (kind || '') }, msg);
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3000);
  },

  /**
   * Bottom-sheet dialog.
   * opts: { title, body: element, actions: [{ label, cls, onClick }] }
   * If onClick returns false the sheet stays open. Returns a close() function.
   */
  modal(opts) {
    const h = GT.ui.h;
    const overlay = h('div', { class: 'overlay' });
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title },
      h('div', { class: 'sheet-head' },
        h('h2', null, opts.title),
        h('button', { class: 'btn btn-ghost btn-icon', 'aria-label': 'Close', onclick: close }, GT.ui.icon('x'))),
      opts.body ? h('div', { class: 'sheet-body' }, opts.body) : null,
      opts.actions && opts.actions.length ? h('div', { class: 'sheet-actions' },
        opts.actions.map(a => h('button', {
          class: 'btn ' + (a.cls || ''),
          onclick: () => { if (a.onClick && a.onClick() === false) return; close(); },
        }, a.label))) : null);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
    return close;
  },

  /** Yes/no dialog */
  confirm(title, message, okLabel, onOk, danger) {
    GT.ui.modal({
      title,
      body: GT.ui.h('p', { class: 'muted' }, message),
      actions: [{ label: 'Cancel' }, { label: okLabel || 'OK', cls: danger ? 'btn-bad' : 'btn-primary', onClick: onOk }],
    });
  },

  /** Ask for a line of text */
  prompt(title, label, initial, onOk) {
    const input = GT.ui.h('input', { class: 'input', type: 'text', value: initial || '' });
    const submit = () => {
      const v = input.value.trim();
      if (!v) { input.focus(); return false; }
      onOk(v);
    };
    const close = GT.ui.modal({
      title,
      body: GT.ui.h('label', { class: 'field' }, label, input),
      actions: [{ label: 'Cancel' }, { label: 'Save', cls: 'btn-primary', onClick: submit }],
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && submit() !== false) close(); });
    setTimeout(() => input.focus(), 60);
  },

  /** Searchable exercise list. Calls onPick(exerciseId). */
  pickExercise(onPick) {
    const h = GT.ui.h;
    const search = h('input', { class: 'input', type: 'search', placeholder: 'Search exercises' });
    const list = h('div');
    let close = null;
    const draw = () => {
      list.innerHTML = '';
      const q = search.value.trim().toLowerCase();
      const ex = GT.store.state.exercises.filter(e => e.name.toLowerCase().includes(q));
      const muscles = [...new Set(ex.map(e => e.muscle))];
      muscles.forEach(m => {
        list.appendChild(h('div', { class: 'pick-group' }, m));
        ex.filter(e => e.muscle === m).forEach(e => list.appendChild(
          h('button', { class: 'pick-item', onclick: () => { close(); onPick(e.id); } }, e.name)));
      });
      if (!ex.length) list.appendChild(h('p', { class: 'muted small' }, 'No match. Add new exercises in Plan > Exercise library.'));
    };
    search.addEventListener('input', draw);
    draw();
    close = GT.ui.modal({ title: 'Add exercise', body: h('div', { class: 'stack' }, search, list) });
  },

  /** Floating "+10 XP" above an element */
  xpPop(anchor, text) {
    const r = anchor.getBoundingClientRect();
    const el = GT.ui.h('div', { class: 'xp-pop' }, text);
    el.style.left = (r.left + r.width / 2) + 'px';
    el.style.top = (r.top - 8) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 950);
  },

  /** Confetti burst for PRs and level-ups */
  celebrate() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = GT.ui.h('div', { class: 'confetti' });
    const colors = ['var(--accent)', 'var(--gold)', 'var(--good)', 'var(--bad)', 'var(--heat-2)'];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = (1.4 + Math.random() * 1.4) + 's';
      p.style.animationDelay = (Math.random() * 0.4) + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3400);
  },

  /** A stat tile: big number + label */
  stat(label, value, sub) {
    const h = GT.ui.h;
    return h('div', { class: 'stat' },
      h('div', { class: 'stat-label' }, label),
      h('div', { class: 'stat-value' }, value),
      sub ? h('div', { class: 'stat-sub' }, sub) : null);
  },

  /** Empty-state block */
  empty(iconName, title, text, action) {
    const h = GT.ui.h;
    return h('div', { class: 'empty' }, GT.ui.icon(iconName), h('h3', null, title), h('p', null, text), action || null);
  },

  /** Card with a title row. extra = element shown on the right of the title */
  card(title, iconName, extra, cls) {
    const h = GT.ui.h;
    return h('section', { class: 'card ' + (cls || '') },
      title ? h('div', { class: 'card-head' },
        h('h2', { class: 'card-title' }, iconName ? GT.ui.icon(iconName) : null, title), extra || null) : null);
  },
};
