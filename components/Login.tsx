
import React, { useState } from 'react';
import { User } from '../types';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        const userData: User = {
          id: firebaseUser.uid,
          name,
          email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
        };
        
        // Store user profile in Firestore
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        onLogin(userData);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // App.tsx handles the state change
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl p-10 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 mb-6 shadow-xl shadow-indigo-500/20 transform rotate-3 hover:rotate-0 transition-transform">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white">StuddySpace</h2>
          <p className="text-slate-400 mt-3 font-medium">Cloud-synced focused collaboration</p>
        </div>

        <div className="flex p-1 bg-slate-900 rounded-xl">
          <button 
            disabled={loading}
            onClick={() => { setIsSignUp(false); setError(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isSignUp ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Sign In
          </button>
          <button 
            disabled={loading}
            onClick={() => { setIsSignUp(true); setError(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isSignUp ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-xs text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
              <input
                type="text"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-200"
                placeholder="How should we call you?"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase ml-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-200"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
            <input
              type="password"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-200"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all active:scale-95 transform hover:-translate-y-1 flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            {isSignUp ? 'Create My Account' : 'Welcome Back'}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
          Cloud Secure • Private • Reliable
        </p>
      </div>
    </div>
  );
};

export default Login;
