// A small tap-timing mini-game: catch falling items before they hit the
// ground. Feeding-type actions run this first and send the hit count back to
// the server as a `bonus` (0-3) that scales the action's affinity/need gain -
// turning "tap a button" into a skill-based interaction.
const COUNT = 3;
const FALL_MS = 1500;
const SPAWN_GAP_MS = 420;

export function playCatchGame(stage, { emoji = '🍎', reducedMotion = false, lang = 'zh-TW', fallMs = FALL_MS, spawnGapMs = SPAWN_GAP_MS } = {}) {
  // Reduced-motion users still get the full bonus - the mini-game is a bonus
  // layer, not a requirement to progress.
  if (reducedMotion) return Promise.resolve(COUNT);

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    const hint = document.createElement('div');
    hint.className = 'minigame-hint';
    hint.textContent = lang === 'zh-TW' ? `接住掉下來的 ${emoji}！` : `Catch the falling ${emoji}!`;
    overlay.appendChild(hint);
    // Swallow pointerdown so taps on the overlay (hits or misses) never reach
    // the stage's own gesture layer underneath and trigger an unrelated pet
    // reaction (poke/long-press) while the mini-game is running.
    overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    stage.appendChild(overlay);

    let hits = 0;
    let settled = 0;
    const timers = [];

    function finish() {
      timers.forEach(clearTimeout);
      overlay.classList.add('is-done');
      setTimeout(() => overlay.remove(), 220);
      resolve(hits);
    }

    function settle() {
      settled++;
      if (settled >= COUNT) timers.push(setTimeout(finish, 250));
    }

    function spawnOne() {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'minigame-item';
      el.textContent = emoji;
      el.style.left = `${12 + Math.random() * 70}%`;
      el.style.animationDuration = `${fallMs}ms`;
      let caught = false;
      const catchIt = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (caught) return;
        caught = true;
        hits++;
        el.classList.add('is-caught');
        setTimeout(() => el.remove(), 200);
        settle();
      };
      el.addEventListener('pointerdown', catchIt);
      el.addEventListener('animationend', () => {
        if (!caught) { el.remove(); settle(); }
      });
      overlay.appendChild(el);
    }

    for (let i = 0; i < COUNT; i++) timers.push(setTimeout(spawnOne, i * spawnGapMs));
    // Safety net in case an animationend event is ever missed (e.g. tab was
    // backgrounded mid-animation).
    timers.push(setTimeout(finish, COUNT * spawnGapMs + fallMs + 800));
  });
}
