const VIEWBOX = '0 0 1000 1500';

// HD uses photographic cutouts. Keeping them inside SVG means the existing
// drag, breathe, bounce, and particle effects can animate them unchanged.
// `crop` is used in the stage and character picker. Full-body artwork stays
// reserved for the explicit lightbox preview so choosing a companion never
// unexpectedly turns the interface into a full-body gallery.
export function renderReal(spec, presentation = 'crop') {
  const human = spec.archetype === 'humanoid';
  const fullPortraits = {
    momo: 'momo-young-v2.png',
    aria: 'aria-s-curve-full-v5.png',
    mochi: 'mochi-real-longhair-v5.png'
  };
  const croppedPortraits = {
    momo: 'momo-knee-v4.png',
    aria: 'aria-knee-v3.png',
    mochi: 'mochi-real-longhair-v5.png'
  };
  const portraits = presentation === 'full' ? fullPortraits : croppedPortraits;
  const image = `./assets/hd/${portraits[spec.id] || `${spec.id}.png`}`;
  if (presentation === 'stage') {
    return `<div class="pet-stage-art pet-real-stage${human ? '' : ' pet-real-stage--critter'}" role="img" aria-label="${spec.name.en}">
  <div class="pet-root"><img class="pet-stage-image pet-photo${human ? ' pet-photo--portrait' : ''}" src="${image}" alt="" draggable="false"></div>
</div>`;
  }

  const frame = human
    ? { x: 35, y: 35, width: 930, height: 1380, shadowY: null, shadowRx: 0 }
    : { x: 40, y: 150, width: 920, height: 1160, shadowY: 1320, shadowRx: 260 };

  const shadow = frame.shadowY == null
    ? ''
    : `<g class="pet-shadow-layer">
        <ellipse class="pet-shadow" cx="500" cy="${frame.shadowY}" rx="${frame.shadowRx}" ry="38" fill="url(#real-shadow-${spec.id})"/>
      </g>`;

  const cropHuman = human && presentation !== 'full';
  const viewBox = cropHuman ? '0 0 1000 960' : VIEWBOX;
  const imageFit = cropHuman ? 'xMidYMin meet' : 'xMidYMid meet';
  return `<svg class="pet-svg pet-svg--real${cropHuman ? ' pet-svg--portrait-crop' : ''}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${spec.name.en}" preserveAspectRatio="xMidYMid meet">
  <defs>
    <radialGradient id="real-shadow-${spec.id}">
      <stop offset="0" stop-color="#000" stop-opacity=".28"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${shadow}
  <g class="pet-root">
    <image class="pet-photo${human ? ' pet-photo--portrait' : ''}" href="${image}" x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" preserveAspectRatio="${imageFit}"/>
  </g>
</svg>`;
}
