import { mouthPath } from './face.js';

const VIEWBOX = '0 0 200 220';

const GEO = {
  chibi:   { cx: 100, eyeY: 88, eyeGap: 18, eyeRx: 12.5, eyeRy: 14.5, mouthY: 108, mouthW: 16, browY: 71, blushY: 97, blushDx: 31, headY: 76, headRx: 45, headRy: 43 },
  tall:    { cx: 100, eyeY: 65, eyeGap: 14.5, eyeRx: 11.5, eyeRy: 11, mouthY: 85,  mouthW: 14, browY: 50, blushY: 75, blushDx: 23, headY: 56, headRx: 32, headRy: 35 },
  real:    { cx: 100, eyeY: 54.5, eyeGap: 13.8, eyeRx: 9.2, eyeRy: 6.1, mouthY: 79, mouthW: 17, browY: 44, blushY: 66, blushDx: 20, headY: 54, headRx: 29, headRy: 37 },
  critter: { cx: 100, eyeY: 88, eyeGap: 21, eyeRx: 13,   eyeRy: 14.5, mouthY: 113, mouthW: 18, browY: 63, blushY: 104, blushDx: 36, headY: 86, headRx: 52, headRy: 48 }
};

const n = (v) => Math.round(v * 100) / 100;

function starPoints(cx, cy, outer, inner, points = 5) {
  const out = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    out.push(`${n(cx + Math.cos(a) * rad)},${n(cy + Math.sin(a) * rad)}`);
  }
  return out.join(' ');
}

function heartPath(cx, cy, s) {
  return `M ${n(cx)} ${n(cy + s * 0.42)} C ${n(cx - s * 1.05)} ${n(cy - s * 0.3)} ${n(cx - s * 0.5)} ${n(cy - s * 1.05)} ${n(cx)} ${n(cy - s * 0.4)} C ${n(cx + s * 0.5)} ${n(cy - s * 1.05)} ${n(cx + s * 1.05)} ${n(cy - s * 0.3)} ${n(cx)} ${n(cy + s * 0.42)} Z`;
}

