import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage({ socket, gameState, onAdminLogin }) {
  const navigate = useNavigate();
  
  // Tabs: 'join' | 'signup' | 'login' | 'admin'
  const [activeTab, setActiveTab] = useState('join');
  
  // Forms state
  const [gameCode, setGameCode] = useState('GUESS24');
  const [playerName, setPlayerName] = useState('');
  
  // Account state
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [accountName, setAccountName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Admin state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Pre-fill player name if account exists in localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('player_account');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.name) setPlayerName(parsed.name);
      } catch (e) {}
    } else {
      const savedName = localStorage.getItem('player_name');
      if (savedName) setPlayerName(savedName);
    }
  }, []);

  // Quick Join Game as Player
  const handleQuickJoin = (e) => {
    e.preventDefault();
    if (!playerName.trim() || !gameCode.trim()) return;
    
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

  // Player Account Creation
  const handleSignUp = (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!accountName.trim() || !userEmail.trim() || !userPassword) {
      setAuthError('Please fill in all required fields.');
      return;
    }

    const newAccount = {
      name: accountName.trim(),
      email: userEmail.trim().toLowerCase(),
      password: userPassword,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('player_account', JSON.stringify(newAccount));
    localStorage.setItem('player_name', newAccount.name);
    setPlayerName(newAccount.name);
    setAuthSuccess('Account created successfully! You can now join games.');
    setTimeout(() => {
      setActiveTab('join');
      setAuthSuccess('');
    }, 1500);
  };

  // Player Account Login
  const handlePlayerLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const savedUser = localStorage.getItem('player_account');
    if (!savedUser) {
      setAuthError('No account found. Please create an account first.');
      return;
    }

    try {
      const parsed = JSON.parse(savedUser);
      if (parsed.email === userEmail.trim().toLowerCase() && parsed.password === userPassword) {
        localStorage.setItem('player_name', parsed.name);
        setPlayerName(parsed.name);
        setAuthSuccess(`Welcome back, ${parsed.name}!`);
        setTimeout(() => {
          setActiveTab('join');
          setAuthSuccess('');
        }, 1200);
      } else {
        setAuthError('Invalid email or password.');
      }
    } catch (err) {
      setAuthError('Error authenticating account.');
    }
  };

  // Admin / Host Login
  const handleAdminAuth = (e) => {
    e.preventDefault();
    setAdminError('');

    const cleanEmail = adminEmail.trim().toLowerCase();
    
    if (cleanEmail === 'arc@gmail.com' && adminPassword === 'arcgame') {
      sessionStorage.setItem('admin_authenticated', 'true');
      if (onAdminLogin) onAdminLogin();
      navigate('/host');
    } else {
      setAdminError('Invalid Admin credentials. Access denied.');
    }
  };

  return (
    <div className="home-container">
      {/* Hero Header */}
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

      {/* Navigation Tabs */}
      <div className="home-tabs">
        <button 
          className={`tab-btn ${activeTab === 'join' ? 'active' : ''}`}
          onClick={() => { setActiveTab('join'); setAuthError(''); setAdminError(''); }}
        >
          🎮 Join Game
        </button>
        <button 
          className={`tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
          onClick={() => { setActiveTab('signup'); setAuthError(''); setAdminError(''); }}
        >
          ✨ Create Account
        </button>
        <button 
          className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => { setActiveTab('login'); setAuthError(''); setAdminError(''); }}
        >
          🔑 Player Login
        </button>
        <button 
          className={`tab-btn admin-tab ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => { setActiveTab('admin'); setAuthError(''); setAdminError(''); }}
        >
          👑 Host / Admin
        </button>
      </div>

      {/* Main Form Card */}
      <div className="panel home-card" style={{ maxWidth: '460px', margin: '0 auto', width: '100%' }}>
        {/* ─── TAB 1: QUICK JOIN ─── */}
        {activeTab === 'join' && (
          <form onSubmit={handleQuickJoin} className="flex-col" style={{ gap: '1rem' }}>
            <h2 className="text-center" style={{ fontSize: '1.4rem' }}>Enter Game Room</h2>
            <p className="text-muted text-center" style={{ fontSize: '0.9rem', marginTop: '-0.5rem' }}>
              Join the live room using the code shown on the host screen.
            </p>

            <div>
              <label className="input-label">GAME CODE</label>
              <input 
                type="text" 
                placeholder="e.g. GUESS24" 
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                required
                style={{ textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 800, textAlign: 'center', fontSize: '1.2rem' }}
              />
            </div>

            <div>
              <label className="input-label">YOUR PLAYER NAME</label>
              <input 
                type="text" 
                placeholder="Enter your name..." 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary btn-glow" style={{ padding: '16px', fontSize: '1.1rem', marginTop: '0.5rem' }}>
              🚀 PLAY NOW
            </button>
          </form>
        )}

        {/* ─── TAB 2: CREATE ACCOUNT ─── */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} className="flex-col" style={{ gap: '1rem' }}>
            <h2 className="text-center" style={{ fontSize: '1.4rem' }}>Create Player Account</h2>
            <p className="text-muted text-center" style={{ fontSize: '0.9rem', marginTop: '-0.5rem' }}>
              Save your player profile & track your score stats.
            </p>

            {authError && <div className="alert-banner error">{authError}</div>}
            {authSuccess && <div className="alert-banner success">{authSuccess}</div>}

            <div>
              <label className="input-label">PLAYER NAME / NICKNAME</label>
              <input 
                type="text" 
                placeholder="e.g. Alex" 
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="input-label">EMAIL ADDRESS</label>
              <input 
                type="email" 
                placeholder="player@example.com" 
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="input-label">PASSWORD</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '14px', marginTop: '0.5rem' }}>
              ✨ REGISTER ACCOUNT
            </button>
          </form>
        )}

        {/* ─── TAB 3: PLAYER LOGIN ─── */}
        {activeTab === 'login' && (
          <form onSubmit={handlePlayerLogin} className="flex-col" style={{ gap: '1rem' }}>
            <h2 className="text-center" style={{ fontSize: '1.4rem' }}>Player Sign In</h2>
            <p className="text-muted text-center" style={{ fontSize: '0.9rem', marginTop: '-0.5rem' }}>
              Sign in to use your saved player profile.
            </p>

            {authError && <div className="alert-banner error">{authError}</div>}
            {authSuccess && <div className="alert-banner success">{authSuccess}</div>}

            <div>
              <label className="input-label">EMAIL ADDRESS</label>
              <input 
                type="email" 
                placeholder="player@example.com" 
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="input-label">PASSWORD</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '14px', marginTop: '0.5rem' }}>
              🔑 SIGN IN
            </button>
          </form>
        )}

        {/* ─── TAB 4: ADMIN / HOST LOGIN ─── */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminAuth} className="flex-col" style={{ gap: '1rem' }}>
            <div className="text-center mb-4">
              <span className="difficulty-badge" style={{ background: 'rgba(255,42,95,0.15)', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', padding: '6px 14px' }}>
                ADMIN ACCESS ONLY
              </span>
            </div>

            <h2 className="text-center" style={{ fontSize: '1.4rem' }}>Host Dashboard Login</h2>
            <p className="text-muted text-center" style={{ fontSize: '0.9rem', marginTop: '-0.5rem' }}>
              Enter administrator credentials to manage the live game server.
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

            <button type="submit" className="btn-primary btn-glow" style={{ padding: '15px', marginTop: '0.5rem', background: 'linear-gradient(135deg, #7c3aed, #ff2a5f)' }}>
              👑 LOGIN AS ADMIN
            </button>
          </form>
        )}
      </div>

      {/* Feature Highlights */}
      <div className="home-features">
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Real-time Sync</h3>
          <p>Sub-millisecond WebSocket response times for 500+ players.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Speed Bonus</h3>
          <p>The faster you tap the correct answer, the more points you earn!</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🏆</div>
          <h3>Live Podium</h3>
          <p>Track top 10 rankings in real time on the host screen.</p>
        </div>
      </div>
    </div>
  );
}
