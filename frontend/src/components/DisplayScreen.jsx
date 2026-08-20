import React, { useEffect } from 'react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706'];
const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

export default function DisplayScreen({ socket, hostState, gameState }) {
  useEffect(() => {
    if (socket) {
      socket.emit('join_host');
    }
  }, [socket]);

  // Combine data from hostState or public gameState
  const stateData = hostState || gameState;

  if (!socket || !stateData) {
    return (
      <div className="display-container flex-center">
        <div className="logo-badge" style={{ fontSize: '3rem', padding: '16px' }}>📺</div>
        <h1 className="title" style={{ marginTop: '1rem' }}>MAIN DISPLAY SCREEN</h1>
        <p className="loading-pulse mt-4">Connecting to live game room...</p>
      </div>
    );
  }

  const {
    status,
    currentQuestionIndex = 0,
    totalQuestions = 10,
    connectedPlayers = 0,
    answersReceived = 0,
    currentSong,
    leaderboard = []
  } = hostState || {};

  const publicSong = currentSong || gameState?.song;
  const top10 = leaderboard.length > 0 ? leaderboard.slice(0, 10) : (gameState?.top10 || []);
  const top3 = top10.slice(0, 3);
  const rest = top10.slice(3);

  return (
    <div className="display-container">
      {/* Top Banner Header */}
      <header className="display-header">
        <div className="display-brand">
          <span className="logo-badge" style={{ fontSize: '1.5rem', padding: '8px 14px' }}>🎵</span>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 900 }}>GUESS THE SONG</h1>
            <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>LIVE MAIN AUDIENCE DISPLAY</p>
          </div>
        </div>

        <div className="display-stats">
          <div className="display-stat-box">
            <span className="stat-label">GAME CODE</span>
            <span className="stat-value" style={{ color: 'var(--accent-secondary)', letterSpacing: '2px' }}>GUESS24</span>
          </div>
          <div className="display-stat-box">
            <span className="stat-label">QUESTION</span>
            <span className="stat-value">{currentQuestionIndex + 1} / {totalQuestions}</span>
          </div>
          <div className="display-stat-box">
            <span className="stat-label">PLAYERS</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>{connectedPlayers}</span>
          </div>
        </div>
      </header>

      {/* Main Split Layout: Question View (Left) & Leaderboard (Right) */}
      <div className="display-grid">
        
        {/* ─── LEFT: LIVE QUESTION & AUDIO AREA ─── */}
        <div className="panel display-question-panel flex-center" style={{ justifyContent: 'space-between' }}>
          
          {/* Status Badge */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="status-chip" data-status={status} style={{ fontSize: '0.9rem', padding: '6px 16px' }}>
              {status ? status.replace('_', ' ') : 'LOBBY'}
            </span>
            {status === 'ANSWERING' && (
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>
                📥 Answers: {answersReceived} / {connectedPlayers}
              </span>
            )}
          </div>

          {/* LOBBY STATE */}
          {status === 'LOBBY' && (
            <div className="text-center" style={{ padding: '2rem 0' }}>
              <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>📱</div>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>SCAN OR VISIT TO JOIN!</h2>
              <p className="text-muted" style={{ fontSize: '1.4rem' }}>
                Open on your phone & enter code: <strong style={{ color: 'var(--accent-secondary)' }}>GUESS24</strong>
              </p>
              <div className="loading-dots" style={{ marginTop: '2rem' }}>
                <span /><span /><span />
              </div>
            </div>
          )}

          {/* QUESTION READY / AUDIO PLAYING */}
          {(status === 'QUESTION_READY' || status === 'AUDIO_PLAYING') && (
            <div className="text-center flex-center" style={{ padding: '2rem 0' }}>
              <div className="audio-wave-container">
                <div className="audio-wave" style={{ height: '90px' }}>
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="wave-bar" style={{ width: '14px', animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>
              <h1 style={{ fontSize: '3rem', marginTop: '1.5rem', fontWeight: 900 }}>
                {status === 'AUDIO_PLAYING' ? '🔊 LISTEN CLOSELY!' : 'GET READY FOR THE SONG...'}
              </h1>
              <p className="text-muted" style={{ fontSize: '1.2rem' }}>3-Second Music Clip</p>
            </div>
          )}

          {/* ANSWERING / ANSWERS LOCKED */}
          {(status === 'ANSWERING' || status === 'ANSWERS_LOCKED') && (
            <div style={{ width: '100%' }}>
              <h2 className="text-center mb-4" style={{ fontSize: '2rem' }}>What song is this?</h2>
              
              <div className="mcq-grid" style={{ gap: '16px' }}>
                {publicSong?.options?.map((option, idx) => (
                  <div
                    key={idx}
                    className="mcq-btn"
                    style={{
                      padding: '20px',
                      fontSize: '1.2rem',
                      background: 'rgba(255,255,255,0.06)',
                      border: '2px solid rgba(255,255,255,0.12)',
                      cursor: 'default',
                      '--option-color': OPTION_COLORS[idx]
                    }}
                  >
                    <span className="option-label" style={{ width: '36px', height: '36px', fontSize: '1.1rem' }}>
                      {OPTION_LABELS[idx]}
                    </span>
                    <span className="option-text" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                      {option}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESULTS STATE */}
          {status === 'RESULTS' && (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <p className="text-muted mb-4" style={{ fontSize: '1rem', letterSpacing: '2px' }}>REVEALED ANSWER</p>
              <div className="result-banner correct" style={{ padding: '2.5rem' }}>
                <div style={{ fontSize: '3.5rem' }}>🎉</div>
                <h1 style={{ fontSize: '3rem', margin: '0.5rem 0', color: 'var(--success)' }}>
                  {publicSong?.title}
                </h1>
                <h3 style={{ color: 'var(--text-muted)', fontSize: '1.5rem', fontWeight: 400 }}>
                  by {publicSong?.artist}
                </h3>
              </div>
            </div>
          )}

          {/* FINAL RESULTS STATE */}
          {status === 'FINAL_RESULTS' && (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '5rem', marginBottom: '0.5rem' }}>🏆</div>
              <h1 className="title" style={{ fontSize: '3.5rem', color: 'gold' }}>GAME COMPLETED!</h1>
              {top3.length > 0 && (
                <div className="result-banner correct" style={{ marginTop: '1.5rem', padding: '2rem' }}>
                  <h2>🥇 WINNER: {top3[0].name.toUpperCase()}</h2>
                  <h1 style={{ fontSize: '3.5rem', margin: '10px 0', color: 'gold' }}>{top3[0].score} PTS</h1>
                </div>
              )}
            </div>
          )}

          {/* Footer note */}
          <div style={{ width: '100%', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Difficulty: <strong style={{ color: 'white' }}>{publicSong?.difficulty || 'Medium'}</strong></span>
          </div>

        </div>

        {/* ─── RIGHT: LIVE LEADERBOARD WITH POINTS ─── */}
        <div className="panel display-leaderboard-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.1rem', margin: 0 }}>
              🏆 LIVE LEADERBOARD
            </h3>
            <span className="difficulty-badge" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              TOP 10
            </span>
          </div>

          {top10.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* Podium Top 3 */}
              {top3.map((player, idx) => (
                <div
                  key={player.uuid || idx}
                  className="leaderboard-item podium-item"
                  style={{
                    background: idx === 0
                      ? 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.1))'
                      : idx === 1
                        ? 'linear-gradient(135deg, rgba(192,192,192,0.18), rgba(192,192,192,0.08))'
                        : 'linear-gradient(135deg, rgba(205,127,50,0.18), rgba(205,127,50,0.08))',
                    border: idx === 0 ? '1.5px solid rgba(255,215,0,0.45)' : '1px solid rgba(255,255,255,0.1)',
                    padding: '14px 18px',
                    borderRadius: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '1.6rem' }}>{RANK_EMOJIS[idx]}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem', color: idx === 0 ? 'gold' : 'white' }}>
                        {player.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {player.correctAnswers ?? 0} Correct Answers
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: idx === 0 ? 'gold' : 'var(--accent-secondary)' }}>
                      {player.score}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PTS</div>
                  </div>
                </div>
              ))}

              {/* Ranks 4 to 10 */}
              {rest.map((player, idx) => (
                <div
                  key={player.uuid || idx}
                  className="leaderboard-item"
                  style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.02)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '1rem', width: '28px' }}>
                      #{idx + 4}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{player.name}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                    {player.score} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>PTS</span>
                  </div>
                </div>
              ))}

            </div>
          ) : (
            <div className="text-center text-muted" style={{ padding: '3rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎯</div>
              <p style={{ fontSize: '1.1rem' }}>Waiting for players to join & answer...</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
