// Test with a realistic phone-photo-sized image (~3-5MB) to verify body size
// limit doesn't reject it.
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

async function main() {
  const BASE = 'http://localhost:3000'

  // Create a realistic phone photo: 4032x3024 (typical iPhone photo), high quality
  // This produces a ~3-5MB JPEG
  console.log('=== Creating realistic phone photo (4032x3024 JPEG, quality 98) ===')
  const testFile = path.join(process.cwd(), 'test-phone-photo.jpg')
  await sharp({
    create: {
      width: 4032,
      height: 3024,
      channels: 3,
      background: { r: 180, g: 100, b: 60 },
    },
  })
    .jpeg({ quality: 98 })
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
  console.log('\n=== Uploading large phone photo ===')
  const buffer = fs.readFileSync(testFile)
  const blob = new Blob([buffer], { type: 'image/jpeg' })
  const form = new FormData()
  form.append('files', blob, 'photo.jpg')

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
    console.log(`  Compressed: ${(compressedStat.size / 1024).toFixed(1)} KB (${compressedStat.size} bytes)`)
    console.log(`  Saved:      ${ratio}%`)
    console.log(`  Dimensions: ${metadata.width}x${metadata.height}`)
    console.log(`  Format:     ${metadata.format}`)
  }

  // Cleanup
  fs.unlinkSync(testFile)
  console.log('\n✅ Realistic phone photo test complete')
}

main().catch((e) => { console.error(e); process.exit(1) })
