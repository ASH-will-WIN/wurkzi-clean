import { io } from "socket.io-client";

let socket;
let subscriberCount = 0;

export const connectMessageRealtime = (token) => {
  if (!token) return null;
  subscriberCount += 1;
  if (!socket) {
    const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
    socket = io(apiUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

export const disconnectMessageRealtime = () => {
  subscriberCount = Math.max(0, subscriberCount - 1);
  if (subscriberCount === 0) {
    socket?.disconnect();
    socket = undefined;
  }
};
