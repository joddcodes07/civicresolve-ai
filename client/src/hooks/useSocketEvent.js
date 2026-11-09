import { useEffect } from 'react'
import { getSocket } from '../lib/socket.js'

/** Subscribe to a Socket.IO event for the lifetime of a component. */
export function useSocketEvent(event, handler, deps = []) {
  useEffect(() => {
    if (!event || !handler) return
    const socket = getSocket()
    socket.on(event, handler)
    return () => socket.off(event, handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps])
}

export default useSocketEvent
