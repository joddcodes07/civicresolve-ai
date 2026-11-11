import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

/** Records audio locally; only our backend holds the Groq credential. */
export function useSpeech({ lang = 'en-IN' } = {}) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const recording = useRef(null)
  const busy = useRef(false)
  const mounted = useRef(true)
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
  const stop = useCallback(() => {
    if (recording.current?.state === 'recording') recording.current.stop()
    setListening(false)
  }, [])
  const start = useCallback(async ({ onResult, onFinal, langOverride } = {}) => {
    if (!supported || busy.current) return false
    busy.current = true
    let stream
    try {
      setError(null)
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mounted.current) { stream.getTracks().forEach(t => t.stop()); busy.current = false; return false }
      const mimeType = ['audio/webm', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recording.current = recorder
      const chunks = []
      let size = 0
      recorder.ondataavailable = e => { if (e.data.size) { chunks.push(e.data); size += e.data.size; if (size >= 4.5 * 1024 * 1024) stop() } }
      const timer = setTimeout(() => recorder.state === 'recording' && recorder.stop(), 60000)
      recorder.onstop = async () => {
        clearTimeout(timer)
        stream.getTracks().forEach(t => t.stop())
        if (!mounted.current) { busy.current = false; return }
        setListening(false)
        try {
          const form = new FormData()
          const type = recorder.mimeType || 'audio/webm'
          form.append('audio', new Blob(chunks, { type }), type.includes('mp4') ? 'voice.m4a' : 'voice.webm')
          form.append('language', (langOverride || lang).split('-')[0])
          const result = await api.upload('/api/ai/transcribe', form)
          if (mounted.current) { onResult?.(result.text); onFinal?.(result.text) }
        } catch (e) { if (mounted.current) setError(e.message) }
        finally { busy.current = false }
      }
      recorder.start(500)
      setListening(true)
      return true
    } catch (e) { stream?.getTracks().forEach(t => t.stop()); busy.current = false; setError(e.message); return false }
  }, [lang, supported, stop])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (recording.current?.state === 'recording') recording.current.stop() } }, [])
  return { listening, supported, error, start, stop }
}