function eye(uid, side, g, p, style) {
  const sx = side === 'l' ? -1 : 1;
  const cx = g.cx + sx * g.eyeGap;
  const cy = g.eyeY;
  const rx = g.eyeRx;
  const ry = g.eyeRy;
  const clipId = `${uid}-clip-${side}`;
  const realistic = style === 'realistic';
  const sparkle = style === 'sparkle';

  const inner = cx - sx * rx;
  const outer = cx + sx * rx;
  const shell = realistic
    ? `<path d="M ${n(inner)} ${n(cy + ry * 0.16)} Q ${n(cx)} ${n(cy - ry * 1.42)} ${n(outer)} ${n(cy - ry * 0.16)} Q ${n(cx)} ${n(cy + ry * 1.28)} ${n(inner)} ${n(cy + ry * 0.16)} Z"/>`
    : `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;

  const irisR = realistic ? rx * 0.72 : rx * 0.82;
  const irisCy = realistic ? cy - ry * 0.1 : cy + ry * 0.08;

  const lashes = realistic
    ? `<path class="pet-lash" d="M ${n(inner)} ${n(cy + ry * 0.16)} Q ${n(cx)} ${n(cy - ry * 1.48)} ${n(outer)} ${n(cy - ry * 0.16)}" fill="none" stroke="${p.hairDark || p.outline}" stroke-width="1.6" stroke-linecap="round"/>
       <path d="M ${n(outer)} ${n(cy - ry * 0.16)} l ${n(sx * 4.5)} ${n(-3)}" stroke="${p.hairDark || p.outline}" stroke-width="1.5" stroke-linecap="round" fill="none"/>`
    : sparkle
      ? `<path class="pet-lash" d="M ${n(cx - rx * 1.02)} ${n(cy - ry * 0.55)} Q ${n(cx)} ${n(cy - ry * 1.32)} ${n(cx + rx * 1.02)} ${n(cy - ry * 0.55)}" fill="none" stroke="${p.outline}" stroke-width="3" stroke-linecap="round"/>`
      : '';

  const glints = sparkle
    ? `<circle cx="${n(cx - irisR * 0.42)}" cy="${n(irisCy - irisR * 0.45)}" r="${n(irisR * 0.38)}" fill="#fff" opacity=".95"/>
       <circle cx="${n(cx + irisR * 0.45)}" cy="${n(irisCy + irisR * 0.35)}" r="${n(irisR * 0.22)}" fill="#fff" opacity=".8"/>
       <circle cx="${n(cx + irisR * 0.2)}" cy="${n(irisCy - irisR * 0.62)}" r="${n(irisR * 0.14)}" fill="#fff" opacity=".9"/>`
    : `<circle cx="${n(cx - irisR * 0.38)}" cy="${n(irisCy - irisR * 0.42)}" r="${n(irisR * 0.32)}" fill="#fff" opacity=".9"/>
       <circle cx="${n(cx + irisR * 0.4)}" cy="${n(irisCy + irisR * 0.4)}" r="${n(irisR * 0.17)}" fill="#fff" opacity=".7"/>`;

  return `<g class="pet-eye" data-side="${side}" style="transform-origin:${cx}px ${cy}px">
  <g class="pet-eye-shape" data-shape="open" style="transform-origin:${cx}px ${cy}px">
    <clipPath id="${clipId}">${shell}</clipPath>
    <g class="pet-eye-white" fill="#fffdfa" stroke="${p.outline}" stroke-width="${realistic ? 1.4 : 1.8}">${shell}</g>
    <g clip-path="url(#${clipId})">
      <g class="pet-pupil">
        <circle cx="${n(cx)}" cy="${n(irisCy)}" r="${n(irisR)}" fill="url(#${uid}-iris)"/>
        <circle cx="${n(cx)}" cy="${n(irisCy + irisR * 0.12)}" r="${n(irisR * 0.46)}" fill="${p.irisDark}"/>
        <ellipse cx="${n(cx)}" cy="${n(irisCy + irisR * 0.72)}" rx="${n(irisR * 0.7)}" ry="${n(irisR * 0.32)}" fill="#fff" opacity=".22"/>
        ${glints}
      </g>
    </g>
    ${lashes}
  </g>
  <path class="pet-eye-shape" data-shape="happy" style="display:none" fill="none" stroke="${p.outline}" stroke-width="3.4" stroke-linecap="round"
    d="M ${n(cx - rx * 0.95)} ${n(cy + ry * 0.35)} Q ${n(cx)} ${n(cy - ry * 0.85)} ${n(cx + rx * 0.95)} ${n(cy + ry * 0.35)}"/>
  <path class="pet-eye-shape" data-shape="sleepy" style="display:none" fill="none" stroke="${p.outline}" stroke-width="3.4" stroke-linecap="round"
    d="M ${n(cx - rx * 0.95)} ${n(cy - ry * 0.15)} Q ${n(cx)} ${n(cy + ry * 0.7)} ${n(cx + rx * 0.95)} ${n(cy - ry * 0.15)}"/>
  <path class="pet-eye-shape" data-shape="heart" style="display:none" fill="${p.blush}" stroke="${p.accent || p.outline}" stroke-width="1.2"
    d="${heartPath(cx, cy, rx * 1.05)}"/>
  <polygon class="pet-eye-shape" data-shape="star" style="display:none" fill="${p.accent || '#ffd76a'}" stroke="${p.outline}" stroke-width="1.2"
    points="${starPoints(cx, cy, rx * 1.15, rx * 0.5)}"/>
</g>`;
}

function face(uid, spec, g, p, opts = {}) {
  const style = spec.eyeStyle || 'round';
  const browColor = opts.browColor || p.hairDark || p.outline;
  const browW = g.eyeRx * 1.3;
  const brow = (side) => {
    const sx = side === 'l' ? -1 : 1;
    const bx = g.cx + sx * g.eyeGap;
    return `<path class="pet-brow" data-side="${side}" style="transform-origin:${bx}px ${g.browY}px" fill="none"
      stroke="${browColor}" stroke-width="${n(g.eyeRx * 0.19)}" stroke-linecap="round" opacity="${opts.browOpacity ?? 0.85}" data-rest="${opts.browOpacity ?? 0.85}"
      d="M ${n(bx - browW)} ${n(g.browY + 2)} Q ${n(bx)} ${n(g.browY - 3)} ${n(bx + browW)} ${n(g.browY + 1)}"/>`;
  };

  return `<g class="pet-face">
  ${brow('l')}${brow('r')}
  ${eye(uid, 'l', g, p, style)}
  ${eye(uid, 'r', g, p, style)}
  <g class="pet-blush" opacity=".35">
    <ellipse cx="${n(g.cx - g.blushDx)}" cy="${g.blushY}" rx="${n(g.eyeRx * 0.85)}" ry="${n(g.eyeRx * 0.5)}" fill="${p.blush}"/>
    <ellipse cx="${n(g.cx + g.blushDx)}" cy="${g.blushY}" rx="${n(g.eyeRx * 0.85)}" ry="${n(g.eyeRx * 0.5)}" fill="${p.blush}"/>
  </g>
  ${opts.nose || ''}
  <path class="pet-mouth" data-mx="${g.cx}" data-my="${g.mouthY}" data-mw="${g.mouthW}"
    d="${mouthPath('smile', g.cx, g.mouthY, g.mouthW, g.mouthW * 0.45)}"
    fill="${opts.mouthFill || 'none'}" stroke="${opts.mouthStroke || p.outline}" stroke-width="${n(g.mouthW * 0.16)}" stroke-linecap="round" stroke-linejoin="round"/>
</g>`;
}

function defs(uid, p) {
  return `<defs>
  <radialGradient id="${uid}-iris" cx="50%" cy="35%" r="70%">
    <stop offset="0%" stop-color="${p.iris}"/>
    <stop offset="60%" stop-color="${p.iris}"/>
    <stop offset="100%" stop-color="${p.irisDark}"/>
  </radialGradient>
  <linearGradient id="${uid}-body" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${p.bodyLight || p.body || p.skin}"/>
    <stop offset="100%" stop-color="${p.bodyDark || p.skinShade}"/>
  </linearGradient>
  <linearGradient id="${uid}-hair" x1="0.2" y1="0" x2="0.8" y2="1">
    <stop offset="0%" stop-color="${p.hairLight || p.body}"/>
    <stop offset="55%" stop-color="${p.hair || p.body}"/>
    <stop offset="100%" stop-color="${p.hairDark || p.bodyDark}"/>
  </linearGradient>
  <linearGradient id="${uid}-cloth" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${p.cloth || p.belly}"/>
    <stop offset="100%" stop-color="${p.clothDark || p.bodyDark}"/>
  </linearGradient>
  <linearGradient id="${uid}-face" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${p.skinLight || p.skin}"/>
    <stop offset="62%" stop-color="${p.skin}"/>
    <stop offset="100%" stop-color="${p.skinShade || p.skin}"/>
  </linearGradient>
  <linearGradient id="${uid}-lip" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${p.lipDark || p.accent}"/>
    <stop offset="55%" stop-color="${p.lip || p.accent}"/>
    <stop offset="100%" stop-color="${p.lipDark || p.accent}"/>
  </linearGradient>
  <radialGradient id="${uid}-glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${p.accent || p.iris}" stop-opacity=".45"/>
    <stop offset="100%" stop-color="${p.accent || p.iris}" stop-opacity="0"/>
  </radialGradient>
</defs>`;
}

/* ---------------------------------------------------------------- humanoid */

function hairBack(uid, spec, p) {
  if (spec.hair === 'twin-tails') {
    return `<g class="pet-hair-back">
      <ellipse cx="100" cy="78" rx="51" ry="46" fill="url(#${uid}-hair)"/>
      <g class="pet-hairtail" data-side="l" style="transform-origin:62px 74px">
        <ellipse cx="53" cy="98" rx="15" ry="27" fill="url(#${uid}-hair)" transform="rotate(-14 53 98)"/>
        <ellipse cx="50" cy="116" rx="10" ry="12" fill="${p.hairDark}" opacity=".28"/>
      </g>
      <g class="pet-hairtail" data-side="r" style="transform-origin:138px 74px">
        <ellipse cx="147" cy="98" rx="15" ry="27" fill="url(#${uid}-hair)" transform="rotate(14 147 98)"/>
        <ellipse cx="150" cy="116" rx="10" ry="12" fill="${p.hairDark}" opacity=".28"/>
      </g>
    </g>`;
  }
  if (spec.hair === 'high-ponytail') {
    return `<g class="pet-hair-back">
      <ellipse cx="100" cy="76" rx="45" ry="45" fill="url(#${uid}-hair)"/>
      <g class="pet-hairtail" data-side="r" style="transform-origin:128px 48px">
        <path d="M121 45 Q159 34 160 74 Q159 108 139 139 Q147 102 132 82 Q119 65 121 45 Z" fill="url(#${uid}-hair)"/>
        <path d="M143 62 Q150 89 141 116" stroke="${p.hairLight}" stroke-width="3" fill="none" opacity=".34" stroke-linecap="round"/>
      </g>
    </g>`;
  }
  return `<g class="pet-hair-back">
    <path d="M64 54 Q62 16 100 14 Q138 16 136 54 L144 178 Q120 187 100 182 Q80 187 56 178 Z" fill="url(#${uid}-hair)"/>
    <path d="M72 96 Q78 140 74 176" stroke="${p.hairLight}" stroke-width="3.5" fill="none" opacity=".35" stroke-linecap="round"/>
    <path d="M128 96 Q122 140 126 176" stroke="${p.hairLight}" stroke-width="3.5" fill="none" opacity=".35" stroke-linecap="round"/>
  </g>`;
}

function hairFront(uid, spec, p) {
  if (spec.hair === 'twin-tails') {
    return `<g class="pet-hair-front">
      <path d="M54 70 Q56 30 100 30 Q144 30 146 70 Q140 48 118 44 Q110 60 98 54 Q86 62 76 46 Q60 50 54 70 Z" fill="url(#${uid}-hair)"/>
      <ellipse cx="84" cy="42" rx="15" ry="6" fill="#fff" opacity=".3" transform="rotate(-16 84 42)"/>
      <g class="pet-accessory">
        <circle cx="52" cy="62" r="9" fill="${p.accent}"/><circle cx="52" cy="62" r="3.6" fill="#fff" opacity=".75"/>
        <circle cx="148" cy="62" r="9" fill="${p.accent}"/><circle cx="148" cy="62" r="3.6" fill="#fff" opacity=".75"/>
      </g>
    </g>`;
  }
  if (spec.hair === 'high-ponytail') {
    return `<g class="pet-hair-front">
      <path d="M68 55 Q69 20 100 17 Q130 20 132 52 Q119 35 106 30 Q97 46 84 33 Q75 39 68 55 Z" fill="url(#${uid}-hair)"/>
      <path d="M67 47 Q62 69 64 91 Q57 72 62 43 Z" fill="url(#${uid}-hair)"/>
      <path d="M132 45 Q137 61 135 82 Q142 64 137 40 Z" fill="url(#${uid}-hair)"/>
      <ellipse cx="126" cy="43" rx="8" ry="6" fill="${p.accent}" opacity=".9"/>
      <path d="M80 27 Q94 20 108 24" stroke="${p.hairLight}" stroke-width="4" fill="none" opacity=".38" stroke-linecap="round"/>
    </g>`;
  }
  return `<g class="pet-hair-front">
    <path d="M70 46 Q72 18 100 17 Q128 18 130 46 Q123 31 107 27 Q100 44 92 29 Q78 31 70 46 Z" fill="url(#${uid}-hair)"/>
    <path d="M70 42 Q65 70 63 94 Q57 64 65 38 Z" fill="url(#${uid}-hair)"/>
    <path d="M130 42 Q135 70 137 94 Q143 64 135 38 Z" fill="url(#${uid}-hair)"/>
    <path d="M80 26 Q94 20 108 24" stroke="${p.hairLight}" stroke-width="4" fill="none" opacity=".4" stroke-linecap="round"/>
  </g>`;
}

function buildHumanoid(uid, spec) {
  const p = spec.palette;
  const chibi = spec.body === 'chibi';
  const g = GEO[chibi ? 'chibi' : 'tall'];

  const body = chibi
    ? `<g class="pet-body">
        <rect x="87" y="178" width="12" height="27" rx="6" fill="${p.skin}"/>
        <rect x="101" y="178" width="12" height="27" rx="6" fill="${p.skin}"/>
        <ellipse cx="91" cy="204" rx="11" ry="6.5" fill="${p.accent}"/>
        <ellipse cx="109" cy="204" rx="11" ry="6.5" fill="${p.accent}"/>
        <path d="M74 116 Q100 107 126 116 L145 184 Q100 197 55 184 Z" fill="url(#${uid}-cloth)"/>
        <path d="M55 180 Q100 193 145 180 L145 186 Q100 199 55 186 Z" fill="${p.accent}" opacity=".5"/>
        <circle cx="100" cy="127" r="7" fill="${p.accent}"/>
        <path d="M93 127 h14" stroke="#fff" stroke-width="2" opacity=".5"/>
        <ellipse class="pet-limb" data-side="l" cx="59" cy="148" rx="10.5" ry="18" fill="${p.skin}" stroke="${p.skinShade}" stroke-width="1.2" style="transform-origin:72px 128px"/>
        <ellipse class="pet-limb" data-side="r" cx="141" cy="148" rx="10.5" ry="18" fill="${p.skin}" stroke="${p.skinShade}" stroke-width="1.2" style="transform-origin:128px 128px"/>
      </g>`
    : `<g class="pet-body">
        <rect x="92" y="86" width="16" height="16" rx="7" fill="${p.skinShade}"/>
        <path d="M74 106 Q100 96 126 106 L124 154 Q100 162 76 154 Z" fill="url(#${uid}-cloth)"/>
        <path d="M84 102 Q100 114 116 102 L117 128 Q100 136 83 128 Z" fill="${p.cloth2 || p.belly}"/>
        <path d="M84 102 Q100 114 116 102 L114 108 Q100 118 86 108 Z" fill="${p.skin}"/>
        <rect x="76" y="148" width="48" height="7" rx="3" fill="${p.accent}"/>
        <path d="M76 154 L124 154 L131 182 L69 182 Z" fill="${p.clothDark}"/>
        <rect x="84" y="178" width="13" height="26" rx="4" fill="${p.skin}"/>
        <rect x="103" y="178" width="13" height="26" rx="4" fill="${p.skin}"/>
        <rect x="80" y="192" width="19" height="18" rx="5" fill="${p.clothDark}"/>
        <rect x="101" y="192" width="19" height="18" rx="5" fill="${p.clothDark}"/>
        <rect x="80" y="192" width="19" height="4" rx="2" fill="${p.accent}" opacity=".8"/>
        <rect x="101" y="192" width="19" height="4" rx="2" fill="${p.accent}" opacity=".8"/>
        <ellipse class="pet-limb" data-side="l" cx="66" cy="136" rx="8" ry="30" fill="${p.skin}" stroke="${p.skinShade}" stroke-width="1.1" style="transform-origin:76px 108px"/>
        <ellipse class="pet-limb" data-side="r" cx="134" cy="136" rx="8" ry="30" fill="${p.skin}" stroke="${p.skinShade}" stroke-width="1.1" style="transform-origin:124px 108px"/>
      </g>`;

  const headShape = chibi
    ? `<ellipse cx="100" cy="${g.headY}" rx="${g.headRx}" ry="${g.headRy}" fill="${p.skin}"/>
       <ellipse cx="100" cy="${g.headY + 16}" rx="${g.headRx - 8}" ry="${g.headRy - 14}" fill="${p.skinShade}" opacity=".18"/>`
    : `<path d="M68 50 Q68 20 100 20 Q132 20 132 50 Q132 72 118 86 Q109 96 100 96 Q91 96 82 86 Q68 72 68 50 Z" fill="${p.skin}"/>
       <path d="M84 84 Q100 93 116 84 Q108 95 100 95 Q92 95 84 84 Z" fill="${p.skinShade}" opacity=".28"/>
       <path d="M86 74 Q100 79 114 74" stroke="${p.skinShade}" stroke-width="1.2" fill="none" opacity=".5"/>`;

  return `<g class="pet-shadow-layer"><ellipse class="pet-shadow" cx="100" cy="210" rx="50" ry="8" fill="#000" opacity=".14"/></g>
${hairBack(uid, spec, p)}
${body}
<g class="pet-head" style="transform-origin:100px ${g.headY + g.headRy}px">
  ${headShape}
  ${hairFront(uid, spec, p)}
  ${face(uid, spec, g, p, { browOpacity: chibi ? 0.42 : 0.45 })}
</g>`;
}

/* ------------------------------------------------- realistic human (Aria) */

function realisticEye(uid, side, g, p) {
  const sx = side === 'l' ? -1 : 1;
  const cx = g.cx + sx * g.eyeGap;
  const cy = g.eyeY;
  const rx = g.eyeRx;
  const ry = g.eyeRy;
  const inner = cx - sx * rx;
  const outer = cx + sx * rx;
  const innerY = cy + ry * 0.26;
  const outerY = cy - ry * 0.3;
  const clip = `${uid}-eclip-${side}`;
  const irisR = ry * 1.02;
  const irisCx = cx + sx * 0.4;

  const lidPath = `M ${inner} ${innerY} Q ${cx} ${n(cy - ry * 2.05)} ${outer} ${outerY} Q ${cx} ${n(cy + ry * 1.5)} ${inner} ${innerY} Z`;
  const upperLid = `M ${inner} ${innerY} Q ${cx} ${n(cy - ry * 2.05)} ${outer} ${outerY}`;
  const lowerLid = `M ${inner} ${innerY} Q ${cx} ${n(cy + ry * 1.5)} ${outer} ${outerY}`;
  const crease = `M ${n(inner + sx * 1.2)} ${n(innerY - ry * 1.15)} Q ${cx} ${n(cy - ry * 3.1)} ${n(outer - sx * 0.4)} ${n(outerY - ry * 0.95)}`;

  // A few iris fibres sell the depth without exploding the node count.
  let fibres = '';
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10 + 0.3;
    fibres += `<line x1="${n(irisCx + Math.cos(a) * irisR * 0.42)}" y1="${n(cy + Math.sin(a) * irisR * 0.42)}" x2="${n(irisCx + Math.cos(a) * irisR * 0.94)}" y2="${n(cy + Math.sin(a) * irisR * 0.94)}" stroke="${p.irisDark}" stroke-width=".32" opacity=".28"/>`;
  }

  return `<g class="pet-eye" data-side="${side}" style="transform-origin:${cx}px ${cy}px">
  <g class="pet-eye-shape" data-shape="open" style="transform-origin:${cx}px ${cy}px">
    <clipPath id="${clip}"><path d="${lidPath}"/></clipPath>
    <path d="${lidPath}" fill="#f6efec"/>
    <g clip-path="url(#${clip})">
      <ellipse cx="${cx}" cy="${n(cy - ry * 0.9)}" rx="${n(rx * 1.1)}" ry="${n(ry * 0.9)}" fill="${p.skinShade}" opacity=".38"/>
      <g class="pet-pupil">
        <circle cx="${n(irisCx)}" cy="${cy}" r="${n(irisR)}" fill="url(#${uid}-iris)"/>
        ${fibres}
        <circle cx="${n(irisCx)}" cy="${cy}" r="${n(irisR)}" fill="none" stroke="${p.irisDark}" stroke-width="1.05" opacity=".8"/>
        <ellipse cx="${n(irisCx)}" cy="${n(cy + irisR * 0.42)}" rx="${n(irisR * 0.6)}" ry="${n(irisR * 0.35)}" fill="#ffd9b0" opacity=".18"/>
        <circle cx="${n(irisCx)}" cy="${cy}" r="${n(irisR * 0.42)}" fill="#160d10"/>
        <circle cx="${n(irisCx - sx * irisR * 0.34)}" cy="${n(cy - irisR * 0.38)}" r="${n(irisR * 0.2)}" fill="#fff" opacity=".9"/>
        <circle cx="${n(irisCx + sx * irisR * 0.4)}" cy="${n(cy + irisR * 0.42)}" r="${n(irisR * 0.11)}" fill="#fff" opacity=".5"/>
      </g>
    </g>
    <path d="${lowerLid}" fill="none" stroke="${p.skinShade}" stroke-width=".9" opacity=".75"/>
    <path d="${lowerLid}" fill="none" stroke="#fff" stroke-width=".7" opacity=".35" transform="translate(0,1.2)"/>
    <path d="${upperLid}" fill="none" stroke="${p.lashColor || p.hairDark}" stroke-width="1.45" stroke-linecap="round"/>
    <path d="M ${outer} ${outerY} l ${n(sx * 2.2)} ${-1.5}" stroke="${p.lashColor || p.hairDark}" stroke-width="1.15" stroke-linecap="round" fill="none"/>
    <path d="M ${n(outer - sx * 2.6)} ${n(outerY - 0.8)} l ${n(sx * 1.9)} ${-1.7}" stroke="${p.lashColor || p.hairDark}" stroke-width=".85" stroke-linecap="round" fill="none"/>
    <path d="${crease}" fill="none" stroke="${p.skinShade}" stroke-width=".7" opacity=".3"/>
  </g>
  <path class="pet-eye-shape" data-shape="happy" style="display:none" fill="none" stroke="${p.hairDark}" stroke-width="2.2" stroke-linecap="round"
    d="M ${inner} ${n(cy + ry * 0.5)} Q ${cx} ${n(cy - ry * 1.5)} ${outer} ${n(cy + ry * 0.2)}"/>
  <path class="pet-eye-shape" data-shape="sleepy" style="display:none" fill="none" stroke="${p.hairDark}" stroke-width="2.2" stroke-linecap="round"
    d="M ${inner} ${n(cy - ry * 0.2)} Q ${cx} ${n(cy + ry * 1.2)} ${outer} ${n(cy - ry * 0.5)}"/>
  <path class="pet-eye-shape" data-shape="heart" style="display:none" fill="${p.accent}" stroke="${p.irisDark}" stroke-width=".8"
    d="${heartPath(cx, cy, rx * 0.78)}"/>
  <polygon class="pet-eye-shape" data-shape="star" style="display:none" fill="${p.accent}" stroke="${p.irisDark}" stroke-width=".8"
    points="${starPoints(cx, cy, rx * 0.85, rx * 0.36)}"/>
</g>`;
}

function realisticBrow(side, g, p) {
  const sx = side === 'l' ? -1 : 1;
  const bx = g.cx + sx * g.eyeGap;
  const by = g.browY;
  const inr = bx - sx * 9;
  const out = bx + sx * 10;
  return `<path class="pet-brow" data-side="${side}" data-rest=".82" opacity=".82"
    style="transform-origin:${bx}px ${by}px" fill="${p.browColor || p.hairLight}"
    stroke="${p.browColor || p.hairLight}" stroke-width="1.1" stroke-linejoin="round"
    d="M ${n(inr)} ${n(by + 2.3)} C ${n(bx - sx * 4)} ${n(by - 0.2)} ${n(bx + sx * 4)} ${n(by - 0.7)} ${n(out)} ${n(by + 1.4)}
       C ${n(bx + sx * 3.5)} ${n(by + 0.6)} ${n(bx - sx * 3.5)} ${n(by + 1.2)} ${n(inr)} ${n(by + 3)} Z"/>`;
}

