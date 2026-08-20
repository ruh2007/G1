const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  artist:        { type: String, required: true },
  difficulty:    { type: String, default: 'Medium', enum: ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'] },
  options:       { type: [String], required: true },
  correctAnswer: { type: String, required: true },
  audioUrl:      { type: String, default: '' },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model('Song', songSchema);
