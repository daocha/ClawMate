import { renderReal } from './render-real.js';
import { renderChibi } from './render-chibi.js';
import { renderPixel } from './render-pixel.js';
import { mouthPath, EXPRESSIONS, BROW_POSE } from './face.js';

const BLINK_MIN = 2400;
const BLINK_MAX = 6200;

export class Pet {
  constructor(stage, opts = {}) {
    this.stage = stage;
    this.spec = null;
    this.mode = 'hd';
    this.expression = 'idle';
    this.reducedMotion = !!opts.reducedMotion;
    this.onReact = opts.onReact || (() => {});
    this.blinkTimer = null;
    this.holdTimer = null;
    this.talkTimer = null;
    this.mood = 70;
    this.energy = 80;
    this.asleep = false;
    this.layer = document.createElement('div');
    this.layer.className = 'pet-fx';
    this.stage.appendChild(this.layer);
  }

  mount(spec, mode) {
    this.spec = spec;
    this.mode = mode;
    const svg = mode === 'pixel'
      ? renderPixel(spec)
      : mode === 'chibi'
        ? renderChibi(spec)
        : renderReal(spec);
    const host = this.stage.querySelector('.pet-host') || (() => {
      const d = document.createElement('div');
      d.className = 'pet-host';
      this.stage.insertBefore(d, this.layer);
      return d;
    })();
    host.innerHTML = svg;
    this.host = host;
    this.svg = host.querySelector('svg');
    this.root = this.svg.querySelector('.pet-root');
    this.head = this.svg.querySelector('.pet-head');
    this.eyes = [...this.svg.querySelectorAll('.pet-eye')];
    this.pupils = [...this.svg.querySelectorAll('.pet-pupil')];
    this.brows = [...this.svg.querySelectorAll('.pet-brow')];
    this.blush = this.svg.querySelector('.pet-blush');
    this.mouthPathEl = this.svg.querySelector('path.pet-mouth');
    this.mouthShapes = [...this.svg.querySelectorAll('.pet-mouth-shape')];
    this.applyExpression(this.asleep ? 'sleepy' : 'idle');
    this.scheduleBlink();
    return this;
  }

  destroy() {
    clearTimeout(this.blinkTimer);
    clearTimeout(this.holdTimer);
    clearInterval(this.talkTimer);
  }

  setReducedMotion(v) {
    this.reducedMotion = !!v;
    this.stage.classList.toggle('is-reduced', this.reducedMotion);
  }

  /* ------------------------------------------------------------- blinking */

