
import React, { useState, useEffect } from 'react';
import { User, Room } from '../types';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onEnterRoom: (room: Room) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onEnterRoom }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    const savedRooms = localStorage.getItem('studdy_rooms');
    if (savedRooms) {
      setRooms(JSON.parse(savedRooms));
    }
  }, []);

  const saveRooms = (updatedRooms: Room[]) => {
    setRooms(updatedRooms);
    localStorage.setItem('studdy_rooms', JSON.stringify(updatedRooms));
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName) return;

    const newRoom: Room = {
      id: Math.random().toString(36).substr(2, 9),
      code: Math.random().toString(36).substr(2, 6).toUpperCase(),
      name: roomName,
      ownerId: user.id,
      files: [],
      messages: [],
      members: [user.id]
    };

    saveRooms([...rooms, newRoom]);
    setRoomName('');
    setShowCreateModal(false);
    onEnterRoom(newRoom);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find(r => r.code === joinCode.toUpperCase());
    if (room) {
      if (!room.members.includes(user.id)) {
        const updatedRoom = { ...room, members: [...room.members, user.id] };
        saveRooms(rooms.map(r => r.id === room.id ? updatedRoom : r));
        onEnterRoom(updatedRoom);
      } else {
        onEnterRoom(room);
      }
      setJoinCode('');
      setShowJoinModal(false);
    } else {
      alert("Room not found. Check the code.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-6 md:p-12 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Welcome, {user.name.split(' ')[0]}</h1>
          <p className="text-slate-400">Ready to boost your productivity?</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-800/50 p-2 rounded-2xl border border-slate-700">
          <img src={user.avatar} className="w-10 h-10 rounded-full border border-indigo-500/30" alt="Avatar" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-none">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-400 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Actions */}
        <button 
          onClick={() => setShowCreateModal(true)}
          className="group relative h-48 rounded-3xl bg-indigo-600 p-8 text-left transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-600/20 active:scale-95 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-125 transition-transform">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-2">Create Room</h3>
            <p className="text-indigo-100/70 text-sm">Start a new private workspace for your group.</p>
          </div>
        </button>

        <button 
          onClick={() => setShowJoinModal(true)}
          className="group relative h-48 rounded-3xl bg-slate-800 p-8 text-left transition-all hover:scale-[1.02] border border-slate-700 hover:bg-slate-750 active:scale-95 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-2">Join with Code</h3>
            <p className="text-slate-400 text-sm">Have a code? Enter it here to join existing rooms.</p>
          </div>
        </button>

        {/* Room List */}
        {rooms.filter(r => r.members.includes(user.id)).map(room => (
          <div 
            key={room.id}
            onClick={() => onEnterRoom(room)}
            className="group h-48 rounded-3xl bg-slate-800/50 p-8 border border-slate-700 hover:border-slate-500 cursor-pointer transition-all hover:bg-slate-800 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold truncate pr-2">{room.name}</h3>
                <span className="text-[10px] font-bold bg-slate-700 px-2 py-1 rounded-full text-slate-400 uppercase tracking-wider">{room.code}</span>
              </div>
              <p className="text-slate-500 text-sm">{room.files.length} documents shared</p>
            </div>
            <div className="flex -space-x-2">
              {room.members.slice(0, 3).map((mId, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                  {mId.charAt(0).toUpperCase()}
                </div>
              ))}
              {room.members.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                  +{room.members.length - 3}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-sm w-full animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-4">Create Study Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <input
                autoFocus
                type="text"
                placeholder="Room Name (e.g. Physics Final Exam)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-slate-400 font-semibold hover:bg-slate-700 rounded-xl transition">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 py-3 text-white font-semibold rounded-xl hover:bg-indigo-500 transition">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-sm w-full animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-4">Join Private Room</h2>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <input
                autoFocus
                type="text"
                placeholder="6-digit code"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl tracking-widest uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.substring(0, 6))}
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowJoinModal(false)} className="flex-1 py-3 text-slate-400 font-semibold hover:bg-slate-700 rounded-xl transition">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 py-3 text-white font-semibold rounded-xl hover:bg-indigo-500 transition">Join</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
