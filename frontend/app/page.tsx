'use client';
import { useState } from 'react';
import { useWebAuthn } from '../hooks/useWebAuthn';
import { Toaster, toast } from 'sonner';
import { Fingerprint, KeyRound, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [occupation, setOccupation] = useState('');
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const { register, login } = useWebAuthn();

  const handleRegister = async () => {
    if (!email || !name || !occupation) return toast.error("Please fill out all fields", { description: "Name, Occupation, and Email are required to register your identity." });
    setIsRegistering(true);
    toast.promise(register(email, name, occupation), {
      loading: 'Awaiting biometric verification...',
      success: 'Passkey registered successfully! 🎉 You can now clear the fields and login.',
      error: (err) => `Registration failed: ${err.message}`,
      finally: () => setIsRegistering(false)
    });
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    toast.promise(login(), {
      loading: 'Authenticating with passkey...',
      success: () => {
        router.push('/dashboard');
        return 'Welcome back! Authentication successful 🚀';
      },
      error: (err) => `Login failed: ${err.message}`,
      finally: () => setIsLoggingIn(false)
    });
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <Toaster position="top-center" richColors />
      
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-50 p-4 rounded-full text-indigo-600 ring-8 ring-indigo-50/50">
            <ShieldCheck size={40} strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold mb-2 text-gray-900 text-center tracking-tight">
          Secure Access
        </h2>
        <p className="text-gray-500 text-center mb-8 text-sm">
          Sign in seamlessly with your biometric device
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Full Name <span className="text-gray-400 font-normal">(Registration Only)</span></label>
            <input
              className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-gray-900 transition-all shadow-sm placeholder-gray-400 font-medium"
              placeholder="Satoshi Nakamoto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isRegistering || isLoggingIn}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Occupation <span className="text-gray-400 font-normal">(Registration Only)</span></label>
            <input
              className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-gray-900 transition-all shadow-sm placeholder-gray-400 font-medium"
              placeholder="Software Engineer"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              disabled={isRegistering || isLoggingIn}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Email <span className="text-gray-400 font-normal">(Registration Only)</span></label>
            <input
              className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-gray-900 transition-all shadow-sm placeholder-gray-400 font-medium"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isRegistering || isLoggingIn}
            />
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <button 
              onClick={handleRegister}
              disabled={isRegistering || isLoggingIn}
              className="w-full relative flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              <Fingerprint className={`size-5 ${isRegistering ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
              {isRegistering ? 'Registering...' : 'Register Passkey'}
            </button>
            <button 
              onClick={handleLogin}
              disabled={isRegistering || isLoggingIn}
              className="w-full relative flex items-center justify-center gap-3 bg-white border-2 border-gray-100 text-gray-800 py-4 rounded-2xl font-semibold hover:bg-gray-50 hover:border-gray-200 active:scale-[0.98] transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              <KeyRound className={`size-5 text-gray-500 ${isLoggingIn ? 'animate-pulse' : 'group-hover:text-indigo-600 transition-colors'}`} />
              {isLoggingIn ? 'Authenticating...' : 'Login with Passkey'}
            </button>
          </div>
        </div>
        
        <p className="mt-8 text-xs text-center text-gray-400 font-medium leading-relaxed">
          Requires a secure context (HTTPS/localhost)
          <br/>
          and compatible biometric hardware.
        </p>
      </div>
    </main>
  );
}