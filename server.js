const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.static(__dirname));

console.log("🚀 Server starting...");

const rooms = {};

io.on("connection", (socket) => {
  console.log(`✅ New user connected: ${socket.id}`);

  socket.on("joinCall", ({ room, username }) => {
    if (!room || !username) return;

    // Leave previous room if exists
    if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
      if (rooms[socket.currentRoom]) {
        rooms[socket.currentRoom] = rooms[socket.currentRoom].filter(
          (user) => user.id !== socket.id
        );
        if (rooms[socket.currentRoom].length === 0) {
          delete rooms[socket.currentRoom];
        }
      }
    }

    console.log(`📢 ${username} (${socket.id}) joined room: ${room}`);
    socket.join(room);
    socket.currentRoom = room;
    socket.username = username;

    if (!rooms[room]) {
      rooms[room] = [];
    }
    rooms[room].push({ id: socket.id, name: username });

    console.log("🔄 Updated Users List:", rooms[room]);
    io.to(room).emit("userJoined", { users: rooms[room] });
  });

  // Handle chat messages
  socket.on("sendMessage", ({ room, username, message }) => {
    console.log(`📩 ${username} sent: ${message} in ${room}`);
    io.to(room).emit("receiveMessage", { username, message });
  });

  // Handle PeerJS ID exchange
  socket.on("peerId", ({ room, peerId }) => {
    socket.to(room).emit("newUser", peerId);
  });

  // Notify other users when a stream starts
  socket.on("newStream", ({ room, peerId, streamType }) => {
    console.log(`📡 New ${streamType} started in ${room}`);
    socket.to(room).emit("updateStream", { peerId, streamType });
  });

  socket.on("leaveCall", () => {
    if (!socket.currentRoom) return;

    console.log(
      `❌ ${socket.username} (${socket.id}) left room: ${socket.currentRoom}`
    );
    socket.leave(socket.currentRoom);

    if (rooms[socket.currentRoom]) {
      rooms[socket.currentRoom] = rooms[socket.currentRoom].filter(
        (user) => user.id !== socket.id
      );
      if (rooms[socket.currentRoom].length === 0) {
        delete rooms[socket.currentRoom];
      }
    }

    io.to(socket.currentRoom).emit("userLeft", {
      users: rooms[socket.currentRoom] || [],
    });
    socket.currentRoom = null;
  });

  socket.on("disconnect", () => {
    console.log(`🚪 User disconnected: ${socket.id}`);

    for (const room in rooms) {
      rooms[room] = rooms[room].filter((user) => user.id !== socket.id);
      if (rooms[room].length === 0) {
        delete rooms[room];
      } else {
        io.to(room).emit("userLeft", { users: rooms[room] });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
