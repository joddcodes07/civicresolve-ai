// Shared enums / labels used across services, routes and the client payloads.

export const STATUS_LABELS = {
  SUBMITTED: 'Submitted',
  ASSIGNED: 'Assigned to officer',
  IN_PROGRESS: 'Work in progress',
  RESOLVED: 'Resolved · awaiting your confirmation',
  CONFIRMED: 'Closed · verified fixed',
  REOPENED: 'Reopened · not fixed',
  NEEDS_REVIEW: 'Needs manual routing',
}

export const OPEN_STATUSES = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'NEEDS_REVIEW']
export const CLOSED_STATUSES = ['RESOLVED', 'CONFIRMED']

export const CONFIRM_WINDOW_DAYS = 7

// F7 weighting for the department performance index (configurable in settings).
export const DPI_WEIGHTS = { onTime: 0.4, vrr: 0.4, rating: 0.2 }

// Phrases that do NOT count as proof of a real fix.
export const VAGUE_NOTE_PHRASES = [
  'forwarded', 'under process', 'in process', 'will check', 'will be done', 'as per',
  'noted', 'done', 'ok', 'okay', 'no issue', 'no problem', 'resolved', 'pending',
  'attended', 'seen', 'checked', 'will do', 'not applicable', 'n/a',
]

export const MIN_RESOLUTION_NOTE_LENGTH = 20
export const AFTER_PHOTO_MAX_DISTANCE_M = 200