function lipShape(uid, mx, my, w, lift, open, p) {
  const hw = w / 2;
  const lx = mx - hw;
  const rx = mx + hw;
  const cly = my - lift;
  const top = my - 2.8;
  const bot = my + 3.2 + open * 0.55;
  const upper = `M ${n(lx)} ${n(cly)} Q ${n(mx - hw * 0.5)} ${n(top - 0.4)} ${n(mx - hw * 0.17)} ${n(top + 1)} Q ${n(mx)} ${n(top - 0.9)} ${n(mx + hw * 0.17)} ${n(top + 1)} Q ${n(mx + hw * 0.5)} ${n(top - 0.4)} ${n(rx)} ${n(cly)}`;
  const lower = `Q ${n(mx + hw * 0.62)} ${n(bot)} ${n(mx)} ${n(bot)} Q ${n(mx - hw * 0.62)} ${n(bot)} ${n(lx)} ${n(cly)} Z`;
  const mouthOpen = open > 0
    ? `<path d="M ${n(lx + hw * 0.22)} ${n(cly + 0.4)} Q ${n(mx)} ${n(cly - 1.2 - open * 0.15)} ${n(rx - hw * 0.22)} ${n(cly + 0.4)} Q ${n(mx)} ${n(cly + open * 0.9)} ${n(lx + hw * 0.22)} ${n(cly + 0.4)} Z" fill="#5b2230"/>
       <path d="M ${n(lx + hw * 0.3)} ${n(cly + 0.2)} Q ${n(mx)} ${n(cly - 1)} ${n(rx - hw * 0.3)} ${n(cly + 0.2)} Z" fill="#fffaf6" opacity=".92"/>`
    : '';
  return `<path d="${upper} ${lower}" fill="url(#${uid}-lip)"/>
    ${mouthOpen}
    <path d="M ${n(lx)} ${n(cly)} Q ${n(mx)} ${n(my + 0.7)} ${n(rx)} ${n(cly)}" fill="none" stroke="${p.irisDark}" stroke-width=".85" opacity=".55" stroke-linecap="round"/>
    <ellipse cx="${n(mx)}" cy="${n(my + 1.9)}" rx="${n(hw * 0.42)}" ry="1.15" fill="#fff" opacity=".32"/>`;
}

