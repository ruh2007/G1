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
 * Remove a player from MongoDB (used when host kicks a player).
 */
async function removePlayer(uuid) {
  try {
    if (mongoose.connection.readyState !== 1) return;
    await Player.deleteOne({ uuid });
    console.log(`🚫 Player ${uuid} removed from DB.`);
  } catch (err) {
    console.warn('DB: removePlayer failed:', err.message);
  }
}

/**
 * Persist a player's live score mid-game (called after each correct answer).
 * Uses $max to only update bestScore if current score exceeds it.
 */
async function updatePlayerScore(uuid, score, correctAnswers) {
  try {
    if (mongoose.connection.readyState !== 1) return;
    await Player.updateOne(
      { uuid },
      {
        $set: { lastSeenAt: new Date() },
        $max: { bestScore: score },
      },
      { upsert: false }
    );
  } catch (err) {
    // Non-critical — don't warn noisily on every answer
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

module.exports = { upsertPlayer, saveGameResults, removePlayer, updatePlayerScore, getGlobalLeaderboard };
