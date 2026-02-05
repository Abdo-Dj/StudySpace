
import React, { useState, useEffect, useCallback } from 'react';
import { User, Room, AppState } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RoomView from './components/RoomView';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [view, setView] = useState<AppState>(AppState.LOGIN);

  useEffect(() => {
    const savedUser = localStorage.getItem('studdy_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView(AppState.DASHBOARD);
    }
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('studdy_user', JSON.stringify(newUser));
    setView(AppState.DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentRoom(null);
    localStorage.removeItem('studdy_user');
    setView(AppState.LOGIN);
  };

  const enterRoom = (room: Room) => {
    setCurrentRoom(room);
    setView(AppState.ROOM);
  };

  const leaveRoom = () => {
    setCurrentRoom(null);
    setView(AppState.DASHBOARD);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 selection:bg-indigo-500/30">
      {view === AppState.LOGIN && <Login onLogin={handleLogin} />}
      {view === AppState.DASHBOARD && user && (
        <Dashboard 
          user={user} 
          onLogout={handleLogout} 
          onEnterRoom={enterRoom} 
        />
      )}
      {view === AppState.ROOM && user && currentRoom && (
        <RoomView 
          user={user} 
          room={currentRoom} 
          onLeave={leaveRoom} 
        />
      )}
    </div>
  );
};

export default App;
