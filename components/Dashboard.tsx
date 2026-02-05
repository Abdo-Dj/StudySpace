
import React, { useState, useEffect, useRef } from 'react';
import { User, Room } from '../types';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, arrayUnion, getDocs } from 'firebase/firestore';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onEnterRoom: (room: Room) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onEnterRoom }) => {
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const pfpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Listen to rooms where the user is a member
    const q = query(collection(db, 'rooms'), where('members', 'array-contains', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      setRooms(roomList);
    });

    return () => unsubscribe();
  }, [user.id]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const updatedUser = { ...currentUser, avatar: base64 };
      setCurrentUser(updatedUser);
      
      // Update in Firestore
      await updateDoc(doc(db, 'users', user.id), { avatar: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName) return;

    const roomId = Math.random().toString(36).substr(2, 9);
    const newRoom: Room = {
      id: roomId,
      code: Math.random().toString(36).substr(2, 6).toUpperCase(),
      name: roomName,
      ownerId: user.id,
      files: [], // Files will be in a sub-collection for efficiency
      messages: [], // Messages will be in a sub-collection
      members: [user.id]
    };

    try {
      await setDoc(doc(db, 'rooms', roomId), newRoom);
      setRoomName('');
      setShowCreateModal(false);
      onEnterRoom(newRoom);
    } catch (err) {
      console.error(err);
      alert('Failed to create room.');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const q = query(collection(db, 'rooms'), where('code', '==', joinCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const roomDoc = querySnapshot.docs[0];
        const roomData = roomDoc.data() as Room;
        
        if (!roomData.members.includes(user.id)) {
          await updateDoc(doc(db, 'rooms', roomDoc.id), {
            members: arrayUnion(user.id)
          });
        }
        
        onEnterRoom({ ...roomData, id: roomDoc.id });
        setJoinCode('');
        setShowJoinModal(false);
      } else {
        alert("Room not found. Check the code.");
      }
    } catch (err) {
      console.error(err);
      alert('Error joining room.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-6 md:p-12 animate-in slide-in-from-bottom-8 duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
        <div className="flex items-center gap-8">
          <div className="relative group cursor-pointer" onClick={() => pfpInputRef.current?.click()}>
            <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
            <img 
              src={currentUser.avatar} 
              className="relative w-24 h-24 rounded-full border-4 border-slate-900 object-cover shadow-2xl transition duration-500 group-hover:scale-105" 
              alt="Avatar" 
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <input 
              type="file" 
              className="hidden" 
              ref={pfpInputRef} 
              accept="image/*" 
              onChange={handleAvatarChange} 
            />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tight mb-2 text-white">Hey, {currentUser.name.split(' ')[0]}</h1>
            <p className="text-slate-400 font-medium text-lg">Manage your private study circles.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-300">{currentUser.name}</p>
            <p className="text-xs text-slate-500">{currentUser.email}</p>
          </div>
          <button 
            onClick={onLogout}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl border border-slate-700 transition-all flex items-center gap-2 group"
          >
            <span>Log Out</span>
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <button 
          onClick={() => setShowCreateModal(true)}
          className="group relative h-56 rounded-[2.5rem] bg-indigo-600 p-10 text-left transition-all hover:scale-[1.02] hover:shadow-3xl hover:shadow-indigo-600/30 active:scale-95 overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-150 transition-all duration-700">
            <svg className="w-64 h-64 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
            </div>
            <div>
              <h3 className="text-3xl font-black text-white mb-2">New Room</h3>
              <p className="text-indigo-100/60 text-sm font-medium">Create a new cloud-synced space.</p>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setShowJoinModal(true)}
          className="group relative h-56 rounded-[2.5rem] bg-slate-800 p-10 text-left transition-all hover:scale-[1.02] border border-slate-700 hover:bg-slate-750 active:scale-95 overflow-hidden shadow-xl"
        >
          <div className="absolute -top-10 -right-10 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-150 transition-all duration-700">
            <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="w-12 h-12 bg-slate-700 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
            </div>
            <div>
              <h3 className="text-3xl font-black text-white mb-2">Join Circle</h3>
              <p className="text-slate-500 text-sm font-medium">Enter a room code to join your study group.</p>
            </div>
          </div>
        </button>

        {rooms.map(room => (
          <div 
            key={room.id}
            onClick={() => onEnterRoom(room)}
            className="group h-56 rounded-[2.5rem] bg-slate-800/40 p-10 border border-slate-700/50 hover:border-indigo-500/50 cursor-pointer transition-all hover:bg-slate-800 flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold truncate pr-4 text-slate-100">{room.name}</h3>
                <span className="text-[10px] font-black bg-slate-700/80 px-3 py-1.5 rounded-full text-slate-400 uppercase tracking-widest">{room.code}</span>
              </div>
              <p className="text-slate-500 text-sm font-semibold">Study Circle Member</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex -space-x-3">
                {room.members.slice(0, 4).map((mId, i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-slate-700 border-4 border-slate-900 flex items-center justify-center text-xs font-black text-slate-400 uppercase shadow-md">
                    {mId.charAt(0)}
                  </div>
                ))}
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                <svg className="w-5 h-5 text-indigo-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-10 max-w-md w-full animate-in zoom-in duration-300 shadow-2xl">
            <h2 className="text-3xl font-black mb-6 text-white">Create Study Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-6">
              <input
                autoFocus
                type="text"
                placeholder="Ex: Physics Final Group"
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-100 text-lg"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-700 rounded-2xl transition">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 py-4 text-white font-bold rounded-2xl hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20">Create Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-10 max-w-md w-full animate-in zoom-in duration-300 shadow-2xl">
            <h2 className="text-3xl font-black mb-6 text-white text-center">Join with Code</h2>
            <form onSubmit={handleJoinRoom} className="space-y-6">
              <input
                autoFocus
                type="text"
                placeholder="000000"
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-5 text-center text-4xl tracking-[0.3em] uppercase font-black text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.substring(0, 6))}
              />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowJoinModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-700 rounded-2xl transition">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 py-4 text-white font-bold rounded-2xl hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20">Join Room</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
