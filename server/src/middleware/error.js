// Centralised error handling + a typed HttpError helper.

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Not found' })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500
  if (status >= 500) console.error('[error]', err)
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Upload failed: ${err.message}` })
  }
  res.status(status).json({ error: err.message || 'Something went wrong', ...(err.extra || {}) })
}

// Wrap async handlers so rejections reach the error handler (Express 5 does this
// natively, but this keeps behaviour explicit and portable).
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
