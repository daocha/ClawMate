import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS } from '../public/js/characters.js';
import { ACTIONS, WIDTH, HEIGHT, drawModel, poseAt, PixelAnimator } from '../public/js/pixel-model.js';
import { renderPixel } from '../public/js/render-pixel.js';
import { attachInteractions } from '../public/js/interactions.js';

const cast = CHARACTERS.filter(c => c.visible);

test('all active companions render without raster assets', () => {
  for (const spec of cast) {
    const preview = renderPixel(spec, 'full');
    assert.match(preview, /<rect /);
    assert.doesNotMatch(preview, /<image|<img|\.png|rotate\(/);
    const cells = drawModel(spec).cells;
    assert.equal(cells.length, WIDTH * HEIGHT);
    assert.ok(cells.filter(Boolean).length > 3000);
  }
});

test('all six actions change pixels, return to rest, and fit in the canvas', () => {
  for (const spec of cast) {
    const rest = drawModel(spec, poseAt(null, 0, 0)).cells;
    for (const action of ACTIONS) {
      assert.deepEqual(drawModel(spec, poseAt(action, 0, 0)).cells, rest);
      assert.deepEqual(drawModel(spec, poseAt(action, 1, 0)).cells, rest);
      assert.notDeepEqual(drawModel(spec, poseAt(action, .45, 0)).cells, rest);
      for (let frame = 0; frame <= 40; frame++) {
        const cells = drawModel(spec, poseAt(action, frame / 40, frame / 8)).cells;
        const edges = cells.some((color, i) => color &&
          (i < WIDTH || i >= cells.length - WIDTH || i % WIDTH === 0 || i % WIDTH === WIDTH - 1));
        assert.equal(edges, false, `${spec.id} ${action} frame ${frame} clips`);
      }
    }
  }
});

test('expressions alter the face, including sleep and talking', () => {
  for (const spec of cast) {
    const rest = drawModel(spec).cells;
    for (const expression of ['happy', 'sleepy', 'talking']) {
      assert.notDeepEqual(drawModel(spec, poseAt(), { expression }).cells, rest);
    }
  }
});

test('random tap actions never repeat consecutively', () => {
  const model = Object.create(PixelAnimator.prototype);
  model.play = (name) => assert.ok(ACTIONS.includes(name));
  const seen = new Set();
  // Exercise each available random slot deterministically.
  const original = Math.random;
  try {
    for (let i = 0; i < 100; i++) {
      Math.random = () => (i % 10) / 10;
      const previous = model.lastAction;
      const next = model.randomAction();
      assert.notEqual(next, previous);
      seen.add(next);
    }
  } finally { Math.random = original; }
  assert.equal(seen.size, ACTIONS.length);
});

class Stage extends EventTarget {
  classList = { add() {}, remove() {} };
  style = { setProperty() {} };
  setPointerCapture() {}
  pointer(type, x = 100, y = 100, pointerId = 1, isPrimary = true) {
    const event = new Event(type);
    Object.assign(event, { clientX: x, clientY: y, pointerId, isPrimary, pointerType: 'touch' });
    this.dispatchEvent(event);
  }
}

test('mobile single taps react immediately; drags, cancellation and extra fingers do not tap', () => {
  const stage = new Stage(), reactions = [];
  const pet = { pixelAnimator: {}, react: kind => reactions.push(kind), sleep() {}, lookAt() {}, lookForward() {} };
  const gestures = attachInteractions(stage, pet);
  try {
    for (let i = 0; i < 3; i++) {
      stage.pointer('pointerdown'); stage.pointer('pointerup');
      assert.equal(reactions.length, i + 1);
      assert.equal(reactions.at(-1), 'poke');
    }
    stage.pointer('pointerdown'); stage.pointer('pointermove', 120); stage.pointer('pointerup', 120);
    assert.equal(reactions.length, 3);
    stage.pointer('pointerdown'); stage.pointer('pointercancel'); stage.pointer('pointerup');
    assert.equal(reactions.length, 3);
    stage.pointer('pointerdown', 100, 100, 2, false); stage.pointer('pointerup', 100, 100, 2, false);
    assert.equal(reactions.length, 3);
    stage.pointer('pointerdown'); stage.pointer('pointermove', 150); stage.pointer('pointerup', 150);
    assert.equal(reactions.at(-1), 'swipe');
  } finally { gestures.destroy(); }
});

test('animation lifecycle stops on destroy, reduced motion and hidden pages', () => {
  const original = { document: globalThis.document, request: globalThis.requestAnimationFrame, cancel: globalThis.cancelAnimationFrame };
  const frames = new Map(), events = new Map();
  let next = 0, paints = 0;
  globalThis.requestAnimationFrame = fn => { frames.set(++next, fn); return next; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  globalThis.document = { hidden: false, addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) };
  const canvas = { dataset: {}, getContext: () => ({
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: () => paints++
  }) };
  let model;
  try {
    model = new PixelAnimator(canvas, cast[0]);
    assert.equal(frames.size, 1);
    model.play('wave');
    assert.equal(canvas.dataset.action, 'wave');
    model.draw(model.started + model.duration + 1);
    assert.equal(canvas.dataset.action, 'idle');
    model.setReducedMotion(true);
    assert.equal(frames.size, 0);
    model.play('hop');
    assert.equal(canvas.dataset.action, 'idle');
    const before = paints; model.setExpression('happy');
    assert.equal(paints, before + 1);
    model.setReducedMotion(false);
    assert.equal(frames.size, 1);
    document.hidden = true; events.get('visibilitychange')();
    assert.equal(frames.size, 0);
    document.hidden = false; events.get('visibilitychange')();
    assert.equal(frames.size, 1);
    model.destroy();
    assert.equal(frames.size, 0); assert.equal(events.size, 0);
  } finally {
    model?.destroy();
    globalThis.document = original.document;
    globalThis.requestAnimationFrame = original.request;
    globalThis.cancelAnimationFrame = original.cancel;
  }
});
