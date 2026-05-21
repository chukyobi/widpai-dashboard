import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'

export const dynamic = 'force-dynamic'

// Configure Cloudinary securely
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

function getExtensionFromType(mimeType: string): string {
  const cleanMime = mimeType.split(';')[0].trim().toLowerCase()
  switch (cleanMime) {
    case 'audio/ogg':
    case 'audio/opus':
      return '.ogg'
    case 'audio/mp3':
    case 'audio/mpeg':
      return '.mp3'
    case 'audio/amr':
      return '.amr'
    case 'audio/wav':
      return '.wav'
    case 'audio/m4a':
    case 'audio/x-m4a':
      return '.m4a'
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/gif':
      return '.gif'
    case 'image/webp':
      return '.webp'
    case 'video/mp4':
      return '.mp4'
    case 'video/ogg':
      return '.ogg'
    case 'video/webm':
      return '.webm'
    default:
      return '.bin'
  }
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  const expectedKey = process.env.UPLOAD_API_KEY

  if (expectedKey && apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 1. If Cloudinary credentials exist, upload directly to Cloudinary!
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      
      let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'
      if (file.type.startsWith('image/')) resourceType = 'image'
      else if (file.type.startsWith('video/') || file.type.startsWith('audio/')) resourceType = 'video'
      else resourceType = 'raw'

      // Important: for 'raw' files, we must include the extension in the public_id or use original filename
      const originalExt = path.extname(file.name) || getExtensionFromType(file.type)
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${originalExt}`

      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadOptions: Record<string, unknown> = { 
          resource_type: resourceType, 
          folder: 'widpai_uploads',
          public_id: resourceType === 'raw' ? uniqueName : undefined
        }

        // For video, eagerly transcode to H.264 MP4 so it's immediately ready for WhatsApp
        if (resourceType === 'video' && file.type.startsWith('video/')) {
          uploadOptions.eager = [{ format: 'mp4', video_codec: 'h264', audio_codec: 'aac' }]
          uploadOptions.eager_async = false // Wait for transcoding to finish before responding
        }

        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error)
            else resolve(result!)
          }
        ).end(buffer)
      })
      
      let finalUrl = result.secure_url
      
      // Use the eager MP4 URL if available (guaranteed H.264 + AAC for WhatsApp)
      if (resourceType === 'video' && file.type.startsWith('video/') && result.eager?.[0]?.secure_url) {
        finalUrl = result.eager[0].secure_url
      } else if (resourceType === 'video' && file.type.startsWith('video/')) {
        // Fallback: rename extension to .mp4 so Cloudinary serves transcoded version
        finalUrl = finalUrl.replace(/\.[^/.]+$/, '.mp4')
      }

      // Return the absolutely bulletproof HTTPS URL from Cloudinary
      return NextResponse.json({ url: finalUrl })
    }

    // 2. Fallback to Local Storage if Cloudinary is not configured
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const originalExt = path.extname(file.name)
    const ext = originalExt || getExtensionFromType(file.type)
    const filename = `${uniqueSuffix}${ext}`
    const filePath = path.join(uploadDir, filename)

    fs.writeFileSync(filePath, buffer)

    const protocol = req.headers.get('x-forwarded-proto') || 'http'
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
    const fileUrl = `${protocol}://${host}/uploads/${filename}`
    
    return NextResponse.json({ url: fileUrl, relativeUrl: `/uploads/${filename}` })
  } catch (err: any) {
    console.error('[Upload API Error]', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
