import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'

/** Minimal GET data hook with loading / error / reload. */
export function useFetch(path, { enabled = true, initial = null } = {}) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(Boolean(enabled))
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const reload = useCallback(
    async (silent = false) => {
      if (!path) return
      if (!silent) setLoading(true)
      try {
        const result = await api.get(path)
        if (mounted.current) {
          setData(result)
          setError(null)
        }
        return result
      } catch (err) {
        if (mounted.current) setError(err)
        throw err
      } finally {
        if (mounted.current) setLoading(false)
      }
    },
    [path],
  )

  useEffect(() => {
    if (!enabled || !path) {
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    api
      .get(path)
      .then((result) => {
        if (alive) {
          setData(result)
          setError(null)
        }
      })
      .catch((err) => {
        if (alive) setError(err)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [path, enabled])

  return { data, loading, error, reload, setData }
}

export default useFetch
