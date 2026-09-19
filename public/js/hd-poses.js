// The original stage portrait is shown first. Every later tap picks an unused
// v1/v3 pose at random; a fresh shuffled run starts only after all poses play.
export const HD_POSES = {
  momo: [
    ['wave', 1], ['stretch', 1], ['bow', 1], ['look-back', 1], ['jump', 1],
    ['peace', 3], ['stretch', 3], ['bow', 3], ['look-back', 3], ['jump', 3]
  ],
  aria: [
    ['wave', 1], ['stretch', 1], ['bow', 1], ['profile-turn', 1], ['look-back', 1],
    ['wave', 3], ['stretch', 3], ['bow', 3], ['profile-turn', 3], ['look-back', 3]
  ]
};

export class HDPoseCycle {
  constructor(image, character) {
    this.image = image;
    this.index = 0;
    this.disposed = false;
    this.frames = [image.getAttribute('src'), ...HD_POSES[character].map(
      ([pose, version]) => `./assets/hd/poses/${character}/${pose}-v${version}.png?v=${version}`
    )];
    this.queue = [];
    // Decode ahead so a tap does not replace a visible image with an empty one.
    this.ready = this.frames.map((src, index) => {
      if (index === 0) return Promise.resolve(true);
      const preload = new Image();
      preload.src = src;
      return preload.decode().then(() => true, () => false);
    });
  }

  async next() {
    const index = this.index = this.nextPoseIndex();
    const ready = await this.ready[index];
    // A slower earlier request must not overwrite a newer tap or a remount.
    if (this.disposed || this.index !== index) return;
    if (!ready) { this.index = 0; }
    this.image.src = this.frames[this.index];
    this.image.dataset.poseIndex = String(this.index);
  }

  nextPoseIndex() {
    if (!this.queue.length) this.queue = this.shuffledPoseIndices();
    return this.queue.shift();
  }

  shuffledPoseIndices() {
    const indices = Array.from({ length: this.frames.length - 1 }, (_, i) => i + 1);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    // Do not repeat the final frame of the previous shuffled run.
    if (indices[0] === this.index && indices.length > 1) {
      [indices[0], indices[1]] = [indices[1], indices[0]];
    }
    return indices;
  }

  contains(at) {
    const box = this.image.getBoundingClientRect();
    return at.x >= box.left && at.x <= box.right && at.y >= box.top && at.y <= box.bottom;
  }

  destroy() {
    this.disposed = true;
  }
}
