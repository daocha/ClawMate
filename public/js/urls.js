import { getDeviceId } from './device.js';

// Resolve runtime endpoints from this module's own URL. At the domain root the
// module lives at /js/urls.js; behind a path proxy it may live at
// /clawmate/js/urls.js. This keeps both deployments working without config.
const APP_BASE = new URL('../', import.meta.url);

export function appUrl(path = '', base = APP_BASE) {
  const url = new URL(String(path).replace(/^\/+/, ''), base);
  // Every server request identifies its device so the backend can gate access to
  // approved pairs only - see public/js/device.js and server/devices.js.
  url.searchParams.set('device', getDeviceId());
  return url;
}

export function appWebSocketUrl(path = 'ws', base = APP_BASE) {
  const url = appUrl(path, base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}
