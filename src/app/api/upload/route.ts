import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, stat } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import sharp from 'sharp'

// Image compression settings — tuned for e-commerce product photos.
// - Max dimension 1200px is plenty for product cards (displayed at 200-600px)
//   and looks crisp on retina screens.
// - JPEG quality 80 is visually indistinguishable from quality 100 but ~40% smaller.
// - PNGs with transparency are preserved (compressed lossy); PNGs without alpha
//   are converted to JPEG for much smaller files.
// - WebP is preserved as WebP (best efficiency).
export const MAX_IMAGE_DIMENSION = 1200
export const JPEG_QUALITY = 80
export const PNG_QUALITY = 85
export const WEBP_QUALITY = 80

// Allow large uploads (phone photos can be 5-10MB each; multi-image uploads
// can easily exceed Next.js's default limit).
export const runtime = 'nodejs'
export const maxDuration = 60 // seconds — give sharp time to process multiple images

function isImageFile(filename: string, mimetype: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return (
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'tif', 'tiff'].includes(ext) ||
    mimetype.startsWith('image/')
  )
}

/**
 * Compress an image buffer using sharp.
 * - Resizes so the longest side is <= MAX_IMAGE_DIMENSION (preserves aspect ratio).
 * - Re-encodes at the chosen quality.
 * - Auto-rotates based on EXIF (so phone photos display correctly).
 * Returns { buffer, ext } where ext is the output file extension.
 */
async function compressImage(
  inputBuffer: Buffer,
  originalExt: string,
): Promise<{ buffer: Buffer; ext: string; originalSize: number; compressedSize: number }> {
  const originalSize = inputBuffer.byteLength

  // Get metadata to detect transparency and decide on output format
  const metadata = await sharp(inputBuffer).metadata()
  const hasAlpha = metadata.hasAlpha === true
  const ext = originalExt.toLowerCase()

  // Decide output format
  let pipeline = sharp(inputBuffer, { failOn: 'truncated' })
    .rotate() // auto-orient based on EXIF
    .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true, // don't upscale small images
    })

  let outputExt: string

  if (ext === 'webp' || ext === 'avif') {
    // Keep modern formats as-is (they're already efficient)
    outputExt = ext
    if (ext === 'webp') {
      pipeline = pipeline.webp({ quality: WEBP_QUALITY })
    } else {
      pipeline = pipeline.avif({ quality: WEBP_QUALITY })
    }
  } else if (ext === 'png' && hasAlpha) {
    // Preserve PNG for transparency
    outputExt = 'png'
    pipeline = pipeline.png({
      quality: PNG_QUALITY,
      compressionLevel: 9,
      palette: true, // reduce to palette when beneficial
    })
  } else if (ext === 'gif') {
    // sharp doesn't compress GIFs well; keep as-is
    outputExt = 'gif'
    // No transform — return original buffer
    return { buffer: inputBuffer, ext: outputExt, originalSize, compressedSize: originalSize }
  } else {
    // JPG, JPEG, PNG-without-alpha, TIFF → convert to JPEG (best for product photos)
    outputExt = 'jpg'
    pipeline = pipeline
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // composite alpha onto white before JPEG
      .jpeg({
        quality: JPEG_QUALITY,
        progressive: true,
        mozjpeg: true, // better compression
      })
  }

  const outputBuffer = await pipeline.toBuffer()
  return { buffer: outputBuffer, ext: outputExt, originalSize, compressedSize: outputBuffer.byteLength }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files')
    if (!files.length) return NextResponse.json({ error: 'No files' }, { status: 400 })

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true })

    const urls: string[] = []
    const stats: { name: string; originalSize: number; compressedSize: number; ratio: number; skipped: boolean }[] = []

    for (const file of files) {
      if (!(file instanceof File)) continue

      const originalExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const inputBuffer = Buffer.from(await file.arrayBuffer())
      const isImage = isImageFile(file.name, file.type)

      let outputBuffer: Buffer
      let outputExt: string
      let skipped = false

      if (isImage) {
        try {
          const result = await compressImage(inputBuffer, originalExt)
          outputBuffer = result.buffer
          outputExt = result.ext
          stats.push({
            name: file.name,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            ratio: result.originalSize > 0 ? (1 - result.compressedSize / result.originalSize) : 0,
            skipped: false,
          })
        } catch (compressErr: any) {
          // If compression fails, fall back to the original file (don't block the upload)
          console.error('[upload] compression failed for', file.name, ':', compressErr?.message)
          outputBuffer = inputBuffer
          outputExt = originalExt
          skipped = true
          stats.push({
            name: file.name,
            originalSize: inputBuffer.byteLength,
            compressedSize: inputBuffer.byteLength,
            ratio: 0,
            skipped: true,
          })
        }
      } else {
        // Non-image file — save as-is
        outputBuffer = inputBuffer
        outputExt = originalExt
        skipped = true
        stats.push({
          name: file.name,
          originalSize: inputBuffer.byteLength,
          compressedSize: inputBuffer.byteLength,
          ratio: 0,
          skipped: true,
        })
      }

      const filename = `p_${Date.now()}_${Math.floor(Math.random() * 100000)}.${outputExt}`
      await writeFile(path.join(uploadDir, filename), outputBuffer)
      urls.push(`/uploads/${filename}`)
    }

    // Log compression summary to server console (helpful for debugging)
    const totalOriginal = stats.reduce((s, x) => s + x.originalSize, 0)
    const totalCompressed = stats.reduce((s, x) => s + x.compressedSize, 0)
    if (totalOriginal > 0) {
      const savedPct = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1)
      console.log(
        `[upload] ${stats.length} file(s): ${(totalOriginal / 1024).toFixed(1)}KB → ${(totalCompressed / 1024).toFixed(1)}KB (${savedPct}% saved)`,
      )
    }

    return NextResponse.json({ urls, stats })
  } catch (e: any) {
    console.error('[upload] error:', e?.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Optional: GET endpoint to check upload dir size (for admin monitoring)
export async function GET() {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      return NextResponse.json({ fileCount: 0, totalSizeBytes: 0 })
    }
    const { readdir } = await import('fs/promises')
    const files = await readdir(uploadDir)
    let totalSize = 0
    for (const f of files) {
      try {
        const s = await stat(path.join(uploadDir, f))
        if (s.isFile()) totalSize += s.size
      } catch {}
    }
    return NextResponse.json({
      fileCount: files.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
