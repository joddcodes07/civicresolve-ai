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
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().slice(0, 6)
    const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : '.jpg'
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`)
  },
})

export const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true)
    else cb(new Error('Only image uploads are allowed'))
  },
})

export function publicUrl(file) {
  return file ? `/uploads/${file.filename}` : null
}
