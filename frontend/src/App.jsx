import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import HomePage from './components/HomePage';
import PlayerScreen from './components/PlayerScreen';
import HostDashboard from './components/HostDashboard';
import DisplayScreen from './components/DisplayScreen';
import './index.css';

import { SOCKET_URL } from './config';

function App() {
  const socketRef = useRef(null);
  const [socket, setSocket]           = useState(null);
  const [gameState, setGameState]     = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [hostState, setHostState]     = useState(null);
  const [connected, setConnected]     = useState(false);

  useEffect(() => {
    const socketOptions = {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    };

    // If SOCKET_URL has a subpath like /ori/api, pass it appropriately
    if (import.meta.env.VITE_SOCKET_PATH) {
      socketOptions.path = import.meta.env.VITE_SOCKET_PATH;
    }

    const s = io(SOCKET_URL, socketOptions);

    socketRef.current = s;
    setSocket(s);

    s.on('connect',    ()      => setConnected(true));
    s.on('disconnect', ()      => setConnected(false));
    s.on('game_state_update', setGameState);
    s.on('player_update',     setPlayerState);
    s.on('host_state_update', setHostState);

    return () => s.disconnect();
  }, []);

  return (
    <Router>
      {!connected && (
        <div className="connection-banner">
          ⚡ Reconnecting to game server...
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={<HomePage socket={socket} gameState={gameState} />}
        />
        <Route
          path="/play"
          element={<PlayerScreen socket={socket} gameState={gameState} playerState={playerState} />}
        />
        <Route
          path="/host"
          element={<HostDashboard socket={socket} hostState={hostState} />}
        />
        <Route
          path="/display"
          element={<DisplayScreen socket={socket} hostState={hostState} gameState={gameState} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
