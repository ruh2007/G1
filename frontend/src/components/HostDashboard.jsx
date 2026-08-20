import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../config';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function HostDashboard({ socket, hostState }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSongList, setShowSongList] = useState(false);
  const [showPlayersList, setShowPlayersList] = useState(false);
  const [editingSongId, setEditingSongId] = useState(null);
  const [editSongForm, setEditSongForm] = useState({
    title: '', artist: '', difficulty: 'Medium',
    opt1: '', opt2: '', opt3: '', opt4: '',
    correct: '', audioUrl: ''
  });
  const [newSong, setNewSong] = useState({
    title: '', artist: '', difficulty: 'Medium',
    opt1: '', opt2: '', opt3: '', opt4: '',
    correct: '', audioUrl: ''
  });

  const [isAdminAuth, setIsAdminAuth] = useState(
    () => sessionStorage.getItem('admin_authenticated') === 'true'
  );
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    if (socket && isAdminAuth) socket.emit('join_host');
  }, [socket, isAdminAuth]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');

    try {
      const response = await fetch(getApiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem('admin_authenticated', 'true');
        setIsAdminAuth(true);
      } else {
        setAdminError(data.error || 'Invalid Admin credentials. Access denied.');
      }
    } catch (err) {
      if (adminEmail.trim().toLowerCase() === 'arc@gmail.com' && adminPassword === 'arcgame') {
        sessionStorage.setItem('admin_authenticated', 'true');
        setIsAdminAuth(true);
      } else {
        setAdminError('Invalid Admin credentials. Access denied.');
      }
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    setIsAdminAuth(false);
  };

  if (!isAdminAuth) {
    return (
      <div className="host-container flex-center">
        <div className="panel" style={{ maxWidth: '440px', width: '100%', padding: '2rem' }}>
          <div className="text-center mb-4">
            <span className="logo-badge" style={{ fontSize: '2rem', padding: '10px 16px' }}>👑</span>
          </div>
          <h2 className="text-center mb-4" style={{ fontSize: '1.6rem' }}>Admin Host Login</h2>
          <p className="text-muted text-center" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Please log in with your administrator credentials to access the game dashboard.
          </p>

          {adminError && <div className="alert-banner error" style={{ marginBottom: '1rem' }}>{adminError}</div>}

          <form onSubmit={handleAdminLogin} className="flex-col" style={{ gap: '1rem' }}>
            <div>
              <label className="input-label">ADMIN EMAIL</label>
              <input
                type="email"
                placeholder="arc@gmail.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="input-label">ADMIN PASSWORD</label>
              <input
                type="password"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary btn-glow" style={{ padding: '14px', marginTop: '0.5rem', background: 'linear-gradient(135deg, #7c3aed, #ff2a5f)' }}>
              👑 UNLOCK DASHBOARD
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!socket) {
    return (
      <div className="host-container flex-center">
        <div className="loading-pulse">⚡ Connecting to server...</div>
      </div>
    );
  }

  const handleAction = (action) => {
    socket.emit('host_action', { action });
  };

  const handleAddSong = (e) => {
    e.preventDefault();
    const payload = {
      title: newSong.title,
      artist: newSong.artist,
      difficulty: newSong.difficulty,
      options: [newSong.opt1, newSong.opt2, newSong.opt3, newSong.opt4],
      correctAnswer: newSong.correct,
      audioUrl: newSong.audioUrl || '/audio/placeholder.mp3'
    };
    socket.emit('host_action', { action: 'ADD_SONG', payload });
    setShowAddForm(false);
    setNewSong({ title: '', artist: '', difficulty: 'Medium', opt1: '', opt2: '', opt3: '', opt4: '', correct: '', audioUrl: '' });
  };

  if (!hostState) {
    return (
      <div className="host-container flex-center">
        <div className="lobby-screen">
          <div className="logo-badge">🎵</div>
          <h1 className="title" style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>GUESS THE SONG</h1>
          <p className="text-muted" style={{ marginBottom: '3rem', fontSize: '1.1rem' }}>Host Dashboard — Waiting for state...</p>
          <div className="loading-pulse">Connecting...</div>
        </div>
      </div>
    );
  }

  const {
    status,
    currentQuestionIndex,
    totalQuestions,
    playerCount,
    connectedPlayers,
    answersReceived,
    currentSong,
    allSongs,
    playersList,
    leaderboard
  } = hostState;

  const handleStartEditSong = (song) => {
    setEditingSongId(song.id);
    const opts = song.options || [];
    setEditSongForm({
      title: song.title || '',
      artist: song.artist || '',
      difficulty: song.difficulty || 'Medium',
      opt1: opts[0] || '',
      opt2: opts[1] || '',
      opt3: opts[2] || '',
      opt4: opts[3] || '',
      correct: song.correctAnswer || '',
      audioUrl: song.audioUrl || '/audio/placeholder.mp3'
    });
  };

  const handleSaveEditSong = (e) => {
    e.preventDefault();
    if (!editingSongId) return;
    const payload = {
      songId: editingSongId,
      songData: {
        title: editSongForm.title,
        artist: editSongForm.artist,
        difficulty: editSongForm.difficulty,
        options: [editSongForm.opt1, editSongForm.opt2, editSongForm.opt3, editSongForm.opt4],
        correctAnswer: editSongForm.correct,
        audioUrl: editSongForm.audioUrl || '/audio/placeholder.mp3'
      }
    };
    socket.emit('host_action', { action: 'EDIT_SONG', payload });
    setEditingSongId(null);
  };

  const handleDeleteSong = (songId, title) => {
    if (window.confirm(`Delete song "${title}"?`)) {
      socket.emit('host_action', { action: 'DELETE_SONG', payload: { songId } });
    }
  };

  const handleKickPlayer = (uuid, name) => {
    if (window.confirm(`Remove player "${name}" from the game?`)) {
      socket.emit('host_action', { action: 'REMOVE_PLAYER', payload: { uuid } });
    }
  };

  const handleResetPoints = () => {
    if (window.confirm("Are you sure you want to reset ALL player scores to 0?")) {
      socket.emit('host_action', { action: 'RESET_POINTS' });
    }
  };

  const progressPct = totalQuestions > 0 ? ((currentQuestionIndex) / totalQuestions) * 100 : 0;
  const top3 = leaderboard?.slice(0, 3) || [];
  const rest = leaderboard?.slice(3, 10) || [];
  const rankEmojis = ['🥇', '🥈', '🥉'];

  return (
    <div className="host-container">
      {/* Header */}
      <div className="host-header">
        <div className="host-header-left">
          <img src="/logo.png" alt="Alumni Relations Cell" className="app-brand-logo" style={{ height: '36px' }} />
          <h2 style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.5px' }}>GUESS THE SONG</h2>
          <span className="status-chip" data-status={status}>{status.replace('_', ' ')}</span>
        </div>
        <div className="host-header-right">
          <a href="/display" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button style={{ width: 'auto', background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.3)', color: 'var(--accent-secondary)', padding: '8px 14px', fontSize: '0.85rem' }}>
              📺 Open TV Display
            </button>
          </a>
          <div className="stat-badge">
            <span className="stat-label">Players</span>
            <span className="stat-value" style={{ color: 'var(--accent-secondary)' }}>{connectedPlayers ?? playerCount}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Question</span>
            <span className="stat-value">{currentQuestionIndex + 1} / {totalQuestions}</span>
          </div>
          <button onClick={handleAdminLogout} style={{ width: 'auto', background: 'rgba(255,23,68,0.15)', border: '1px solid rgba(255,23,68,0.3)', color: 'var(--error)', padding: '8px 14px', fontSize: '0.85rem' }}>
            🚪 Logout Admin
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="host-grid">
        {/* ─── Left Panel: Controls ─── */}
        <div className="panel">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem' }}>Game Controls</h3>

          {status === 'LOBBY' && (
            <button className="btn-primary btn-glow" onClick={() => handleAction('START_GAME')}>
              🏁 START GAME
            </button>
          )}

          {status === 'QUESTION_READY' && (
            <div>
              <div className="info-box" style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>SONG {currentQuestionIndex + 1}</p>
                <h3>{currentSong?.title ?? '???'}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>by {currentSong?.artist ?? '???'}</p>
              </div>
              <button className="btn-primary" onClick={() => handleAction('PLAY_AUDIO')}>
                ▶ PLAY AUDIO CLIP
              </button>
            </div>
          )}

          {status === 'AUDIO_PLAYING' && (
            <button className="btn-primary" disabled style={{ opacity: 0.6 }}>
              🔊 AUDIO PLAYING...
            </button>
          )}

          {status === 'ANSWERING' && (
            <div>
              <div className="answers-progress">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Answers Received</span>
                  <strong style={{ color: 'var(--success)' }}>{answersReceived} / {connectedPlayers}</strong>
                </div>
                <div className="progress-track" style={{ height: '8px' }}>
                  <div className="progress-fill" style={{
                    width: connectedPlayers > 0 ? `${(answersReceived / connectedPlayers) * 100}%` : '0%',
                    background: 'var(--success)'
                  }} />
                </div>
              </div>
              <button className="btn-secondary" onClick={() => handleAction('CLOSE_ANSWERS')} style={{ marginTop: '1rem' }}>
                ⏹ CLOSE ANSWERS EARLY
              </button>
            </div>
          )}

          {status === 'ANSWERS_LOCKED' && (
            <button className="btn-primary" style={{ background: 'var(--success)' }} onClick={() => handleAction('REVEAL_ANSWER')}>
              👁 REVEAL ANSWER
            </button>
          )}

          {status === 'RESULTS' && (
            <div>
              <div className="info-box" style={{ borderColor: 'var(--success)', marginBottom: '1rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>CORRECT ANSWER</p>
                <h3 style={{ color: 'var(--success)' }}>{currentSong?.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>by {currentSong?.artist}</p>
              </div>
              <button className="btn-primary btn-glow" onClick={() => handleAction('SHOW_LEADERBOARD')}>
                🏆 SHOW LEADERBOARD
              </button>
            </div>
          )}

          {status === 'LEADERBOARD' && (
            <button className="btn-primary" onClick={() => handleAction('NEXT_QUESTION')}>
              ⏭ NEXT QUESTION
            </button>
          )}

          {status === 'FINAL_RESULTS' && (
            <button className="btn-secondary" onClick={() => handleAction('RESET_GAME')}>
              🔄 RESET GAME
            </button>
          )}

          {/* End Game Button */}
          {status !== 'LOBBY' && status !== 'FINAL_RESULTS' && (
            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button
                onClick={() => {
                  if (window.confirm('End the game now? Players will see the final leaderboard.')) {
                    handleAction('END_GAME');
                  }
                }}
                style={{
                  background: 'transparent',
                  border: '2px solid var(--error)',
                  color: 'var(--error)',
                  boxShadow: 'none',
                  fontSize: '0.85rem',
                  padding: '10px 18px'
                }}
              >
                🛑 END GAME EARLY
              </button>
            </div>
          )}
        </div>

        {/* ─── Middle Panel: Song Info / Options ─── */}
        <div className="panel">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem' }}>Song Details</h3>

          {currentSong && (
            <div>
              <div className="info-box" style={{ marginBottom: '1.5rem' }}>
                <span className="difficulty-badge">{currentSong.difficulty}</span>
                {currentSong.title && <h3 style={{ marginTop: '8px' }}>{currentSong.title}</h3>}
                {currentSong.artist && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>by {currentSong.artist}</p>}
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Answer Choices</p>
              <div className="mcq-grid" style={{ marginTop: '0' }}>
                {currentSong.options?.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`mcq-btn${opt === currentSong.correctAnswer ? ' correct' : ''}`}
                    style={{ cursor: 'default', padding: '12px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span style={{ opacity: 0.5, fontWeight: 700, fontSize: '0.8rem' }}>{OPTION_LABELS[idx]}</span>
                    <span>{opt}</span>
                    {opt === currentSong.correctAnswer && <span style={{ marginLeft: 'auto', color: 'var(--success)' }}>✓</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!currentSong && status === 'LOBBY' && (
            <p className="text-muted">Game is in the lobby. Start the game to begin Question 1.</p>
          )}

          {/* Add Song & Manage Songs & Manage Players Controls */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => { setShowAddForm(!showAddForm); setShowSongList(false); setShowPlayersList(false); }} style={{ background: showAddForm ? 'var(--error)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'none', fontSize: '0.85rem' }}>
                {showAddForm ? '✕ CANCEL' : '➕ ADD SONG'}
              </button>
              <button onClick={() => { setShowSongList(!showSongList); setShowAddForm(false); setShowPlayersList(false); }} style={{ background: showSongList ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'none', fontSize: '0.85rem' }}>
                {showSongList ? '✕ HIDE SONGS' : `🎵 MANAGE SONGS (${allSongs?.length || totalQuestions})`}
              </button>
              <button onClick={() => { setShowPlayersList(!showPlayersList); setShowAddForm(false); setShowSongList(false); }} style={{ background: showPlayersList ? '#2563eb' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'none', fontSize: '0.85rem' }}>
                {showPlayersList ? '✕ HIDE PLAYERS' : `👥 PLAYERS LIST (${playersList?.length || playerCount})`}
              </button>
            </div>

            {/* Players List Management */}
            {showPlayersList && (
              <div className="panel" style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', marginTop: '8px' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>ACTIVE PLAYERS IN ROOM ({playersList?.length || 0})</h4>
                {playersList && playersList.length > 0 ? (
                  <ul className="leaderboard-list">
                    {playersList.map((p, idx) => (
                      <li key={p.uuid || idx} className="leaderboard-item" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                          <span style={{ fontSize: '0.7rem', marginRight: '6px' }}>{p.connected ? '🟢' : '🔴'}</span>
                          <strong>{p.name}</strong>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.8rem' }}>({p.score} pts)</span>
                        </div>
                        <button
                          onClick={() => handleKickPlayer(p.uuid, p.name)}
                          style={{ width: 'auto', background: 'rgba(255,23,68,0.2)', color: 'var(--error)', border: '1px solid rgba(255,23,68,0.4)', padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          🚫 Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>No players currently in the room.</p>
                )}
              </div>
            )}

            {/* Song List Management */}
            {showSongList && (
              <div className="panel" style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', marginTop: '8px' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>ALL SONGS ({allSongs?.length || 0})</h4>
                <ul className="leaderboard-list">
                  {allSongs?.map((song, idx) => (
                    <React.Fragment key={song.id || idx}>
                      <li className="leaderboard-item" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                          <strong>{idx + 1}. {song.title}</strong>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>by {song.artist}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', shrink: 0 }}>
                          <button
                            onClick={() => handleStartEditSong(song)}
                            style={{ width: 'auto', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSong(song.id, song.title)}
                            style={{ width: 'auto', background: 'rgba(255,23,68,0.2)', color: 'var(--error)', border: '1px solid rgba(255,23,68,0.4)', padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </li>

                      {/* Inline Edit Form */}
                      {editingSongId === song.id && (
                        <li style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid var(--accent-primary)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                          <form onSubmit={handleSaveEditSong} className="add-song-form" style={{ gap: '8px' }}>
                            <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--accent-primary)' }}>✏️ EDIT SONG #{idx + 1}</h5>
                            <div className="form-row">
                              <input placeholder="Song Title *" value={editSongForm.title} onChange={e => setEditSongForm({ ...editSongForm, title: e.target.value })} required />
                              <input placeholder="Artist *" value={editSongForm.artist} onChange={e => setEditSongForm({ ...editSongForm, artist: e.target.value })} required />
                            </div>
                            <div className="form-row">
                              <input placeholder="Option A *" value={editSongForm.opt1} onChange={e => setEditSongForm({ ...editSongForm, opt1: e.target.value })} required />
                              <input placeholder="Option B *" value={editSongForm.opt2} onChange={e => setEditSongForm({ ...editSongForm, opt2: e.target.value })} required />
                            </div>
                            <div className="form-row">
                              <input placeholder="Option C *" value={editSongForm.opt3} onChange={e => setEditSongForm({ ...editSongForm, opt3: e.target.value })} required />
                              <input placeholder="Option D *" value={editSongForm.opt4} onChange={e => setEditSongForm({ ...editSongForm, opt4: e.target.value })} required />
                            </div>
                            <input placeholder="Correct Answer *" value={editSongForm.correct} onChange={e => setEditSongForm({ ...editSongForm, correct: e.target.value })} required />
                            <div className="form-row">
                              <select value={editSongForm.difficulty} onChange={e => setEditSongForm({ ...editSongForm, difficulty: e.target.value })} style={{ background: 'var(--bg-panel)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px' }}>
                                <option>Very Easy</option>
                                <option>Easy</option>
                                <option>Medium</option>
                                <option>Hard</option>
                                <option>Very Hard</option>
                              </select>
                              <input placeholder="Audio URL" value={editSongForm.audioUrl} onChange={e => setEditSongForm({ ...editSongForm, audioUrl: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                              <button type="submit" className="btn-primary" style={{ padding: '8px', fontSize: '0.85rem' }}>💾 SAVE CHANGES</button>
                              <button type="button" onClick={() => setEditingSongId(null)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '0.85rem', width: 'auto' }}>CANCEL</button>
                            </div>
                          </form>
                        </li>
                      )}
                    </React.Fragment>
                  ))}
                </ul>
              </div>
            )}

            {showAddForm && (
              <form onSubmit={handleAddSong} className="add-song-form">
                <div className="form-row">
                  <input placeholder="Song Title *" value={newSong.title} onChange={e => setNewSong({ ...newSong, title: e.target.value })} required />
                  <input placeholder="Artist *" value={newSong.artist} onChange={e => setNewSong({ ...newSong, artist: e.target.value })} required />
                </div>
                <div className="form-row">
                  <input placeholder="Option A *" value={newSong.opt1} onChange={e => setNewSong({ ...newSong, opt1: e.target.value })} required />
                  <input placeholder="Option B *" value={newSong.opt2} onChange={e => setNewSong({ ...newSong, opt2: e.target.value })} required />
                </div>
                <div className="form-row">
                  <input placeholder="Option C *" value={newSong.opt3} onChange={e => setNewSong({ ...newSong, opt3: e.target.value })} required />
                  <input placeholder="Option D *" value={newSong.opt4} onChange={e => setNewSong({ ...newSong, opt4: e.target.value })} required />
                </div>
                <input placeholder="Correct Answer (must match one of A/B/C/D exactly) *" value={newSong.correct} onChange={e => setNewSong({ ...newSong, correct: e.target.value })} required />
                <select value={newSong.difficulty} onChange={e => setNewSong({ ...newSong, difficulty: e.target.value })} style={{ background: 'var(--bg-panel)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                  <option>Very Easy</option>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                  <option>Very Hard</option>
                </select>
                <button type="submit" className="btn-primary" style={{ marginTop: '4px' }}>💾 SAVE SONG</button>
              </form>
            )}
          </div>
        </div>

        {/* ─── Right Panel: Leaderboard ─── */}
        <div className="panel">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem' }}>Leaderboard</h3>

          {leaderboard && leaderboard.length > 0 ? (
            <div>
              {/* Top 3 Podium */}
              {top3.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  {top3.map((p, idx) => (
                    <div key={p.uuid || idx} className="leaderboard-item podium-item" style={{
                      background: idx === 0
                        ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.08))'
                        : idx === 1
                          ? 'linear-gradient(135deg, rgba(192,192,192,0.12), rgba(192,192,192,0.05))'
                          : 'linear-gradient(135deg, rgba(205,127,50,0.12), rgba(205,127,50,0.05))',
                      border: idx === 0 ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.07)',
                      padding: '14px 16px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.4rem' }}>{rankEmojis[idx]}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.correctAnswers} correct</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: idx === 0 ? 'gold' : 'white' }}>{p.score}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PTS</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Rest of top 10 */}
              {rest.length > 0 && (
                <ul className="leaderboard-list">
                  {rest.map((p, idx) => (
                    <li key={p.uuid || idx} className="leaderboard-item" style={{ padding: '8px 12px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>#{idx + 4} {p.name}</span>
                      <strong style={{ fontSize: '0.95rem' }}>{p.score} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>PTS</span></strong>
                    </li>
                  ))}
                </ul>
              )}

              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1rem', textAlign: 'center' }}>
                Showing top 10 of {leaderboard.length} players
              </p>

              <button
                onClick={handleResetPoints}
                style={{
                  marginTop: '1rem',
                  background: 'rgba(255, 149, 0, 0.15)',
                  border: '1px solid rgba(255, 149, 0, 0.35)',
                  color: '#ff9500',
                  fontSize: '0.85rem',
                  padding: '8px 14px'
                }}
              >
                🔄 RESET PLAYER POINTS
              </button>
            </div>
          ) : (
            <p className="text-muted">Leaderboard will appear once players have answered.</p>
          )}
        </div>
      </div>
    </div>
  );
}
