/* ==========================================================
   app.js — starts the app and switches screens.
   Screens are chosen by the part of the URL after "#":
     #today  #workout  #summary/<id>  #plan  #plan/w/<id>  #plan/library
     #progress  #progress/<exerciseId>  #body  #me
   Each screen is an object in GT.screens with a render(view, arg) function.
   ========================================================== */
GT.app = {
  cleanup: null,   // function a screen can set to stop its timers when you leave
  lastHash: null,

  init() {
    GT.store.load();
    GT.app.applyTheme();

    // Rest timer buttons
    document.querySelectorAll('[data-timer]').forEach(btn => btn.addEventListener('click', () => {
      const what = btn.getAttribute('data-timer');
      if (what === 'plus') GT.timer.add(15);
      if (what === 'minus') GT.timer.add(-15);
      if (what === 'skip') GT.timer.stop();
    }));

    window.addEventListener('hashchange', GT.app.render);
    if (!location.hash) {
      history.replaceState(null, '', GT.store.state.activeSession ? '#workout' : '#today');
    }
    GT.app.render();
  },

  /** Go to a screen (re-renders even if we're already there) */
  go(hash) {
    if (location.hash === hash) GT.app.render();
    else location.hash = hash;
  },

  /** Draw the current screen */
  render() {
    if (GT.app.cleanup) { GT.app.cleanup(); GT.app.cleanup = null; }
    const hash = location.hash.slice(1) || 'today';
    const parts = hash.split('/');
    const route = parts[0];
    const arg = parts.slice(1).join('/');
    const sameScreen = GT.app.lastHash === hash;
    const scrollY = window.scrollY;
    GT.app.lastHash = hash;

    const view = document.getElementById('view');
    view.innerHTML = '';
    const screen = GT.screens[route] || GT.screens.today;
    try {
      screen.render(view, arg);
    } catch (e) {
      console.error(e);
      view.appendChild(GT.ui.h('div', { class: 'card' }, 'Something went wrong drawing this screen: ' + e.message));
    }

    // Highlight the right tab
    const tab = { workout: 'today', summary: 'today' }[route] || route;
    document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('active', a.getAttribute('data-tab') === tab));

    window.scrollTo(0, sameScreen ? scrollY : 0);
    GT.app.updateHeader();
  },

  /** Update the level badge, XP bar and streak in the top bar */
  updateHeader() {
    const info = GT.game.levelInfo(GT.game.totalXP());
    document.getElementById('hdr-level').textContent = info.level;
    document.getElementById('hdr-rank').textContent = info.rank;
    document.getElementById('hdr-xp').textContent = info.into + ' / ' + info.need + ' XP';
    document.getElementById('hdr-xpfill').style.width = (info.into / info.need * 100) + '%';
    document.getElementById('hdr-streak-n').textContent = GT.stats.streak().current;
  },

  /** 'auto' follows the phone/PC setting; 'light'/'dark' force it */
  applyTheme() {
    const t = GT.store.state.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  },
};

document.addEventListener('DOMContentLoaded', GT.app.init);
