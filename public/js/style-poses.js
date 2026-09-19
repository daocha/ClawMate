// Standalone raster poses, intentionally parallel to assets/hd/poses.
// Each tap replaces the actual image source: no sprite sheets or CSS cropping.
const ACTIONS = {
  momo: ['wave', 'happy', 'step', 'peace', 'jump'],
  aria: ['wave', 'read', 'think', 'step', 'jump'],
  mochi: ['wave', 'sit', 'stretch', 'jump', 'groom'],
  coco: ['wave', 'sit', 'bow', 'run', 'jump']
};

function chibiBase(id) {
  const legacy = { momo: 'momo-painted-v4.png', aria: 'aria-painted-v4.png' };
  return `./assets/chibi/${legacy[id] || `${id}-painted-v2.png`}`;
}

export function stylePoseFrames(id, style) {
  const poses = (ACTIONS[id] || []).map((action) => `./assets/${style}/poses/${id}/${action}-v1.png`);
  if (style === 'cartoon') return [`./assets/cartoon/${id}-v3-1.png`, `./assets/cartoon/${id}-v3-2.png`, ...poses];
  return [chibiBase(id), ...poses];
}

export function renderStylePoseStage(spec, style) {
  const [base] = stylePoseFrames(spec.id, style);
  return `<div class="pet-stage-art pet-${style}-stage" role="img" aria-label="${spec.name.en}">
    <div class="pet-root"><img class="pet-stage-image pet-style-pose-image" src="${base}" alt="" draggable="false"></div>
  </div>`;
}

export class StylePoseCycle {
  constructor(image, id, style) {
    this.image = image;
    this.frames = stylePoseFrames(id, style);
    this.index = 0;
    this.queue = [];
    this.disposed = false;
    this.ready = this.frames.map((src) => {
      const preload = new Image();
      preload.src = src;
      return preload.decode().then(() => true, () => false);
    });
  }

  async next() {
    const index = this.index = this.nextIndex();
    const ready = await this.ready[index];
    if (this.disposed || this.index !== index) return;
    this.image.src = this.frames[ready ? index : 0];
    this.image.dataset.poseIndex = String(ready ? index : 0);
  }

  nextIndex() {
    if (!this.queue.length) this.queue = this.shuffledIndices();
    return this.queue.shift();
  }

  shuffledIndices() {
    const indices = Array.from({ length: this.frames.length }, (_, index) => index);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    if (indices[0] === this.index && indices.length > 1) [indices[0], indices[1]] = [indices[1], indices[0]];
    return indices;
  }

  contains(at) {
    const box = this.image.getBoundingClientRect();
    return at.x >= box.left && at.x <= box.right && at.y >= box.top && at.y <= box.bottom;
  }

  destroy() { this.disposed = true; }
}
