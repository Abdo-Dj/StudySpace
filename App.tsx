
import React, { useState, useEffect } from 'react';
import { User, Room, AppState } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RoomView from './components/RoomView';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [view, setView] = useState<AppState>(AppState.LOGIN);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser({ ...userData, id: firebaseUser.uid });
          setView(AppState.DASHBOARD);
        }
      } else {
        setUser(null);
        setView(AppState.LOGIN);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setCurrentRoom(null);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 selection:bg-indigo-500/30">
      {view === AppState.LOGIN && <Login onLogin={() => {}} />}
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
