import { io } from "socket.io-client";

let socket;
let subscriberCount = 0;
let activeToken;

export const connectMessageRealtime = (token) => {
  if (!token) return null;
  subscriberCount += 1;
  if (!socket) {
    const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
    socket = io(apiUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
    activeToken = token;
  } else {
    // A socket may be shared by several UI surfaces. Reconnect the shared
    // socket when auth changes so the server receives the refreshed token.
    if (activeToken !== token) {
      activeToken = token;
      socket.auth = { token };
      socket.disconnect().connect();
    } else if (!socket.connected) socket.connect();
  }
  return socket;
};

export const disconnectMessageRealtime = () => {
  subscriberCount = Math.max(0, subscriberCount - 1);
  if (subscriberCount === 0) {
    socket?.disconnect();
    socket = undefined;
    activeToken = undefined;
  }
};
