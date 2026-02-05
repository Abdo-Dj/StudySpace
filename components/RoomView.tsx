
import React, { useState, useEffect, useRef } from 'react';
import { User, Room, FileContent, ChatMessage } from '../types';
import { subscribeToSync, syncUpdate } from '../services/realtimeService';

interface RoomViewProps {
  user: User;
  room: Room;
  onLeave: () => void;
}

const Whiteboard: React.FC<{ 
  file: FileContent; 
  onSave: (dataUrl: string) => void;
  roomId: string;
}> = ({ file, onSave, roomId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#6366f1');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load initial content
    if (file.content) {
      const img = new Image();
      img.src = file.content;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
    }

    const unsubscribe = subscribeToSync((event) => {
      if (event.type === 'DRAWING_SYNC' && event.fileId === file.id) {
        const img = new Image();
        img.src = event.dataUrl;
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
      }
    });

    return () => unsubscribe();
  }, [file.id]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      onSave(dataUrl);
      syncUpdate({ type: 'DRAWING_SYNC', roomId, fileId: file.id, dataUrl });
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = tool === 'eraser' ? '#0f172a' : color;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL();
    onSave(dataUrl);
    syncUpdate({ type: 'DRAWING_SYNC', roomId, fileId: file.id, dataUrl });
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      {/* Whiteboard Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/90 backdrop-blur-xl border border-slate-700 p-3 rounded-2xl shadow-2xl z-10">
        <div className="flex bg-slate-900 rounded-xl p-1">
          <button 
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg transition-all ${tool === 'pen' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button 
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>

        <div className="h-6 w-px bg-slate-700" />

        <div className="flex gap-2">
          {['#6366f1', '#ef4444', '#22c55e', '#eab308'].map(c => (
            <button 
              key={c}
              onClick={() => { setColor(c); setTool('pen'); }}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full transition-transform ${color === c && tool === 'pen' ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
            />
          ))}
        </div>

        <div className="h-6 w-px bg-slate-700" />

        <button 
          onClick={clearCanvas}
          className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-red-400 transition"
        >
          CLEAR
        </button>
      </div>

      <div className="w-full h-full bg-slate-900 overflow-hidden relative" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        <canvas
          ref={canvasRef}
          width={1600}
          height={1000}
          className="cursor-crosshair w-full h-full touch-none"
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
        />
      </div>
    </div>
  );
};

const RoomView: React.FC<RoomViewProps> = ({ user, room, onLeave }) => {
  const [roomData, setRoomData] = useState<Room>(room);
  const [activeFile, setActiveFile] = useState<FileContent | null>(null);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('studdy_rooms');
    if (saved) {
      const all = JSON.parse(saved);
      const current = all.find((r: Room) => r.id === room.id);
      if (current) setRoomData(current);
    }

    const unsubscribe = subscribeToSync((event) => {
      if (event.roomId !== room.id) return;

      if (event.type === 'FILE_UPDATE') {
        setRoomData(prev => {
          const files = [...prev.files];
          const idx = files.findIndex(f => f.id === event.file.id);
          if (idx > -1) files[idx] = event.file;
          else files.push(event.file);
          
          const updated = { ...prev, files };
          updatePersistentStorage(updated);
          return updated;
        });
        
        if (activeFile && activeFile.id === event.file.id) {
          setActiveFile(event.file);
        }
      } else if (event.type === 'MESSAGE_SENT') {
        setRoomData(prev => {
          const updated = { ...prev, messages: [...prev.messages, event.message] };
          updatePersistentStorage(updated);
          return updated;
        });
      }
    });

    return () => unsubscribe();
  }, [room.id, activeFile]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomData.messages]);

  const updatePersistentStorage = (updatedRoom: Room) => {
    const saved = localStorage.getItem('studdy_rooms');
    if (saved) {
      const all = JSON.parse(saved);
      const newAll = all.map((r: Room) => r.id === updatedRoom.id ? updatedRoom : r);
      localStorage.setItem('studdy_rooms', JSON.stringify(newAll));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newFile: FileContent = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        content: content,
        lastModified: Date.now(),
        authorId: user.id
      };

      const updatedRoom = { ...roomData, files: [...roomData.files, newFile] };
      setRoomData(updatedRoom);
      updatePersistentStorage(updatedRoom);
      syncUpdate({ type: 'FILE_UPDATE', roomId: room.id, file: newFile });
      setActiveFile(newFile);
    };

    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const createWhiteboard = () => {
    const newFile: FileContent = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Board ${roomData.files.filter(f => f.type === 'whiteboard').length + 1}`,
      type: 'whiteboard',
      content: '', // Empty canvas
      lastModified: Date.now(),
      authorId: user.id
    };

    const updatedRoom = { ...roomData, files: [...roomData.files, newFile] };
    setRoomData(updatedRoom);
    updatePersistentStorage(updatedRoom);
    syncUpdate({ type: 'FILE_UPDATE', roomId: room.id, file: newFile });
    setActiveFile(newFile);
  };

  const handleEditorChange = (newContent: string) => {
    if (!activeFile) return;
    const updatedFile = { ...activeFile, content: newContent, lastModified: Date.now() };
    setActiveFile(updatedFile);
    
    setRoomData(prev => {
      const files = prev.files.map(f => f.id === updatedFile.id ? updatedFile : f);
      const updated = { ...prev, files };
      updatePersistentStorage(updated);
      return updated;
    });

    syncUpdate({ type: 'FILE_UPDATE', roomId: room.id, file: updatedFile });
  };

  const sendChatMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const msg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: user.id,
      senderName: user.name,
      text: chatInput,
      timestamp: Date.now()
    };

    const updatedWithMsg = { ...roomData, messages: [...roomData.messages, msg] };
    setRoomData(updatedWithMsg);
    updatePersistentStorage(updatedWithMsg);
    syncUpdate({ type: 'MESSAGE_SENT', roomId: room.id, message: msg });
    setChatInput('');
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <aside className="w-80 bg-slate-800/80 border-r border-slate-700 flex flex-col backdrop-blur-md">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
          <button onClick={onLeave} className="p-2.5 hover:bg-slate-700 rounded-2xl transition-all text-slate-400 group">
            <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex-1 px-4 text-center truncate">
            <h2 className="text-base font-black truncate text-white">{roomData.name}</h2>
            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{roomData.code}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          <div className="flex items-center justify-between px-2 mb-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
            <span>Shared Items</span>
            <div className="flex gap-2">
              <button 
                onClick={createWhiteboard}
                className="text-indigo-500 hover:text-indigo-400 transition"
                title="Create Whiteboard"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-indigo-500 hover:text-indigo-400 transition"
                title="Upload Document"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload} 
              accept=".txt,.md,.pdf,image/*"
            />
          </div>

          {roomData.files.length === 0 ? (
            <div className="py-12 px-6 text-center border-2 border-dashed border-slate-700 rounded-[2rem]">
              <p className="text-sm text-slate-500 font-bold leading-relaxed">Workspace is empty.</p>
            </div>
          ) : (
            roomData.files.map(file => (
              <button
                key={file.id}
                onClick={() => setActiveFile(file)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm transition-all group ${
                  activeFile?.id === file.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-xl transition-colors ${activeFile?.id === file.id ? 'bg-indigo-500' : 'bg-slate-700 group-hover:bg-slate-600'}`}>
                  {file.type === 'whiteboard' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  ) : file.type.startsWith('image/') ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  ) : file.type === 'application/pdf' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  )}
                </div>
                <span className="truncate flex-1 text-left font-bold">{file.name}</span>
              </button>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-800/80 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {roomData.members.map((mId, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-indigo-600 border-4 border-slate-800 flex items-center justify-center text-xs font-black text-white uppercase shadow-lg">
                  {mId.charAt(0)}
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Team Session</p>
              <p className="text-xs font-bold text-slate-300">{roomData.members.length} Members</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-slate-900 flex flex-col relative overflow-hidden">
        {activeFile ? (
          <>
            <div className="h-20 bg-slate-800/20 border-b border-slate-700 flex items-center justify-between px-10 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </div>
                <h3 className="text-xl font-black text-white">{activeFile.name}</h3>
              </div>
              <div className="text-[11px] font-black text-slate-500 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50">
                ACTIVE EDITING • {new Date(activeFile.lastModified).toLocaleTimeString()}
              </div>
            </div>
            
            <div className="flex-1 overflow-auto flex flex-col">
              {activeFile.type === 'whiteboard' ? (
                <Whiteboard 
                  file={activeFile} 
                  roomId={room.id}
                  onSave={handleEditorChange} 
                />
              ) : activeFile.type === 'application/pdf' ? (
                <div className="flex-1 p-6">
                   <embed 
                    src={activeFile.content} 
                    type="application/pdf" 
                    className="w-full h-full rounded-[2rem] border-4 border-slate-800 bg-slate-800"
                    style={{ minHeight: '80vh' }}
                  />
                </div>
              ) : activeFile.type.startsWith('text/') || activeFile.name.endsWith('.md') || activeFile.name.endsWith('.txt') ? (
                <div className="flex-1 p-12">
                   <textarea
                    className="w-full h-full bg-transparent border-none focus:ring-0 text-slate-300 font-mono resize-none text-xl leading-loose placeholder:text-slate-800"
                    value={activeFile.content}
                    onChange={(e) => handleEditorChange(e.target.value)}
                    placeholder="Shared notes..."
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-8 p-12">
                  <img 
                    src={activeFile.content} 
                    className="max-h-[85%] rounded-[2.5rem] shadow-[0_0_80px_rgba(79,70,229,0.15)] border-4 border-slate-800 object-contain" 
                    alt={activeFile.name} 
                  />
                  <p className="text-slate-500 font-black text-xs uppercase tracking-[0.3em]">Resource Preview</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-700 p-10 space-y-6">
            <div className="w-32 h-32 rounded-[2.5rem] bg-slate-800/50 border-4 border-slate-700/50 flex items-center justify-center text-slate-700">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 01-2-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-black text-slate-400">Collaboration Space</p>
              <p className="text-slate-600 font-bold max-w-sm">Pick an item or create a new whiteboard to begin.</p>
            </div>
          </div>
        )}
      </main>

      <aside className="w-96 bg-slate-800/80 border-l border-slate-700 flex flex-col backdrop-blur-xl">
        <div className="p-6 border-b border-slate-700 bg-slate-800/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Live Feed</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {roomData.messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.senderId === user.id ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-3 duration-400`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase">{msg.senderName}</span>
                <span className="text-[9px] font-bold text-slate-700">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className={`px-5 py-3.5 rounded-[1.5rem] text-sm max-w-[95%] shadow-sm font-medium leading-relaxed ${
                msg.senderId === user.id 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-slate-700/80 text-slate-200 rounded-tl-none border border-slate-700'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={sendChatMessage} className="p-6 bg-slate-800/50 border-t border-slate-700">
          <div className="relative group">
            <input
              type="text"
              placeholder="Chat with your team..."
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl pl-6 pr-14 py-4 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button 
              type="submit"
              className="absolute right-3 top-3 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-all active:scale-90 shadow-lg shadow-indigo-600/20"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
};

export default RoomView;