function realisticMouth(uid, g, p) {
  const mx = g.cx;
  const my = g.mouthY;
  const w = g.mouthW;
  const variants = {
    smile:    [w * 1.08, 1.7, 0],
    bigSmile: [w * 1.05, 2.4, 3.4],
    open:     [w * 0.82, 0.6, 4.2],
    o:        [w * 0.5, 0, 4.6],
    sad:      [w * 0.92, -1.9, 0],
    flat:     [w * 0.85, 0, 0],
    wobble:   [w * 0.9, 0.4, 1.2],
    cat:      [w, 1.4, 0],
    neutral:  [w * 0.9, 0.3, 0]
  };
  return Object.entries(variants)
    .map(([kind, [ww, lift, open]]) =>
      `<g class="pet-mouth-shape" data-shape="${kind}"${kind === 'smile' ? '' : ' style="display:none"'}>${lipShape(uid, mx, my, ww, lift, open, p)}</g>`)
    .join('');
}

function buildRealistic(uid, spec) {
  const p = spec.palette;
  const g = GEO.real;
  const ponytail = spec.hair === 'high-ponytail';

  const facePath = `M 100 17
    C 84 17 72 27 71 45
    C 70.4 54 71.6 62 74 69
    C 77 77.5 84 86 92 90.4
    C 95 92 105 92 108 90.4
    C 116 86 123 77.5 126 69
    C 128.4 62 129.6 54 129 45
    C 128 27 116 17 100 17 Z`;

  return `<g class="pet-shadow-layer"><ellipse class="pet-shadow" cx="100" cy="212" rx="44" ry="7" fill="#000" opacity=".16"/></g>

<g class="pet-hair-back">
  ${ponytail
    ? `<path d="M107 18 C137 13 151 33 144 55 C138 74 128 91 139 126 C145 145 137 170 118 184 C124 151 112 130 116 101 C120 73 133 47 113 34 Z" fill="url(#${uid}-hair)"/>
       <path d="M66 52 C64 20 80 8 100 8 C120 8 136 20 134 52 L126 105 C117 111 83 111 74 105 Z" fill="url(#${uid}-hair)"/>
       <path d="M129 45 C138 82 124 116 132 157" fill="none" stroke="${p.hairLight}" stroke-width="3" opacity=".3" stroke-linecap="round"/>`
    : `<path d="M66 52 C64 20 80 8 100 8 C120 8 136 20 134 52 L140 176 C138 190 128 196 118 193 C112 176 114 120 112 96 L88 96 C86 120 88 176 82 193 C72 196 62 190 60 176 Z" fill="url(#${uid}-hair)"/>
       <path d="M74 60 C70 100 72 150 76 184" fill="none" stroke="${p.hairLight}" stroke-width="3.2" opacity=".28" stroke-linecap="round"/>
       <path d="M126 60 C130 100 128 150 124 184" fill="none" stroke="${p.hairLight}" stroke-width="3.2" opacity=".28" stroke-linecap="round"/>`}
</g>

<g class="pet-body">
  <path d="M92 86 h16 v16 q-8 5 -16 0 Z" fill="${p.skinShade}"/>
  <path d="M92 92 q8 7 16 0 v6 q-8 6 -16 0 Z" fill="#000" opacity=".16"/>
  <path d="M76 108 C82 100 90 97 100 97 C110 97 118 100 124 108 L127 150 C118 156 82 156 73 150 Z" fill="${p.cloth2 || '#f4ece4'}"/>
  <path d="M88 97 q12 10 24 0 l-2 9 q-10 7 -20 0 Z" fill="${p.skin}"/>
  <path d="M86 99 q14 11 28 0" fill="none" stroke="${p.skinShade}" stroke-width=".9" opacity=".5"/>
  <rect x="74" y="148" width="52" height="7" rx="3" fill="${p.accent}"/>
  <path d="M74 154 L126 154 L133 186 L67 186 Z" fill="${p.clothDark}"/>
  <path d="M100 154 L100 186" stroke="#000" stroke-width="1" opacity=".18"/>
  <rect x="84" y="182" width="13" height="26" rx="5" fill="${p.skin}"/>
  <rect x="103" y="182" width="13" height="26" rx="5" fill="${p.skin}"/>
  <rect x="82" y="196" width="17" height="17" rx="5" fill="${p.clothDark}"/>
  <rect x="101" y="196" width="17" height="17" rx="5" fill="${p.clothDark}"/>
  <rect x="82" y="196" width="17" height="4" rx="2" fill="${p.accent}" opacity=".85"/>
  <rect x="101" y="196" width="17" height="4" rx="2" fill="${p.accent}" opacity=".85"/>
  <ellipse class="pet-limb" data-side="l" cx="69" cy="134" rx="7.5" ry="30" fill="${p.skin}" stroke="${p.skinShade}" stroke-width=".9" style="transform-origin:78px 108px"/>
  <ellipse class="pet-limb" data-side="r" cx="131" cy="134" rx="7.5" ry="30" fill="${p.skin}" stroke="${p.skinShade}" stroke-width=".9" style="transform-origin:122px 108px"/>
</g>

<g class="pet-head" style="transform-origin:100px 92px">
  <ellipse cx="70" cy="58" rx="4.5" ry="7" fill="${p.skin}" stroke="${p.skinShade}" stroke-width=".8"/>
  <ellipse cx="130" cy="58" rx="4.5" ry="7" fill="${p.skin}" stroke="${p.skinShade}" stroke-width=".8"/>
  <path d="${facePath}" fill="url(#${uid}-face)"/>
  <path d="M74 66 C78 78 86 87 93 90.8 C89 91 82 86 78 79 Z" fill="${p.skinShade}" opacity=".3"/>
  <path d="M126 66 C122 78 114 87 107 90.8 C111 91 118 86 122 79 Z" fill="${p.skinShade}" opacity=".22"/>
  <ellipse cx="100" cy="88" rx="7" ry="3" fill="${p.skinShade}" opacity=".25"/>

  <g class="pet-face">
    ${realisticBrow('l', g, p)}${realisticBrow('r', g, p)}
    ${realisticEye(uid, 'l', g, p)}
    ${realisticEye(uid, 'r', g, p)}

    <path d="M95.4 68.6 Q97.4 71.2 100 71.1 Q102.6 71.2 104.6 68.6" fill="none" stroke="${p.skinShade}" stroke-width="1" opacity=".45" stroke-linecap="round"/>
    <ellipse cx="100" cy="68.2" rx="2.6" ry="1.5" fill="#fff" opacity=".18"/>
    <ellipse cx="96.4" cy="70.2" rx=".95" ry=".62" fill="${p.skinShade}" opacity=".6" transform="rotate(-18 96.4 70.2)"/>
    <ellipse cx="103.6" cy="70.2" rx=".95" ry=".62" fill="${p.skinShade}" opacity=".6" transform="rotate(18 103.6 70.2)"/>

    <g class="pet-blush" opacity=".35">
      <ellipse cx="82" cy="67" rx="6" ry="3" fill="${p.blush}" opacity=".55" transform="rotate(-8 82 67)"/>
      <ellipse cx="118" cy="67" rx="6" ry="3" fill="${p.blush}" opacity=".55" transform="rotate(8 118 67)"/>
    </g>

    ${realisticMouth(uid, g, p)}
  </g>

  <g class="pet-hair-front">
    <path d="M66 54 C64 21 80 10 100 10 C120 10 136 21 134 54 C132 44 127 35 119 31 C113 36 106 38.5 100 38.5 C94 38.5 87 36 81 31 C73 35 68 44 66 54 Z" fill="url(#${uid}-hair)"/>
    <path d="M66 50 C63 70 62 86 65 99 C59 81 59 62 64 45 Z" fill="url(#${uid}-hair)"/>
    <path d="M134 50 C137 70 138 86 135 99 C141 81 141 62 136 45 Z" fill="url(#${uid}-hair)"/>
    <path d="M82 21 C91 15 109 15 118 21" fill="none" stroke="${p.hairLight}" stroke-width="3" opacity=".22" stroke-linecap="round"/>
    ${ponytail ? `<path d="M77 31 C88 36 104 36 119 27 C111 42 94 48 78 42 Z" fill="${p.hairDark}" opacity=".42"/>` : ''}
  </g>
</g>`;
}

