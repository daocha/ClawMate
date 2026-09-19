// Unified pointer/touch gesture layer: works with mouse, finger and Apple Pencil.
const LONG_PRESS_MS = 550;
const SWIPE_MIN = 42;
const TAP_MAX_MOVE = 12;
const DOUBLE_TAP_MS = 280;
const IDLE_SLEEP_MS = 75_000;

export function attachInteractions(stage, pet, opts = {}) {
  const haptics = () => { if (opts.haptics?.() && navigator.vibrate) navigator.vibrate(12); };
  let start = null;
  let longTimer = null;
  let lastTapAt = 0;
  let pendingTap = null;
  let idleTimer = null;

  const bumpIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => pet.sleep(), IDLE_SLEEP_MS);
  };

  const pointFrom = (e) => ({ x: e.clientX, y: e.clientY });

  function onDown(e) {
    if (e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) return;
    stage.setPointerCapture?.(e.pointerId);
    start = { ...pointFrom(e), pointerId: e.pointerId, t: Date.now(), moved: false };
    stage.classList.add('is-held');
    bumpIdle();
    clearTimeout(longTimer);
    longTimer = setTimeout(() => {
      if (!start || start.moved) return;
      start.consumed = true;
      haptics();
      pet.react('hug', pointFrom(e));
    }, LONG_PRESS_MS);
  }

  function onMove(e) {
    if (start && e.pointerId !== start.pointerId) return;
    pet.lookAt(e.clientX, e.clientY);
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > TAP_MAX_MOVE) {
      start.moved = true;
      clearTimeout(longTimer);
      stage.style.setProperty('--drag-x', `${Math.max(-18, Math.min(18, dx * 0.18))}px`);
      stage.style.setProperty('--drag-y', `${Math.max(-14, Math.min(14, dy * 0.14))}px`);
    }
  }

  function onUp(e) {
    if (!start || e.pointerId !== start.pointerId) return;
    stage.classList.remove('is-held');
    stage.style.setProperty('--drag-x', '0px');
    stage.style.setProperty('--drag-y', '0px');
    clearTimeout(longTimer);
    if (!start) return;
    const s = start;
    start = null;
    if (s.consumed) return;

    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    const dist = Math.hypot(dx, dy);
    const at = pointFrom(e);

    if (dist >= SWIPE_MIN) {
      haptics();
      const horizontal = Math.abs(dx) > Math.abs(dy);
      pet.react(horizontal ? 'swipe' : dy < 0 ? 'feed' : 'swipe', at);
      bumpIdle();
      return;
    }

    if (s.moved) return;
    // HD portrait taps advance once per pointerup, including rapid taps.
    // Keep pose changes separate from feed/hug/programmatic reactions.
    if (pet.hdPoseCycle) {
      clearTimeout(pendingTap);
      lastTapAt = 0;
      if (pet.hdPoseCycle.contains({ x: s.x, y: s.y }) && pet.hdPoseCycle.contains(at)) {
        void pet.hdPoseCycle.next();
        haptics();
        pet.react('pet', at);
      }
      bumpIdle();
      return;
    }
    // Q版與卡通版使用各自的五格姿勢表，和 HD 一樣每次點擊都輪播。
    if (pet.stylePoseCycle) {
      clearTimeout(pendingTap);
      lastTapAt = 0;
      if (pet.stylePoseCycle.contains({ x: s.x, y: s.y }) && pet.stylePoseCycle.contains(at)) {
        pet.stylePoseCycle.next();
        haptics();
        pet.react('pet', at);
      }
      bumpIdle();
      return;
    }
    // Pixel and cartoon art also respond immediately to every single tap.
    // Other art styles retain their existing double-tap gesture.
    if (pet.pixelAnimator || pet.cartoonImg) {
      clearTimeout(pendingTap);
      lastTapAt = 0;
      haptics();
      pet.react('poke', at);
      bumpIdle();
      return;
    }

    const now = Date.now();
    if (now - lastTapAt < DOUBLE_TAP_MS) {
      clearTimeout(pendingTap);
      lastTapAt = 0;
      haptics();
      pet.react('doubleTap', at);
    } else {
      lastTapAt = now;
      clearTimeout(pendingTap);
      pendingTap = setTimeout(() => {
        haptics();
        pet.react(Date.now() - s.t > 260 ? 'pet' : 'poke', at);
      }, DOUBLE_TAP_MS);
    }
    bumpIdle();
  }

  function onCancel(e) {
    if (start && e.pointerId !== start.pointerId) return;
    clearTimeout(longTimer);
    clearTimeout(pendingTap);
    lastTapAt = 0;
    start = null;
    stage.classList.remove('is-held');
    stage.style.setProperty('--drag-x', '0px');
    stage.style.setProperty('--drag-y', '0px');
  }

  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onCancel);
  stage.addEventListener('pointerleave', () => pet.lookForward());
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  // iPadOS fires gesture events for pinch/rotate — swallow them so the page never zooms.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((n) =>
    stage.addEventListener(n, (e) => e.preventDefault())
  );

  bumpIdle();

  return {
    bumpIdle,
    destroy() {
      clearTimeout(idleTimer);
      clearTimeout(longTimer);
      clearTimeout(pendingTap);
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onCancel);
    }
  };
}
