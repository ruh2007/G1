import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage({ socket }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('join');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('player_name') || '');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  const handleQuickJoin = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    let uuid = localStorage.getItem('player_uuid');
    if (!uuid) {
      uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      localStorage.setItem('player_uuid', uuid);
    }
    localStorage.setItem('player_name', playerName.trim());

    if (socket) {
      socket.emit('join_game', { playerName: playerName.trim(), uuid });
    }
    navigate('/play');
  };

  const handleAdminAuth = (e) => {
    e.preventDefault();
    setAdminError('');
    if (adminEmail.trim().toLowerCase() === 'arc@gmail.com' && adminPassword === 'arcgame') {
      sessionStorage.setItem('admin_authenticated', 'true');
      navigate('/host');
    } else {
      setAdminError('Invalid credentials. Access denied.');
    }
  };

  return (
    <div className="home-container">
      {/* Hero */}
      <div className="hero-section text-center">
        <div style={{ marginBottom: '1.25rem' }}>
          <img src="/logo.png" alt="Alumni Relations Cell" className="app-brand-logo large" />
        </div>
        <h1 className="title" style={{ fontSize: '3.2rem', marginBottom: '0.5rem', letterSpacing: '-1px' }}>
          GUESS THE SONG
        </h1>
        <p className="text-muted" style={{ fontSize: '1.15rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
          Presented by Alumni Relations Cell
        </p>
      </div>

      {/* Tabs */}
      <div className="home-tabs">
        <button
          className={`tab-btn ${activeTab === 'join' ? 'active' : ''}`}
          onClick={() => { setActiveTab('join'); setAdminError(''); }}
        >
          🎮 Join Game
        </button>
        <button
          className={`tab-btn admin-tab ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => { setActiveTab('admin'); setAdminError(''); }}
        >
          👑 Host / Admin
        </button>
      </div>

      {/* Card */}
      <div className="panel home-card" style={{ maxWidth: '460px', margin: '0 auto', width: '100%' }}>

        {/* ── JOIN ── */}
        {activeTab === 'join' && (
          <form onSubmit={handleQuickJoin} className="flex-col" style={{ gap: '1.2rem' }}>
            <h2 className="text-center" style={{ fontSize: '1.4rem' }}>Enter Your Name</h2>
            <p className="text-muted text-center" style={{ fontSize: '0.9rem', marginTop: '-0.5rem' }}>
              Type your name and tap <strong>PLAY NOW</strong> to join the room.
            </p>

            <div>
              <label className="input-label">YOUR NAME</label>
              <input
                type="text"
                placeholder="e.g. Alex"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button type="submit" className="btn-primary btn-glow" style={{ padding: '16px', fontSize: '1.1rem' }}>
              🚀 PLAY NOW
            </button>
          </form>
        )}

        {/* ── ADMIN ── */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminAuth} className="flex-col" style={{ gap: '1rem' }}>
            <div className="text-center" style={{ marginBottom: '0.5rem' }}>
              <span className="difficulty-badge" style={{ background: 'rgba(255,42,95,0.15)', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', padding: '6px 14px' }}>
                ADMIN ACCESS ONLY
              </span>
            </div>

            <h2 className="text-center" style={{ fontSize: '1.4rem' }}>Host Dashboard Login</h2>
            <p className="text-muted text-center" style={{ fontSize: '0.9rem', marginTop: '-0.5rem' }}>
              Enter administrator credentials to manage the live game.
            </p>

            {adminError && <div className="alert-banner error">{adminError}</div>}

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

            <button type="submit" className="btn-primary btn-glow" style={{ padding: '15px', background: 'linear-gradient(135deg, #7c3aed, #ff2a5f)' }}>
              👑 LOGIN AS ADMIN
            </button>
          </form>
        )}
      </div>

      {/* Feature Cards */}
      <div className="home-features">
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Real-time Sync</h3>
          <p>Sub-millisecond WebSocket responses for 500+ players simultaneously.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Speed Bonus</h3>
          <p>Answer faster to earn more points — up to 150 pts per question!</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🏆</div>
          <h3>Live Leaderboard</h3>
          <p>Watch rankings update live on the host screen after every question.</p>
        </div>
      </div>
    </div>
  );
}
