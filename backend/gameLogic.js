const { loadSongs, saveSongs } = require('./songs');

// ─── Rate-limit helper (per socket, per event) ───
function makeRateLimiter(maxCalls, windowMs) {
  const map = new Map();
  return function check(socketId) {
    const now = Date.now();
    const entry = map.get(socketId) || { count: 0, windowStart: now };
    if (now - entry.windowStart > windowMs) {
      entry.count = 1;
      entry.windowStart = now;
    } else {
      entry.count++;
    }
    map.set(socketId, entry);
    return entry.count <= maxCalls;
  };
}

class GameState {
  constructor() {
    this.status = 'LOBBY';
    this.currentQuestionIndex = 0;
    this.questionStartTime = null;
    this.players = new Map();
    this.socketToUuid = new Map();
    this.songs = loadSongs();
    this._audioTimer = null;
    this._lockTimer = null;
  }

  clearTimers() {
    if (this._audioTimer) { clearTimeout(this._audioTimer); this._audioTimer = null; }
    if (this._lockTimer)  { clearTimeout(this._lockTimer);  this._lockTimer = null; }
  }

  getLeaderboard() {
    const arr = Array.from(this.players.values());
    arr.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
      return a.totalAnswerTime - b.totalAnswerTime;
    });
    arr.forEach((p, i) => { p.rank = i + 1; });
    return arr;
  }

  normalizeAnswer(answer) {
    if (!answer) return '';
    return answer.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  checkAnswer(submittedText) {
    const song = this.songs[this.currentQuestionIndex];
    if (!song) return false;
    return this.normalizeAnswer(submittedText) === this.normalizeAnswer(song.correctAnswer);
  }
}

let gameState = new GameState();

