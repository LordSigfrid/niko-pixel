// Prévia do tema tático (sem navegador): desenha cada tema de sala — piso + parede norte — num PNG.
// Uso: npx tsx scripts/tactical-preview.ts [saida.png]
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { TILE } from '../client/src/art/api';
import { PixelBuf } from '../client/src/art/core/pixbuf';
import { CHUNK_PX, floorChunk } from '../client/src/art/surfaces/floor';
import { WALL_FACE_H, wallFaceTile } from '../client/src/art/surfaces/walls';
import { roomTheme, THEME_COUNT } from '../client/src/art/theme';

const COLS = 3;
const ROOM_W = 16 * TILE;
const ROOM_H = WALL_FACE_H + 9 * TILE;
const GAP = 8;
const SCALE = 2;
const rows = Math.ceil(THEME_COUNT / COLS);
const sheet = new PixelBuf(COLS * (ROOM_W + GAP) + GAP, rows * (ROOM_H + GAP) + GAP);
sheet.rect(0, 0, sheet.w, sheet.h, '#1b1e24');

for (let i = 0; i < THEME_COUNT; i++) {
  const th = roomTheme(i);
  const ox = GAP + (i % COLS) * (ROOM_W + GAP);
  const oy = GAP + Math.floor(i / COLS) * (ROOM_H + GAP);
  for (let cx = 0; cx * CHUNK_PX < ROOM_W; cx++) {
    for (let cy = 0; cy * CHUNK_PX < ROOM_H - WALL_FACE_H; cy++) {
      const chunk = floorChunk(th.floor ?? 'marble', cx, cy, { seed: i * 7 + 1, tint: th.carpet, tint2: th.carpet2 });
      const crop = chunk.crop(0, 0, Math.min(CHUNK_PX, ROOM_W - cx * CHUNK_PX), Math.min(CHUNK_PX, ROOM_H - WALL_FACE_H - cy * CHUNK_PX));
      sheet.draw(crop, ox + cx * CHUNK_PX, oy + WALL_FACE_H + cy * CHUNK_PX);
    }
  }
  for (let c = 0; c < 16; c++) sheet.draw(wallFaceTile(th.wall, i, c), ox + c * TILE, oy);
  // Tapete/lona na cor do tema, como a sala faz sob a ilha de mesas.
  sheet.rect(ox + 2 * TILE, oy + WALL_FACE_H + 2 * TILE, 6 * TILE, 4 * TILE, th.carpet);
  sheet.rect(ox + 2 * TILE + 2, oy + WALL_FACE_H + 2 * TILE + 2, 6 * TILE - 4, 4 * TILE - 4, th.carpet2);
  sheet.rect(ox + ROOM_W - 3 * TILE, oy + WALL_FACE_H + TILE, 2 * TILE, 4, th.accent);
}

// PNG mínimo (RGBA 8 bits) ampliado SCALE vezes.
const W = sheet.w * SCALE;
const H = sheet.h * SCALE;
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  for (let x = 0; x < W; x++) {
    const s = ((Math.floor(y / SCALE) * sheet.w) + Math.floor(x / SCALE)) * 4;
    const d = y * (W * 4 + 1) + 1 + x * 4;
    raw[d] = sheet.data[s];
    raw[d + 1] = sheet.data[s + 1];
    raw[d + 2] = sheet.data[s + 2];
    raw[d + 3] = sheet.data[s + 3];
  }
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (b: Buffer) => {
  let c = 0xffffffff;
  for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const out = process.argv[2] ?? 'docs/preview-tatico.png';
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log(`prévia: ${out} (${W}x${H})`);
