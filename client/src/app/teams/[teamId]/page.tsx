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

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteError, setInviteError] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Role change state
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);

  // Prevent double-fetch
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
      // Try to load invitations (admins only)
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
      router.push('/login');
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-slate-400">Loading...</div>
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
      <nav className="bg-slate-800/95 border-b border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-white">
                EnvMate
              </Link>
              <span className="ml-4 text-slate-500">/</span>
              <Link href="/teams" className="ml-4 text-slate-300 hover:text-white">
                Teams
              </Link>
              <span className="ml-4 text-slate-500">/</span>
              <span className="ml-4 text-white">{team.name}</span>
            </div>
            {isAdmin && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-3 py-2 text-sm text-slate-300 hover:text-white"
                >
                  Settings
                </button>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-3 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Invite
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded">
              {error}
              <button onClick={() => setError('')} className="ml-2 text-red-400">
                ×
              </button>
            </div>
          )}

          {/* Team Header */}
          <div className="bg-slate-800 rounded-lg shadow p-6 mb-6 border border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{team.name}</h1>
                {team.description && (
                  <p className="mt-2 text-slate-300">{team.description}</p>
                )}
                <div className="mt-4 flex items-center space-x-4 text-sm text-slate-400">
                  <span className="flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </span>
                  <span>Your role: {team.user_role}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Link
                  href={`/teams/${teamId}/projects`}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  View Projects
                </Link>
                {!isOwner && (
                  <button
                    onClick={handleLeaveTeam}
                    className="px-3 py-2 text-sm text-red-400 hover:text-red-300"
                  >
                    Leave Team
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-3 py-2 text-sm text-red-400 hover:text-red-300"
                  >
                    Delete Team
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-slate-800 rounded-lg shadow border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-medium text-white">Members</h2>
            </div>
            <ul className="divide-y divide-slate-700">
              {members.map((member) => (
                <li key={member.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <span className="text-indigo-400 font-medium">
                        {member.user?.name.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-white">
                        {member.user?.name || 'Unknown'}
                        {member.user_id === user?.id && (
                          <span className="ml-2 text-slate-400">(you)</span>
                        )}
                      </p>
                      <p className="text-sm text-slate-400">{member.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {isAdmin && member.user_id !== user?.id ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                        disabled={changingRoleFor === member.user_id}
                        className="text-sm border-slate-600 rounded-md bg-slate-700 text-white border"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
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
                    {isAdmin && member.user_id !== user?.id && member.user_id !== team.owner_id && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {isAdmin && (
            <div className="bg-slate-800 rounded-lg shadow mt-6 border border-slate-700">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-lg font-medium text-white">Pending Invitations</h2>
              </div>
              <ul className="divide-y divide-slate-700">
                {invitations.length === 0 && (
                  <li className="px-6 py-4 text-sm text-slate-400">No pending invitations</li>
                )}
                {invitations.map((inv) => (
                  <li key={inv.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{inv.email}</p>
                      <p className="text-sm text-slate-400">Role: {inv.role} · Expires: {new Date(inv.expiresAt || inv.expires_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button onClick={() => handleResendInvitation(inv.id)} className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Resend</button>
                      <button onClick={() => handleRevokeInvitation(inv.id)} className="px-3 py-1 text-sm text-red-400 hover:text-red-300">Revoke</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Edit Team Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowEditModal(false)}
            />
            <div className="relative bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-700">
              <h2 className="text-lg font-medium text-white mb-4">
                Team Settings
              </h2>
              <form onSubmit={handleUpdateTeam}>
                {editError && (
                  <div className="mb-4 bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded">
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
                    className="mt-1 block w-full rounded-md border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 bg-slate-700 text-white"
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
                    className="mt-1 block w-full rounded-md border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 bg-slate-700 text-white"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowInviteModal(false)}
            />
            <div className="relative bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-700">
              <h2 className="text-lg font-medium text-white mb-4">Invite Member</h2>
              <form onSubmit={handleInviteSubmit}>
                {inviteError && (
                  <div className="mb-4 bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded">
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
                    className="mt-1 block w-full rounded-md border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 bg-slate-700 text-white"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 bg-slate-700 text-white"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {isInviting ? 'Inviting...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowDeleteModal(false)}
            />
            <div className="relative bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-700">
              <h2 className="text-lg font-medium text-white mb-4">
                Delete Team
              </h2>
              <p className="text-slate-300 mb-4">
                Are you sure you want to delete &quot;{team.name}&quot;? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTeam}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
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
