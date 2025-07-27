require('dotenv').config(); // Load env vars at the top

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Player = require('./models/Player');
const Room = require('./models/Room');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const rooms = {};
const timers = {};

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizGame';
const port = process.env.PORT || 3000;

mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

io.on('connection', (socket) => {
  console.log(`🟢 Connected: ${socket.id}`);

  socket.on('joinRoom', async ({ roomId, name }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { players: [], firstBuzz: null, roundActive: false };
    }

    const player = { id: socket.id, name, score: 0 };
    rooms[roomId].players.push(player);
    socket.join(roomId);

    await Player.create({ socketId: socket.id, name, roomId, score: 0 });
    io.to(roomId).emit('playersUpdated', rooms[roomId].players);
  });

  socket.on('startRound', ({ roomId }) => {
    if (!rooms[roomId]) return;

    rooms[roomId].firstBuzz = null;
    rooms[roomId].roundActive = true;

    io.to(roomId).emit('roundStarted');
  });

  socket.on('buzz', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.firstBuzz || !room.roundActive) return;

    room.firstBuzz = socket.id;
    room.roundActive = false;

    io.to(socket.id).emit('buzzAccepted');

    if (timers[roomId]) clearTimeout(timers[roomId]);
    timers[roomId] = setTimeout(async () => {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.score -= 1;
        io.to(roomId).emit('playersUpdated', room.players);
        await Player.updateOne({ socketId: socket.id }, { $inc: { score: -1 } });
      }
      room.firstBuzz = null;
      io.to(roomId).emit('buzzReset');
    }, 10000);
  });

  socket.on('updateScore', async ({ roomId, playerId, points }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.score += points;
      io.to(roomId).emit('playersUpdated', room.players);
      await Player.updateOne({ socketId: playerId }, { $inc: { score: points } });
    }
  });

  socket.on('setScore', async ({ roomId, playerId, score }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.score = score;
      io.to(roomId).emit('playersUpdated', room.players);
      await Player.updateOne({ socketId: playerId }, { $set: { score } });
    }
  });

  socket.on('getLeaderboard', async ({ roomId }) => {
    const players = await Player.find({ roomId }).sort({ score: -1 }).limit(10);
    io.to(socket.id).emit('leaderboard', players);
  });

  socket.on('disconnect', async () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        await Player.deleteOne({ socketId: socket.id });
        io.to(roomId).emit('playersUpdated', room.players);
        break;
      }
    }
    console.log(`🔴 Disconnected: ${socket.id}`);
  });
});

server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});