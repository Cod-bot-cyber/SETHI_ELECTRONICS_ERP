import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Toast, { ToastMessage } from './components/Toast';

const mockUser = {
  displayName: 'Sethi Electronics-ERP',
  email: 'admin@sethielectronics.com',
  photoURL: null,
};

export default function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Helper to add toast messages
  const addToast = (text: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  // Helper to dismiss toasts
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="antialiased text-slate-800" id="app-root">
      <Dashboard user={mockUser} onAddToast={addToast} />

      {/* Global Toast component */}
      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
}
