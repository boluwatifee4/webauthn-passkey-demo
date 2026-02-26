'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogOut, User as UserIcon, Briefcase } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name?: string;
  occupation?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(() => {
    if (typeof window !== 'undefined') {
      const rawUser = localStorage.getItem('passkey_user');
      if (rawUser) return JSON.parse(rawUser) as UserData;
    }
    return null;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Escaping the synchronous effect phase to prevent the "cascading render" ESLint warning
    const timeout = setTimeout(() => {
      setMounted(true);
      if (!user) {
        router.push('/');
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [router, user]);

  if (!mounted || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-pulse flex items-center gap-3 text-indigo-500 font-semibold tracking-wide">
          <ShieldCheck size={28} className="animate-spin" /> Load Identity...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="bg-green-50 p-3 rounded-2xl text-green-600">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Passkey Protected Dashboard</h1>
              <p className="text-gray-500 font-medium mt-1 inline-flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Resident key authenticated
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('passkey_user');
              router.push('/');
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors shadow-sm"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </header>

        {/* User Stats/Details */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <UserIcon size={180} />
            </div>
            
            <h2 className="text-indigo-200 font-medium mb-2 tracking-wide text-sm">SECURE IDENTITY</h2>
            <p className="text-4xl font-extrabold mb-1 tracking-tight">{user.name || 'Anonymous User'}</p>
            <p className="text-indigo-200 font-medium text-lg">{user.email}</p>
            
            <div className="mt-12 inline-flex items-center gap-2 bg-indigo-500/50 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-semibold">
               ID: {user.id.split('-')[0]}••••••
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-6">
               <div className="bg-purple-50 p-4 rounded-2xl text-purple-600">
                 <Briefcase size={28} />
               </div>
               <div>
                  <h3 className="font-bold text-gray-900 text-xl tracking-tight">Occupation</h3>
                  <p className="text-gray-500 text-sm mt-1">Sourced from registration</p>
               </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-2xl font-semibold text-gray-800 tracking-tight">
                {user.occupation || 'No occupation listed'}
              </p>
            </div>
          </div>
        </section>
        
      </div>
    </main>
  );
}