  scheduleBlink() {
    clearTimeout(this.blinkTimer);
    if (this.reducedMotion) return;
    const wait = BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN);
    this.blinkTimer = setTimeout(() => {
      this.blink(Math.random() < 0.22);
      this.scheduleBlink();
    }, this.asleep ? wait * 2 : wait);
  }

  blink(double = false) {
    const shapes = this.visibleEyeShapes();
    if (!shapes.length) return;
    const close = () => shapes.forEach((s) => s.classList.add('is-blinking'));
    const open = () => shapes.forEach((s) => s.classList.remove('is-blinking'));
    close();
    setTimeout(() => {
      open();
      if (double) setTimeout(() => { close(); setTimeout(open, 85); }, 110);
    }, 95);
  }

  visibleEyeShapes() {
    return this.eyes
      .map((eye) => eye.querySelector('.pet-eye-shape[data-shape="open"]'))
      .filter((el) => el && el.style.display !== 'none');
  }

  /* ---------------------------------------------------------- expressions */

  applyExpression(name) {
    const recipe = EXPRESSIONS[name] || EXPRESSIONS.idle;
    this.expression = name;

    this.eyes.forEach((eye) => {
      eye.querySelectorAll('.pet-eye-shape').forEach((shape) => {
        const on = shape.dataset.shape === recipe.eyes;
        shape.style.display = on ? '' : 'none';
        if (on) shape.classList.remove('is-blinking');
      });
      eye.style.transform = `scale(${recipe.eyeScale})`;
    });

    if (this.mouthPathEl) {
      const mx = +this.mouthPathEl.dataset.mx;
      const my = +this.mouthPathEl.dataset.my;
      const mw = +this.mouthPathEl.dataset.mw;
      this.mouthPathEl.setAttribute('d', mouthPath(recipe.mouth, mx, my, mw, mw * 0.45));
      this.mouthPathEl.setAttribute('fill', ['bigSmile', 'open', 'o'].includes(recipe.mouth) ? 'rgba(0,0,0,.35)' : 'none');
    }
    this.mouthShapes.forEach((el) => {
      el.style.display = el.dataset.shape === recipe.mouth ? '' : 'none';
    });

    const pose = BROW_POSE[recipe.brows] || BROW_POSE.neutral;
    this.brows.forEach((b) => {
      const p = pose[b.dataset.side] || pose.l;
      b.style.transform = `translateY(${p.dy}px) rotate(${p.rot}deg)`;
      const rest = Number(b.dataset.rest ?? 0.8);
      b.style.opacity = recipe.brows === 'neutral' ? rest : Math.min(1, rest * 3.2 + 0.2);
    });

    if (this.blush) this.blush.style.opacity = recipe.blush;
    if (this.head) this.head.style.setProperty('--tilt', `${recipe.headTilt}deg`);
  }

  express(name, holdMs = 2200) {
    clearTimeout(this.holdTimer);
    this.applyExpression(name);
    if (holdMs > 0) {
      this.holdTimer = setTimeout(() => this.applyExpression(this.asleep ? 'sleepy' : 'idle'), holdMs);
    }
  }

  /* ---------------------------------------------------------- eye tracking */

  lookAt(clientX, clientY) {
    if (!this.svg || this.reducedMotion) return;
    const r = this.svg.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, (clientX - (r.left + r.width / 2)) / (r.width / 2)));
    const ny = Math.max(-1, Math.min(1, (clientY - (r.top + r.height / 2)) / (r.height / 2)));
    const range = this.mode === 'pixel' ? 0.7 : 3.2;
    this.pupils.forEach((pupil) => {
      pupil.style.transform = `translate(${(nx * range).toFixed(2)}px, ${(ny * range * 0.8).toFixed(2)}px)`;
    });
  }

  lookForward() {
    this.pupils.forEach((p) => { p.style.transform = 'translate(0,0)'; });
  }

  /* ------------------------------------------------------------- reactions */

  animate(cls, ms = 700) {
    if (this.reducedMotion || !this.root) return;
    this.root.classList.remove(cls);
    void this.root.offsetWidth;
    this.root.classList.add(cls);
    setTimeout(() => this.root.classList.remove(cls), ms);
  }

  react(kind, at) {
    this.wake();
    switch (kind) {
      case 'pet':
        this.adjust(+4, 0); this.express('happy', 1800); this.animate('fx-nuzzle', 900);
        this.burst('heart', at, 3); this.onReact('reactPet'); break;
      case 'poke':
        this.adjust(-2, 0); this.express('surprised', 1100); this.animate('fx-shake', 520);
        this.burst('spark', at, 2); this.onReact('reactPoke'); break;
      case 'swipe':
        this.adjust(+3, -3); this.express('excited', 1600); this.animate('fx-spin', 900);
        this.burst('star', at, 5); this.onReact('reactSwipe'); break;
      case 'hug':
        this.adjust(+8, +2); this.express('love', 2600); this.animate('fx-squish', 1200);
        this.burst('heart', at, 6); this.onReact('reactHug'); break;
      case 'feed':
        this.adjust(+6, +10); this.express('happy', 2200); this.animate('fx-bounce', 900);
        this.burst('sparkle', at, 4); this.onReact('reactFeed'); break;
      case 'doubleTap':
        this.adjust(+5, 0); this.express('love', 2000); this.animate('fx-bounce', 800);
        this.burst('heart', at, 4); this.onReact('reactHug'); break;
      default:
        this.express('happy', 1400);
    }
  }

  sleep() {
    this.asleep = true;
    this.stage.classList.add('is-asleep');
    this.applyExpression('sleepy');
    this.burst('zzz', null, 2);
    this.onReact('reactSleep');
  }

  wake() {
    if (!this.asleep) return;
    this.asleep = false;
    this.stage.classList.remove('is-asleep');
    this.applyExpression('idle');
  }

  adjust(mood, energy) {
    this.mood = Math.max(0, Math.min(100, this.mood + mood));
    this.energy = Math.max(0, Math.min(100, this.energy + energy));
    this.stage.dispatchEvent(new CustomEvent('pet:stats', { detail: { mood: this.mood, energy: this.energy }, bubbles: true }));
  }

  /* ---------------------------------------------------------------- talking */

  startTalking() {
    clearInterval(this.talkTimer);
    this.wake();
    clearTimeout(this.holdTimer);
    let open = false;
    this.applyExpression('talking');
    if (this.reducedMotion) return;
    this.talkTimer = setInterval(() => {
      open = !open;
      this.applyExpression(open ? 'talking' : 'happy');
    }, 190);
  }

  stopTalking() {
    clearInterval(this.talkTimer);
    this.talkTimer = null;
    this.express('happy', 1500);
  }

  thinking() {
    this.wake();
    this.express('surprised', 600);
    this.animate('fx-think', 1200);
  }

  /* --------------------------------------------------------------- particles */

  burst(kind, at, count = 3) {
    if (this.reducedMotion) return;
    const box = this.stage.getBoundingClientRect();
    const ox = at ? at.x - box.left : box.width / 2;
    const oy = at ? at.y - box.top : box.height * 0.42;
    const glyphs = { heart: '♥', star: '★', spark: '✦', sparkle: '✧', zzz: 'Z' };
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = `fx-particle fx-${kind}`;
      el.textContent = glyphs[kind] || '♥';
      el.style.left = `${ox + (Math.random() - 0.5) * 60}px`;
      el.style.top = `${oy + (Math.random() - 0.5) * 30}px`;
      el.style.setProperty('--dx', `${(Math.random() - 0.5) * 80}px`);
      el.style.setProperty('--dur', `${900 + Math.random() * 600}ms`);
      el.style.animationDelay = `${i * 70}ms`;
      this.layer.appendChild(el);
      setTimeout(() => el.remove(), 1800);
    }
  }
}