/* ----------------------------------------------------------------- critter */

function ears(uid, spec, p) {
  switch (spec.ears) {
    case 'cat':
      return `<g class="pet-ears">
        <path class="pet-ear" data-side="l" style="transform-origin:72px 56px" d="M58 62 L66 18 L96 46 Z" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="2"/>
        <path d="M66 54 L70 32 L84 48 Z" fill="${p.inner}"/>
        <path class="pet-ear" data-side="r" style="transform-origin:128px 56px" d="M142 62 L134 18 L104 46 Z" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="2"/>
        <path d="M134 54 L130 32 L116 48 Z" fill="${p.inner}"/>
      </g>`;
    case 'fox':
      return `<g class="pet-ears">
        <path class="pet-ear" data-side="l" style="transform-origin:70px 58px" d="M54 64 L58 10 L98 44 Z" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="2"/>
        <path d="M60 22 L58 10 L72 22 Z" fill="${p.outline}"/>
        <path d="M64 54 L66 26 L84 46 Z" fill="${p.inner}"/>
        <path class="pet-ear" data-side="r" style="transform-origin:130px 58px" d="M146 64 L142 10 L102 44 Z" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="2"/>
        <path d="M140 22 L142 10 L128 22 Z" fill="${p.outline}"/>
        <path d="M136 54 L134 26 L116 46 Z" fill="${p.inner}"/>
      </g>`;
    case 'dog':
      return `<g class="pet-ears">
        <g class="pet-ear" data-side="l" style="transform-origin:68px 58px"><ellipse cx="62" cy="78" rx="14" ry="26" fill="${p.accent}" stroke="${p.outline}" stroke-width="1.4" transform="rotate(-22 62 78)"/></g>
        <g class="pet-ear" data-side="r" style="transform-origin:132px 58px"><ellipse cx="138" cy="78" rx="14" ry="26" fill="${p.accent}" stroke="${p.outline}" stroke-width="1.4" transform="rotate(22 138 78)"/></g>
      </g>`;
    case 'bunny':
      return `<g class="pet-ears">
        <g class="pet-ear" data-side="l" style="transform-origin:80px 56px">
          <ellipse cx="76" cy="24" rx="12" ry="32" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="2" transform="rotate(-9 76 24)"/>
          <ellipse cx="76" cy="26" rx="6" ry="23" fill="${p.inner}" transform="rotate(-9 76 26)"/>
        </g>
        <g class="pet-ear" data-side="r" style="transform-origin:120px 56px">
          <ellipse cx="124" cy="24" rx="12" ry="32" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="2" transform="rotate(9 124 24)"/>
          <ellipse cx="124" cy="26" rx="6" ry="23" fill="${p.inner}" transform="rotate(9 124 26)"/>
        </g>
      </g>`;
    case 'panda':
      return `<g class="pet-ears">
        <circle class="pet-ear" data-side="l" style="transform-origin:64px 56px" cx="60" cy="48" r="19" fill="${p.accent}"/>
        <circle class="pet-ear" data-side="r" style="transform-origin:136px 56px" cx="140" cy="48" r="19" fill="${p.accent}"/>
      </g>`;
    case 'dragon':
      return `<g class="pet-ears">
        <path class="pet-ear" data-side="l" style="transform-origin:74px 50px" d="M74 50 L62 18 L88 40 Z" fill="${p.accent}" stroke="${p.outline}" stroke-width="1.6"/>
        <path class="pet-ear" data-side="r" style="transform-origin:126px 50px" d="M126 50 L138 18 L112 40 Z" fill="${p.accent}" stroke="${p.outline}" stroke-width="1.6"/>
        <path d="M100 38 l6 12 l-12 0 z" fill="${p.inner}"/>
      </g>`;
    case 'star':
      return `<g class="pet-ears">
        <polygon class="pet-ear" data-side="l" style="transform-origin:100px 40px" points="${starPoints(100, 30, 18, 8)}" fill="${p.accent}" stroke="${p.outline}" stroke-width="1.6"/>
        <circle cx="62" cy="52" r="4" fill="${p.accent}" opacity=".8"/>
        <circle cx="138" cy="52" r="4" fill="${p.accent}" opacity=".8"/>
      </g>`;
    default:
      return '';
  }
}

