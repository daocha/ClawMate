// Hand-drawn "cartoon" reference art. Only the four active companions have
// these assets; other characters fall back to chibi rendering (see app.js).
export const hasCartoonArt = (spec) => ['momo', 'aria', 'mochi', 'coco'].includes(spec.id);

export function renderCartoon(spec) {
  const base = `./assets/pixel-${spec.id}-v3-1.png`;
  const tap = `./assets/pixel-${spec.id}-v3-2.png`;
  return `<div class="pet-stage-art pet-cartoon-stage" role="img" aria-label="${spec.name.en}">
  <div class="pet-root"><img class="pet-stage-image pet-photo pet-cartoon-image" src="${base}" data-base-src="${base}" data-tap-src="${tap}" alt="" draggable="false"></div>
</div>`;
}
