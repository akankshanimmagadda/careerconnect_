import { Server } from "socket.io";
import { User } from "./models/userSchema.js";

export const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", async (socket) => {
    const { userId, name } = socket.handshake.auth;
    if (!userId) return;

    socket.userId = userId;
    socket.userName = name;

    // Mark user online
    await User.findByIdAndUpdate(userId, { isOnline: true });

    // Join personal room (important for direct requests)
    socket.join(userId);
    console.log(`User ${name} (${userId}) connected and joined personal room`);

    // Store interview room info for this socket
    const userInterviewRooms = {};

    /* ===============================
       SEND INTERVIEW REQUEST
    =============================== */
    socket.on("send-interview-request", ({ receiverId }) => {
      console.log(`Interview request from ${socket.userName} to ${receiverId}`);
      io.to(receiverId).emit("interview-request-received", {
        senderId: userId,
        senderName: name,
      });
    });

    /* ===============================
       ACCEPT INTERVIEW REQUEST
    =============================== */
    socket.on("accept-interview-request", ({ senderId, interviewId }) => {
      console.log(`Interview request accepted by ${socket.userName} for session ${interviewId}`);
      
      userInterviewRooms[interviewId] = true;
      
      // Notify the sender that their request was accepted
      io.to(senderId).emit("interview-request-accepted", {
        receiverId: userId,
        receiverName: name,
        interviewId
      });

      // Navigate both users to the interview session
      io.to(senderId).emit("navigate-to-interview", interviewId);
      io.to(userId).emit("navigate-to-interview", interviewId);
    });

    /* ===============================
       START PEER SESSION
    =============================== */
    socket.on("start-peer-session", ({ user1Id, user2Id, interviewId }) => {
      console.log(`Starting peer session ${interviewId} between ${user1Id} and ${user2Id}`);
      io.to(user1Id).emit("navigate-to-interview", interviewId);
      io.to(user2Id).emit("navigate-to-interview", interviewId);
    });

    /* ===============================
       JOIN INTERVIEW ROOM
    =============================== */
    socket.on("join-interview", ({ interviewId, peerId }) => {
      socket.join(interviewId);
      socket.peerId = peerId;
      userInterviewRooms[interviewId] = true;
      
      console.log(`User ${socket.userName} (${socket.userId}) joined interview room ${interviewId} with peerId ${peerId}`);

      // Broadcast to other users in the same room
      const connectedUsers = [];
      for (const roomSocket of io.sockets.sockets.get(interviewId) || []) {
        if (roomSocket.id !== socket.id) {
          connectedUsers.push({
            peerId: roomSocket.peerId,
            userId: roomSocket.userId,
            userName: roomSocket.userName
          });
        }
      }

      console.log(`Broadcasting user-connected to room ${interviewId}. Connected users:`, connectedUsers);

      // Notify all other users in the room about this user
      socket.to(interviewId).emit("user-connected", {
        peerId,
        userId,
        userName: name,
      });

      // Optionally send back info about already connected users
      if (connectedUsers.length > 0) {
        socket.emit("existing-users", connectedUsers);
      }
    });

    /* ===============================
       CHAT
    =============================== */
    socket.on("send-message", ({ interviewId, message }) => {
      io.to(interviewId).emit("receive-message", {
        sender: name,
        message,
      });
    });

    /* ===============================
       CODE SYNC
    =============================== */
    socket.on("code-update", ({ interviewId, code }) => {
      socket.to(interviewId).emit("code-update", { code });
    });

    /* ===============================
       DISCONNECT
    =============================== */
    socket.on("disconnect", async () => {
      console.log(`User ${socket.userName} disconnected`);
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        isAvailableForMockInterview: false,
      });
    });
  });
};
