import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck, Cpu } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

interface LoginProps {
  onAddToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function Login({ onAddToast }: LoginProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onAddToast('Logged in successfully as Admin', 'success');
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Failed to sign in. Please try again.';
      if (err.code === 'auth/popup-blocked') {
        errorMsg = 'Pop-up blocked by browser. Please allow pop-ups for this site.';
      } else if (err.code === 'auth/unauthorised-domain') {
        errorMsg = 'This domain is not authorized in Firebase Console.';
      }
      onAddToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" id="login-page">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-md shadow-indigo-600/15 text-white" id="header-logo-container">
            <Cpu className="h-6 w-6" />
          </div>
          <span className="font-sans font-extrabold tracking-tight text-lg bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent" id="header-brand-name">
            Sethi Electronics - ERP System
          </span>
        </div>
        <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100" id="header-badge">
          Admin Portal
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10"
          id="login-card"
        >
          {/* Brand/Welcome */}
          <div className="text-center mb-8">
            <div className="mx-auto w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100" id="login-shield-badge">
              <ShieldCheck className="h-7 w-7 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold font-sans tracking-tight text-slate-900" id="login-title">
              Internal Admin Login
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Welcome back, Sethi. Access your secure customer portal to manage shop records, track orders, and interact via WhatsApp.
            </p>
          </div>

          {/* Action button */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-3 px-4 rounded-xl shadow-md shadow-indigo-600/10 transition-all duration-200 disabled:opacity-50"
              id="google-login-btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {/* Google SVG Icon */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Sign In with Google</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 justify-center py-2 bg-slate-50 border border-slate-100 rounded-xl" id="security-notice-container">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-slate-500">
                Authorized Google credentials required
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-8 pt-6 text-center">
            <span className="text-xs text-slate-400">
              Sethi Electronics Internal CRM v2.1 • Zero-Trust Database
            </span>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-400 border-t border-slate-100 relative z-10">
        &copy; {new Date().getFullYear()} Sethi Electronics. All rights reserved.
      </footer>
    </div>
  );
}
