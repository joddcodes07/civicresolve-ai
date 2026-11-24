import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

/** Records audio locally; only our backend holds the Groq credential. */
export function useSpeech({ lang = 'en-IN', signedIn = false } = {}) {
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const recording = useRef(null)
  const recognition = useRef(null)
  const busy = useRef(false)
  const retryInBrowser = useRef(false)
  const mounted = useRef(true)
  const Recognition = typeof window === 'undefined' ? undefined : window.SpeechRecognition || window.webkitSpeechRecognition
  const canRecord = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
  const supported = Boolean(Recognition || (signedIn && canRecord))
  const stop = useCallback(() => {
    recognition.current?.stop()
    if (recording.current?.state === 'recording') recording.current.stop()
    setListening(false)
  }, [])
  const start = useCallback(async ({ onResult, onFinal, langOverride } = {}) => {
    if (!supported || busy.current) return false
    busy.current = true
    setError(null)
    const language = langOverride || lang

    // Browser recognition keeps voice usable for guests. Server transcription requires sign-in.
    if ((!signedIn || !canRecord || retryInBrowser.current) && Recognition) {
      const recognizer = new Recognition()
      recognition.current = recognizer
      recognizer.lang = language
      recognizer.onresult = (event) => {
        if (!mounted.current) return
        const text = event.results[0]?.[0]?.transcript?.trim()
        if (text) { onResult?.(text); onFinal?.(text) }
      }
      recognizer.onerror = (event) => {
        retryInBrowser.current = false
        if (mounted.current) setError(event.error)
      }
      recognizer.onend = () => {
        recognition.current = null
        busy.current = false
        if (mounted.current) setListening(false)
      }
      try {
        recognizer.start()
        setListening(true)
        return true
      } catch (e) {
        recognizer.onend()
        setError(e.name)
        return false
      }
    }

    let stream
    try {
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
        setProcessing(true)
        try {
          const form = new FormData()
          const type = recorder.mimeType || 'audio/webm'
          form.append('audio', new Blob(chunks, { type }), type.includes('mp4') ? 'voice.m4a' : 'voice.webm')
          form.append('language', language.split('-')[0])
          const result = await api.upload('/api/ai/transcribe', form)
          if (mounted.current && result.text) { onResult?.(result.text); onFinal?.(result.text) }
          else if (mounted.current) setError('no-speech')
        } catch {
          if (mounted.current) {
            retryInBrowser.current = Boolean(Recognition)
            setError('transcription')
          }
        } finally {
          busy.current = false
          if (mounted.current) setProcessing(false)
        }
      }
      recorder.start(500)
      setListening(true)
      return true
    } catch (e) { stream?.getTracks().forEach(t => t.stop()); busy.current = false; setError(e.name); return false }
  }, [lang, supported, stop, signedIn, canRecord, Recognition])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; recognition.current?.abort(); if (recording.current?.state === 'recording') recording.current.stop() } }, [])
  return { listening, processing, supported, error, start, stop }
}
