'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { GLSLHills } from "@/components/ui/glsl-hills";

export default function DemoOne() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
        <GLSLHills />
        <div className="space-y-6 pointer-events-none z-10 text-center absolute px-6">
          <div className="text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <GLSLHills />

      <div className="space-y-6 pointer-events-none z-10 text-center absolute px-6">
        <h1 className="font-semibold text-6xl md:text-7xl text-white tracking-tight">
          EnvMate
        </h1>

        <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Stop sharing <span className="text-white font-medium">.env</span> files in chats.  
          Keep your secrets encrypted, organized, and accessible only to your team.
        </p>

        <p className="text-sm text-slate-400 tracking-wide">
          Invite teammates • Control access • Stay secure
        </p>
      </div>
    </div>
  );
}