import React, { useState, useEffect } from 'react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706'];

export default function PlayerScreen({ socket, gameState, playerState }) {
  const [name, setName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [timerInterval, setTimerInterval] = useState(null);

  // Reconnect logic
  useEffect(() => {
    if (socket && !joined) {
      const storedUuid = localStorage.getItem('player_uuid');
      const storedName = localStorage.getItem('player_name');
      if (storedUuid && storedName) {
        socket.emit('join_game', { playerName: storedName, uuid: storedUuid });
        setName(storedName);
        setJoined(true);
      }
    }
  }, [socket, joined]);

  useEffect(() => {
    if (gameState?.status === 'ANSWERING') {
      setSubmitted(false);
      setAnswer('');
      setTimeLeft(10);

      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (timerInterval) clearInterval(timerInterval);
    }
  }, [gameState?.status]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name || !gameCode) return;
    let uuid = localStorage.getItem('player_uuid');
    if (!uuid) {
      uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      localStorage.setItem('player_uuid', uuid);
    }
    localStorage.setItem('player_name', name);
    socket.emit('join_game', { playerName: name, uuid });
    setJoined(true);
  };

  const handleSelectOption = (selectedOption) => {
    if (submitted) return;
    setAnswer(selectedOption);
    const uuid = localStorage.getItem('player_uuid');
    socket.emit('submit_answer', { answer: selectedOption, uuid });
    setSubmitted(true);
  };

  if (!socket) {
    return (
      <div className="container flex-center">
        <div className="loading-pulse">⚡ Connecting...</div>
      </div>
    );
  }

  if (!joined || !gameState) {
    return (
      <div className="container flex-center" style={{ gap: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🎵</div>
          <h1 className="title" style={{ fontSize: '2.8rem', lineHeight: 1.1 }}>GUESS<br />THE SONG</h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Enter the game code to join!</p>
        </div>
        <form className="panel" onSubmit={handleJoin} style={{ width: '100%', gap: '12px', display: 'flex', flexDirection: 'column' }}>
          <input
            type="text"
            placeholder="🔑 Game Code"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value)}
            required
            style={{ textTransform: 'uppercase', letterSpacing: '4px', textAlign: 'center', fontWeight: 700, fontSize: '1.2rem' }}
          />
          <input
            type="text"
            placeholder="😎 Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary btn-glow">JOIN GAME</button>
        </form>
      </div>
    );
  }

  const { status, currentQuestionIndex, totalQuestions, playerCount } = gameState;
  const myScore = playerState?.score || 0;

  // ── LOBBY / QUESTION READY ──
  if (status === 'LOBBY' || status === 'QUESTION_READY') {
    return (
      <div className="container flex-center" style={{ gap: '2rem' }}>
        <div className="join-success-badge">✓ YOU'RE IN!</div>
        <h2 className="title" style={{ fontSize: '2rem', textAlign: 'center' }}>Get Ready,<br /><span style={{ color: 'var(--accent-primary)' }}>{name}</span>!</h2>
        <div className="panel" style={{ width: '100%', textAlign: 'center' }}>
          <p className="text-muted" style={{ marginBottom: '4px' }}>WAITING FOR HOST</p>
          <div className="loading-dots">
            <span /><span /><span />
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-badge"><span className="stat-label">Players</span><span className="stat-value">{playerCount}</span></div>
          <div className="stat-badge"><span className="stat-label">Questions</span><span className="stat-value">{totalQuestions}</span></div>
        </div>
      </div>
    );
  }

  // ── AUDIO PLAYING ──
  if (status === 'AUDIO_PLAYING') {
    return (
      <div className="container flex-center">
        <p className="text-muted">SONG {currentQuestionIndex + 1} / {totalQuestions}</p>
        <div className="audio-wave-container">
          <div className="audio-wave">
            {[...Array(7)].map((_, i) => <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />)}
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '1rem' }}>🎵 LISTEN!</h1>
        </div>
      </div>
    );
  }

  // ── ANSWERING ──
  if (status === 'ANSWERING') {
    const timerPct = (timeLeft / 10) * 100;
    const timerColor = timeLeft > 6 ? 'var(--success)' : timeLeft > 3 ? '#f59e0b' : 'var(--error)';

    return (
      <div className="container flex-center">
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <p className="text-muted" style={{ margin: 0 }}>SONG {currentQuestionIndex + 1} / {totalQuestions}</p>
          <p className="text-muted" style={{ margin: 0 }}>Score: <strong style={{ color: 'white' }}>{myScore}</strong></p>
        </div>

        {/* Timer Ring */}
        <div className="timer-ring-container">
          <svg className="timer-ring" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke={timerColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - timerPct / 100)}`}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />
          </svg>
          <div className="timer-number" style={{ color: timerColor }}>{timeLeft}</div>
        </div>

        {submitted ? (
          <div style={{ width: '100%', textAlign: 'center', marginTop: '1rem' }}>
            <h2 style={{ color: 'var(--success)', marginBottom: '1rem' }}>✅ Locked In!</h2>
            <div className="mcq-btn selected" style={{ margin: '0 auto', maxWidth: '320px', cursor: 'default', padding: '18px', fontSize: '1.1rem' }}>
              {answer}
            </div>
            <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Waiting for others...</p>
          </div>
        ) : (
          <div style={{ width: '100%', marginTop: '0.5rem' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.2rem', fontSize: '1.2rem' }}>🎵 What song is this?</h2>
            <div className="mcq-grid">
              {gameState.song?.options?.map((option, idx) => (
                <button
                  key={idx}
                  className="mcq-btn"
                  onClick={() => handleSelectOption(option)}
                  style={{ '--option-color': OPTION_COLORS[idx] }}
                >
                  <span className="option-label">{OPTION_LABELS[idx]}</span>
                  <span className="option-text">{option}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ANSWERS LOCKED ──
  if (status === 'ANSWERS_LOCKED') {
    return (
      <div className="container flex-center">
        <div style={{ fontSize: '4rem' }}>⏳</div>
        <h2 style={{ fontSize: '2rem', marginTop: '1rem' }}>Time's Up!</h2>
        <p className="text-muted" style={{ marginTop: '0.5rem' }}>Revealing the answer...</p>
      </div>
    );
  }

  // ── RESULTS ──
  if (status === 'RESULTS') {
    const qIndex = currentQuestionIndex;
    const playerAnswerData = playerState?.answers?.[qIndex];
    const isCorrect = playerAnswerData?.correct;

    return (
      <div className="container flex-center" style={{ gap: '1.5rem' }}>
        <p className="text-muted">SONG {currentQuestionIndex + 1} / {totalQuestions}</p>

        <div className={`result-banner ${isCorrect ? 'correct' : 'wrong'}`}>
          <div className="result-icon">{isCorrect ? '🎉' : '😔'}</div>
          <h1 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{isCorrect ? 'CORRECT!' : 'WRONG!'}</h1>
          {isCorrect && (
            <div className="points-pill">+{playerAnswerData.points} pts</div>
          )}
        </div>

        <div className="panel" style={{ width: '100%', textAlign: 'center' }}>
          <p className="text-muted" style={{ marginBottom: '4px', fontSize: '0.85rem' }}>THE ANSWER WAS</p>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{gameState.song.title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>by {gameState.song.artist}</p>
        </div>

        <div className="stat-badge" style={{ width: '100%', justifyContent: 'center', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{myScore}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL SCORE</div>
          </div>
          {playerAnswerData && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{playerAnswerData.timeTaken?.toFixed(1)}s</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ANSWER TIME</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── LEADERBOARD ──
  if (status === 'LEADERBOARD') {
    const myUuid = localStorage.getItem('player_uuid');
    const myRankIndex = gameState.top10?.findIndex(p => p.uuid === myUuid) ?? -1;
    const rankEmojis = ['🥇', '🥈', '🥉'];

    return (
      <div className="container" style={{ paddingTop: '2rem' }}>
        <h2 className="title" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>🏆 Top 10</h2>
        <ul className="leaderboard-list">
          {gameState.top10?.map((p, idx) => (
            <li
              key={idx}
              className="leaderboard-item"
              style={{
                background: p.uuid === myUuid ? 'rgba(255,42,95,0.15)' : undefined,
                border: p.uuid === myUuid ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)',
                fontWeight: p.uuid === myUuid ? 700 : 400,
                padding: '14px 16px',
                marginBottom: '8px'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>{idx < 3 ? rankEmojis[idx] : `#${idx + 1}`}</span>
                <span>{p.name}{p.uuid === myUuid ? ' (You)' : ''}</span>
              </span>
              <strong style={{ color: p.uuid === myUuid ? 'var(--accent-primary)' : 'white' }}>{p.score} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>PTS</span></strong>
            </li>
          ))}
        </ul>
        {myRankIndex === -1 && (
          <div className="panel" style={{ textAlign: 'center', marginTop: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Your score: <strong style={{ color: 'white', fontSize: '1.1rem' }}>{myScore} pts</strong></p>
          </div>
        )}
        <p className="text-muted" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>Next question coming up...</p>
      </div>
    );
  }

  // ── FINAL RESULTS ──
  if (status === 'FINAL_RESULTS') {
    const myUuid = localStorage.getItem('player_uuid');
    const winner = gameState.top10?.[0];
    const isWinner = winner?.uuid === myUuid;
    const rankEmojis = ['🥇', '🥈', '🥉'];

    return (
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem' }}>{isWinner ? '🎉' : '🎮'}</div>
          <h1 className="title" style={{ fontSize: '2.5rem', marginTop: '0.5rem' }}>GAME OVER!</h1>
        </div>

        {winner && (
          <div className="result-banner correct" style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem' }}>🥇</div>
            <h2 style={{ margin: '0.5rem 0 0' }}>{isWinner ? 'You Won!' : `Winner: ${winner.name}`}</h2>
            <div className="points-pill" style={{ fontSize: '1.2rem', padding: '8px 20px', marginTop: '8px' }}>{winner.score} PTS</div>
          </div>
        )}

        <ul className="leaderboard-list">
          {gameState.top10?.map((p, idx) => (
            <li
              key={idx}
              className="leaderboard-item"
              style={{
                background: p.uuid === myUuid ? 'rgba(255,42,95,0.15)' : undefined,
                border: p.uuid === myUuid ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)',
                padding: '14px 16px',
                marginBottom: '8px'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: idx < 3 ? '1.3rem' : '1rem' }}>{idx < 3 ? rankEmojis[idx] : `#${idx + 1}`}</span>
                <span style={{ fontWeight: p.uuid === myUuid ? 700 : 400 }}>
                  {p.name}{p.uuid === myUuid ? ' (You)' : ''}
                </span>
              </span>
              <strong style={{ color: p.uuid === myUuid ? 'var(--accent-primary)' : 'white', fontSize: '1.1rem' }}>
                {p.score} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>PTS</span>
              </strong>
            </li>
          ))}
        </ul>

        <div className="panel" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>YOUR FINAL SCORE</p>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{myScore}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>POINTS</div>
        </div>
      </div>
    );
  }

  return <div className="container flex-center"><div className="loading-pulse">Loading...</div></div>;
}
