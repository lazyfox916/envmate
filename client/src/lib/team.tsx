'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { API_URL } from './api';

/**
 * Team type
 */
export interface Team {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  member_count?: number;
  user_role?: 'admin' | 'editor' | 'viewer';
}

/**
 * Team member type
 */
export interface TeamMember {
  id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'viewer';
  joined_at: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Team context state
 */
interface TeamState {
  teams: Team[];
  currentTeam: Team | null;
  isLoading: boolean;
}

/**
 * Team context methods
 */
interface TeamContextType extends TeamState {
  fetchTeams: () => Promise<void>;
  getTeamById: (teamId: string) => Promise<{ success: boolean; team?: Team; membership?: { role: string }; error?: string }>;
  setCurrentTeam: (team: Team | null) => void;
  createTeam: (name: string, description?: string) => Promise<{ success: boolean; error?: string; team?: Team }>;
  updateTeam: (teamId: string, data: { name?: string; description?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteTeam: (teamId: string) => Promise<{ success: boolean; error?: string }>;
  leaveTeam: (teamId: string) => Promise<{ success: boolean; error?: string }>;
  getTeamMembers: (teamId: string) => Promise<{ success: boolean; members?: TeamMember[]; error?: string }>;
  removeMember: (teamId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  updateMemberRole: (teamId: string, userId: string, role: string) => Promise<{ success: boolean; error?: string }>;
  inviteMember: (teamId: string, email: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  getTeamInvitations: (teamId: string) => Promise<{ success: boolean; invitations?: any[]; error?: string }>;
  revokeInvitation: (teamId: string, invitationId: string) => Promise<{ success: boolean; error?: string }>;
  resendInvitation: (teamId: string, invitationId: string) => Promise<{ success: boolean; error?: string }>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

/**
 * Get auth token from localStorage
 */
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
};

/**
 * Make authenticated request
 */
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include',
  });
};

/**
 * Team Provider component
 */
export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TeamState>({
    teams: [],
    currentTeam: null,
    isLoading: false,
  });

  // Use ref to prevent concurrent fetches
  const fetchingRef = useRef(false);

  /**
   * Fetch all teams for current user
   */
  const fetchTeams = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams`);
      const data = await response.json();

      if (response.ok && data.success) {
        setState((prev) => ({
          ...prev,
          teams: data.data.teams,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  /**
   * Get a single team by ID (directly from API, no state mutation)
   */
  const getTeamById = useCallback(async (teamId: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams/${teamId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true, team: data.data.team, membership: data.data.membership };
      }

      return { success: false, error: data.error || 'Failed to get team' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Set current team
   */
  const setCurrentTeam = useCallback((team: Team | null) => {
    setState((prev) => ({ ...prev, currentTeam: team }));
    if (team) {
      localStorage.setItem('currentTeamId', team.id);
    } else {
      localStorage.removeItem('currentTeamId');
    }
  }, []);

  /**
   * Create a new team
   */
  const createTeam = useCallback(async (name: string, description?: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams`, {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await fetchTeams();
        return { success: true, team: data.data.team };
      }

      return { success: false, error: data.error || 'Failed to create team' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [fetchTeams]);

  /**
   * Update team
   */
  const updateTeam = useCallback(async (teamId: string, updateData: { name?: string; description?: string }) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams/${teamId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update the team in local state without full refetch
        setState((prev) => ({
          ...prev,
          teams: prev.teams.map((t) =>
            t.id === teamId ? { ...t, ...updateData } : t
          ),
          currentTeam: prev.currentTeam?.id === teamId
            ? { ...prev.currentTeam, ...updateData }
            : prev.currentTeam,
        }));
        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to update team' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Delete team
   */
  const deleteTeam = useCallback(async (teamId: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams/${teamId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setState((prev) => ({
          ...prev,
          teams: prev.teams.filter((t) => t.id !== teamId),
          currentTeam: prev.currentTeam?.id === teamId ? null : prev.currentTeam,
        }));
        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to delete team' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Leave team
   */
  const leaveTeam = useCallback(async (teamId: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams/${teamId}/leave`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setState((prev) => ({
          ...prev,
          teams: prev.teams.filter((t) => t.id !== teamId),
          currentTeam: prev.currentTeam?.id === teamId ? null : prev.currentTeam,
        }));
        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to leave team' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Get team members
   */
  const getTeamMembers = useCallback(async (teamId: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams/${teamId}/members`);
      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true, members: data.data.members };
      }

      return { success: false, error: data.error || 'Failed to get members' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Invite a user to the team (admins only)
   */
  const inviteMember = useCallback(async (teamId: string, email: string, role: string = 'viewer') => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams/${teamId}/invitations`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to send invitation' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Get pending invitations for a team (admins only)
   */
  const getTeamInvitations = useCallback(async (teamId: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams/${teamId}/invitations`);
      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true, invitations: data.data };
      }

      return { success: false, error: data.error || 'Failed to get invitations' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Revoke a pending invitation
   */
  const revokeInvitation = useCallback(async (teamId: string, invitationId: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams/${teamId}/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to revoke invitation' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Resend invitation email
   */
  const resendInvitation = useCallback(async (teamId: string, invitationId: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams/${teamId}/invitations/${invitationId}/resend`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to resend invitation' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Remove member from team
   */
  const removeMember = useCallback(async (teamId: string, userId: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to remove member' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Update member role
   */
  const updateMemberRole = useCallback(async (teamId: string, userId: string, role: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams/${teamId}/members/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to update role' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  return (
    <TeamContext.Provider
      value={{
        ...state,
        fetchTeams,
        getTeamById,
        setCurrentTeam,
        createTeam,
        updateTeam,
        deleteTeam,
        leaveTeam,
        getTeamMembers,
        removeMember,
        updateMemberRole,
        inviteMember,
        getTeamInvitations,
        revokeInvitation,
        resendInvitation,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

/**
 * Hook to use team context
 */
export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