function tail(uid, spec, p) {
  switch (spec.tail) {
    case 'cat':
      return `<path class="pet-tail" style="transform-origin:148px 170px" d="M146 172 Q182 168 178 138 Q176 120 160 122 Q172 126 170 140 Q170 158 144 160 Z" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="1.5"/>`;
    case 'fox':
      return `<path class="pet-tail" style="transform-origin:146px 168px" d="M146 168 Q192 160 186 118 Q178 92 156 104 Q180 112 176 136 Q172 156 144 156 Z" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="1.5"/>
              <path d="M162 100 Q180 96 184 116 Q170 104 158 108 Z" fill="${p.belly}"/>`;
    case 'fluff':
      return `<path class="pet-tail" style="transform-origin:146px 160px" d="M144 158 Q178 158 176 132 Q174 112 154 116 Q170 122 166 136 Q162 148 142 146 Z" fill="${p.belly}" stroke="${p.accent}" stroke-width="2"/>`;
    case 'puff':
      return `<circle class="pet-tail" style="transform-origin:150px 164px" cx="152" cy="166" r="14" fill="${p.belly}" stroke="${p.outline}" stroke-width="1.5"/>`;
    case 'dragon':
      return `<path class="pet-tail" style="transform-origin:146px 176px" d="M144 176 Q184 178 180 148 L192 156 L182 140 L190 132 Q170 126 164 148 Q160 164 142 164 Z" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="1.5"/>`;
    default:
      return '';
  }
}

