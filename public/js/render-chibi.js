const VIEWBOX = '0 0 1000 1400';

// Premium Q assets preserve each character's face, species anatomy, markings,
// outfit, and silhouette instead of rebuilding everyone from round primitives.
export function renderChibi(spec) {
  const image = `./assets/chibi/${spec.id}.png`;
  const animal = spec.archetype !== 'humanoid';
  const frame = animal
    ? { x: 30, y: 90, width: 940, height: 1190, shadowY: 1300, shadowRx: 270 }
    : { x: 45, y: 25, width: 910, height: 1330, shadowY: 1350, shadowRx: 210 };

  return `<svg class="pet-svg pet-svg--chibi" viewBox="${VIEWBOX}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${spec.name.en}" preserveAspectRatio="xMidYMid meet">
  <defs>
    <radialGradient id="chibi-shadow-${spec.id}">
      <stop offset="0" stop-color="#000" stop-opacity=".24"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g class="pet-shadow-layer">
    <ellipse class="pet-shadow" cx="500" cy="${frame.shadowY}" rx="${frame.shadowRx}" ry="34" fill="url(#chibi-shadow-${spec.id})"/>
  </g>
  <g class="pet-root">
    <image class="pet-chibi-art" href="${image}" x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" preserveAspectRatio="xMidYMid meet"/>
  </g>
</svg>`;
}
