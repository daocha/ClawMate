const VIEWBOX = '0 0 1000 1500';

// HD uses photographic cutouts. Keeping them inside SVG means the existing
// drag, breathe, bounce, and particle effects can animate them unchanged.
export function renderReal(spec) {
  const human = spec.archetype === 'humanoid';
  const portraits = { momo: 'momo-knee-v3.png', aria: 'aria-knee-v3.png' };
  const image = `./assets/hd/${portraits[spec.id] || `${spec.id}.png`}`;
  const frame = human
    ? { x: 35, y: 35, width: 930, height: 1380, shadowY: null, shadowRx: 0 }
    : { x: 40, y: 150, width: 920, height: 1160, shadowY: 1320, shadowRx: 260 };

  const shadow = frame.shadowY == null
    ? ''
    : `<g class="pet-shadow-layer">
        <ellipse class="pet-shadow" cx="500" cy="${frame.shadowY}" rx="${frame.shadowRx}" ry="38" fill="url(#real-shadow-${spec.id})"/>
      </g>`;

  return `<svg class="pet-svg pet-svg--real" viewBox="${VIEWBOX}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${spec.name.en}" preserveAspectRatio="xMidYMid meet">
  <defs>
    <radialGradient id="real-shadow-${spec.id}">
      <stop offset="0" stop-color="#000" stop-opacity=".28"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${shadow}
  <g class="pet-root">
    <image class="pet-photo${human ? ' pet-photo--portrait' : ''}" href="${image}" x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" preserveAspectRatio="xMidYMid meet"/>
  </g>
</svg>`;
}