// Each species gets its own skull silhouette - a single ellipse made every
// character read as the same round blob.
function critterHead(spec, p, uid) {
  const fill = `url(#${uid}-body)`;
  const stroke = `stroke="${p.outline}" stroke-width="2"`;
  switch (spec.ears) {
    case 'cat':
      return `<path d="M100 40 C121 40 140 51 145 72 C149 91 140 111 122 123 C115 128 107 130 100 130 C93 130 85 128 78 123 C60 111 51 91 55 72 C60 51 79 40 100 40 Z" fill="${fill}" ${stroke}/>
        <path d="M60 96 q-9 3 -13 7" fill="none" stroke="${p.outline}" stroke-width="1.3" stroke-linecap="round" opacity=".45"/>
        <path d="M140 96 q9 3 13 7" fill="none" stroke="${p.outline}" stroke-width="1.3" stroke-linecap="round" opacity=".45"/>`;
    case 'fox':
      return `<path d="M100 40 C120 40 138 50 142 71 C145 87 138 101 126 111 L106 128 C102 131 98 131 94 128 L74 111 C62 101 55 87 58 71 C62 50 80 40 100 40 Z" fill="${fill}" ${stroke}/>`;
    case 'dog':
      return `<path d="M100 40 C122 40 141 52 144 74 C147 94 136 112 118 120 C112 123 106 124 100 124 C94 124 88 123 82 120 C64 112 53 94 56 74 C59 52 78 40 100 40 Z" fill="${fill}" ${stroke}/>
`;
    case 'bunny':
      return `<path d="M100 38 C119 38 134 50 137 72 C140 94 131 114 116 124 C111 128 105 130 100 130 C95 130 89 128 84 124 C69 114 60 94 63 72 C66 50 81 38 100 38 Z" fill="${fill}" ${stroke}/>`;
    case 'dragon':
      return `<path d="M100 40 C120 40 137 50 142 68 C146 82 142 94 133 104 L114 124 C108 130 92 130 86 124 L67 104 C58 94 54 82 58 68 C63 50 80 40 100 40 Z" fill="${fill}" ${stroke}/>
        <path d="M70 70 Q84 62 96 68" fill="none" stroke="${p.outline}" stroke-width="1.6" opacity=".5"/>
        <path d="M130 70 Q116 62 104 68" fill="none" stroke="${p.outline}" stroke-width="1.6" opacity=".5"/>`;
    case 'none':
      return `<path d="M100 38 C120 38 135 52 138 74 C141 96 130 116 113 125 C109 127 104 128 100 128 C96 128 91 127 87 125 C70 116 59 96 62 74 C65 52 80 38 100 38 Z" fill="${fill}" ${stroke}/>`;
    default:
      return `<ellipse cx="100" cy="86" rx="52" ry="48" fill="${fill}" ${stroke}/>`;
  }
}

