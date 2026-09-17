import { renderHD } from './render-hd.js';

// The chibi renderer intentionally reuses the HD face/expression system so all
// interactions stay in sync, while using a narrower head and less exaggerated
// facial geometry than the original super-deformed character.
export function renderChibi(spec) {
  return renderHD(spec, 'chibi');
}
