import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

// Browser speech recognition (Chrome / Edge / Safari). Works with no server key.
const SpeechRecognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

/** Voice input: browser speech-to-text first, server transcription as a fallback. */
export function useSpeech({ lang = 'en-IN' } = {}) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const recognition = useRef(null)
  const recording = useRef(null)
  const busy = useRef(false)
  const mounted = useRef(true)

  const recorderSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  const supported = Boolean(SpeechRecognition) || recorderSupported

  const stop = useCallback(() => {
    if (recognition.current) {
      try {
        recognition.current.stop()
      } catch {
        /* already stopped */
      }
      recognition.current = null
    }
    if (recording.current?.state === 'recording') recording.current.stop()
    setListening(false)
  }, [])

  const startRecorder = useCallback(
    async ({ onResult, onFinal, langOverride } = {}) => {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (!mounted.current) {
          stream.getTracks().forEach((t) => t.stop())
          busy.current = false
          return
        }
        const mimeType = ['audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type))
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
        recording.current = recorder
        const chunks = []
        let size = 0
        recorder.ondataavailable = (e) => {
          if (e.data.size) {
            chunks.push(e.data)
            size += e.data.size
            if (size >= 4.5 * 1024 * 1024) stop()
          }
        }
        const timer = setTimeout(() => recorder.state === 'recording' && recorder.stop(), 60000)
        recorder.onstop = async () => {
          clearTimeout(timer)
          stream.getTracks().forEach((t) => t.stop())
          if (!mounted.current) {
            busy.current = false
            return
          }
          setListening(false)
          try {
            const form = new FormData()
            const type = recorder.mimeType || 'audio/webm'
            form.append('audio', new Blob(chunks, { type }), type.includes('mp4') ? 'voice.m4a' : 'voice.webm')
            form.append('language', (langOverride || lang).split('-')[0])
            const result = await api.upload('/api/ai/transcribe', form)
            if (mounted.current) {
              onResult?.(result.text)
              onFinal?.(result.text)
            }
          } catch (e) {
            if (mounted.current) setError(e.message)
          } finally {
            busy.current = false
          }
        }
        recorder.start(500)
        setListening(true)
      } catch (e) {
        stream?.getTracks().forEach((t) => t.stop())
        busy.current = false
        setError(e?.name || e?.message || 'microphone_error')
      }
    },
    [lang, stop],
  )

  const start = useCallback(
    ({ onResult, onFinal, langOverride } = {}) => {
      if (busy.current) return false
      setError(null)

      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition()
          rec.lang = langOverride || lang
          rec.interimResults = true
          rec.continuous = false
          rec.maxAlternatives = 1
          let finalText = ''
          rec.onresult = (event) => {
            let interim = ''
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
              const result = event.results[i]
              const transcript = result[0]?.transcript || ''
              if (result.isFinal) finalText += `${transcript} `
              else interim += transcript
            }
            const combined = `${finalText}${interim}`.replace(/\s+/g, ' ').trim()
            if (combined) onResult?.(combined)
            if (finalText.trim()) onFinal?.(finalText.replace(/\s+/g, ' ').trim())
          }
          rec.onerror = (event) => {
            setError(event.error || 'speech_error')
            setListening(false)
            busy.current = false
          }
          rec.onend = () => {
            setListening(false)
            busy.current = false
            recognition.current = null
          }
          recognition.current = rec
          busy.current = true
          rec.start()
          setListening(true)
          return true
        } catch (e) {
          busy.current = false
          setError(e?.message || 'speech_error')
          return false
        }
      }

      if (!recorderSupported) {
        setError('unsupported')
        return false
      }

      busy.current = true
      startRecorder({ onResult, onFinal, langOverride })
      return true
    },
    [lang, recorderSupported, startRecorder],
  )

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (recognition.current) {
        try {
          recognition.current.abort()
        } catch {
          /* ignore */
        }
        recognition.current = null
      }
      if (recording.current?.state === 'recording') recording.current.stop()
      busy.current = false
    }
  }, [])

  return { listening, supported, error, start, stop }
}
