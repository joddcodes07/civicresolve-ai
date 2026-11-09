// Thin Socket.IO registry so services can emit without importing the server.
// Rooms: complaint:<code> · officers:<departmentId> · user:<userId> · admins
let io = null

export function setIO(server) {
  io = server
}

export function getIO() {
  return io
}

export function emitToRoom(room, event, payload) {
  if (io) io.to(room).emit(event, payload)
}

export function emitToAll(event, payload) {
  if (io) io.emit(event, payload)
}

export const rooms = {
  complaint: (code) => `complaint:${code}`,
  officers: (departmentId) => `officers:${departmentId}`,
  user: (userId) => `user:${userId}`,
  admins: 'admins',
}
