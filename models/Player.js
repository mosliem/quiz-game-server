const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  socketId: String,
  name: String,
  roomId: String,
  score: Number,
});

module.exports = mongoose.model('Player', playerSchema);
