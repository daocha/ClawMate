// Export the actual software-rendered pixels for visual review without a browser.
// Usage: node scripts/pixel-model-preview.js /tmp/pixel-model-preview.png
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { CHARACTERS } from '../public/js/characters.js';
import { WIDTH, HEIGHT, drawModel, poseAt } from '../public/js/pixel-model.js';

const cast = CHARACTERS.filter(c => c.visible);
const poses = [[null, 0], ['wave', .45], ['hop', .5], ['kick', .5]];
const scale = 3, width = WIDTH * scale * poses.length, height = HEIGHT * scale * cast.length;
const raw = Buffer.alloc((width * 4 + 1) * height);
for (let row = 0; row < cast.length; row++) {
  for (let col = 0; col < poses.length; col++) {
    const cells = drawModel(cast[row], poseAt(...poses[col], 0, true)).cells;
    for (let y = 0; y < HEIGHT * scale; y++) for (let x = 0; x < WIDTH * scale; x++) {
      const color = cells[Math.floor(y / scale) * WIDTH + Math.floor(x / scale)] || '#302936';
      const n = parseInt(color.slice(1), 16);
      const offset = (row * HEIGHT * scale + y) * (width * 4 + 1) + 1 + (col * WIDTH * scale + x) * 4;
      raw[offset] = n >> 16; raw[offset + 1] = n >> 8 & 255; raw[offset + 2] = n & 255; raw[offset + 3] = 255;
    }
  }
}
function chunk(type, bytes) {
  const data = Buffer.concat([Buffer.from(type), bytes]);
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const size = Buffer.alloc(4), checksum = Buffer.alloc(4);
  size.writeUInt32BE(bytes.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, data, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
const output = process.argv[2] || '/tmp/pixel-model-preview.png';
writeFileSync(output, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR',header), chunk('IDAT',deflateSync(raw)), chunk('IEND',Buffer.alloc(0))]));
console.log(output);
