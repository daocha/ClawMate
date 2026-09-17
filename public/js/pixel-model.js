// A small software rasterizer and articulated character model. No textures,
// image crops, CSS rotations or offscreen image pieces are used: every frame
// is filled from posed geometry on the same integer pixel grid.
// Padding is part of the logical canvas so a hop or outstretched paw cannot
// be clipped at the stage edge on a narrow phone.
export const WIDTH = 128;
export const HEIGHT = 164;
export const ACTIONS = ['wave', 'dance', 'hop', 'stretch', 'bow', 'kick'];
// Idle/tap reactions favor different moves per personality, so the same
// gesture reads differently depending on who you tapped - lively characters
// dance and hop more, calmer ones stretch and bow more.
const ACTION_WEIGHTS = {
  momo: { wave: 1, dance: 1.5, hop: 1.3, stretch: 0.6, bow: 0.8, kick: 0.6 },
  aria: { wave: 0.8, dance: 0.5, hop: 0.6, stretch: 1.4, bow: 1.4, kick: 0.4 },
  mochi: { wave: 0.7, dance: 0.8, hop: 1.1, stretch: 1.3, bow: 0.6, kick: 0.9 },
  coco: { wave: 1.1, dance: 1.2, hop: 1.6, stretch: 0.6, bow: 0.5, kick: 1.4 }
};
const TAU = Math.PI * 2;
const mix = (a, b, t) => a + (b - a) * t;
const lerp = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
const colors = new Map();
function rgba(hex) {
  if (!colors.has(hex)) {
    const n = parseInt(hex.slice(1), 16);
    colors.set(hex, [n >> 16, (n >> 8) & 255, n & 255, 255]);
  }
  return colors.get(hex);
}

export class PixelGrid {
  constructor() { this.cells = new Array(WIDTH * HEIGHT).fill(null); }
  rect(x, y, w, h, color) {
    for (let py = Math.max(0, Math.round(y)); py < Math.min(HEIGHT, Math.round(y + h)); py++) {
      for (let px = Math.max(0, Math.round(x)); px < Math.min(WIDTH, Math.round(x + w)); px++) {
        this.cells[py * WIDTH + px] = color;
      }
    }
  }
  polygon(points, color) {
    const min = Math.max(0, Math.floor(Math.min(...points.map(p => p[1]))));
    const max = Math.min(HEIGHT - 1, Math.ceil(Math.max(...points.map(p => p[1]))));
    for (let y = min; y <= max; y++) {
      const hits = [];
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i], b = points[j];
        if ((a[1] > y + .5) !== (b[1] > y + .5)) {
          hits.push(a[0] + (y + .5 - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
        }
      }
      hits.sort((a, b) => a - b);
      for (let i = 0; i + 1 < hits.length; i += 2) {
        const start = Math.max(0, Math.ceil(hits[i] - .5));
        const end = Math.min(WIDTH, Math.ceil(hits[i + 1] - .5));
        this.rect(start, y, end - start, 1, color);
      }
    }
  }
  ellipse(x, y, rx, ry, color) {
    for (let py = Math.max(0, Math.floor(y - ry)); py < Math.min(HEIGHT, Math.ceil(y + ry)); py++) {
      const span = rx * Math.sqrt(Math.max(0, 1 - ((py + .5 - y) / ry) ** 2));
      const left = Math.ceil(x - span - .5), right = Math.ceil(x + span - .5);
      this.rect(left, py, right - left, 1, color);
    }
  }
  line(a, b, radius, color) {
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.5);
    for (let i = 0; i <= steps; i++) {
      const p = lerp(a, b, steps ? i / steps : 0);
      this.ellipse(...p, radius, radius, color);
    }
  }
  toSVG() {
    let out = '';
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH;) {
        const color = this.cells[y * WIDTH + x];
        if (!color) { x++; continue; }
        let w = 1;
        while (x + w < WIDTH && this.cells[y * WIDTH + x + w] === color) w++;
        out += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${color}"/>`;
        x += w;
      }
    }
    return out;
  }
  paint(ctx, buffer) {
    buffer.data.fill(0);
    this.cells.forEach((color, i) => { if (color) buffer.data.set(rgba(color), i * 4); });
    ctx.putImageData(buffer, 0, 0);
  }
}

// Two-bone forward kinematics keeps elbows/knees attached and bone lengths
// constant; sleeves, skin, cuffs and shading are drawn around the new joints.
function chain(start, upper, lower, angle, bend) {
  const next = (p, length, a) => [p[0] + Math.sin(a) * length, p[1] + Math.cos(a) * length];
  const joint = next(start, upper, angle);
  return [start, joint, next(joint, lower, angle + bend)];
}

