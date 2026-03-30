'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTeam, Team, TeamMember } from '@/lib/team';

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    getTeamById,
    updateTeam,
    deleteTeam,
    leaveTeam,
    getTeamMembers,
    removeMember,
    updateMemberRole,
    setCurrentTeam,
    inviteMember,
    getTeamInvitations,
    revokeInvitation,
    resendInvitation,
  } = useTeam();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteError, setInviteError] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);

  const loadedRef = useRef(false);

  const loadTeamData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [teamResult, membersResult] = await Promise.all([
        getTeamById(teamId),
        getTeamMembers(teamId),
      ]);

      if (teamResult.success && teamResult.team) {
        const teamData: Team = {
          ...teamResult.team,
          user_role: teamResult.membership?.role as Team['user_role'],
        };
        setTeam(teamData);
        setCurrentTeam(teamData);
        setEditName(teamData.name);
        setEditDescription(teamData.description || '');
      }

      if (membersResult.success && membersResult.members) {
        setMembers(membersResult.members);
      }

      const invResult = await getTeamInvitations(teamId);
      if (invResult.success && invResult.invitations) {
        setInvitations(invResult.invitations);
      } else {
        setInvitations([]);
      }
    } catch {
      setError('Failed to load team data');
    }
    setIsLoading(false);
  }, [teamId, getTeamById, getTeamMembers, setCurrentTeam, getTeamInvitations]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && teamId && !loadedRef.current) {
      loadedRef.current = true;
      loadTeamData();
    }
  }, [isAuthenticated, teamId, loadTeamData]);

  const refreshTeamData = async () => {
    const [teamResult, membersResult] = await Promise.all([
      getTeamById(teamId),
      getTeamMembers(teamId),
    ]);

    if (teamResult.success && teamResult.team) {
      const teamData: Team = {
        ...teamResult.team,
        user_role: teamResult.membership?.role as Team['user_role'],
      };
      setTeam(teamData);
      setCurrentTeam(teamData);
      setEditName(teamData.name);
      setEditDescription(teamData.description || '');
    }

    if (membersResult.success && membersResult.members) {
      setMembers(membersResult.members);
    }

    const invResult = await getTeamInvitations(teamId);
    if (invResult.success && invResult.invitations) {
      setInvitations(invResult.invitations);
    } else {
      setInvitations([]);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setIsSaving(true);

    const result = await updateTeam(teamId, {
      name: editName,
      description: editDescription || undefined,
    });

    if (result.success) {
      setShowEditModal(false);
      await refreshTeamData();
    } else {
      setEditError(result.error || 'Failed to update team');
    }
    setIsSaving(false);
  };

  const handleDeleteTeam = async () => {
    setIsDeleting(true);
    const result = await deleteTeam(teamId);
    if (result.success) {
      router.push('/teams');
    } else {
      setError(result.error || 'Failed to delete team');
    }
    setIsDeleting(false);
  };

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return;

    const result = await leaveTeam(teamId);
    if (result.success) {
      router.push('/teams');
    } else {
      setError(result.error || 'Failed to leave team');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    const result = await removeMember(teamId, userId);
    if (result.success) {
      await refreshTeamData();
    } else {
      setError(result.error || 'Failed to remove member');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRoleFor(userId);
    const result = await updateMemberRole(teamId, userId, newRole);
    if (result.success) {
      await refreshTeamData();
    } else {
      setError(result.error || 'Failed to change role');
    }
    setChangingRoleFor(null);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setIsInviting(true);

    const result = await inviteMember(teamId, inviteEmail, inviteRole);
    if (result.success) {
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('viewer');
      await refreshTeamData();
    } else {
      setInviteError(result.error || 'Failed to send invitation');
    }

    setIsInviting(false);
  };

  const handleRevokeInvitation = async (invId: string) => {
    if (!confirm('Revoke this invitation?')) return;
    const result = await revokeInvitation(teamId, invId);
    if (result.success) {
      await refreshTeamData();
    } else {
      setError(result.error || 'Failed to revoke invitation');
    }
  };

  const handleResendInvitation = async (invId: string) => {
    const result = await resendInvitation(teamId, invId);
    if (result.success) {
      await refreshTeamData();
    } else {
      setError(result.error || 'Failed to resend invitation');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
        <div className="text-center text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !team) {
    return null;
  }

  const isAdmin = team.user_role === 'admin';
  const isOwner = team.owner_id === user?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="border-b border-slate-700 bg-slate-800/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 flex-col gap-3 py-3 sm:min-h-[64px] sm:flex-row sm:items-center sm:justify-between sm:py-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-sm sm:text-base">
              <Link href="/dashboard" className="shrink-0 text-lg font-bold text-white sm:text-xl">
                EnvMate
              </Link>

              <span className="text-slate-500">/</span>

              <Link href="/teams" className="text-slate-300 transition hover:text-white">
                Teams
              </Link>

              <span className="text-slate-500">/</span>

              <span className="max-w-[180px] truncate font-medium text-white sm:max-w-[320px]">
                {team.name}
              </span>
            </div>

            {isAdmin && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="w-full rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white sm:w-auto"
                >
                  Settings
                </button>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="w-full rounded-md bg-green-600 px-3 py-2 text-sm text-white transition hover:bg-green-700 sm:w-auto"
                >
                  Invite
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded border border-red-700 bg-red-900/30 px-4 py-3 text-red-300">
            <span className="text-sm sm:text-base">{error}</span>
            <button onClick={() => setError('')} className="shrink-0 text-red-400">
              ×
            </button>
          </div>
        )}

        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-5 shadow sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold text-white sm:text-3xl">
                {team.name}
              </h1>

              {team.description && (
                <p className="mt-2 break-words text-slate-300">{team.description}</p>
              )}

              <div className="mt-4 flex flex-col gap-2 text-sm text-slate-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <span className="flex items-center">
                  <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
                <span className="capitalize">Your role: {team.user_role}</span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
              <Link
                href={`/teams/${teamId}/projects`}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm text-white transition hover:bg-indigo-700"
              >
                View Projects
              </Link>

              {!isOwner && (
                <button
                  onClick={handleLeaveTeam}
                  className="rounded-md px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                >
                  Leave Team
                </button>
              )}

              {isOwner && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="rounded-md px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                >
                  Delete Team
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800 shadow">
          <div className="border-b border-slate-700 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-medium text-white">Members</h2>
          </div>

          <ul className="divide-y divide-slate-700">
            {members.map((member) => (
              <li key={member.id} className="px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
                      <span className="font-medium text-indigo-400">
                        {member.user?.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-white">
                        {member.user?.name || 'Unknown'}
                        {member.user_id === user?.id && (
                          <span className="ml-2 text-slate-400">(you)</span>
                        )}
                      </p>
                      <p className="break-all text-sm text-slate-400">
                        {member.user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    {isAdmin && member.user_id !== user?.id ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                        disabled={changingRoleFor === member.user_id}
                        className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex w-fit items-center rounded-full px-2 py-1 text-xs ${
                          member.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-300'
                            : member.role === 'editor'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-600/30 text-slate-300'
                        }`}
                      >
                        {member.role}
                      </span>
                    )}

                    {isAdmin &&
                      member.user_id !== user?.id &&
                      member.user_id !== team.owner_id && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-left text-sm text-red-400 transition hover:text-red-300 sm:text-right"
                        >
                          Remove
                        </button>
                      )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {isAdmin && (
          <div className="mt-6 rounded-lg border border-slate-700 bg-slate-800 shadow">
            <div className="border-b border-slate-700 px-5 py-4 sm:px-6">
              <h2 className="text-lg font-medium text-white">Pending Invitations</h2>
            </div>

            <ul className="divide-y divide-slate-700">
              {invitations.length === 0 && (
                <li className="px-5 py-4 text-sm text-slate-400 sm:px-6">
                  No pending invitations
                </li>
              )}

              {invitations.map((inv) => (
                <li key={inv.id} className="px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="break-all text-sm font-medium text-white">{inv.email}</p>
                      <p className="mt-1 break-words text-sm text-slate-400">
                        Role: {inv.role} · Expires:{' '}
                        {new Date(inv.expiresAt || inv.expires_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        onClick={() => handleResendInvitation(inv.id)}
                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white transition hover:bg-indigo-700"
                      >
                        Resend
                      </button>
                      <button
                        onClick={() => handleRevokeInvitation(inv.id)}
                        className="rounded-md px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 p-3 sm:p-4">
          <div className="flex min-h-full items-end justify-center sm:items-center">
            <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 p-5 shadow-xl sm:p-6">
              <h2 className="mb-4 text-lg font-medium text-white">Team Settings</h2>

              <form onSubmit={handleUpdateTeam}>
                {editError && (
                  <div className="mb-4 rounded border border-red-700 bg-red-900/30 px-4 py-3 text-red-300">
                    {editError}
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-600 sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 p-3 sm:p-4">
          <div className="flex min-h-full items-end justify-center sm:items-center">
            <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 p-5 shadow-xl sm:p-6">
              <h2 className="mb-4 text-lg font-medium text-white">Invite Member</h2>

              <form onSubmit={handleInviteSubmit}>
                {inviteError && (
                  <div className="mb-4 rounded border border-red-700 bg-red-900/30 px-4 py-3 text-red-300">
                    {inviteError}
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-600 sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 sm:w-auto"
                  >
                    {isInviting ? 'Inviting...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 p-3 sm:p-4">
          <div className="flex min-h-full items-end justify-center sm:items-center">
            <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 p-5 shadow-xl sm:p-6">
              <h2 className="mb-4 text-lg font-medium text-white">Delete Team</h2>

              <p className="mb-4 text-slate-300">
                Are you sure you want to delete &quot;{team.name}&quot;? This action cannot be undone.
              </p>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-600 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTeam}
                  disabled={isDeleting}
                  className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50 sm:w-auto"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}