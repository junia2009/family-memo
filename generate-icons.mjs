import sharp from 'sharp';

// ノート＋ペンアイコン SVG (any用 / 角丸背景あり)
function makeSvg(size) {
  const rx = Math.round(size * 0.225);
  const s = size / 100;

  const nx = Math.round(22 * s);
  const ny = Math.round(16 * s);
  const nw = Math.round(52 * s);
  const nh = Math.round(62 * s);
  const nr = Math.round(5 * s);

  const holeR = Math.round(3.5 * s);
  const lineX1 = Math.round(nx + 10 * s);
  const lineX2 = Math.round(nx + nw - 6 * s);
  const lineY = [38, 50, 62, 74].map(p => Math.round(p * s));

  const penTipX = Math.round(68 * s);
  const penTipY = Math.round(84 * s);
  const penEndX = Math.round(83 * s);
  const penEndY = Math.round(63 * s);
  const penW = Math.round(5.5 * s);

  const holes = [-1, 0, 1].map(i =>
    `<circle cx="${Math.round((nx + nw / 2))}" cy="${Math.round(ny + (14 + i * 12) * s)}" r="${holeR}"
             fill="#1a3d8f" stroke="#0b1a3e" stroke-width="${Math.round(1.2 * s)}"/>`
  ).join('\n  ');

  const lines = lineY.map(y =>
    `<line x1="${lineX1}" y1="${y}" x2="${lineX2}" y2="${y}"
           stroke="rgba(45,27,105,0.32)" stroke-width="${Math.round(1.8 * s)}" stroke-linecap="round"/>`
  ).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#2d1b69"/>
      <stop offset="55%"  stop-color="#1a3d8f"/>
      <stop offset="100%" stop-color="#0b1a3e"/>
    </linearGradient>
    <linearGradient id="note" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#ffe57a"/>
      <stop offset="100%" stop-color="#e6a800"/>
    </linearGradient>
    <linearGradient id="pen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#fff0a0"/>
      <stop offset="100%" stop-color="#ffc72c"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="${Math.round(1.5*s)}" dy="${Math.round(2*s)}" stdDeviation="${Math.round(3*s)}"
                    flood-color="#000" flood-opacity="0.45"/>
    </filter>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${Math.round(2*s)}" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" rx="${rx}" ry="${rx}" fill="url(#bg)"/>
  <text x="${Math.round(13*s)}" y="${Math.round(26*s)}" font-size="${Math.round(10*s)}" text-anchor="middle"
        font-family="Segoe UI Emoji,Apple Color Emoji,sans-serif" fill="#ffd700" opacity="0.7">✦</text>
  <text x="${Math.round(85*s)}" y="${Math.round(21*s)}" font-size="${Math.round(7*s)}" text-anchor="middle"
        font-family="Segoe UI Emoji,Apple Color Emoji,sans-serif" fill="#ffd700" opacity="0.5">✦</text>
  <rect x="${nx}" y="${ny}" width="${nw}" height="${nh}" rx="${nr}" ry="${nr}"
        fill="url(#note)" filter="url(#shadow)"/>
  <rect x="${nx}" y="${ny}" width="${Math.round(10*s)}" height="${nh}" rx="${nr}" ry="${nr}"
        fill="rgba(0,0,0,0.13)"/>
  ${holes}
  ${lines}
  <line x1="${lineX1}" y1="${lineY[0]}" x2="${Math.round(lineX1 + 22*s)}" y2="${lineY[0]}"
        stroke="rgba(45,27,105,0.6)" stroke-width="${Math.round(2.2*s)}" stroke-linecap="round"/>
  <g filter="url(#glow)">
    <line x1="${penTipX}" y1="${penTipY}" x2="${penEndX}" y2="${penEndY}"
          stroke="url(#pen)" stroke-width="${penW}" stroke-linecap="round"/>
    <circle cx="${penTipX}" cy="${penTipY}" r="${Math.round(2.8*s)}" fill="white" opacity="0.9"/>
  </g>
</svg>`;
}

// maskable用 (コンテンツを中心72%に収める)
function makeMaskableSvg(size) {
  const scale = 0.72;
  const off = Math.round(size * (1 - scale) / 2);
  const inner = Math.round(size * scale);
  const s = inner / 100;

  const nx = Math.round(22 * s);
  const ny = Math.round(16 * s);
  const nw = Math.round(52 * s);
  const nh = Math.round(62 * s);
  const nr = Math.round(5 * s);

  const holeR = Math.round(3.5 * s);
  const lineX1 = Math.round(nx + 10 * s);
  const lineX2 = Math.round(nx + nw - 6 * s);
  const lineY = [38, 50, 62, 74].map(p => Math.round(p * s));

  const penTipX = Math.round(68 * s);
  const penTipY = Math.round(84 * s);
  const penEndX = Math.round(83 * s);
  const penEndY = Math.round(63 * s);
  const penW = Math.round(5.5 * s);

  const holes = [-1, 0, 1].map(i =>
    `<circle cx="${Math.round((nx + nw / 2))}" cy="${Math.round(ny + (14 + i * 12) * s)}" r="${holeR}"
               fill="#1a3d8f" stroke="#0b1a3e" stroke-width="${Math.round(1.2*s)}"/>`
  ).join('\n    ');

  const lines = lineY.map(y =>
    `<line x1="${lineX1}" y1="${y}" x2="${lineX2}" y2="${y}"
             stroke="rgba(45,27,105,0.32)" stroke-width="${Math.round(1.8*s)}" stroke-linecap="round"/>`
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#2d1b69"/>
      <stop offset="55%"  stop-color="#1a3d8f"/>
      <stop offset="100%" stop-color="#0b1a3e"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <svg x="${off}" y="${off}" width="${inner}" height="${inner}" viewBox="0 0 ${inner} ${inner}">
    <defs>
      <linearGradient id="note2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stop-color="#ffe57a"/>
        <stop offset="100%" stop-color="#e6a800"/>
      </linearGradient>
      <linearGradient id="pen2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#fff0a0"/>
        <stop offset="100%" stop-color="#ffc72c"/>
      </linearGradient>
      <filter id="shadow2">
        <feDropShadow dx="${Math.round(1.5*s)}" dy="${Math.round(2*s)}" stdDeviation="${Math.round(3*s)}"
                      flood-color="#000" flood-opacity="0.45"/>
      </filter>
      <filter id="glow2">
        <feGaussianBlur stdDeviation="${Math.round(2*s)}" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <text x="${Math.round(13*s)}" y="${Math.round(26*s)}" font-size="${Math.round(10*s)}" text-anchor="middle"
          font-family="Segoe UI Emoji,Apple Color Emoji,sans-serif" fill="#ffd700" opacity="0.7">✦</text>
    <rect x="${nx}" y="${ny}" width="${nw}" height="${nh}" rx="${nr}" ry="${nr}"
          fill="url(#note2)" filter="url(#shadow2)"/>
    <rect x="${nx}" y="${ny}" width="${Math.round(10*s)}" height="${nh}" rx="${nr}" ry="${nr}"
          fill="rgba(0,0,0,0.13)"/>
    ${holes}
    ${lines}
    <line x1="${lineX1}" y1="${lineY[0]}" x2="${Math.round(lineX1 + 22*s)}" y2="${lineY[0]}"
          stroke="rgba(45,27,105,0.6)" stroke-width="${Math.round(2.2*s)}" stroke-linecap="round"/>
    <g filter="url(#glow2)">
      <line x1="${penTipX}" y1="${penTipY}" x2="${penEndX}" y2="${penEndY}"
            stroke="url(#pen2)" stroke-width="${penW}" stroke-linecap="round"/>
      <circle cx="${penTipX}" cy="${penTipY}" r="${Math.round(2.8*s)}" fill="white" opacity="0.9"/>
    </g>
  </svg>
</svg>`;
}

async function generate() {
  await sharp(Buffer.from(makeSvg(192))).png().toFile('public/icon-192.png');
  console.log('✓ icon-192.png');

  await sharp(Buffer.from(makeSvg(512))).png().toFile('public/icon-512.png');
  console.log('✓ icon-512.png');

  await sharp(Buffer.from(makeMaskableSvg(192))).png().toFile('public/icon-192-maskable.png');
  console.log('✓ icon-192-maskable.png');

  await sharp(Buffer.from(makeMaskableSvg(512))).png().toFile('public/icon-512-maskable.png');
  console.log('✓ icon-512-maskable.png');

  await sharp(Buffer.from(makeSvg(180))).png().toFile('public/apple-touch-icon.png');
  console.log('✓ apple-touch-icon.png');

  console.log('完了！');
}

generate().catch(console.error);

