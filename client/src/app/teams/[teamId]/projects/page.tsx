'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTeam, Team } from '@/lib/team';
import { useProject } from '@/lib/project';

export default function TeamProjectsPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { getTeamById } = useTeam();
  const { projects, fetchProjects, createProject, isLoading: projectsLoading } = useProject();

  const [team, setTeam] = useState<Team | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && teamId && !loadedRef.current) {
      loadedRef.current = true;

      getTeamById(teamId).then((result) => {
        if (result.success && result.team) {
          setTeam({
            ...result.team,
            user_role: result.membership?.role as Team['user_role'],
          });
        }
      });

      fetchProjects(teamId);
    }
  }, [isAuthenticated, teamId, getTeamById, fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);

    const result = await createProject(
      teamId,
      newProjectName,
      newProjectDescription || undefined
    );

    if (result.success) {
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
      fetchProjects(teamId);
    } else {
      setCreateError(result.error || 'Failed to create project');
    }

    setIsCreating(false);
  };

  const canCreateProject = team?.user_role === 'admin' || team?.user_role === 'editor';

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="text-center text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="border-b border-slate-700 bg-slate-800/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-sm sm:text-base">
              <Link
                href="/dashboard"
                className="shrink-0 text-lg font-bold text-white sm:text-xl"
              >
                EnvMate
              </Link>

              <span className="text-slate-600">/</span>

              <Link
                href="/teams"
                className="text-slate-300 transition hover:text-white"
              >
                Teams
              </Link>

              <span className="text-slate-600">/</span>

              <Link
                href={`/teams/${teamId}`}
                className="max-w-[140px] truncate text-slate-300 transition hover:text-white sm:max-w-[220px]"
              >
                {team?.name || 'Team'}
              </Link>

              <span className="text-slate-600">/</span>

              <span className="max-w-[120px] truncate font-medium text-white sm:max-w-none">
                Projects
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">Projects</h1>
              <p className="mt-1 text-sm text-slate-400">
                Manage projects and environment files for this team.
              </p>
            </div>

            {canCreateProject && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 sm:w-auto"
              >
                New Project
              </button>
            )}
          </div>

          {projectsLoading ? (
            <div className="py-12 text-center">
              <div className="text-slate-400">Loading projects...</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-12 text-center shadow-lg">
              <svg
                className="mx-auto h-12 w-12 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>

              <h3 className="mt-3 text-sm font-medium text-white">No projects</h3>
              <p className="mt-1 text-sm text-slate-400">
                Get started by creating a new project.
              </p>

              {canCreateProject && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 sm:w-auto"
                  >
                    Create Project
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-lg border border-slate-700 bg-slate-800 shadow-lg transition-all hover:border-slate-600 hover:shadow-xl"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <h3 className="min-w-0 break-words text-lg font-medium text-white">
                        {project.name}
                      </h3>

                      <span className="shrink-0 text-xs text-slate-400">
                        {project.envFiles?.length || 0} env file
                        {project.envFiles?.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {project.description && (
                      <p className="mt-2 break-words text-sm text-slate-400 line-clamp-3">
                        {project.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center text-xs text-slate-500">
                      <span>
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 shadow-xl">
            <form onSubmit={handleCreateProject}>
              <div className="border-b border-slate-700 px-4 py-4 sm:px-6">
                <h3 className="text-lg font-medium text-white">Create New Project</h3>
              </div>

              <div className="space-y-4 px-4 py-4 sm:px-6">
                {createError && (
                  <div className="rounded border border-red-700/50 bg-red-900/30 px-3 py-2 text-sm text-red-200">
                    {createError}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="projectName"
                    className="block text-sm font-medium text-slate-200"
                  >
                    Project Name
                  </label>
                  <input
                    type="text"
                    id="projectName"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white shadow-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="My Project"
                  />
                </div>

                <div>
                  <label
                    htmlFor="projectDescription"
                    className="block text-sm font-medium text-slate-200"
                  >
                    Description (optional)
                  </label>
                  <textarea
                    id="projectDescription"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    rows={4}
                    className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white shadow-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="Project description..."
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-700 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError('');
                    setNewProjectName('');
                    setNewProjectDescription('');
                  }}
                  className="w-full rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-600 sm:w-auto"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCreating || !newProjectName.trim()}
                  className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
                >
                  {isCreating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}