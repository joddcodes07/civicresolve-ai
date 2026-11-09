import { useCallback, useEffect, useRef, useState } from 'react'

/** Web Speech API wrapper (browser speech-to-text). No install, no key. */
export function useSpeech({ lang = 'en-IN' } = {}) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const supported =
    typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    setListening(false)
  }, [])

  const start = useCallback(
    ({ onResult, onFinal, langOverride } = {}) => {
      if (!supported) {
        setError('unsupported')
        return false
      }
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new Ctor()
      recognition.lang = langOverride || lang
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      let finalText = ''
      recognition.onstart = () => {
        setError(null)
        setListening(true)
      }
      recognition.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript
          if (event.results[i].isFinal) finalText += chunk
          else interim += chunk
        }
        onResult?.(`${finalText}${interim}`.trim())
      }
      recognition.onerror = (event) => {
        setError(event.error || 'error')
        setListening(false)
      }
      recognition.onend = () => {
        setListening(false)
        if (finalText.trim()) onFinal?.(finalText.trim())
      }

      recognitionRef.current = recognition
      try {
        recognition.start()
      } catch {
        setError('error')
        return false
      }
      return true
    },
    [lang, supported],
  )

  useEffect(() => () => stop(), [stop])

  return { listening, supported, error, start, stop }
}