function buildCritter(uid, spec) {
  const p = spec.palette;
  const g = GEO.critter;
  const isPenguin = !!spec.beak;
  const isNova = spec.id === 'nova';

  const wings = spec.wings
    ? `<g class="pet-wings">
        <path class="pet-wing" data-side="l" style="transform-origin:72px 138px" d="M72 138 Q34 106 22 130 Q40 128 34 144 Q52 138 48 152 Q64 150 72 160 Z" fill="${p.inner}" stroke="${p.outline}" stroke-width="1.5" opacity=".95"/>
        <path class="pet-wing" data-side="r" style="transform-origin:128px 138px" d="M128 138 Q166 106 178 130 Q160 128 166 144 Q148 138 152 152 Q136 150 128 160 Z" fill="${p.inner}" stroke="${p.outline}" stroke-width="1.5" opacity=".95"/>
      </g>`
    : '';

  const feet = isNova
    ? ''
    : isPenguin
      ? `<ellipse cx="78" cy="196" rx="17" ry="7" fill="${p.nose}"/><ellipse cx="122" cy="196" rx="17" ry="7" fill="${p.nose}"/>`
      : `<ellipse class="pet-foot" data-side="l" cx="78" cy="194" rx="16" ry="10" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="1.5"/>
         <ellipse class="pet-foot" data-side="r" cx="122" cy="194" rx="16" ry="10" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="1.5"/>
         <ellipse cx="78" cy="196" rx="8" ry="5" fill="${p.inner}" opacity=".8"/>
         <ellipse cx="122" cy="196" rx="8" ry="5" fill="${p.inner}" opacity=".8"/>`;

  const arms = isPenguin
    ? `<ellipse class="pet-limb" data-side="l" cx="64" cy="158" rx="11" ry="28" fill="${p.bodyDark}" style="transform-origin:64px 128px" transform="rotate(-8 64 158)"/>
       <ellipse class="pet-limb" data-side="r" cx="136" cy="158" rx="11" ry="28" fill="${p.bodyDark}" style="transform-origin:136px 128px" transform="rotate(8 136 158)"/>`
    : `<ellipse class="pet-limb" data-side="l" cx="62" cy="158" rx="13" ry="18" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="1.5" style="transform-origin:70px 142px"/>
       <ellipse class="pet-limb" data-side="r" cx="138" cy="158" rx="13" ry="18" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="1.5" style="transform-origin:130px 142px"/>`;

  const bodyShape = isNova
    ? `<ellipse cx="100" cy="158" rx="37" ry="34" fill="url(#${uid}-body)" opacity=".95"/>
       <ellipse cx="100" cy="164" rx="24" ry="21" fill="${p.belly}" opacity=".6"/>`
    : `<ellipse cx="100" cy="160" rx="39" ry="36" fill="url(#${uid}-body)" stroke="${p.outline}" stroke-width="2"/>
       <ellipse cx="100" cy="166" rx="25" ry="26" fill="${p.belly}"/>`;

  const markings = spec.id === 'bao'
    ? `<ellipse cx="72" cy="86" rx="17" ry="20" fill="${p.accent}" transform="rotate(-12 72 86)"/>
       <ellipse cx="128" cy="86" rx="17" ry="20" fill="${p.accent}" transform="rotate(12 128 86)"/>`
    : spec.id === 'coco'
      ? `<path d="M100 60 Q70 64 62 96 Q74 84 100 82 Q126 84 138 96 Q130 64 100 60 Z" fill="${p.accent}" opacity=".45"/>`
      : '';

  const muzzle = isPenguin
    ? `<path class="pet-beak" d="M100 106 L114 116 L100 126 L86 116 Z" fill="${p.nose}" stroke="${p.outline}" stroke-width="1.2"/>`
    : isNova
      ? ''
      : spec.ears === 'fox'
        ? `<path d="M100 96 C110 96 116 104 114 114 C112 122 106 126 100 126 C94 126 88 122 86 114 C84 104 90 96 100 96 Z" fill="${p.belly}" stroke="${p.outline}" stroke-width="1.2" opacity=".95"/>`
        : spec.ears === 'dog'
          ? `<ellipse cx="100" cy="116" rx="24" ry="16" fill="${p.belly}" stroke="${p.outline}" stroke-width="1.2" opacity=".95"/>`
          : spec.ears === 'cat'
            ? `<ellipse cx="100" cy="117" rx="19" ry="12" fill="${p.belly}" stroke="${p.outline}" stroke-width="1.1" opacity=".92"/>`
            : `<ellipse cx="100" cy="118" rx="21" ry="14" fill="${p.belly}" opacity=".9"/>`;

  const nose = isPenguin || isNova
    ? ''
    : `<path d="M100 105 l7 6 l-7 6 l-7 -6 z" fill="${p.nose}"/>`;

  const sparkles = isNova
    ? `<g class="pet-sparkles">
        <polygon points="${starPoints(40, 70, 7, 3)}" fill="${p.accent}" opacity=".8"/>
        <polygon points="${starPoints(168, 96, 6, 2.5)}" fill="${p.accent}" opacity=".7"/>
        <polygon points="${starPoints(150, 44, 5, 2)}" fill="${p.accent}" opacity=".6"/>
        <circle cx="100" cy="120" r="88" fill="url(#${uid}-glow)"/>
      </g>`
    : '';

  return `<g class="pet-shadow-layer"><ellipse class="pet-shadow" cx="100" cy="207" rx="50" ry="9" fill="#000" opacity="${isNova ? 0.08 : 0.15}"/></g>
${sparkles}
${wings}
${tail(uid, spec, p)}
<g class="pet-body">${feet}${arms}${bodyShape}${isPenguin ? `<ellipse cx="100" cy="164" rx="26" ry="28" fill="${p.belly}"/>` : ''}</g>
<g class="pet-head" style="transform-origin:100px 130px">
  ${ears(uid, spec, p)}
  ${critterHead(spec, p, uid)}
  ${markings}
  ${muzzle}
  ${face(uid, spec, g, p, { browOpacity: 0.14, nose, mouthStroke: p.outline })}
</g>`;
}

export function renderHD(spec, mode = 'hd') {
  const chibiMode = mode === 'chibi';
  const uid = `${chibiMode ? 'chibi' : 'hd'}-${spec.id}`;
  const renderSpec = chibiMode && spec.archetype === 'humanoid'
    ? { ...spec, body: 'tall' }
    : spec;
  const inner = spec.archetype === 'humanoid'
    ? (chibiMode ? buildHumanoid(uid, renderSpec) : buildRealistic(uid, renderSpec))
    : buildCritter(uid, renderSpec);
  return `<svg class="pet-svg pet-svg--${chibiMode ? 'chibi' : 'hd'}" viewBox="${VIEWBOX}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
${defs(uid, renderSpec.palette)}
<g class="pet-root">${inner}</g>
</svg>`;
}

export { GEO as HD_GEO };