export function poseAt(action = null, progress = 0, time = 0, still = false) {
  const idle = still ? 0 : Math.sin(time * 1.8);
  const p = { x: 0, y: 0, lean: idle * .35, head: idle * .3, breathe: idle * .45,
    arms: [[-.12, -.08], [.18, 2.25]], legs: [[-.07, .12], [.07, -.12]], tail: idle * 2, bow: 0 };
  if (!action) return p;
  const t = Math.max(0, Math.min(1, progress));
  if (t === 0 || t === 1) return p;
  const e = Math.sin(Math.PI * t) ** 2;
  const beat = Math.sin(t * TAU * 2);
  if (action === 'wave') {
    p.arms[1] = [mix(.18, 1.1, e), mix(2.25, 1.5 + beat * .45, e)];
    p.head += e * 1.7; p.tail += beat * 4 * e;
  } else if (action === 'dance') {
    p.x = beat * 3 * e; p.lean = beat * 3 * e; p.head = -beat * 2 * e;
    p.arms = [[-.12 - 1.1 * e, -.08 - (1 + beat) * e], [.18 + e, 2.25 - (1 + beat) * e]];
    p.legs = [[-.07 - beat * .22 * e, .12 + Math.max(0, beat) * e], [.07 - beat * .22 * e, -.12 - Math.max(0, -beat) * e]];
    p.tail += -beat * 5 * e;
  } else if (action === 'hop') {
    // Crouch, take-off, flight, landing: ground contact is visibly different
    // from translating an unchanged standing sprite up and down.
    const crouch = t < .22 ? Math.sin(Math.PI * t / .22) ** 2 : t > .78 ? Math.sin(Math.PI * (t-.78) / .22) ** 2 : 0;
    p.y = -12 * e + 3 * crouch; p.breathe += 2 * crouch;
    p.arms = [[-.12 - e, -.08 - .7 * e], [.18 + e, 2.25 - .7 * e]];
    p.legs = [[-.07 - .4 * e, .12 + .9 * e], [.07 + .4 * e, -.12 - .9 * e]];
    p.tail += Math.sin(t * TAU - .7) * 4 * e;
  } else if (action === 'stretch') {
    p.arms = [[-.12 - 2.3 * e, -.08 - .35 * e], [.18 + 2.2 * e, 2.25 * (1 - e)]];
    p.breathe -= e * 2; p.head -= e; p.tail += e * 7;
  } else if (action === 'bow') {
    p.breathe += 5 * e; p.head += 4 * e; p.lean = -2 * e; p.bow = e;
    p.arms = [[-.12 + .4 * e, -.08 - .5 * e], [.18 - .6 * e, 2.25 - 1.6 * e]];
    p.legs = [[-.07, .12 + .18 * e], [.07, -.12 - .18 * e]];
  } else if (action === 'kick') {
    const extend = Math.sin(Math.PI * Math.max(0, (t - .2) / .8)) ** 2;
    p.lean = -3 * e; p.legs[1] = [.07 + 1.15 * e, -.12 - .9 * e + 1.25 * extend];
    p.arms[0] = [-.12 - .8 * e, -.08 - .4 * e]; p.tail += 5 * e;
  }
  return p;
}

// Pixel-only palettes follow artwork/clawmate.png; other styles keep their catalogue palettes.
const MOMO = {
  outline: '#754354', hairDark: '#bf7396', hair: '#f3adca', hairLight: '#ffd3de', hairShine: '#fff0e8',
  skin: '#ffdacb', skinShade: '#eaa2a4', skinLight: '#fff0dc', cream: '#fff1e9', seam: '#caa6c9',
  pink: '#e791b4', pinkLight: '#ffc9de', pinkDark: '#ac547b', gold: '#edbc65', white: '#fff8ef'
};
const ARIA = {
  outline: '#211d30', hairDark: '#302735', hair: '#4b3945', hairLight: '#72515e', hairShine: '#a6757b',
  skin: '#ffdacb', skinShade: '#df9f9e', skinLight: '#ffecdd', cream: '#302b41', seam: '#57506e',
  pink: '#363046', pinkLight: '#57506e', pinkDark: '#211d30', gold: '#72b7ef', white: '#aaa2ca'
};

function eye(g, x, y, cat, closed, happy, dog = false, iris = null) {
  // The reference cats have large green irises; the women's eyes are narrower
  // almond shapes. Scaling the same eye equally made every face look alike.
  const target = g, sx = cat ? 1.3 : dog ? 1.05 : .78, sy = cat ? 1.22 : dog ? .95 : .82;
  g = {
    ellipse: (cx,cy,rx,ry,c) => target.ellipse(x+(cx-x)*sx,y+(cy-y)*sy,rx*sx,ry*sy,c),
    rect: (cx,cy,w,h,c) => target.rect(x+(cx-x)*sx,y+(cy-y)*sy,w*sx,h*sy,c),
    line: (a,b,r,c) => target.line([x+(a[0]-x)*sx,y+(a[1]-y)*sy],[x+(b[0]-x)*sx,y+(b[1]-y)*sy],r,c)
  };
  const dark = cat ? '#183d32' : '#301b16';
  if (closed || happy) {
    g.line([x - 4, y + 2], [x, y + (happy ? 0 : 3)], 1, dark);
    g.line([x, y + (happy ? 0 : 3)], [x + 4, y + 2], 1, dark);
    return;
  }
  g.ellipse(x, y, dog ? 5 : 6, 7, dark);
  g.ellipse(x + 1, y + 1, 4, 5, '#fffdf5');
  g.ellipse(x, y + 1, 3.5, 5, iris || (cat ? '#39945c' : '#744024'));
  g.ellipse(x - .5, y, 2.5, 4, dark);
  g.rect(x - 2, y + 3, 4, 2, iris ? (iris === '#a44378' ? '#f996bd' : '#b3a4f1') : cat ? '#a4db69' : '#b77e47');
  g.rect(x - 2, y - 4, 2, 3, '#ffffff');
  g.rect(x + 2, y - 1, 1, 2, '#ffffff');
}

