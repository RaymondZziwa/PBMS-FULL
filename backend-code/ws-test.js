import { io } from "socket.io-client";

const socket = io("https://api.streetmatchafrica.com", {
    transports: ["websocket"],
    withCredentials: true,
  });
  
  socket.on("connect", () => console.log("Connected", socket.id));
  socket.on("message", (m) => console.log("Message:", m));
  