// Single shared Socket.IO client for live complaint updates.
import { getToken, BASE } from './api'
import { io } from 'socket.io-client'

const DEFAULT_SOCKET_URL = 'https://civicresolve-api-mq39.onrender.com'
const isDesktop =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' || Boolean(window.desktop?.isElectron))

const URL = import.meta.env.VITE_SOCKET_URL || (isDesktop && !import.meta.env.DEV ? DEFAULT_SOCKET_URL : (BASE || undefined))

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