function human(g, spec, p, face) {
  const momo = spec.id === 'momo', c = momo ? MOMO : ARIA;
  // Each character keeps her resting gesture when an action finishes.
  p = { ...p, arms: p.arms.map(a => [...a]), legs: p.legs.map(a => [...a]) };
  p.arms[0][0] += momo ? .26 : -.16;
  p.arms[0][1] += momo ? .55 : 1.35;
  p.arms[1][0] += .65; p.arms[1][1] -= .25;
  p.legs[0][0] += momo ? .12 : .24;
  p.legs[0][1] -= momo ? .22 : .1;
  p.legs[1][0] -= momo ? .1 : .26;
  p.legs[1][1] += momo ? .05 : .16;
  const skirt = c.pink, skirtShade = c.pinkDark;
  const ox = p.x, oy = p.y;
  const body = (x, y) => [x + ox + p.lean * (108 - y) / 45, y + oy + p.breathe * (108 - y) / 45];
  const hx = ox + p.lean * 1.35 + p.head * .35, hy = oy + p.breathe + p.head * .4;
  const head = (x, y) => [50 + (x-50)*1.18 + hx + p.head * (y - 48) / 35 + Math.max(0, y - 44) / 22 * p.tail * .16,
    12+(y-12)*1.15*(1-(p.bow||0)*.16) + hy + (x - 50) * (momo ? .04 : .07)];
  // Cloth is a deforming surface: the hem lags behind the hips and widens
  // over a lifted knee, while the waistband remains attached to the torso.
  const cloth = (x, y) => {
    const a = body(x, y), hem = Math.max(0, (y - 80) / 30);
    return [a[0] + hem * (p.tail * .3 + (x - 50) * Math.abs(p.legs[1][0]) * .12),
      a[1] - hem * Math.max(0, p.legs[1][0] - .1) * (x > 50 ? 5 : 1)];
  };
  const poly = (pts, color, transform = body) => g.polygon(pts.map(([x, y]) => transform(x, y)), color);
  const ellipse = (x, y, rx, ry, color, transform = body) => g.ellipse(...transform(x, y), rx, ry, color);
  const line = (a, b, r, color, transform = body) => g.line(transform(...a), transform(...b), r, color);

  const tail = [[65,103],[82,104],[90,94],[89+p.tail*.3,81],[94+p.tail*.4,77]];
  for (const [color,r] of [[c.outline,4],[c.hair,2.8]]) {
    for (let i=0;i<tail.length-1;i++) line(tail[i],tail[i+1],r,color);
  }
  line(tail[3],tail[4],2.8,momo?c.hairLight:'#9984b7');

  // Cat ears and long side locks are attached to the head, including in a bow.
  for (const pts of [ [[20,29],[18,8],[24,9],[39,23]], [[61,22],[77,8],[81,12],[78,32]] ]) {
    poly(pts,c.outline,head);
  }
  poly([[22,26],[21,12],[34,23]],c.hair,head);
  poly([[66,23],[76,12],[77,28]],c.hair,head);
  poly([[24,23],[23,16],[31,23]],momo ? '#ea8daf' : '#c19ab9',head);
  poly([[69,24],[75,16],[75,27]],momo ? '#ea8daf' : '#c19ab9',head);
  for (const x of [25,70]) poly([[x,22],[x+3,20],[x+2,24],[x+5,25],[x,27]],c.white,head);
  for (const [x,s] of [[24,-1],[73,1]]) {
    poly([[x,38],[x+s*6,55],[x+s*5,74],[x+s*10,89],[x,97],[x-s*7,90],[x-s*2,72]],c.outline,head);
    poly([[x,43],[x+s*3,59],[x+s*2,76],[x+s*6,88],[x,93],[x-s*3,88],[x-s*4,71]],c.hair,head);
    line([x,57],[x-s*1,80],1.5,c.hairLight,head);
  }
  // Sculpted back hair silhouette and individual waves, behind the torso.
  poly([[21,59],[18,47],[20,30],[26,19],[36,10],[48,7],[60,10],[69,17],[76,30],[78,46],[83,57],[78,66],[66,69],[29,68]], c.outline, head);
  poly([[23,58],[22,43],[24,29],[32,18],[44,10],[55,11],[65,17],[72,31],[73,46],[80,57],[74,64],[60,65],[31,64]], c.hair, head);
  for (let i = 0; i < 4; i++) {
    const x = 25 + i * 13;
    poly([[x,33],[x+4,35],[x+3,48],[x+7,58],[x+3,65],[x-3,65],[x+1,58],[x-3,48]], c.hairDark, head);
    line([x+1,40],[x+3,53], 1, c.hairLight, head);
  }
  // Layered highlights follow each character's pink / dark hair palette.
  for (const [x, direction] of [[24,-1],[73,1]]) {
    poly([[x,37],[x+direction*3,43],[x+direction*2,51],[x+direction*5,58],[x+direction*2,62],[x-direction*5,65],[x-direction*7,62],[x-direction,58],[x-direction*3,51]],c.hairDark,head);
    poly([[x,39],[x+direction,45],[x-direction,52],[x+direction*2,58],[x-direction*4,62],[x-direction*5,61],[x-direction,57],[x-direction*3,49]],c.hairLight,head);
    line([x-direction,42],[x-direction*2,48],.8,c.hairShine,head);
  }

  // Legs: separate hips, knees and ankles with pose-dependent silhouettes.
  for (let i = 0; i < 2; i++) {
    const joints = chain(body(i ? 56 : 45, 102), 18, 18, ...p.legs[i]);
    for (let j = 0; j < 2; j++) g.line(joints[j], joints[j+1], j ? 4.7 : 5.4, c.outline);
    for (let j = 0; j < 2; j++) g.line(joints[j], joints[j+1], j ? 3.5 : 4.2, c.skin);
    for (let j = 0; j < 2; j++) {
      g.line([joints[j][0]-2,joints[j][1]], [joints[j+1][0]-2,joints[j+1][1]], 1, c.skinShade);
    }
    const [x,y] = joints[2];
    g.polygon([[x-4,y-2],[x+3,y-2],[x+6,y+5],[x+5,y+8],[x-5,y+7]], c.outline);
    g.polygon([[x-3,y-2],[x+2,y-2],[x+5,y+5],[x+4,y+6],[x-4,y+5]], momo ? c.white : c.cream);
    if (momo) {
      g.rect(x-3,y-1,6,2,c.seam); g.rect(x-2,y+2,6,1,c.seam); g.rect(x-4,y+5,8,1,c.seam);
    } else { g.line([x-2,y+1],[x+3,y+4],1,c.white); }
  }

  poly([[36,76],[64,76],[momo ? 77 : 66,104],[62,110],[43,110],[momo ? 25 : 35,104]], c.outline, cloth);
  poly([[38,78],[62,78],[momo ? 74 : 64,103],[60,108],[44,108],[momo ? 28 : 37,103]], skirt, cloth);
  for (let i = 0; i < 4; i++) {
    poly([[39+i*6,83],[41+i*6,84],[38+i*9,106],[35+i*9,105]], i % 2 ? skirtShade : c.pinkLight, cloth);
  }
  if (momo) {
    poly([[35,86],[39,88],[34,103],[29,102]], '#ffd1d3', cloth);
    poly([[49,84],[52,84],[55,106],[50,108]], '#f6b0be', cloth);
    line([31,104],[44,108],.7,c.pinkDark,cloth);
  } else {
    poly([[38,85],[52,88],[63,83],[61,90],[49,94],[39,90]], c.seam, cloth);
    poly([[40,92],[49,93],[62,98],[61,101],[49,97]], c.outline, cloth);
    poly([[39,96],[45,100],[49,106],[43,107]], c.cream, cloth);
  }
  poly([[33,59],[42,55],[57,55],[66,60],[64,80],[58,84],[39,83],[32,77]], c.outline);
  poly([[34,61],[43,57],[56,57],[64,61],[62,79],[57,82],[40,81],[34,77]], momo ? c.pink : c.cream);
  poly([[44,50],[56,50],[57,59],[51,63],[43,59]], c.skinShade);
  poly([[45,50],[54,50],[55,58],[50,61],[45,58]], c.skin);
  if (momo) {
    poly([[33,59],[41,57],[44,64],[43,80],[38,88],[32,85]], c.cream);
    poly([[59,57],[66,60],[65,86],[60,88],[56,80],[56,64]], c.cream);
    line([40,63],[41,79],1,c.seam); line([58,63],[60,84],1,c.seam);
    line([44,64],[49,66],1,c.pinkDark); line([49,66],[55,63],1,c.pinkDark);
    poly([[49,65],[45,67],[49,68],[50,66],[54,68],[54,65]], c.pinkDark);
    ellipse(50,68,4,4,c.outline); ellipse(50,68,3,3,c.gold);
    line([49,69],[51,69],.8,c.outline); ellipse(49,66,1,1,c.white);
    line([44,80],[56,80],1,c.pinkDark); ellipse(54,80,1.5,1.5,c.gold);
  } else {
    poly([[38,59],[44,57],[56,57],[62,60],[59,69],[51,73],[41,68]],c.skin);
    line([43,60],[55,61],1.5,c.outline);
    line([43,64],[51,69],.7,c.gold); line([51,69],[58,63],.7,c.gold);
    ellipse(51,70,1.7,2.5,c.gold);
    line([36,64],[39,76],1,c.seam); line([61,63],[59,75],1,c.seam);
  }

  // Sleeves are continuous chains with round elbow joins; cuff and hand
  // positions follow the wrist instead of rotating a prepainted image.
  for (let i = 0; i < 2; i++) {
    const joints = chain(body(i ? 64 : 34, 63), 13, 12, ...p.arms[i]);
    for (let j = 0; j < 2; j++) g.line(joints[j],joints[j+1],5.4,c.outline);
    for (let j = 0; j < 2; j++) g.line(joints[j],joints[j+1],4.3,c.cream);
    for (let j = 0; j < 2; j++) {
      const a = lerp(joints[j],joints[j+1],.2), b = lerp(joints[j],joints[j+1],.8);
      g.line([a[0]-2,a[1]], [b[0]-2,b[1]],1,c.seam);
      // Fold marks follow the segment normal, including a compressed elbow.
      const dx=b[0]-a[0], dy=b[1]-a[1], len=Math.hypot(dx,dy)||1;
      for (const t of [.25,.7]) {
        const q=lerp(a,b,t), nx=dy/len, ny=-dx/len;
        g.line([q[0]-nx*3,q[1]-ny*3],[q[0]+nx,q[1]+ny],.7,c.seam);
        g.line([q[0]+nx,q[1]+ny],[q[0]+nx*3,q[1]+ny*3],.7,c.white);
      }
    }
    const wrist = joints[2], cuff = lerp(joints[1],wrist,.8);
    g.line(cuff,wrist,4.1,c.seam); g.line(cuff,wrist,2.8,c.white);
    const angle = p.arms[i][0] + p.arms[i][1];
    const hand = [wrist[0]+Math.sin(angle)*4,wrist[1]+Math.cos(angle)*4];
    g.line(wrist,hand,3.2,c.outline); g.line(wrist,hand,2.3,c.skin);
    if (i === 1) {
      for (let f = -1; f <= 1; f++) {
        const base = [hand[0]+Math.cos(angle)*f*1.6,hand[1]-Math.sin(angle)*f*1.6];
        g.line(base,[base[0]+Math.sin(angle+f*.22)*3,base[1]+Math.cos(angle+f*.22)*3],.8,c.skin);
      }
      if (!momo) { g.ellipse(...cuff,2,2,c.gold); g.ellipse(...cuff,1,1,c.white); }
    }
    if (momo) {
      const [x,y] = lerp(joints[1],wrist,.55);
      g.ellipse(x,y,2.5,2,c.pinkDark);
      for (const dx of [-3,0,3]) g.ellipse(x+dx,y-3,1,1.2,c.pink);
    }
  }

  // Face, ears, swept fringe and highlights are also rasterized geometry.
  ellipse(30,38,4,6,c.skinShade,head); ellipse(69,40,4,6,c.skinShade,head);
  poly([[31,28],[42,19],[56,19],[66,27],[70,40],[64,49],[54,55],[45,54],[35,48],[30,38]],c.outline,head);
  poly([[32,28],[43,20],[56,21],[65,28],[68,40],[62,48],[54,53],[45,52],[36,47],[32,38]],c.skin,head);
  poly([[35,28],[44,22],[55,23],[63,29],[64,38],[59,44],[48,46],[37,40]],c.skinLight,head);
  poly([[23,34],[23,25],[32,16],[45,9],[56,11],[65,18],[60,21],[53,18],[48,25],[39,30],[30,33]],c.hairDark,head);
  poly([[23,29],[30,21],[41,14],[51,12],[59,15],[51,16],[43,23],[33,28]],c.hairLight,head);
  poly([[23,28],[31,23],[40,17],[49,13],[52,13],[43,19],[35,26],[25,31]],c.hair,head);
  line([29,23],[40,16],1,c.hairShine,head);
  // Swept, nested ribbons rather than flat concentric hair bands.
  for (const [pts,color] of [
    [[[24,25],[30,19],[41,11],[48,10],[39,16],[31,22]],c.hairShine],
    [[[23,33],[31,31],[42,24],[51,17],[57,17],[49,23],[39,30],[29,35]],c.hair],
    [[[23,35],[32,34],[43,28],[49,24],[44,30],[34,37],[24,39]],c.hairLight],
    [[[31,18],[39,12],[48,9],[56,12],[48,12],[42,14]],c.hairLight],
    [[[59,14],[66,20],[70,29],[69,34],[66,25],[63,20]],c.hairLight],
    [[[21,43],[24,39],[28,39],[25,44],[27,50],[24,55],[22,53],[24,48]],c.hairShine]
  ]) poly(pts,color,head);
  poly([[53,17],[49,26],[43,32],[38,34],[44,27],[48,20]],c.hair,head);
  if (momo) poly([[58,18],[57,27],[51,33],[48,34],[52,27],[54,19]],c.hairLight,head);
  poly([[61,20],[67,26],[69,36],[73,43],[72,52],[66,59],[60,58],[65,51],[64,43]],c.hairDark,head);
  poly([[63,23],[65,29],[66,40],[70,46],[68,53],[64,55],[66,49],[63,40]],c.hairLight,head);
  line([29,37],[27,47],1,c.hairShine,head);
  for (const x of [32,67]) {
    ellipse(x,44,1.3,1.3,c.gold,head); ellipse(x,47,1.8,2,c.white,head);
  }
  const closed = face.blink || face.expression === 'sleepy';
  const happy = ['happy','love','excited'].includes(face.expression);
  for (const x of [40,60]) {
    const pt = head(x,36);
    const wink = momo && x === 40 && (!face.expression || face.expression === 'idle');
    eye(g,...pt,false,closed,happy || wink,false,momo ? '#a44378' : '#7661ad');
    if (!closed && !happy && !wink) {
      line([x-5,32],[x-2,30],.8,c.outline,head);
      line([x+2,30],[x+5,33],.8,c.outline,head);
    }
    line([x-4,27],[x+3,28],.8,c.hairDark,head);
    ellipse(x-1,44,3,1.5,'#f8b39f',head);
  }
  line([50,42],[51,43],.7,c.skinShade,head);
  if (['talking','surprised','excited'].includes(face.expression) || (momo && face.expression !== 'sleepy')) {
    ellipse(50,48,3,face.expression==='talking'?4:2.8,'#923e39',head);
    ellipse(50,face.expression==='talking'?50:49,2,1.2,'#f48483',head);
  } else {
    line([47,47],[50,49],.8,'#af504a',head); line([50,49],[53,47],.8,'#af504a',head);
  }
  if (momo) {
    // Cream cat barrette and dark cat charm from the cover illustration.
    poly([[62,21],[62,15],[66,18],[71,17],[75,14],[76,23],[72,27],[66,26]],c.outline,head);
    poly([[63,21],[63,17],[66,20],[71,19],[74,17],[74,23],[71,25],[66,24]],c.white,head);
    ellipse(66,22,1,1,c.pinkDark,head); ellipse(71,22,1,1,c.pinkDark,head);
    ellipse(69,24,1,1,c.pink,head);
    poly([[23,32],[23,27],[27,30],[30,29],[33,27],[34,34],[30,37],[25,36]],'#332b40',head);
    line([25,34],[27,34],.7,c.pinkLight,head);
    line([24,39],[21,48],1,c.pinkDark,head);
    poly([[23,38],[18,36],[19,42],[24,40],[28,44],[29,38]],c.pinkDark,head);
  } else {
    // Blue earcups, headband, hair clips and a small black ribbon.
    line([24,27],[27,19],2,c.outline,head);
    line([27,19],[34,14],2,'#496397',head);
    for (const x of [22,76]) {
      ellipse(x,34,5,10,c.outline,head); ellipse(x,34,3.5,8,'#496397',head);
      line([x-1,29],[x-1,37],1,'#8ac6f4',head);
    }
    line([29,26],[36,24],1,c.gold,head);
    line([30,29],[35,31],1,c.gold,head);
    poly([[27,19],[22,14],[22,22],[27,21],[33,24],[33,17]],c.outline,head);
    ellipse(27,20,1.5,1.5,'#496397',head);
  }
}

