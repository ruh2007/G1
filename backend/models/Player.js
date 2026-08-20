const mongoose = require('mongoose');

// Per-game result snapshot for a player
const gameResultSchema = new mongoose.Schema({
  score:          { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  playedAt:       { type: Date, default: Date.now },
});

const playerSchema = new mongoose.Schema({
  uuid:            { type: String, required: true, unique: true, index: true },
  name:            { type: String, required: true },
  totalGames:      { type: Number, default: 0 },
  totalScore:      { type: Number, default: 0 },
  bestScore:       { type: Number, default: 0 },
  totalCorrect:    { type: Number, default: 0 },
  gameHistory:     { type: [gameResultSchema], default: [] },
  lastSeenAt:      { type: Date, default: Date.now },
});

// Virtual: average score per game
playerSchema.virtual('avgScore').get(function () {
  return this.totalGames > 0 ? Math.round(this.totalScore / this.totalGames) : 0;
});

module.exports = mongoose.model('Player', playerSchema);
