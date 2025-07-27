const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', roomSchema);