function critter(g, spec, p, face) {
  const cat = spec.id === 'mochi';
  const fur = cat ? '#fff0ed' : '#dfa064', shade = cat ? '#efa7c0' : '#ad6b40';
  const outline = cat ? '#96556f' : '#65402f', light = '#fff5e5', inner = cat ? '#ec8eae' : '#bb7c63';
  const at = (x,y) => [x+p.x+p.lean*(134-y)/60,y+p.y+p.breathe*(134-y)/60];
  const head = (x,y) => { const a = at(55+(x-55)*1.08,10+(y-10)*(1-(p.bow||0)*.14)+3); return [a[0]+p.head*(y-65)/35,a[1]+p.head*.4]; };
  const poly = (pts,color,fn=at) => g.polygon(pts.map(v=>fn(...v)),color);
  const ell = (x,y,rx,ry,color,fn=at) => g.ellipse(...fn(x,y),rx,ry,color);
  const line = (a,b,r,color,fn=at) => g.line(fn(...a),fn(...b),r,color);
  // Curved tail is a chain of newly positioned volumes, with fur on its edge.
  const tail = [[34,121],[22,118],[13,104],[13+p.tail*.25,88],[23+p.tail*.5,82],[27+p.tail,91]];
  for (const [color,r] of [[outline,cat?10:9],[fur,cat?8:7],[light,4]]) {
    for(let i=0;i<tail.length-1;i++) line(tail[i],tail[i+1],r,color);
  }
  // Fur clusters bend along the tail's centreline and are redrawn each frame.
  for (let i=1;cat && i<tail.length-1;i++) {
    const [x,y]=tail[i];
    poly([[x-6,y-3],[x-9,y-5],[x-8,y+1],[x-10,y+4],[x-5,y+6],[x-3,y+2]],light);
    poly([[x+2,y-5],[x+5,y-2],[x+4,y+3],[x+7,y+6],[x+2,y+4],[x,y]],cat?'#ffd1e0':shade);
  }
  if(!cat) {
    // Shiba's compact curled tail has an orange centre and a cream outer rim.
    for(let i=1;i<tail.length-1;i++) line([tail[i][0]+2,tail[i][1]], [tail[i+1][0]+2,tail[i+1][1]],3,fur);
    line([tail[3][0]+3,tail[3][1]+5],[tail[4][0],tail[4][1]+5],2,shade);
  }
  ell(53,106,26,31,outline); ell(53,105,24,30,fur); ell(56,100,17,24,light);
  if(cat) {
    for(const [x,y,s] of [[34,91,1],[42,102,-1],[31,114,1],[64,101,-1],[66,120,1],[51,124,-1]]) {
      poly([[x,y],[x+3*s,y+3],[x+s,y+7],[x+5*s,y+9],[x+4*s,y+13],[x-s,y+9],[x-2*s,y+4]],shade);
      poly([[x+2,y-2],[x+6,y],[x+5,y+5],[x+8,y+7],[x+2,y+6]],'#ffdae7');
    }
  } else {
    poly([[30,93],[35,90],[37,100],[34,110],[38,122],[32,120],[29,110]],shade);
    poly([[48,88],[57,90],[66,85],[71,96],[61,111],[55,119],[45,106]],light);
    poly([[46,99],[52,108],[56,110],[66,99],[63,109],[56,116],[49,112]],'#e8ceaa');
  }
  for (let i=0;i<5;i++) {
    const y=91+i*8;
    poly([[32,y],[27,y+4],[31,y+5],[28,y+9],[36,y+7],[37,y+2]],fur);
    poly([[73,y],[78,y+3],[74,y+5],[79,y+8],[71,y+9],[69,y+2]],fur);
    line([34,y+3],[36,y+7],1,shade);
  }
  for (let i=0;i<2;i++) {
    const joints = chain(at(i?70:37,116),12,10,...p.legs[i]);
    for(let j=0;j<2;j++) g.line(joints[j],joints[j+1],8,outline);
    for(let j=0;j<2;j++) g.line(joints[j],joints[j+1],6.5,fur);
    const [x,y]=joints[2];
    g.ellipse(x,y,8,5,outline); g.ellipse(x,y-1,7,4,light);
    for(let k=-1;k<=1;k++) g.rect(x+k*3-1,y,2,3,cat?inner:shade);
  }
  // Front legs move independently; the raised paw has visible pink pads.
  for(let i=0;i<2;i++) {
    const angles = [p.arms[i][0]*.65,p.arms[i][1]*.72];
    const planted = cat && i === 0;
    const joints=chain(at(i?72:42,planted?92:87),planted?21:16,planted?22:15,...angles);
    for(let j=0;j<2;j++) g.line(joints[j],joints[j+1],7,outline);
    for(let j=0;j<2;j++) g.line(joints[j],joints[j+1],5.5,fur);
    for(let j=0;j<2;j++) {
      const a=lerp(joints[j],joints[j+1],.2), b=lerp(joints[j],joints[j+1],.85);
      g.line([a[0]-3,a[1]],[b[0]-3,b[1]],1.2,shade);
      g.line([a[0]+2,a[1]],[b[0]+2,b[1]],1.6,light);
    }
    const [x,y]=joints[2];
    g.ellipse(x,y,7,6,outline); g.ellipse(x,y-1,6,5,light);
    for(let k=-1;k<=1;k++) g.rect(x+k*3-1,y,2,3,cat?inner:shade);
    if(cat && i===1) g.ellipse(x,y-2,2.5,2,inner);
  }
  // The reference cat has pointed ears; Coco has soft, hanging brown ears.
  if (cat) {
  poly([[25,43],[20,15],[26,12],[42,29],[62,25],[76,7],[82,10],[85,40],[91,53],[87,69],[75,79],[47,83],[27,73],[20,60]],outline,head);
  poly([[27,42],[23,17],[27,16],[43,33],[63,29],[77,11],[80,13],[82,41],[88,54],[84,67],[73,76],[48,80],[30,71],[23,59]],fur,head);
  poly([[27,20],[29,37],[39,35]],light,head); poly([[77,15],[67,32],[80,37]],light,head);
  poly([[28,23],[30,34],[35,33]],inner,head); poly([[76,21],[71,31],[78,33]],inner,head);
  } else {
    ell(55,46,32,30,outline,head); ell(55,46,30,28,fur,head);
    for (const [x,s] of [[29,-1],[78,1]]) {
      poly([[x,24],[x+s*9,27],[x+s*15,53],[x+s*11,65],[x+s*3,67],[x-s*4,57],[x-s*3,37]],outline,head);
      poly([[x,28],[x+s*6,30],[x+s*12,53],[x+s*9,62],[x+s*4,63],[x-s*1,55],[x-s*1,37]],shade,head);
      line([x+s*3,34],[x+s*8,54],2,fur,head);
    }
  }
  ell(56,54,29,24,fur,head); ell(56,66,24,14,light,head);
  if(cat) {
    // Uneven cheek tufts and layered peach patches are essential to Mochi's
    // long-haired silhouette; they move with the face, not a bitmap layer.
    for(const [x,y,s] of [[26,48,-1],[25,59,-1],[29,69,-1],[84,44,1],[86,56,1],[81,68,1]]) {
      poly([[x,y-4],[x+s*7,y-2],[x+s*3,y+1],[x+s*8,y+3],[x+s*2,y+7],[x-s*3,y+5]],fur,head);
      poly([[x,y],[x+s*5,y+2],[x+s,y+4],[x-s*3,y+2]],'#ffd5e4',head);
    }
    for(let i=0;i<6;i++) {
      const x=29+i*9;
      poly([[x,43],[x-3,38],[x+2,40],[x+3,35],[x+6,42]],light,head);
      poly([[x,71],[x+2,78],[x+5,74],[x+6,80],[x+8,72]],fur,head);
    }
    for(let i=0;i<5;i++) poly([[34+i*8,86+i%2*5],[37+i*8,93],[35+i*8,100],[40+i*8,97],[39+i*8,87]],shade);
    for(const [x,y] of [[30,47],[78,45],[28,66],[78,64],[39,74],[67,75]]) {
      poly([[x,y],[x+3,y+2],[x+1,y+5],[x+5,y+3],[x+6,y+8],[x-1,y+5]],'#ffd5e4',head);
    }
    poly([[47,37],[50,41],[48,47],[52,45],[55,48],[54,40]],'#ffd5e4',head);
    poly([[59,33],[57,38],[61,42],[64,38],[62,39]],shade,head);
    poly([[31,35],[34,29],[36,37],[42,40],[39,44],[35,40]],'#ffd5e4',head);
    poly([[65,42],[70,36],[74,38],[70,43],[72,47],[68,47]],light,head);
    poly([[42,72],[48,75],[53,74],[56,78],[67,73],[65,79],[54,82],[46,79]],shade,head);
  } else {
    poly([[51,22],[59,23],[58,39],[63,51],[59,63],[49,64],[51,48],[49,36]],light,head);
    ell(41,43,4,2.5,light,head); ell(70,41,4,2.5,light,head);
    poly([[27,54],[34,51],[37,59],[48,62],[53,67],[46,76],[33,70]],light,head);
    poly([[72,55],[78,48],[85,52],[82,65],[70,73],[61,74],[64,64]],light,head);
  }
  const closed=face.blink||face.expression==='sleepy', happy=['happy','love','excited'].includes(face.expression);
  eye(g,...head(41,53),cat,closed,happy,!cat); eye(g,...head(69,50),cat,closed,happy,!cat);
  for (const x of [33,77]) ell(x,62,4,2.5,cat?'#f6acc7':'#efa48e',head);
  poly([[52,60],[59,59],[57,63],[54,63]],cat?'#d77e70':'#33231c',head);
  line([55,63],[55,66],1,outline,head);
  line([55,66],[50,69],1,outline,head); line([50,69],[46,66],1,outline,head);
  line([55,66],[60,68],1,outline,head); line([60,68],[64,64],1,outline,head);
  if(!cat || face.expression==='talking') {
    ell(56,70,5,face.expression==='talking'?6:4,'#503029',head);
    ell(57,face.expression==='talking'?74:72,3,3,'#ef8b8a',head);
  }
  if(cat) {
    for(let i=0;i<3;i++) { line([33,63+i*3],[22,60+i*5],.8,'#fffdf4',head); line([75,60+i*3],[89,56+i*5],.8,'#fffdf4',head); }
    poly([[31,39],[24,35],[24,43],[31,41],[37,45],[37,36]],'#ce729a',head);
    ell(31,40,2,2,'#f8b8d1',head);
  } else {
    // Dark ribbon and fresh green sprout on Coco's head.
    poly([[60,22],[48,15],[47,24],[60,27],[72,30],[76,20],[65,21]],'#272335',head);
    ell(61,24,3,3,'#42364c',head);
    line([61,22],[62,14],1,'#64853a',head);
    poly([[62,17],[55,17],[51,12],[57,11],[63,15]],'#8dbb4e',head);
    poly([[62,16],[65,11],[71,11],[69,15]],'#acd266',head);
  }
}

