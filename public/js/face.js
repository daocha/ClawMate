// Shared facial geometry so the HD renderer, the pixel renderer and the
// expression engine always agree on what "happy" looks like.

const r = (n) => Math.round(n * 100) / 100;

export function mouthPath(kind, mx, my, w = 20, h = 8) {
  const x = mx;
  const y = my;
  const hw = w / 2;
  switch (kind) {
    case 'smile':
      return `M ${r(x - hw)} ${r(y - h * 0.15)} Q ${r(x)} ${r(y + h)} ${r(x + hw)} ${r(y - h * 0.15)}`;
    case 'bigSmile':
      return `M ${r(x - hw * 1.15)} ${r(y - h * 0.3)} Q ${r(x)} ${r(y + h * 1.9)} ${r(x + hw * 1.15)} ${r(y - h * 0.3)} Q ${r(x)} ${r(y + h * 0.5)} ${r(x - hw * 1.15)} ${r(y - h * 0.3)} Z`;
    case 'open':
      return `M ${r(x - hw * 0.75)} ${r(y - h * 0.2)} Q ${r(x)} ${r(y + h * 1.6)} ${r(x + hw * 0.75)} ${r(y - h * 0.2)} Q ${r(x)} ${r(y - h * 0.9)} ${r(x - hw * 0.75)} ${r(y - h * 0.2)} Z`;
    case 'o':
      return `M ${r(x)} ${r(y - h * 0.8)} C ${r(x + hw * 0.8)} ${r(y - h * 0.8)} ${r(x + hw * 0.8)} ${r(y + h * 1.1)} ${r(x)} ${r(y + h * 1.1)} C ${r(x - hw * 0.8)} ${r(y + h * 1.1)} ${r(x - hw * 0.8)} ${r(y - h * 0.8)} ${r(x)} ${r(y - h * 0.8)} Z`;
    case 'sad':
      return `M ${r(x - hw * 0.85)} ${r(y + h * 0.55)} Q ${r(x)} ${r(y - h * 0.75)} ${r(x + hw * 0.85)} ${r(y + h * 0.55)}`;
    case 'flat':
      return `M ${r(x - hw * 0.6)} ${r(y + h * 0.1)} L ${r(x + hw * 0.6)} ${r(y + h * 0.1)}`;
    case 'wobble':
      return `M ${r(x - hw * 0.9)} ${r(y + h * 0.1)} q ${r(hw * 0.45)} ${r(-h * 0.8)} ${r(hw * 0.9)} 0 q ${r(hw * 0.45)} ${r(h * 0.8)} ${r(hw * 0.9)} 0`;
    case 'cat':
      return `M ${r(x - hw * 0.9)} ${r(y - h * 0.2)} q ${r(hw * 0.45)} ${r(h * 0.85)} ${r(hw * 0.9)} 0 q ${r(hw * 0.45)} ${r(-h * 0.85)} ${r(hw * 0.9)} 0`;
    default:
      return `M ${r(x - hw * 0.5)} ${r(y)} Q ${r(x)} ${r(y + h * 0.55)} ${r(x + hw * 0.5)} ${r(y)}`;
  }
}

// name -> visual recipe
export const EXPRESSIONS = {
  idle:      { mouth: 'smile',    eyes: 'open',   brows: 'neutral', blush: 0.35, eyeScale: 1,    headTilt: 0 },
  happy:     { mouth: 'bigSmile', eyes: 'happy',  brows: 'up',      blush: 0.9,  eyeScale: 1,    headTilt: -3 },
  excited:   { mouth: 'open',     eyes: 'star',   brows: 'up',      blush: 0.8,  eyeScale: 1.08, headTilt: 3 },
  love:      { mouth: 'smile',    eyes: 'heart',  brows: 'up',      blush: 1,    eyeScale: 1.05, headTilt: -4 },
  surprised: { mouth: 'o',        eyes: 'open',   brows: 'up',      blush: 0.3,  eyeScale: 1.2,  headTilt: 0 },
  sleepy:    { mouth: 'flat',     eyes: 'sleepy', brows: 'down',    blush: 0.25, eyeScale: 1,    headTilt: 6 },
  sad:       { mouth: 'sad',      eyes: 'open',   brows: 'sad',     blush: 0.2,  eyeScale: 0.95, headTilt: 5 },
  annoyed:   { mouth: 'wobble',   eyes: 'open',   brows: 'angry',   blush: 0.3,  eyeScale: 0.92, headTilt: -2 },
  talking:   { mouth: 'open',     eyes: 'open',   brows: 'neutral', blush: 0.4,  eyeScale: 1,    headTilt: 0 }
};

export const BROW_POSE = {
  neutral: { l: { dy: 0, rot: 0 }, r: { dy: 0, rot: 0 } },
  up:      { l: { dy: -3, rot: -6 }, r: { dy: -3, rot: 6 } },
  down:    { l: { dy: 2.5, rot: 4 }, r: { dy: 2.5, rot: -4 } },
  sad:     { l: { dy: 1.5, rot: 14 }, r: { dy: 1.5, rot: -14 } },
  angry:   { l: { dy: 2, rot: -18 }, r: { dy: 2, rot: 18 } }
};

export const EYE_SHAPES = ['open', 'happy', 'sleepy', 'heart', 'star'];
