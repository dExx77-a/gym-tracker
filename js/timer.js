/* ==========================================================
   timer.js — the rest timer.
   Starts automatically when you check off a set.
   Beeps at the end using WebAudio (no sound file needed),
   and vibrates on phones that support it (Android).
   ========================================================== */
GT.timer = {
  endAt: 0,     // time (ms) when the rest ends
  total: 0,     // length of this rest in seconds (for the progress bar)
  iv: null,     // the setInterval id
  audio: null,  // AudioContext, created on first tap (browsers require a tap first)

  start(seconds) {
    GT.timer.unlockAudio();
    GT.timer.total = seconds;
    GT.timer.endAt = Date.now() + seconds * 1000;
    const bar = document.getElementById('timer');
    bar.hidden = false;
    bar.classList.remove('done');
    document.body.classList.add('timer-on');
    clearInterval(GT.timer.iv);
    GT.timer.iv = setInterval(GT.timer.tick, 250);
    GT.timer.tick();
  },

  /** Add (or remove, with a negative number) seconds */
  add(seconds) {
    if (!GT.timer.endAt) return;
    GT.timer.endAt += seconds * 1000;
    GT.timer.total = Math.max(1, GT.timer.total + seconds);
    GT.timer.tick();
  },

  stop() {
    clearInterval(GT.timer.iv);
    GT.timer.iv = null;
    GT.timer.endAt = 0;
    document.getElementById('timer').hidden = true;
    document.body.classList.remove('timer-on');
  },

  tick() {
    if (!GT.timer.endAt) return;
    const left = (GT.timer.endAt - Date.now()) / 1000;
    const text = document.getElementById('timer-text');
    const fill = document.getElementById('timer-fill');
    if (left > 0) {
      text.textContent = GT.util.fmtClock(Math.ceil(left));
      fill.style.width = Math.min(100, (left / GT.timer.total) * 100) + '%';
      return;
    }
    // Time's up
    clearInterval(GT.timer.iv);
    GT.timer.endAt = 0;
    text.textContent = 'Rest over. Next set!';
    fill.style.width = '100%';
    document.getElementById('timer').classList.add('done');
    GT.timer.beep();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    setTimeout(() => { if (!GT.timer.endAt) GT.timer.stop(); }, 4000);
  },

  /** Browsers only allow sound after a user tap; call this from a tap */
  unlockAudio() {
    try {
      if (!GT.timer.audio) GT.timer.audio = new (window.AudioContext || window.webkitAudioContext)();
      if (GT.timer.audio.state === 'suspended') GT.timer.audio.resume();
    } catch (e) { /* no audio support */ }
  },

  /** Three short beeps, the last one higher */
  beep() {
    if (!GT.store.state.settings.sound) return;
    const ctx = GT.timer.audio;
    if (!ctx) return;
    [0, 0.28, 0.56].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + t;
      osc.type = 'sine';
      osc.frequency.value = i === 2 ? 1320 : 880;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.24);
    });
  },
};
