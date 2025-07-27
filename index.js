console.log('🟡 Starting server...');

require('dotenv').config();
console.log('🟢 Loaded .env file');

const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
console.log('✅ Created HTTP server');

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
console.log('✅ Initialized Socket.IO');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing in .env');
  process.exit(1);
}

app.get('/', (req, res) => {
  res.send('🎉 Server and Socket.IO are working!');
});

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err);
  });

io.on('connection', (socket) => {
  console.log(`🟢 Socket connected: ${socket.id}`);
});

// Catch unhandled errors
process.on('uncaughtException', err => {
  console.error('❗ Uncaught Exception:', err);
});

process.on('unhandledRejection', reason => {
  console.error('❗ Unhandled Rejection:', reason);
});