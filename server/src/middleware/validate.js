// Zod request validation middleware.
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.') || source,
        message: i.message,
      }))
      return res.status(400).json({ error: 'Please check the highlighted fields.', details })
    }
    // Express 5 exposes req.query as a prototype getter with no setter, so a
    // plain assignment throws. Shadow it on the instance instead.
    try {
      req[source] = result.data
    } catch {
      Object.defineProperty(req, source, {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      })
    }
    next()
  }
}
