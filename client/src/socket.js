import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  if (!token) return null;
  if (socket && socket._authToken === token && (socket.connected || socket.active)) return socket;
  if (socket) socket.disconnect();
  socket = io('/', { auth: { token }, transports: ['websocket', 'polling'] });
  socket._authToken = token;
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