function initGameLogic(io) {
  const answerRateLimit = makeRateLimiter(3, 5000);
  const actionRateLimit = makeRateLimiter(10, 5000);

  // ─── State builders (defined first so scheduleHostBroadcast can use them) ───

  function getPublicGameState() {
    const currentSong = gameState.songs[gameState.currentQuestionIndex];
    if (!currentSong) return { status: gameState.status, error: 'No songs loaded' };

    const publicSong = {
      id: currentSong.id,
      difficulty: currentSong.difficulty,
      audioUrl: currentSong.audioUrl,
      options: currentSong.options,
    };

    if (['RESULTS', 'LEADERBOARD', 'FINAL_RESULTS'].includes(gameState.status)) {
      publicSong.title  = currentSong.title;
      publicSong.artist = currentSong.artist;
    }

    const state = {
      status: gameState.status,
      currentQuestionIndex: gameState.currentQuestionIndex,
      totalQuestions: gameState.songs.length,
      playerCount: gameState.players.size,
      song: publicSong,
    };

    if (['LEADERBOARD', 'FINAL_RESULTS'].includes(gameState.status)) {
      const lb = gameState.getLeaderboard();
      state.top10 = lb.slice(0, 10).map(p => ({ name: p.name, score: p.score, uuid: p.uuid }));
    }

    return state;
  }

  function getHostGameState() {
    const qIndex = gameState.currentQuestionIndex;
    let answersReceived = 0;
    gameState.players.forEach(p => { if (p.answers[qIndex]) answersReceived++; });
    const allPlayers = Array.from(gameState.players.values());
    const connected  = allPlayers.filter(p => p.connected).length;

    return {
      status: gameState.status,
      currentQuestionIndex: qIndex,
      totalQuestions: gameState.songs.length,
      playerCount: allPlayers.length,
      connectedPlayers: connected,
      answersReceived,
      currentSong: gameState.songs[qIndex],
      allSongs: gameState.songs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        difficulty: s.difficulty,
        correctAnswer: s.correctAnswer
      })),
      leaderboard: gameState.getLeaderboard().slice(0, 10).map(p => ({
        uuid: p.uuid,
        name: p.name,
        score: p.score,
        correctAnswers: p.correctAnswers,
        rank: p.rank,
      })),
    };
  }

  // ─── Throttled host broadcast (max 1 update per 200 ms) ───
  let hostBroadcastTimer = null;
  function scheduleHostBroadcast() {
    if (hostBroadcastTimer) return;
    hostBroadcastTimer = setTimeout(() => {
      io.to('host_room').emit('host_state_update', getHostGameState());
      hostBroadcastTimer = null;
    }, 200);
  }

  // ─── Socket handlers ─────────────────────────────────────────────────────

  io.on('connection', (socket) => {
    console.log(`[+] ${socket.id}`);

    socket.on('join_host', () => {
      socket.join('host_room');
      socket.emit('host_state_update', getHostGameState());
    });

    socket.on('host_action', (data) => {
      if (!actionRateLimit(socket.id)) return;
      const { action, payload } = data || {};

      switch (action) {
        case 'ADD_SONG': {
          if (!payload || !payload.title || !payload.options || !payload.correctAnswer) return;
          const newId = gameState.songs.length > 0
            ? Math.max(...gameState.songs.map(s => s.id)) + 1 : 1;
          gameState.songs.push({ id: newId, ...payload });
          saveSongs(gameState.songs);
          io.emit('game_state_update', getPublicGameState());
          break;
        }

        case 'DELETE_SONG': {
          const { songId } = payload || {};
          if (songId === undefined) return;
          gameState.songs = gameState.songs.filter(s => s.id !== songId);
          if (gameState.songs.length === 0) {
            gameState.status = 'LOBBY';
            gameState.currentQuestionIndex = 0;
          } else if (gameState.currentQuestionIndex >= gameState.songs.length) {
            gameState.currentQuestionIndex = Math.max(0, gameState.songs.length - 1);
          }
          saveSongs(gameState.songs);
          io.emit('game_state_update', getPublicGameState());
          break;
        }

        case 'RESET_POINTS': {
          gameState.players.forEach((p) => {
            p.score = 0;
            p.correctAnswers = 0;
            p.totalAnswerTime = 0;
            p.answers = {};
          });
          gameState.players.forEach((p) => {
            if (p.socketId) {
              const socketObj = io.sockets.sockets.get(p.socketId);
              if (socketObj) socketObj.emit('player_update', p);
            }
          });
          io.emit('game_state_update', getPublicGameState());
          break;
        }

        case 'START_GAME':
          if (gameState.status !== 'LOBBY') return;
          gameState.status = 'QUESTION_READY';
          gameState.currentQuestionIndex = 0;
          io.emit('game_state_update', getPublicGameState());
          break;

        case 'PLAY_AUDIO':
          if (gameState.status !== 'QUESTION_READY') return;
          gameState.status = 'AUDIO_PLAYING';
          io.emit('game_state_update', getPublicGameState());
          gameState._audioTimer = setTimeout(() => {
            if (gameState.status !== 'AUDIO_PLAYING') return;
            gameState.status = 'ANSWERING';
            gameState.questionStartTime = Date.now();
            io.emit('game_state_update', getPublicGameState());
            gameState._lockTimer = setTimeout(() => {
              if (gameState.status === 'ANSWERING') {
                gameState.status = 'ANSWERS_LOCKED';
                io.emit('game_state_update', getPublicGameState());
                scheduleHostBroadcast();
              }
            }, 10000);
          }, 3000);
          break;

        case 'CLOSE_ANSWERS':
          if (gameState.status !== 'ANSWERING') return;
          gameState.clearTimers();
          gameState.status = 'ANSWERS_LOCKED';
          io.emit('game_state_update', getPublicGameState());
          break;

        case 'REVEAL_ANSWER':
          if (gameState.status !== 'ANSWERS_LOCKED') return;
          gameState.status = 'RESULTS';
          io.emit('game_state_update', getPublicGameState());
          break;

        case 'SHOW_LEADERBOARD':
          if (gameState.status !== 'RESULTS') return;
          gameState.status = gameState.currentQuestionIndex === gameState.songs.length - 1
            ? 'FINAL_RESULTS' : 'LEADERBOARD';
          io.emit('game_state_update', getPublicGameState());
          break;

        case 'NEXT_QUESTION':
          if (gameState.status !== 'LEADERBOARD') return;
          if (gameState.currentQuestionIndex < gameState.songs.length - 1) {
            gameState.currentQuestionIndex++;
            gameState.status = 'QUESTION_READY';
            gameState.questionStartTime = null;
            io.emit('game_state_update', getPublicGameState());
          }
          break;

        case 'END_GAME':
          gameState.clearTimers();
          gameState.status = 'FINAL_RESULTS';
          io.emit('game_state_update', getPublicGameState());
          break;

        case 'RESET_GAME':
          gameState.clearTimers();
          gameState = new GameState();
          io.emit('game_state_update', getPublicGameState());
          break;
      }

      scheduleHostBroadcast();
    });

    socket.on('join_game', (data) => {
      const { playerName, uuid } = data || {};
      if (!playerName || !uuid) return;

      if (!gameState.players.has(uuid)) {
        gameState.players.set(uuid, {
          uuid,
          socketId: socket.id,
          name: String(playerName).slice(0, 30),
          score: 0,
          correctAnswers: 0,
          totalAnswerTime: 0,
          answers: {},
          connected: true,
        });
      } else {
        const p = gameState.players.get(uuid);
        p.socketId = socket.id;
        p.connected = true;
      }

      gameState.socketToUuid.set(socket.id, uuid);
      socket.emit('game_state_update', getPublicGameState());
      socket.emit('player_update', gameState.players.get(uuid));
      scheduleHostBroadcast();
    });

    socket.on('submit_answer', (data) => {
      if (!answerRateLimit(socket.id)) return;
      const { answer, uuid } = data || {};
      if (!answer || !uuid) return;
      if (gameState.status !== 'ANSWERING') return;

      const player = gameState.players.get(uuid);
      if (!player) return;

      const qIndex = gameState.currentQuestionIndex;
      if (player.answers[qIndex]) return;

      const timeInSecs = (Date.now() - gameState.questionStartTime) / 1000;
      const isCorrect  = gameState.checkAnswer(answer);
      let points = 0;

      if (isCorrect) {
        player.correctAnswers++;
        const speedBonus = Math.max(0, Math.round(50 * (1 - timeInSecs / 10)));
        points = 100 + speedBonus;
      }

      player.answers[qIndex] = { submitted: answer, timeTaken: timeInSecs, points, correct: isCorrect };
      player.score += points;
      player.totalAnswerTime += timeInSecs;

      socket.emit('answer_receipt', { success: true, points });
      socket.emit('player_update', player);
      scheduleHostBroadcast();

      // Auto-lock when every connected player has answered
      const connectedPlayers = Array.from(gameState.players.values()).filter(p => p.connected);
      const answered = connectedPlayers.filter(p => p.answers[qIndex]);
      if (answered.length >= connectedPlayers.length && gameState.status === 'ANSWERING') {
        gameState.clearTimers();
        gameState.status = 'ANSWERS_LOCKED';
        io.emit('game_state_update', getPublicGameState());
        scheduleHostBroadcast();
      }
    });

    socket.on('disconnect', () => {
      console.log(`[-] ${socket.id}`);
      const uuid = gameState.socketToUuid.get(socket.id);
      if (uuid) {
        const p = gameState.players.get(uuid);
        if (p) p.connected = false;
        gameState.socketToUuid.delete(socket.id);
      }
      scheduleHostBroadcast();
    });

    // Send current state immediately on connect
    socket.emit('game_state_update', getPublicGameState());
    const existingUuid = gameState.socketToUuid.get(socket.id);
    if (existingUuid) socket.emit('player_update', gameState.players.get(existingUuid));
  });
}

module.exports = { initGameLogic };
