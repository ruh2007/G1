const io = require('socket.io-client');
const crypto = require('crypto');

const SERVER_URL = 'http://localhost:3000';
const NUM_PLAYERS = 500;

console.log(`Starting load test with ${NUM_PLAYERS} players...`);

const sockets = [];

for (let i = 0; i < NUM_PLAYERS; i++) {
  const socket = io(SERVER_URL);
  
  socket.on('connect', () => {
    // Generate unique UUID and Name
    const uuid = crypto.randomUUID();
    const playerName = `Bot_${i}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Join game
    socket.emit('join_game', { playerName, uuid });
    sockets.push({ socket, uuid });
    
    if (i === NUM_PLAYERS - 1) {
      console.log(`${NUM_PLAYERS} connections established.`);
    }
  });

  socket.on('game_state_update', (state) => {
    if (state.status === 'ANSWERING') {
      // Simulate answering after a random delay (1 to 5 seconds)
      const delay = Math.floor(Math.random() * 4000) + 1000;
      setTimeout(() => {
        // Find the player's socket/uuid info
        const playerInfo = sockets.find(s => s.socket.id === socket.id);
        if (playerInfo) {
          // 50% chance to submit correct answer for current question
          let answerToSubmit = "random wrong answer";
          if (Math.random() > 0.5) {
             // For question 1 ("Tum Hi Ho")
             if (state.currentQuestionIndex === 0) answerToSubmit = "Tum Hi Ho";
             // For question 2 ("Shape of You")
             if (state.currentQuestionIndex === 1) answerToSubmit = "shape of you";
          }
          
          socket.emit('submit_answer', { answer: answerToSubmit, uuid: playerInfo.uuid });
        }
      }, delay);
    }
  });
}
