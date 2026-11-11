// Single shared Socket.IO client for live complaint updates.
import { getToken } from './api'
import { io } from 'socket.io-client'

const URL = import.meta.env.VITE_SOCKET_URL || undefined

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(URL, { path: '/socket.io', transports: ['websocket', 'polling'], autoConnect: true, auth: cb => cb({ token: getToken() }) })
  }
  return socket
}

export function resetSocketAuth() {
  if (socket) { socket.disconnect(); socket = null }
}

export function joinComplaint(code) {
  if (!code) return
  getSocket().emit('join:complaint', code)
}
