import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Cpu } from 'lucide-react';
import { auth } from './firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Toast, { ToastMessage } from './components/Toast';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Monitor Authentication State change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Helper to add toast messages
  const addToast = (text: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  // Helper to dismiss toasts
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auth Loading state splash screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center" id="auth-splash-screen">
        <div className="relative flex flex-col items-center">
          <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-600/20 animate-bounce mb-4" id="splash-logo">
            <Cpu className="h-8 w-8" />
          </div>
          <div className="w-12 h-1 bg-indigo-200 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full w-1/2 bg-indigo-600 rounded-full animate-[shimmer_1.5s_infinite_linear]" style={{
              backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
            }} />
          </div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-4">
            Sethi Electronics - ERP System
          </span>
        </div>
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="antialiased text-slate-800" id="app-root">
      {user ? (
        <Dashboard user={user} onAddToast={addToast} />
      ) : (
        <Login onAddToast={addToast} />
      )}

      {/* Global Toast component */}
      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
}
