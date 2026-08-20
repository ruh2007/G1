const mongoose = require('mongoose');
const Player = require('./models/Player');

/**
 * Upsert player in MongoDB when they join.
 * Creates them if new, updates name & lastSeenAt if returning.
 */
async function upsertPlayer(uuid, name) {
  try {
    if (mongoose.connection.readyState !== 1) return null;
    return await Player.findOneAndUpdate(
      { uuid },
      { $set: { name, lastSeenAt: new Date() } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn('DB: upsertPlayer failed:', err.message);
    return null;
  }
}

/**
 * Called at the end of every game (FINAL_RESULTS / RESET_GAME).
 * Persists per-player game results into MongoDB.
 */
async function saveGameResults(playersMap, totalQuestions) {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const bulk = [];
    playersMap.forEach((p) => {
      const result = {
        score:          p.score,
        correctAnswers: p.correctAnswers,
        totalQuestions,
        playedAt:       new Date(),
      };
      bulk.push({
        updateOne: {
          filter: { uuid: p.uuid },
          update: {
            $set:  { name: p.name, lastSeenAt: new Date() },
            $inc:  { totalGames: 1, totalScore: p.score, totalCorrect: p.correctAnswers },
            $max:  { bestScore: p.score },
            $push: { gameHistory: { $each: [result], $slice: -20 } }, // keep last 20 games
          },
          upsert: true,
        },
      });
    });
    if (bulk.length > 0) {
      await Player.bulkWrite(bulk);
      console.log(`✅ Game results saved to MongoDB for ${bulk.length} players.`);
    }
  } catch (err) {
    console.warn('DB: saveGameResults failed:', err.message);
  }
}

/**
 * Fetch global leaderboard (all-time best scores) from MongoDB.
 */
async function getGlobalLeaderboard(limit = 20) {
  try {
    if (mongoose.connection.readyState !== 1) return [];
    return await Player.find({ totalGames: { $gt: 0 } })
      .sort({ bestScore: -1, totalScore: -1 })
      .limit(limit)
      .select('name totalGames totalScore bestScore totalCorrect lastSeenAt')
      .lean();
  } catch (err) {
    console.warn('DB: getGlobalLeaderboard failed:', err.message);
    return [];
  }
}

module.exports = { upsertPlayer, saveGameResults, getGlobalLeaderboard };
