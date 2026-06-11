// PWAアイコン生成スクリプト（依存パッケージなし）
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32テーブル
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

// グラデーション風ピンクのアイコンPNGを生成（RGBA）
function createIconPNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowBytes = 1 + size * 4;
  const raw = Buffer.alloc(size * rowBytes);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.42;

  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0; // filter None
    for (let x = 0; x < size; x++) {
      const i = y * rowBytes + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 角丸の外側は透明
      const cornerRadius = size * 0.22;
      const inCorner = (
        x < cornerRadius && y < cornerRadius && Math.sqrt((x - cornerRadius) ** 2 + (y - cornerRadius) ** 2) > cornerRadius ||
        x > size - cornerRadius && y < cornerRadius && Math.sqrt((x - (size - cornerRadius)) ** 2 + (y - cornerRadius) ** 2) > cornerRadius ||
        x < cornerRadius && y > size - cornerRadius && Math.sqrt((x - cornerRadius) ** 2 + (y - (size - cornerRadius)) ** 2) > cornerRadius ||
        x > size - cornerRadius && y > size - cornerRadius && Math.sqrt((x - (size - cornerRadius)) ** 2 + (y - (size - cornerRadius)) ** 2) > cornerRadius
      );

      if (inCorner) {
        raw[i] = 0; raw[i+1] = 0; raw[i+2] = 0; raw[i+3] = 0;
        continue;
      }

      // グラデーション: 左上 #f953c6 → 右下 #b91d73
      const t = (x + y) / (size * 2);
      const r = Math.round(249 + (185 - 249) * t);
      const g = Math.round(83  + (29  - 83)  * t);
      const b = Math.round(198 + (115 - 198) * t);

      // 中央にハートっぽい白い円
      const heartDist = Math.sqrt((x - cx * 0.85) ** 2 + (y - cy * 0.9) ** 2);
      const inHeart = heartDist < size * 0.25;

      if (inHeart) {
        raw[i] = 255; raw[i+1] = 255; raw[i+2] = 255; raw[i+3] = 210;
      } else {
        raw[i] = r; raw[i+1] = g; raw[i+2] = b; raw[i+3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = path.join(__dirname, 'public');
fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createIconPNG(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createIconPNG(512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createIconPNG(180));

console.log('✓ アイコン生成完了: public/icon-192.png, icon-512.png, apple-touch-icon.png');
