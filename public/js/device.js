// Every browser gets its own random device id, generated once with the Web Crypto
// API and kept in localStorage - never derived from anything an attacker could spoof
// (User-Agent, IP, ...), so pairing can't be forged by guessing the derivation rule.
const KEY = 'clawmate:deviceId';
let cached = null;

export function getDeviceId() {
  if (cached) return cached;
  try {
    cached = localStorage.getItem(KEY);
    if (!cached) {
      cached = crypto.randomUUID();
      localStorage.setItem(KEY, cached);
    }
  } catch {
    cached ||= crypto.randomUUID();
  }
  return cached;
}