export function drawModel(spec, pose = poseAt(), face = {}) {
  const grid = new PixelGrid();
  const padded = { ...pose, x: pose.x + 14, y: pose.y + 10 };
  grid.ellipse(65,157,19,2,'#b4a296');
  if(spec.archetype === 'humanoid') human(grid,spec,padded,face);
  else critter(grid,spec,padded,face);
  return grid;
}

export function renderModelPreview(spec, presentation) {
  const height = spec.archetype==='humanoid' && presentation !== 'full' ? 110 : HEIGHT;
  return `<svg class="pet-svg pet-svg--pixel" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${spec.name.en}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${drawModel(spec).toSVG()}</svg>`;
}

export class PixelAnimator {
  constructor(canvas, spec, reducedMotion = false) {
    this.canvas=canvas; this.spec=spec; this.reducedMotion=reducedMotion;
    this.ctx=canvas.getContext('2d');
    this.buffer=this.ctx.createImageData(WIDTH,HEIGHT);
    this.expression='idle'; this.action=null; this.lastAction=null;
    this.frame=0; this.lastDraw=-Infinity; this.destroyed=false;
    this.visibility=()=>{ cancelAnimationFrame(this.frame); this.frame=0; this.schedule(); };
    document.addEventListener('visibilitychange',this.visibility);
    this.draw(performance.now()); this.schedule();
  }
  schedule() {
    if(this.destroyed || this.frame || this.reducedMotion || document.hidden) return;
    this.frame=requestAnimationFrame(time=>{
      this.frame=0;
      if(time-this.lastDraw>=1000/16) this.draw(time);
      this.schedule();
    });
  }
  draw(time) {
    this.lastDraw=time;
    const progress=this.action ? (time-this.started)/this.duration : 0;
    if(progress>=1) this.action=null;
    const still=this.reducedMotion;
    const blink=!still && time%4300<130;
    const pose=poseAt(still?null:this.action,progress,time/1000,still);
    drawModel(this.spec,pose,{expression:this.expression,blink}).paint(this.ctx,this.buffer);
    this.canvas.dataset.action=this.action || 'idle';
  }
  setExpression(name) { this.expression=name; this.draw(performance.now()); }
  play(name) {
    if(this.reducedMotion) return;
    this.action=name; this.started=performance.now(); this.duration=name==='dance'?2100:1500;
    this.draw(this.started); this.schedule();
  }
  randomAction() {
    const choices=ACTIONS.filter(name=>name!==this.lastAction);
    const weights=ACTION_WEIGHTS[this.spec?.id];
    let pick;
    if (weights) {
      const total=choices.reduce((sum,name)=>sum+(weights[name]??1),0);
      let roll=Math.random()*total;
      pick=choices[choices.length-1];
      for (const name of choices) {
        roll-=weights[name]??1;
        if (roll<=0) { pick=name; break; }
      }
    } else {
      pick=choices[Math.floor(Math.random()*choices.length)];
    }
    this.lastAction=pick;
    this.play(this.lastAction);
    return this.lastAction;
  }
  setReducedMotion(value) {
    this.reducedMotion=value;
    cancelAnimationFrame(this.frame); this.frame=0;
    this.action=null; this.draw(performance.now()); this.schedule();
  }
  stop() { this.action=null; this.draw(performance.now()); }
  destroy() {
    this.destroyed=true; cancelAnimationFrame(this.frame); this.frame=0;
    document.removeEventListener('visibilitychange',this.visibility);
  }
}
