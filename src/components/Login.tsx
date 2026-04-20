import React from 'react';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { FileText, LogIn, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100/50 p-8 lg:p-12 border border-white"
      >
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-200 mx-auto transform -rotate-6">
            <FileText className="w-10 h-10" />
          </div>
          
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Sistem SPPD</h1>
            <p className="text-gray-500 mt-2 font-medium">Dinas Sosial PPPA Kabupaten Blora</p>
          </div>

          <div className="py-8 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl text-blue-700 text-sm font-medium">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              Akses khusus internal instansi pemerintah Kabupaten Blora.
            </div>

            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-bold py-4 px-6 rounded-2xl border-2 border-gray-100 transition-all active:scale-95 shadow-sm"
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                className="w-6 h-6"
              />
              Masuk dengan Google
            </button>
          </div>

          <p className="text-xs text-gray-400 font-medium">
            &copy; 2026 Dinsos PPPA Blora. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
