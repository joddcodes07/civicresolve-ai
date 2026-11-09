// Single shared Socket.IO client for live complaint updates.
import { io } from 'socket.io-client'

const URL = import.meta.env.VITE_SOCKET_URL || undefined

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(URL, { path: '/socket.io', transports: ['websocket', 'polling'], autoConnect: true })
  }
  return socket
}

export function joinComplaint(code) {
  if (!code) return
  getSocket().emit('join:complaint', code)
}
