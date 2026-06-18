import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files')
    if (!files.length) return NextResponse.json({ error: 'No files' }, { status: 400 })

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true })

    const urls: string[] = []
    for (const file of files) {
      if (!(file instanceof File)) continue
      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `p_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(path.join(uploadDir, filename), buffer)
      urls.push(`/uploads/${filename}`)
    }
    return NextResponse.json({ urls })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
