"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { GLSLHills } from "@/components/ui/glsl-hills";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-sm tracking-[0.3em] uppercase text-zinc-400">
          Loading...
        </div>
      </main>
    );
  }

  if (isAuthenticated) return null;

  return (
    <main className="relative min-h-screen  overflow-hidden bg-black text-white">
      <GLSLHills />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_bottom,rgba(255,0,0,0.08),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-black/35" />

      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
          <div className="text-lg font-semibold tracking-[0.25em] uppercase text-white">
            EnvMate
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="pointer-events-auto rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-medium text-zinc-100 backdrop-blur-md transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-white"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-20 flex min-h-screen items-center justify-center px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
         

          <h1 className="text-5xl font-semibold tracking-tight text-white underline">
            EnvMate
          </h1>

          <p className="mx-auto mt-2 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg md:text-xl">
            Stop sending <span className="font-semibold text-white">.env</span> files
            in chats. Share secrets with your team through encrypted access,
            controlled permissions, and a workflow built for real collaboration.
          </p>

         

          <div className="mt-10 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <div className="text-sm font-semibold text-white">Encrypted Storage</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Keep environment secrets protected instead of passing them around
                in chat threads.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <div className="text-sm font-semibold text-white">Team Access Control</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Invite teammates and control exactly who can view or edit sensitive values.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <div className="text-sm font-semibold text-white">Project-Based Workflow</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Organize secrets by team and project so your setup stays clean and scalable.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}