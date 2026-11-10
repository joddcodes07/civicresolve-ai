// Photo uploads via multer, stored on local disk and served from /uploads.
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const UPLOAD_DIR = path.resolve(here, '../../uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/avif'])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/heic': '.heic', 'image/avif': '.avif' })[file.mimetype] || '.jpg'
    const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : '.jpg'
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`)
  },
})

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true)
    else cb(Object.assign(new Error('Only image uploads are allowed'), { status: 400 }))
  },
})

export function publicUrl(file) {
  return file ? `/uploads/${file.filename}` : null
}

// MIME headers are client-controlled. Validate actual image bytes as well.
export async function validateUploadedPhoto(req, _res, next) {
  if (!req.file) return next()
  try {
    const handle = await fs.promises.open(req.file.path, 'r')
    const b = Buffer.alloc(16)
    try { await handle.read(b, 0, 16, 0) } finally { await handle.close() }
    const valid = {
      'image/jpeg': b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
      'image/png': b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
      'image/gif': ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString()),
      'image/webp': b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
      'image/heic': b.subarray(4, 8).toString() === 'ftyp' && ['heic', 'heix', 'mif1'].includes(b.subarray(8, 12).toString()),
      'image/avif': b.subarray(4, 8).toString() === 'ftyp' && ['avif', 'avis'].includes(b.subarray(8, 12).toString()),
    }[req.file.mimetype]
    if (!valid) {
      await fs.promises.unlink(req.file.path)
      return next(Object.assign(new Error('File contents do not match the image type'), { status: 400 }))
    }
    next()
  } catch (error) { next(error) }
}
