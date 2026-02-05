
import React, { useState, useEffect, useRef } from 'react';
import { User, Room, FileContent, ChatMessage } from '../types';
import { subscribeToSync, syncUpdate } from '../services/realtimeService';
import { getStudyAssistance, summarizeDocument } from '../services/geminiService';

interface RoomViewProps {
  user: User;
  room: Room;
  onLeave: () => void;
}

const RoomView: React.FC<RoomViewProps> = ({ user, room, onLeave }) => {
  const [roomData, setRoomData] = useState<Room>(room);
  const [activeFile, setActiveFile] = useState<FileContent | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initial load from storage if updated
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
        
        // Update active file if it's the one being synced
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

  const handleEditorChange = (newContent: string) => {
    if (!activeFile) return;
    const updatedFile = { ...activeFile, content: newContent, lastModified: Date.now() };
    setActiveFile(updatedFile);
    
    // Efficiently update state
    setRoomData(prev => {
      const files = prev.files.map(f => f.id === updatedFile.id ? updatedFile : f);
      const updated = { ...prev, files };
      updatePersistentStorage(updated);
      return updated;
    });

    syncUpdate({ type: 'FILE_UPDATE', roomId: room.id, file: updatedFile });
  };

  const sendChatMessage = async (e?: React.FormEvent) => {
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
    
    const currentPrompt = chatInput;
    setChatInput('');

    // AI Check
    if (currentPrompt.toLowerCase().includes('@ai') || currentPrompt.toLowerCase().includes('gemini')) {
      setIsAIThinking(true);
      try {
        const aiResponse = await getStudyAssistance(currentPrompt, roomData.files.map(f => ({ name: f.name, content: f.content })));
        const aiMsg: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          senderId: 'ai-assistant',
          senderName: 'Gemini Assistant',
          text: aiResponse || "I'm sorry, I couldn't process that.",
          timestamp: Date.now(),
          isAI: true
        };
        const updatedWithAI = { ...roomData, messages: [...roomData.messages, msg, aiMsg] };
        setRoomData(updatedWithAI);
        updatePersistentStorage(updatedWithAI);
        syncUpdate({ type: 'MESSAGE_SENT', roomId: room.id, message: aiMsg });
      } catch (err) {
        console.error(err);
      } finally {
        setIsAIThinking(false);
      }
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar - Files */}
      <aside className="w-72 bg-slate-800/80 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
          <button onClick={onLeave} className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex-1 px-3 text-center truncate">
            <h2 className="text-sm font-bold truncate">{roomData.name}</h2>
            <p className="text-[10px] text-slate-500 font-mono">{roomData.code}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between px-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Documents</span>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-indigo-400 hover:text-indigo-300 transition"
            >
              Add File
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload} 
              accept=".txt,.md,.pdf,image/*"
            />
          </div>

          {roomData.files.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <p className="text-sm text-slate-500 italic">No files shared yet.</p>
            </div>
          ) : (
            roomData.files.map(file => (
              <button
                key={file.id}
                onClick={() => setActiveFile(file)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  activeFile?.id === file.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${activeFile?.id === file.id ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                  {file.type.startsWith('image/') ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  )}
                </div>
                <span className="truncate flex-1 text-left">{file.name}</span>
              </button>
            ))
          )}
        </div>

        <div className="p-4 bg-slate-800/50 border-t border-slate-700">
          <div className="flex -space-x-2">
            {roomData.members.map((mId, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-slate-800 flex items-center justify-center text-[10px] font-bold text-white uppercase" title={mId}>
                {mId.charAt(0)}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">{roomData.members.length} member(s) online</p>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 bg-slate-900 flex flex-col relative overflow-hidden">
        {activeFile ? (
          <>
            <div className="h-14 bg-slate-800/30 border-b border-slate-700 flex items-center justify-between px-6 backdrop-blur-md">
              <h3 className="font-semibold text-slate-200">{activeFile.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                  Last sync: {new Date(activeFile.lastModified).toLocaleTimeString()}
                </span>
                <button 
                  onClick={async () => {
                    if (activeFile.type.startsWith('text/')) {
                      setIsAIThinking(true);
                      const summary = await summarizeDocument(activeFile.name, activeFile.content);
                      setChatInput(`Summary of ${activeFile.name}: ${summary}`);
                      setIsAIThinking(false);
                    }
                  }}
                  className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-xs font-bold border border-indigo-500/30 transition"
                >
                  AI Summary
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-8 max-w-5xl mx-auto w-full">
              {activeFile.type.startsWith('text/') || activeFile.name.endsWith('.md') || activeFile.name.endsWith('.txt') ? (
                <textarea
                  className="w-full h-full bg-transparent border-none focus:ring-0 text-slate-300 font-mono resize-none text-lg leading-relaxed placeholder:text-slate-700"
                  value={activeFile.content}
                  onChange={(e) => handleEditorChange(e.target.value)}
                  placeholder="Start typing your notes here..."
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <img 
                    src={activeFile.content} 
                    className="max-h-[80%] rounded-2xl shadow-2xl border border-slate-700" 
                    alt={activeFile.name} 
                  />
                  <p className="text-slate-500 text-sm italic">Image Preview (Read-only)</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center text-slate-700">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-center max-w-xs text-lg font-medium">Select a shared document or upload a new one to start studying.</p>
          </div>
        )}
      </main>

      {/* Chat Sidebar */}
      <aside className="w-80 bg-slate-800/80 border-l border-slate-700 flex flex-col backdrop-blur-md">
        <div className="p-4 border-b border-slate-700 bg-slate-800 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Live Study Chat</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {roomData.messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.senderId === user.id ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-slate-500">{msg.senderName}</span>
                <span className="text-[9px] text-slate-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[90%] shadow-sm ${
                msg.senderId === user.id 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : msg.isAI ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-100 rounded-tl-none' : 'bg-slate-700 text-slate-200 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isAIThinking && (
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-300 text-xs animate-pulse">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2" strokeWidth="2" strokeLinecap="round"/></svg>
              AI is analyzing documents...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={sendChatMessage} className="p-4 bg-slate-800 border-t border-slate-700">
          <div className="relative">
            <input
              type="text"
              placeholder="Ask AI or chat with group..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition active:scale-90"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            </button>
          </div>
          <p className="text-[9px] text-slate-600 mt-2 text-center">Tip: Mention <span className="text-indigo-500 font-bold">@AI</span> to get study help</p>
        </form>
      </aside>
    </div>
  );
};

export default RoomView;
