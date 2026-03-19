'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { API_URL } from './api';

/**
 * Project type
 */
export interface Project {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    email: string;
    name: string;
  };
  team?: {
    id: string;
    name: string;
  };
  envFiles?: Array<{
    id: string;
    name: string;
    environment: string;
  }>;
}

/**
 * Environment variable type
 */
export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  description: string | null;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Env file with variables
 */
export interface EnvFileWithVariables {
  id: string | null;
  name: string;
  environment: string;
  description: string | null;
  variables: EnvVariable[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Project context state
 */
interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  envData: EnvFileWithVariables | null;
  isLoading: boolean;
}

/**
 * Project context methods
 */
interface ProjectContextType extends ProjectState {
  fetchProjects: (teamId: string) => Promise<void>;
  getProject: (projectId: string) => Promise<{ success: boolean; project?: Project; error?: string }>;
  setCurrentProject: (project: Project | null) => void;
  createProject: (teamId: string, name: string, description?: string) => Promise<{ success: boolean; error?: string; project?: Project }>;
  updateProject: (projectId: string, data: { name?: string; description?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteProject: (projectId: string) => Promise<{ success: boolean; error?: string }>;
  fetchEnvVariables: (projectId: string) => Promise<void>;
  uploadEnvContent: (projectId: string, content: string, overwrite?: boolean) => Promise<{ success: boolean; error?: string; variablesCount?: number }>;
  updateEnvVariables: (projectId: string, variables: Array<{ key: string; value: string; comment?: string }>) => Promise<{ success: boolean; error?: string }>;
  deleteEnvVariable: (projectId: string, key: string) => Promise<{ success: boolean; error?: string }>;
  exportEnvFile: (projectId: string) => Promise<{ success: boolean; content?: string; error?: string }>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

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
 * Project Provider component
 */
export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProjectState>({
    projects: [],
    currentProject: null,
    envData: null,
    isLoading: false,
  });

  /**
   * Fetch all projects for a team
   */
  const fetchProjects = useCallback(async (teamId: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams/${teamId}/projects`);
      const data = await response.json();

      if (data.success) {
        setState((prev) => ({
          ...prev,
          projects: data.data.projects || [],
          isLoading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  /**
   * Get a single project
   */
  const getProject = useCallback(async (projectId: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/projects/${projectId}`);
      const data = await response.json();

      if (data.success) {
        return { success: true, project: data.data };
      }
      return { success: false, error: data.error || 'Failed to get project' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Set the current project
   */
  const setCurrentProject = useCallback((project: Project | null) => {
    setState((prev) => ({ ...prev, currentProject: project }));
  }, []);

  /**
   * Create a new project
   */
  const createProject = useCallback(async (teamId: string, name: string, description?: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/teams/${teamId}/projects`, {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      const data = await response.json();

      if (data.success) {
        setState((prev) => ({
          ...prev,
          projects: [...prev.projects, data.data],
        }));
        return { success: true, project: data.data };
      }
      return { success: false, error: data.error || 'Failed to create project' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Update a project
   */
  const updateProject = useCallback(async (projectId: string, data: { name?: string; description?: string }) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        setState((prev) => ({
          ...prev,
          projects: prev.projects.map((p) => (p.id === projectId ? { ...p, ...data } : p)),
          currentProject: prev.currentProject?.id === projectId
            ? { ...prev.currentProject, ...data }
            : prev.currentProject,
        }));
        return { success: true };
      }
      return { success: false, error: result.error || 'Failed to update project' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Delete a project
   */
  const deleteProject = useCallback(async (projectId: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/projects/${projectId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setState((prev) => ({
          ...prev,
          projects: prev.projects.filter((p) => p.id !== projectId),
          currentProject: prev.currentProject?.id === projectId ? null : prev.currentProject,
        }));
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to delete project' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Fetch environment variables for a project
   */
  const fetchEnvVariables = useCallback(async (projectId: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await authFetch(`${API_URL}/api/v1/projects/${projectId}/env`);
      const data = await response.json();

      if (data.success) {
        setState((prev) => ({
          ...prev,
          envData: data.data,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error fetching env variables:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  /**
   * Upload .env file content
   */
  const uploadEnvContent = useCallback(async (projectId: string, content: string, overwrite: boolean = false) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/projects/${projectId}/env`, {
        method: 'POST',
        body: JSON.stringify({ content, overwrite }),
      });
      const data = await response.json();

      if (data.success) {
        return { success: true, variablesCount: data.data.variablesCount };
      }
      return { success: false, error: data.error || 'Failed to upload env file' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Update environment variables
   */
  const updateEnvVariables = useCallback(async (
    projectId: string,
    variables: Array<{ key: string; value: string; comment?: string }>
  ) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/projects/${projectId}/env`, {
        method: 'PATCH',
        body: JSON.stringify({ variables }),
      });
      const data = await response.json();

      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to update variables' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Delete an environment variable
   */
  const deleteEnvVariable = useCallback(async (projectId: string, key: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/projects/${projectId}/env/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setState((prev) => ({
          ...prev,
          envData: prev.envData
            ? {
                ...prev.envData,
                variables: prev.envData.variables.filter((v) => v.key !== key),
              }
            : null,
        }));
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to delete variable' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  /**
   * Export env file as string
   */
  const exportEnvFile = useCallback(async (projectId: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/v1/projects/${projectId}/env/export`);

      if (response.ok) {
        const content = await response.text();
        return { success: true, content };
      }
      const data = await response.json();
      return { success: false, error: data.error || 'Failed to export env file' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const value: ProjectContextType = {
    ...state,
    fetchProjects,
    getProject,
    setCurrentProject,
    createProject,
    updateProject,
    deleteProject,
    fetchEnvVariables,
    uploadEnvContent,
    updateEnvVariables,
    deleteEnvVariable,
    exportEnvFile,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

/**
 * Use project hook
 */
export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
