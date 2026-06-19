// Test script: create a large image, upload it via /api/upload, and verify the
// output is compressed (smaller file size, dimensions capped at 1200px).
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

async function main() {
  const BASE = 'http://localhost:3000'

  // 1. Create a large test image (3000x2000 JPEG, simulating a phone photo)
  console.log('=== Creating large test image (3000x2000 JPEG, quality 95) ===')
  const testFile = path.join(process.cwd(), 'test-large-photo.jpg')
  await sharp({
    create: {
      width: 3000,
      height: 2000,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .jpeg({ quality: 95 })
    .toFile(testFile)
  const originalStat = fs.statSync(testFile)
  console.log(`  Original size: ${(originalStat.size / 1024).toFixed(1)} KB`)

  // Also create a PNG with transparency to test that path
  console.log('\n=== Creating PNG with transparency (1500x1500) ===')
  const testPng = path.join(process.cwd(), 'test-transparent.png')
  await sharp({
    create: {
      width: 1500,
      height: 1500,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toFile(testPng)
  const pngStat = fs.statSync(testPng)
  console.log(`  Original PNG size: ${(pngStat.size / 1024).toFixed(1)} KB`)

  // 2. Login as admin to get cookie
  const loginRes = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'mehta123' }),
  })
  const setCookie = loginRes.headers.get('set-cookie') || ''
  const cookie = setCookie.split(';')[0]
  if (!cookie) {
    throw new Error('Failed to login as admin')
  }
  console.log(`\n  Got admin cookie`)

  // 3. Upload the JPEG using native FormData + Blob (Node 18+ supports both)
  console.log('\n=== Uploading JPEG ===')
  const jpegBuffer = fs.readFileSync(testFile)
  const jpegBlob = new Blob([jpegBuffer], { type: 'image/jpeg' })
  const form1 = new FormData()
  form1.append('files', jpegBlob, 'test-large-photo.jpg')

  const uploadRes1 = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: form1,
  })
  console.log(`  Upload status: ${uploadRes1.status}`)
  const data1 = await uploadRes1.json()
  console.log(`  Response:`, JSON.stringify(data1, null, 2))

  // 4. Upload the PNG
  console.log('\n=== Uploading PNG with transparency ===')
  const pngBuffer = fs.readFileSync(testPng)
  const pngBlob = new Blob([pngBuffer], { type: 'image/png' })
  const form2 = new FormData()
  form2.append('files', pngBlob, 'test-transparent.png')

  const uploadRes2 = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: form2,
  })
  console.log(`  Upload status: ${uploadRes2.status}`)
  const data2 = await uploadRes2.json()
  console.log(`  Response:`, JSON.stringify(data2, null, 2))

  // 5. Verify results
  console.log('\n=== Compression Results ===')
  for (const [label, data, origStat, origName] of [
    ['JPEG', data1, originalStat, 'test-large-photo.jpg'],
    ['PNG', data2, pngStat, 'test-transparent.png'],
  ] as const) {
    if (data.urls?.length) {
      const uploadedUrl = data.urls[0]
      const uploadedPath = path.join(process.cwd(), 'public', uploadedUrl)
      const compressedStat = fs.statSync(uploadedPath)
      const ratio = ((1 - compressedStat.size / origStat.size) * 100).toFixed(1)
      const metadata = await sharp(uploadedPath).metadata()
      console.log(`\n  ${label} upload:`)
      console.log(`    Original:   ${(origStat.size / 1024).toFixed(1)} KB`)
      console.log(`    Compressed: ${(compressedStat.size / 1024).toFixed(1)} KB`)
      console.log(`    Saved:      ${ratio}%`)
      console.log(`    Dimensions: ${metadata.width}x${metadata.height} (format: ${metadata.format})`)
      console.log(`    Has alpha:  ${metadata.hasAlpha}`)
      const dimOk = (metadata.width || 0) <= 1200 && (metadata.height || 0) <= 1200
      const sizeOk = compressedStat.size < origStat.size
      console.log(`    ${dimOk ? '✅' : '❌'} Dimensions ${dimOk ? 'capped' : 'NOT capped'} at 1200px`)
      console.log(`    ${sizeOk ? '✅' : '⚠️'} File size ${sizeOk ? 'reduced' : 'not reduced'}`)
    }
  }

  // Cleanup test files
  fs.unlinkSync(testFile)
  fs.unlinkSync(testPng)
  // Note: uploaded files are kept for inspection
  console.log('\n✅ Test complete (uploaded files left in /public/uploads for inspection)')
}

main().catch((e) => { console.error(e); process.exit(1) })
