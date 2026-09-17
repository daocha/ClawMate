// Code-drawn hand-animated chibis, deliberately separate from the HD cut-outs.
const VIEWBOX = '0 0 1000 1400';
const esc = (v = '') => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function face(animal = false) {
  const eye = (side) => `<g class="pet-eye" data-side="${side}">
    <ellipse class="pet-eye-shape" data-shape="open" cx="${500 + side * 115}" cy="458" rx="43" ry="55" fill="#fffaf2"/><ellipse class="pet-eye-shape" data-shape="open" cx="${500 + side * 115}" cy="466" rx="20" ry="34" fill="#342b37"/><circle class="pet-eye-shape" data-shape="open" cx="${508 + side * 115}" cy="445" r="8" fill="#fff"/>
    <path class="pet-eye-shape" data-shape="happy" d="M ${500 + side * 156} 462 Q ${500 + side * 115} 514 ${500 + side * 74} 462" fill="none" stroke="#342b37" stroke-width="15" stroke-linecap="round"/>
    <path class="pet-eye-shape" data-shape="sleepy" d="M ${500 + side * 154} 474 Q ${500 + side * 115} 494 ${500 + side * 76} 474" fill="none" stroke="#342b37" stroke-width="13" stroke-linecap="round"/>
    <path class="pet-eye-shape" data-shape="heart" d="M ${500 + side * 115} 499 C ${500 + side * 58} 458 ${500 + side * 80} 411 ${500 + side * 115} 445 C ${500 + side * 150} 411 ${500 + side * 172} 458 ${500 + side * 115} 499Z" fill="#ef6f8c"/>
    <path class="pet-eye-shape" data-shape="star" d="M ${500 + side * 115} 405 l13 29 31 2 -24 20 8 31 -28 -17 -28 17 8 -31 -24 -20 31 -2Z" fill="#ffc85c"/>
  </g>`;
  return `<g class="pet-head">${eye(-1)}${eye(1)}
    <g class="pet-brow" data-side="l" data-rest=".7"><path d="M 338 370 Q 385 353 430 370" class="chibi-brow"/></g><g class="pet-brow" data-side="r" data-rest=".7"><path d="M 570 370 Q 615 353 662 370" class="chibi-brow"/></g>
    <g class="pet-blush" opacity=".35" fill="#f59aa5"><ellipse cx="300" cy="574" rx="43" ry="18"/><ellipse cx="700" cy="574" rx="43" ry="18"/></g>
    ${animal ? '<ellipse cx="500" cy="535" rx="25" ry="17" fill="#4b3540"/>' : ''}<path class="pet-mouth" data-mx="500" data-my="${animal ? 578 : 565}" data-mw="74" fill="none" stroke="#5b3542" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function human(spec) {
  const p = spec.palette;
  return `<g class="pet-root"><ellipse class="pet-shadow" cx="500" cy="1300" rx="230" ry="34" fill="#4d4050" opacity=".16"/>
    <path d="M280 1250Q300 880 500 850Q700 880 720 1250Z" fill="${p.cloth}" class="chibi-line"/><path d="M345 926Q500 1030 655 926L625 1210Q500 1250 375 1210Z" fill="${p.accent}" opacity=".74"/>
    <path class="chibi-arm chibi-arm--l" d="M330 970Q218 1030 254 1160" stroke="${p.skin}"/><path class="chibi-arm chibi-arm--r" d="M670 970Q782 1030 746 1160" stroke="${p.skin}"/>
    <path d="M254 510Q205 160 500 120Q795 160 746 510L690 800Q500 900 310 800Z" fill="${p.hair}" class="chibi-line"/><ellipse cx="500" cy="490" rx="255" ry="298" fill="${p.skin}" class="chibi-line"/>
    <path d="M260 420Q255 148 502 154Q750 150 747 426Q665 334 588 360Q518 292 426 355Q335 330 260 420Z" fill="${p.hair}" class="chibi-line"/><path d="M318 225Q408 122 494 195Q575 112 690 237Q617 206 542 294Q436 226 318 225Z" fill="${p.hairLight}" opacity=".55"/>
    ${face()}</g>`;
}

function animal(spec) {
  const p = spec.palette; const cat = spec.ears === 'cat'; const dog = spec.ears === 'dog';
  const ears = cat ? `<path d="M276 344L282 92Q376 135 412 274M588 274Q624 135 718 92L724 344" fill="${p.body}" class="chibi-line"/><path d="M303 261L304 150 371 282M629 282L696 150 697 261" stroke="${p.inner}" stroke-width="35"/>`
    : dog ? `<path d="M282 385Q130 158 260 88Q389 160 402 330M598 330Q611 160 740 88Q870 158 718 385" fill="${p.bodyDark}" class="chibi-line"/>`
      : `<ellipse cx="310" cy="290" rx="105" ry="152" fill="${p.body}" class="chibi-line"/><ellipse cx="690" cy="290" rx="105" ry="152" fill="${p.body}" class="chibi-line"/>`;
  return `<g class="pet-root"><ellipse class="pet-shadow" cx="500" cy="1282" rx="254" ry="38" fill="#4d4050" opacity=".16"/>
    <path class="chibi-tail" d="M720 1100Q900 960 830 790Q940 895 876 1090Q835 1200 730 1225" fill="${p.bodyDark}" class="chibi-line"/><ellipse cx="500" cy="1050" rx="265" ry="245" fill="${p.body}" class="chibi-line"/><ellipse cx="500" cy="1125" rx="170" ry="130" fill="${p.belly}" opacity=".9"/>
    <path class="chibi-paw chibi-paw--l" d="M355 1080Q295 1164 346 1220" stroke="${p.bodyDark}"/><path class="chibi-paw chibi-paw--r" d="M645 1080Q705 1164 654 1220" stroke="${p.bodyDark}"/>
    ${ears}<ellipse cx="500" cy="510" rx="300" ry="285" fill="${p.body}" class="chibi-line"/><path d="M310 445Q500 315 690 445" fill="none" stroke="${p.bodyLight || p.bodyDark}" stroke-width="32" stroke-linecap="round" opacity=".65"/>${face(true)}
    ${cat ? `<path d="M298 578h-126M298 604h-146M702 578h126M702 604h146" stroke="${p.outline}" stroke-width="9" stroke-linecap="round" opacity=".7"/>` : ''}</g>`;
}

export function renderChibi(spec) {
  // The four active companions use bespoke illustrated cut-outs. The SVG wrapper
  // keeps the same gesture-driven bounce, hug, spin and particle reactions as
  // every other render mode; the code-drawn version remains a fallback for the
  // hidden catalogue characters.
  if (spec.visible) {
    const image = `./assets/chibi/${spec.id}-painted-v2.png`;
    return `<svg class="pet-svg pet-svg--chibi pet-svg--painted" viewBox="${VIEWBOX}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(spec.name.en)}" preserveAspectRatio="xMidYMid meet"><defs><filter id="chibi-soft-${esc(spec.id)}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="14" flood-opacity=".17"/></filter></defs><g class="pet-root" filter="url(#chibi-soft-${esc(spec.id)})"><image class="pet-chibi-art" href="${image}" x="18" y="0" width="964" height="1400" preserveAspectRatio="xMidYMid meet"/></g></svg>`;
  }
  const art = spec.archetype === 'humanoid' ? human(spec) : animal(spec);
  return `<svg class="pet-svg pet-svg--chibi" viewBox="${VIEWBOX}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(spec.name.en)}" preserveAspectRatio="xMidYMid meet"><defs><filter id="chibi-soft-${esc(spec.id)}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="14" flood-opacity=".17"/></filter></defs><g filter="url(#chibi-soft-${esc(spec.id)})">${art}</g></svg>`;
}
