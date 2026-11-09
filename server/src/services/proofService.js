// Proof-of-fix gate. Closing a complaint as RESOLVED requires:
//   • an after-photo, and
//   • a note of at least 20 characters that actually says WHAT was done
//     (vague filler like "forwarded" / "under process" is rejected).
// If the complaint is not theirs, the officer must Transfer instead.

import { VAGUE_NOTE_PHRASES, MIN_RESOLUTION_NOTE_LENGTH, AFTER_PHOTO_MAX_DISTANCE_M } from '../lib/constants.js'
import { haversineMetres } from '../lib/geo.js'
import { normalizeText } from '../lib/text.js'

const FILLER = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'to', 'of', 'in', 'on', 'at', 'and', 'or', 'for', 'with',
  'this', 'that', 'it', 'its', 'we', 'i', 'has', 'have', 'been', 'be', 'will', 'be', 'by', 'as',
  'per', 'please', 'kindly', 'sir', 'madam', 'team', 'department', 'dept',
])

/** Does the note carry real content once vague phrases and filler are removed? */
export function assessResolutionNote(note = '') {
  const trimmed = String(note).trim()
  const lower = trimmed.toLowerCase()
  const reasons = []

  if (trimmed.length < MIN_RESOLUTION_NOTE_LENGTH) {
    reasons.push(`Note must be at least ${MIN_RESOLUTION_NOTE_LENGTH} characters describing what was actually done.`)
  }

  const hitVague = VAGUE_NOTE_PHRASES.some((p) => lower.includes(p))
  const contentWords = normalizeText(trimmed)
    .split(' ')
    .filter((w) => w && !FILLER.has(w) && !VAGUE_NOTE_PHRASES.some((p) => p.split(' ').includes(w)))

  if (hitVague && contentWords.length < 3) {
    reasons.push('Note is too vague. Say what was done (e.g. "Garbage lifted by truck, area swept and sanitised").')
  }
  if (trimmed && contentWords.length < 2 && reasons.length === 0) {
    reasons.push('Note must describe the action taken, not just a status.')
  }

  return { ok: reasons.length === 0, reasons }
}

/** Optional GPS check: the after-photo should be near the complaint. */
export function assessAfterPhotoLocation({ afterLat, afterLng, complaintLat, complaintLng }) {
  if (afterLat == null || afterLng == null || complaintLat == null || complaintLng == null) {
    return { ok: true, reasons: [], distanceMetres: null }
  }
  const distanceMetres = haversineMetres(complaintLat, complaintLng, afterLat, afterLng)
  if (distanceMetres > AFTER_PHOTO_MAX_DISTANCE_M) {
    return {
      ok: false,
      distanceMetres: Math.round(distanceMetres),
      reasons: [`After-photo was taken ${Math.round(distanceMetres)}m from the complaint (max ${AFTER_PHOTO_MAX_DISTANCE_M}m).`],
    }
  }
  return { ok: true, distanceMetres: Math.round(distanceMetres), reasons: [] }
}

/** Full proof check for a resolve action. */
export function checkProofOfFix({ note, afterPhotoUrl, afterLat, afterLng, complaintLat, complaintLng }) {
  const reasons = []
  const noteCheck = assessResolutionNote(note)
  reasons.push(...noteCheck.reasons)

  if (!afterPhotoUrl) {
    reasons.push('An after-photo of the fixed problem is required.')
  }

  const locCheck = assessAfterPhotoLocation({ afterLat, afterLng, complaintLat, complaintLng })
  reasons.push(...locCheck.reasons)

  return {
    ok: reasons.length === 0,
    reasons,
    distanceMetres: locCheck.distanceMetres,
  }
}
