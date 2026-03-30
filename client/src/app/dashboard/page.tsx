'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTeam } from '@/lib/team';
import { useProject } from '@/lib/project';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { teams, fetchTeams } = useTeam();
  const { uploadEnvContent, fetchEnvVariables } = useProject();

  // Import .env modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [importTeamId, setImportTeamId] = useState('');
  const [importProjectId, setImportProjectId] = useState('');
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState<'select' | 'content'>('select');
  const [teamProjects, setTeamProjects] = useState<Array<{ id: string; name: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch teams on mount
  const loadedRef = useRef(false);
  useEffect(() => {
    if (isAuthenticated && !loadedRef.current) {
      loadedRef.current = true;
      fetchTeams();
    }
  }, [isAuthenticated, fetchTeams]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleImportSelectTeam = async (teamId: string) => {
    setImportTeamId(teamId);
    setImportError('');
    // Fetch projects for this team
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/teams/${teamId}/projects`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );
      const data = await response.json();
      if (data.success) {
        setTeamProjects(data.data.projects || []);
      }
    } catch {
      setImportError('Failed to load projects');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importProjectId || !importContent.trim()) return;

    setImportError('');
    setIsImporting(true);

    const result = await uploadEnvContent(importProjectId, importContent, false);
    if (result.success) {
      setShowImportModal(false);
      setImportContent('');
      setImportTeamId('');
      setImportProjectId('');
      setImportStep('select');
      setTeamProjects([]);
      // Navigate to the project
      router.push(`/projects/${importProjectId}`);
    } else {
      setImportError(result.error || 'Failed to import .env');
    }
    setIsImporting(false);
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImportContent(event.target?.result as string);
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
     <nav className="sticky top-0 z-40 border-b border-slate-700 bg-slate-800/95 backdrop-blur-sm">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="flex min-h-16 flex-col gap-3 py-3 sm:min-h-[64px] sm:flex-row sm:items-center sm:justify-between sm:py-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600">
          <span className="text-lg font-bold text-white">E</span>
        </div>
        <span className="truncate text-lg font-bold text-white sm:text-xl">
          EnvMate
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 font-semibold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-600 sm:w-auto"
        >
          Sign out
        </button>
      </div>
    </div>
  </div>
</nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user.name}!
          </h1>
          <p className="text-slate-400">Manage your environment variables and teams with ease</p>
        </div>

        {!user.email_verified && (
          <div className="mb-6 bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber-700/50 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-amber-200">
                  Email verification pending
                </h3>
                <p className="mt-1 text-sm text-amber-100/80">
                  Verify your email address to unlock all features. Check your inbox for a verification link.
                </p>
                <button className="mt-3 text-sm font-medium text-amber-300 hover:text-amber-200 transition-colors">
                  Resend verification email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 shadow-lg hover:shadow-xl hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Account Status</p>
                <div className="flex items-center space-x-2">
                  <span className={`h-2 w-2 rounded-full ${user.email_verified ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                  <p className="text-lg font-semibold text-white">
                    {user.email_verified ? 'Verified' : 'Pending'}
                  </p>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${user.email_verified ? 'bg-green-900/30' : 'bg-amber-900/30'}`}>
                <svg className={`h-6 w-6 ${user.email_verified ? 'text-green-400' : 'text-amber-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 shadow-lg hover:shadow-xl hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Member Since</p>
                <p className="text-lg font-semibold text-white">
                  {new Date(user.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short' 
                  })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-900/30">
                <svg className="h-6 w-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 shadow-lg hover:shadow-xl hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Last Login</p>
                <p className="text-lg font-semibold text-white">
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'First login'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-900/30">
                <svg className="h-6 w-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.5 1.5H5.75A2.75 2.75 0 003 4.25v11A2.75 2.75 0 005.75 18h8.5A2.75 2.75 0 0017 15.25v-9m-1.5-4h-5M10.5 1.5v3m-7-3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M7 10h6M7 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-6">
            <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              href="/teams" 
              className="group relative bg-slate-800 rounded-lg border border-slate-700 p-5 hover:border-indigo-500/50 hover:shadow-lg transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-indigo-900/30 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.343a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM15.657 14.657a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM11 17a1 1 0 102 0v-1a1 1 0 10-2 0v1zM5.343 15.657a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM3 10a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.343 5.343a1 1 0 001.414-1.414L6.05 3.222a1 1 0 00-1.414 1.414l.707.707z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1">Project</h3>
                <p className="text-sm text-slate-400">Create and manage your project</p>
              </div>
            </Link>

            <Link 
              href="/teams" 
              className="group relative bg-slate-800 rounded-lg border border-slate-700 p-5 hover:border-green-500/50 hover:shadow-lg transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.5 1.5H5.75A2.75 2.75 0 003 4.25v11A2.75 2.75 0 005.75 18h8.5A2.75 2.75 0 0017 15.25v-9m-1.5-4h-5M10.5 1.5v3m-7-3v3M7 10h6M7 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1">Teams</h3>
                <p className="text-sm text-slate-400">Create and manage your teams</p>
              </div>
            </Link>

            <button
              onClick={() => {
                setShowImportModal(true);
                setImportStep('select');
                setImportContent('');
                setImportTeamId('');
                setImportProjectId('');
                setImportError('');
                setTeamProjects([]);
              }}
              className="group relative bg-slate-800 rounded-lg border border-slate-700 p-5 hover:border-purple-500/50 hover:shadow-lg transition-all overflow-hidden text-left cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-purple-900/30 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1">Import .env</h3>
                <p className="text-sm text-slate-400">Import existing environment files</p>
              </div>
            </button>

            <Link 
              href="/teams" 
              className="group relative bg-slate-800 rounded-lg border border-slate-700 p-5 hover:border-slate-600 hover:shadow-lg transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-slate-700/50 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1">Settings</h3>
                <p className="text-sm text-slate-400">Manage your account & preferences</p>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* Import .env Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowImportModal(false)}
            />
            <div className="relative bg-slate-800 rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-700">
              <h2 className="text-lg font-medium text-white mb-4">
                Import .env File
              </h2>

              {importError && (
                <div className="mb-4 bg-red-900/30 border border-red-700/50 text-red-200 px-4 py-3 rounded text-sm">
                  {importError}
                </div>
              )}

              {importStep === 'select' ? (
                <div className="space-y-4">
                  {teams.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-slate-400 text-sm">You need to create a team and project first.</p>
                      <Link
                        href="/teams"
                        className="mt-3 inline-block px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                      >
                        Go to Teams
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-200">Select Team</label>
                        <select
                          value={importTeamId}
                          onChange={(e) => handleImportSelectTeam(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                          <option value="">Choose a team...</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      {importTeamId && (
                        <div>
                          <label className="block text-sm font-medium text-slate-200">Select Project</label>
                          {teamProjects.length === 0 ? (
                            <p className="mt-1 text-sm text-slate-400">
                              No projects in this team.{' '}
                              <Link href={`/teams/${importTeamId}/projects`} className="text-indigo-400 hover:text-indigo-300">
                                Create one
                              </Link>
                            </p>
                          ) : (
                            <select
                              value={importProjectId}
                              onChange={(e) => setImportProjectId(e.target.value)}
                              className="mt-1 block w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                              <option value="">Choose a project...</option>
                              {teamProjects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowImportModal(false)}
                          className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!importProjectId}
                          onClick={() => setImportStep('content')}
                          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <form onSubmit={handleImportSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Choose a .env file
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".env,.env.*,text/plain"
                      onChange={handleImportFileSelect}
                      className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-900/50 file:text-indigo-300 hover:file:bg-indigo-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="importContent" className="block text-sm font-medium text-slate-200">
                      Or paste .env content
                    </label>
                    <textarea
                      id="importContent"
                      value={importContent}
                      onChange={(e) => setImportContent(e.target.value)}
                      required
                      rows={10}
                      className="mt-1 block w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-md shadow-sm font-mono text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-500"
                      placeholder="API_KEY=your_api_key&#10;DATABASE_URL=postgres://..."
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setImportStep('select')}
                      className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isImporting || !importContent.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isImporting ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
