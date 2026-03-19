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
      router.push('/login');
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
    router.push('/login');
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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">EnvMate</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {user.name} ({user.email})
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Welcome, {user.name}!
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500">Account Status</h3>
                <div className="mt-2 flex items-center">
                  {user.email_verified ? (
                    <>
                      <span className="h-2 w-2 bg-green-400 rounded-full mr-2"></span>
                      <span className="text-sm text-gray-900">Email Verified</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></span>
                      <span className="text-sm text-gray-900">Email Not Verified</span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500">Member Since</h3>
                <p className="mt-2 text-sm text-gray-900">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500">Last Login</h3>
                <p className="mt-2 text-sm text-gray-900">
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleString()
                    : 'First login'}
                </p>
              </div>
            </div>

            {!user.email_verified && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Verify your email
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Please verify your email address to access all features.
                        Check your inbox for a verification link.
                      </p>
                    </div>
                    <div className="mt-4">
                      <button className="text-sm font-medium text-yellow-800 hover:text-yellow-600">
                        Resend verification email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/teams" className="p-4 bg-indigo-50 rounded-lg text-left hover:bg-indigo-100 transition-colors block">
                  <div className="text-indigo-600 font-medium">Create Project</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Start a new environment project
                  </p>
                </Link>
                <Link href="/teams" className="p-4 bg-green-50 rounded-lg text-left hover:bg-green-100 transition-colors block">
                  <div className="text-green-600 font-medium">Manage Teams</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Create and manage your teams
                  </p>
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
                  className="p-4 bg-purple-50 rounded-lg text-left hover:bg-purple-100 transition-colors"
                >
                  <div className="text-purple-600 font-medium">Import .env</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Import existing environment files
                  </p>
                </button>
                <Link href="/teams" className="p-4 bg-gray-100 rounded-lg text-left hover:bg-gray-200 transition-colors block">
                  <div className="text-gray-600 font-medium">Settings</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage your teams &amp; projects
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Import .env Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowImportModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Import .env File
              </h2>

              {importError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {importError}
                </div>
              )}

              {importStep === 'select' ? (
                <div className="space-y-4">
                  {teams.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-gray-500 text-sm">You need to create a team and project first.</p>
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
                        <label className="block text-sm font-medium text-gray-700">Select Team</label>
                        <select
                          value={importTeamId}
                          onChange={(e) => handleImportSelectTeam(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                          <option value="">Choose a team...</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      {importTeamId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Select Project</label>
                          {teamProjects.length === 0 ? (
                            <p className="mt-1 text-sm text-gray-500">
                              No projects in this team.{' '}
                              <Link href={`/teams/${importTeamId}/projects`} className="text-indigo-600 hover:text-indigo-700">
                                Create one
                              </Link>
                            </p>
                          ) : (
                            <select
                              value={importProjectId}
                              onChange={(e) => setImportProjectId(e.target.value)}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Choose a .env file
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".env,.env.*,text/plain"
                      onChange={handleImportFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="importContent" className="block text-sm font-medium text-gray-700">
                      Or paste .env content
                    </label>
                    <textarea
                      id="importContent"
                      value={importContent}
                      onChange={(e) => setImportContent(e.target.value)}
                      required
                      rows={10}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm font-mono text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="API_KEY=your_api_key&#10;DATABASE_URL=postgres://..."
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setImportStep('select')}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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
