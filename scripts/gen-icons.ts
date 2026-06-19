// Generate simple PWA icons using sharp
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const iconDir = path.join(process.cwd(), 'public', 'icons')
if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir, { recursive: true })

// Green background with shopping bag SVG
const svg = (size: number) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a7a3c"/>
      <stop offset="100%" stop-color="#0f5327"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${size * 0.18}" fill="url(#bg)"/>
  <!-- Bag -->
  <g transform="translate(140 150)">
    <path d="M 20 60 L 220 60 L 200 320 L 40 320 Z" fill="#ff7a1a" stroke="#fff" stroke-width="6"/>
    <path d="M 60 60 Q 60 0 120 0 Q 180 0 180 60" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/>
    <text x="120" y="200" font-family="Arial Black, sans-serif" font-size="100" font-weight="900" fill="#fff" text-anchor="middle">M</text>
  </g>
</svg>
`

const sizes = [192, 512]
for (const size of sizes) {
  sharp(Buffer.from(svg(size)))
    .png()
    .toFile(path.join(iconDir, `icon-${size}.png`))
    .then(() => console.log(`Generated icon-${size}.png`))
    .catch(console.error)
}
