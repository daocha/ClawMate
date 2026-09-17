import { renderModelPreview } from './pixel-model.js?v=26';

// Legacy catalogue entries retain their 32x32 preview; the four active
// companions use the detailed articulated model for previews and the stage.
const SIZE = 32;

export const hasPixelModel = (spec) => ['momo', 'aria', 'mochi', 'coco'].includes(spec.id);

class Grid {
  constructor(size = SIZE) {
    this.size = size;
    this.cells = new Array(size * size).fill(null);
  }
  px(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (!c || x < 0 || y < 0 || x >= this.size || y >= this.size) return;
    this.cells[y * this.size + x] = c;
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    }
  }
  tri(x0, y0, x1, y1, x2, y2, c) {
    const minX = Math.floor(Math.min(x0, x1, x2));
    const maxX = Math.ceil(Math.max(x0, x1, x2));
    const minY = Math.floor(Math.min(y0, y1, y2));
    const maxY = Math.ceil(Math.max(y0, y1, y2));
    const sign = (ax, ay, bx, by, cx, cy) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        const d1 = sign(px, py, x0, y0, x1, y1);
        const d2 = sign(px, py, x1, y1, x2, y2);
        const d3 = sign(px, py, x2, y2, x0, y0);
        const neg = d1 < 0 || d2 < 0 || d3 < 0;
        const pos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(neg && pos)) this.px(x, y, c);
      }
    }
  }
  // Mirror the left half onto the right half for perfect symmetry.
  mirror() {
    const half = this.size / 2;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < half; x++) {
        const c = this.cells[y * this.size + x];
        this.cells[y * this.size + (this.size - 1 - x)] = c;
      }
    }
  }
  outline(color) {
    const next = this.cells.slice();
    const at = (x, y) => (x < 0 || y < 0 || x >= this.size || y >= this.size ? null : this.cells[y * this.size + x]);
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (at(x, y)) continue;
        if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) next[y * this.size + x] = color;
      }
    }
    this.cells = next;
  }
  toRects() {
    let out = '';
    for (let y = 0; y < this.size; y++) {
      let x = 0;
      while (x < this.size) {
        const c = this.cells[y * this.size + x];
        if (!c) { x++; continue; }
        let w = 1;
        while (x + w < this.size && this.cells[y * this.size + x + w] === c) w++;
        out += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`;
        x += w;
      }
    }
    return out;
  }
}

/* ------------------------------------------------------------------ pieces */

function pixelEye(side, p, ex, ey) {
  // ex/ey = top-left of the 4x5 open-eye block for the LEFT eye.
  const m = (x, w = 1) => (side === 'l' ? x : SIZE - x - w);
  const cell = (x, y, w, h, c) => `<rect x="${m(x, w)}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  const dot = (x, y, c) => cell(x, y, 1, 1, c);

  const open = [
    cell(ex, ey, 4, 5, '#fffdfa'),
    cell(ex, ey + 1, 3, 3, p.iris),
    cell(ex + 1, ey + 2, 2, 2, p.irisDark),
    dot(ex, ey + 1, '#ffffff')
  ].join('');

  const happy = [dot(ex, ey + 2, p.outline), dot(ex + 1, ey + 1, p.outline), dot(ex + 2, ey + 1, p.outline), dot(ex + 3, ey + 2, p.outline)].join('');
  const sleepy = [dot(ex, ey + 2, p.outline), dot(ex + 1, ey + 3, p.outline), dot(ex + 2, ey + 3, p.outline), dot(ex + 3, ey + 2, p.outline)].join('');
  const heart = [
    dot(ex, ey + 1, p.blush), dot(ex + 2, ey + 1, p.blush),
    cell(ex - 1, ey + 2, 5, 1, p.blush),
    cell(ex, ey + 3, 3, 1, p.blush),
    dot(ex + 1, ey + 4, p.blush)
  ].join('');
  const star = [
    dot(ex + 1, ey, p.accent || '#ffd76a'),
    cell(ex - 1, ey + 1, 5, 1, p.accent || '#ffd76a'),
    cell(ex, ey + 2, 3, 1, p.accent || '#ffd76a'),
    dot(ex, ey + 3, p.accent || '#ffd76a'), dot(ex + 2, ey + 3, p.accent || '#ffd76a')
  ].join('');

  const cx = side === 'l' ? ex + 2 : SIZE - ex - 2;
  const cy = ey + 2.5;
  return `<g class="pet-eye" data-side="${side}" style="transform-origin:${cx}px ${cy}px">
    <g class="pet-eye-shape" data-shape="open" style="transform-origin:${cx}px ${cy}px">${open}</g>
    <g class="pet-eye-shape" data-shape="happy" style="display:none">${happy}</g>
    <g class="pet-eye-shape" data-shape="sleepy" style="display:none">${sleepy}</g>
    <g class="pet-eye-shape" data-shape="heart" style="display:none">${heart}</g>
    <g class="pet-eye-shape" data-shape="star" style="display:none">${star}</g>
  </g>`;
}

function pixelMouth(p, mx, my) {
  const d = (x, y, c) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;
  const run = (x, y, w, c) => `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`;
  const o = p.outline;
  const shapes = {
    smile: d(mx - 2, my, o) + d(mx - 1, my + 1, o) + d(mx, my + 1, o) + d(mx + 1, my + 1, o) + d(mx + 2, my, o),
    bigSmile: run(mx - 2, my, 5, o) + run(mx - 2, my + 1, 5, p.inner || p.blush) + run(mx - 1, my + 2, 3, o),
    open: run(mx - 1, my, 3, o) + run(mx - 1, my + 1, 3, p.inner || p.blush) + run(mx - 1, my + 2, 3, o),
    o: run(mx - 1, my, 2, o) + run(mx - 1, my + 1, 2, o),
    sad: d(mx - 2, my + 1, o) + d(mx - 1, my, o) + d(mx, my, o) + d(mx + 1, my, o) + d(mx + 2, my + 1, o),
    flat: run(mx - 1, my + 1, 3, o),
    wobble: d(mx - 2, my + 1, o) + d(mx - 1, my, o) + d(mx, my + 1, o) + d(mx + 1, my, o) + d(mx + 2, my + 1, o),
    cat: d(mx - 2, my, o) + d(mx - 1, my + 1, o) + d(mx, my, o) + d(mx + 1, my + 1, o) + d(mx + 2, my, o),
    neutral: run(mx - 1, my + 1, 2, o)
  };
  return Object.entries(shapes)
    .map(([k, v]) => `<g class="pet-mouth-shape" data-shape="${k}"${k === 'smile' ? '' : ' style="display:none"'}>${v}</g>`)
    .join('');
}

/* --------------------------------------------------------------- painters */

function paintCritter(body, head, spec, p) {
  const isPenguin = !!spec.beak;
  const isNova = spec.id === 'nova';

  if (spec.tail === 'cat') { body.ellipse(26, 21, 2, 5, p.bodyDark); body.ellipse(27, 17, 2, 2, p.bodyDark); }
  if (spec.tail === 'fox') { body.ellipse(26, 21, 3.5, 5.5, p.bodyDark); body.ellipse(27, 17, 2.5, 2.5, p.belly); }
  if (spec.tail === 'fluff') { body.ellipse(26, 20, 3, 4, p.belly); }
  if (spec.tail === 'puff') { body.ellipse(26, 23, 2.5, 2.5, p.belly); }
  if (spec.tail === 'dragon') { body.ellipse(26, 22, 2, 4, p.bodyDark); body.tri(28, 15, 31, 18, 27, 19, p.accent); }
  if (spec.wings) { body.tri(8, 15, 1, 14, 7, 22, p.inner); body.tri(24, 15, 31, 14, 25, 22, p.inner); }

  // feet + arms
  if (!isNova) {
    body.rect(9, 29, 4, 2, isPenguin ? p.nose : p.bodyDark);
    body.rect(19, 29, 4, 2, isPenguin ? p.nose : p.bodyDark);
    body.ellipse(6, 24, 2, 3.5, isPenguin ? p.bodyDark : p.body);
    body.ellipse(25, 24, 2, 3.5, isPenguin ? p.bodyDark : p.body);
  }
  body.ellipse(16, 24, 8, 7.5, p.body);
  body.ellipse(16, 25, 5, 5.5, p.belly);

  // head
  head.ellipse(16, 13, 10, 9, p.body);
  if (spec.id === 'bao') { head.ellipse(11, 12, 2.5, 3, p.accent); head.ellipse(21, 12, 2.5, 3, p.accent); }
  if (spec.id === 'coco') { head.ellipse(16, 6, 9, 3.5, p.accent); }
  if (spec.id === 'kiko') { head.ellipse(16, 18, 6, 3, p.belly); }

  switch (spec.ears) {
    case 'cat': head.tri(6, 8, 8, 0, 14, 6, p.body); head.tri(26, 8, 24, 0, 18, 6, p.body);
      head.tri(8, 7, 9, 3, 12, 6, p.inner); head.tri(24, 7, 23, 3, 20, 6, p.inner); break;
    case 'fox': head.tri(5, 9, 6, 0, 14, 6, p.body); head.tri(27, 9, 26, 0, 18, 6, p.body);
      head.tri(7, 8, 8, 2, 12, 6, p.inner); head.tri(25, 8, 24, 2, 20, 6, p.inner);
      head.tri(6, 2, 6, 0, 9, 2, p.outline); head.tri(26, 2, 26, 0, 23, 2, p.outline); break;
    case 'dog': head.ellipse(6, 12, 2.5, 6, p.accent); head.ellipse(26, 12, 2.5, 6, p.accent); break;
    case 'bunny': head.ellipse(11, 3, 2, 6, p.body); head.ellipse(21, 3, 2, 6, p.body);
      head.ellipse(11, 3, 1, 4, p.inner); head.ellipse(21, 3, 1, 4, p.inner); break;
    case 'panda': head.ellipse(8, 6, 3, 3, p.accent); head.ellipse(24, 6, 3, 3, p.accent); break;
    case 'dragon': head.tri(11, 6, 8, 0, 14, 4, p.accent); head.tri(21, 6, 24, 0, 18, 4, p.accent); break;
    case 'star': head.tri(16, 0, 13, 5, 19, 5, p.accent); head.px(6, 8, p.accent); head.px(26, 9, p.accent); break;
    default: break;
  }

  if (isPenguin) { head.tri(13, 17, 19, 17, 16, 21, p.nose); }
  else if (!isNova) { head.ellipse(16, 17, 4, 2.5, p.belly); head.px(16, 15, p.nose); head.px(15, 16, p.nose); head.px(16, 16, p.nose); head.px(17, 16, p.nose); }

  head.px(10, 16, p.blush); head.px(11, 16, p.blush);
  head.px(21, 16, p.blush); head.px(22, 16, p.blush);
}

function paintHumanoid(body, head, spec, p) {
  const chibi = spec.body === 'chibi';
  const isMomo = spec.id === 'momo';
  if (chibi) {
    body.rect(13, 28, 3, 3, p.skin); body.rect(17, 28, 3, 3, p.skin);
    body.rect(12, 30, 4, 1, p.accent); body.rect(17, 30, 4, 1, p.accent);
    body.tri(11, 30, 21, 30, 16, 19, p.cloth);
    body.rect(10, 27, 12, 3, p.cloth);
    body.rect(10, 29, 12, 1, p.clothDark);
    body.ellipse(9, 24, 1.5, 2.5, p.skin); body.ellipse(23, 24, 1.5, 2.5, p.skin);
    body.px(16, 22, p.accent); body.px(16, 23, p.accent);

    head.ellipse(16, 13, 10.5, 9.5, p.hair);      // back hair
    head.ellipse(16, 14, 8.5, 8, p.skin);          // face
    head.ellipse(16, 7, 9, 4, p.hair);             // bangs
    head.rect(6, 8, 3, 2, p.hair); head.rect(23, 8, 3, 2, p.hair);
    head.ellipse(5, 14, 2.5, 5, p.hair); head.ellipse(27, 14, 2.5, 5, p.hair);  // twin tails
    head.ellipse(5, 9, 2, 2, p.accent); head.ellipse(27, 9, 2, 2, p.accent);    // ties
    head.px(12, 5, p.hairLight); head.px(13, 5, p.hairLight);
  } else {
    // The pixel twins inherit the same outfit anchors as their HD and chibi
    // counterparts: Momo's cream cardigan/pink skirt versus Aria's ivory
    // blouse/plum office skirt. That makes the three modes readable as one cast.
    const skirt = isMomo ? p.accent : p.clothDark;
    const shoe = isMomo ? '#fffaf5' : p.clothDark;
    const top = isMomo ? p.cloth2 : p.cloth;
    body.rect(13, 27, 3, 4, p.skin); body.rect(17, 27, 3, 4, p.skin);
    body.rect(12, 30, 4, 1, shoe); body.rect(17, 30, 4, 1, shoe);
    body.rect(12, 27, 4, 3, shoe); body.rect(17, 27, 4, 3, shoe);
    body.tri(11, 27, 21, 27, 16, 21, skirt);
    body.rect(11, 25, 11, 3, skirt);
    body.rect(11, 24, 11, 1, isMomo ? p.clothDark : p.accent);
    body.rect(11, 19, 11, 5, top);
    body.rect(13, 19, 7, 4, isMomo ? p.cloth2 : (p.cloth2 || p.belly));
    body.rect(14, 19, 5, 1, p.skin);
    body.ellipse(9, 22, 1.5, 4, p.skin); body.ellipse(23, 22, 1.5, 4, p.skin);
    if (isMomo) { body.rect(10, 19, 2, 5, p.cloth); body.rect(20, 19, 2, 5, p.cloth); }
    body.rect(14, 17, 4, 2, p.skin);

    head.ellipse(16, 12, 9.5, 10, p.hairDark);
    if (spec.hair === 'high-ponytail') {
      head.ellipse(26, 12, 3.5, 8, p.hairDark);
      head.rect(25, 17, 3, 8, p.hairDark);
      head.rect(24, 6, 3, 3, p.accent);
    } else {
      head.rect(5, 13, 3, 13, p.hairDark); head.rect(24, 13, 3, 13, p.hairDark);
    }
    head.ellipse(16, 14, 7, 7.5, p.skin);
    head.ellipse(16, 7, 8.5, 4, p.hair);
    head.rect(7, 8, 2, 8, p.hair); head.rect(23, 8, 2, 8, p.hair);
    head.px(12, 4, p.hairLight); head.px(13, 4, p.hairLight); head.px(19, 4, p.hairLight);
  }
  head.px(9, 17, p.blush); head.px(10, 17, p.blush);
  head.px(22, 17, p.blush); head.px(23, 17, p.blush);
}

/* ---------------------------------------------------------------- compose */

export function renderPixel(spec, presentation = 'crop') {
  if (hasPixelModel(spec)) return renderModelPreview(spec, presentation);
  const p = spec.palette;
  const body = new Grid();
  const head = new Grid();
  const chibi = spec.body === 'chibi';

  if (spec.archetype === 'humanoid') paintHumanoid(body, head, spec, p);
  else paintCritter(body, head, spec, p);

  body.outline(p.outline || p.bodyDark || p.hairDark);
  head.outline(p.outline || p.bodyDark || p.hairDark);

  const eyeY = spec.archetype === 'humanoid' ? (chibi ? 12 : 11) : 11;
  const mouth = spec.archetype === 'humanoid'
    ? { x: 16, y: chibi ? 19 : 17 }
    : { x: 16, y: 18 };
  const headOriginY = spec.archetype === 'humanoid' ? 22 : 21;

  const cropHuman = spec.archetype === 'humanoid' && presentation !== 'full';
  const viewBox = cropHuman ? `0 0 ${SIZE} 25` : `0 0 ${SIZE} ${SIZE}`;
  return `<svg class="pet-svg pet-svg--pixel${cropHuman ? ' pet-svg--portrait-crop' : ''}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet">
<g class="pet-root">
  <g class="pet-shadow-layer"><rect class="pet-shadow" x="8" y="31" width="16" height="1" fill="#000" opacity=".16"/></g>
  <g class="pet-body">${body.toRects()}</g>
  <g class="pet-head" style="transform-origin:16px ${headOriginY}px">
    ${head.toRects()}
    <g class="pet-face">
      ${pixelEye('l', p, 10, eyeY)}
      ${pixelEye('r', p, 10, eyeY)}
      ${pixelMouth(p, mouth.x, mouth.y)}
    </g>
  </g>
</g>
</svg>`;
}
