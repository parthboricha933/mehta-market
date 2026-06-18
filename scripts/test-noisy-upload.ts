// Test with a realistic noisy image to better simulate a real photo.
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

async function main() {
  const BASE = 'http://localhost:3000'

  // Create a large image with random-ish noise (more like a real photo)
  console.log('=== Creating realistic noisy image (4032x3024) ===')
  const testFile = path.join(process.cwd(), 'test-noisy-photo.jpg')

  // Generate random RGB noise — this won't compress as well as solid color
  const width = 4032
  const height = 3024
  const channels = 3
  const pixelCount = width * height * channels
  const buf = Buffer.alloc(pixelCount)
  for (let i = 0; i < pixelCount; i++) {
    buf[i] = Math.floor(Math.random() * 256)
  }

  await sharp(buf, { raw: { width, height, channels } })
    .jpeg({ quality: 95 })
    .toFile(testFile)
  const originalStat = fs.statSync(testFile)
  console.log(`  Original size: ${(originalStat.size / (1024 * 1024)).toFixed(2)} MB`)

  // Login
  const loginRes = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'mehta123' }),
  })
  const setCookie = loginRes.headers.get('set-cookie') || ''
  const cookie = setCookie.split(';')[0]

  // Upload
  console.log('\n=== Uploading realistic noisy photo ===')
  const buffer = fs.readFileSync(testFile)
  const blob = new Blob([buffer], { type: 'image/jpeg' })
  const form = new FormData()
  form.append('files', blob, 'noisy-photo.jpg')

  const uploadRes = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: form,
  })
  console.log(`  Upload status: ${uploadRes.status}`)
  const data = await uploadRes.json()
  if (!uploadRes.ok) {
    console.error('  Upload failed:', data)
    process.exit(1)
  }

  if (data.urls?.length) {
    const uploadedPath = path.join(process.cwd(), 'public', data.urls[0])
    const compressedStat = fs.statSync(uploadedPath)
    const ratio = ((1 - compressedStat.size / originalStat.size) * 100).toFixed(1)
    const metadata = await sharp(uploadedPath).metadata()

    console.log(`\n=== Results ===`)
    console.log(`  Original:   ${(originalStat.size / (1024 * 1024)).toFixed(2)} MB (${originalStat.size} bytes)`)
    console.log(`  Compressed: ${(compressedStat.size / (1024 * 1024)).toFixed(2)} MB (${compressedStat.size} bytes)`)
    console.log(`  Saved:      ${ratio}%`)
    console.log(`  Dimensions: ${metadata.width}x${metadata.height}`)
    console.log(`  Format:     ${metadata.format}`)
  }

  // Cleanup
  fs.unlinkSync(testFile)
  console.log('\n✅ Realistic noisy photo test complete')
}

main().catch((e) => { console.error(e); process.exit(1) })
