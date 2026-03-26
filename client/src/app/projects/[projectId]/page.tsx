'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useProject, Project, EnvVariable } from '@/lib/project';
import { API_URL } from '@/lib/api';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    envData,
    getProject,
    setCurrentProject,
    fetchEnvVariables,
    updateProject,
    deleteProject,
    uploadEnvContent,
    updateEnvVariables,
    deleteEnvVariable,
    exportEnvFile,
    isLoading,
  } = useProject();

  const [project, setProject] = useState<Project | null>(null);
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

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadContent, setUploadContent] = useState('');
  const [uploadOverwrite, setUploadOverwrite] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Add variable modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Reveal values state
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [decryptedValues, setDecryptedValues] = useState<Map<string, string>>(new Map());
  const [decryptingKey, setDecryptingKey] = useState<string | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent double-fetch
  const loadedRef = useRef(false);

  const loadProject = useCallback(async () => {
    const result = await getProject(projectId);
    if (result.success && result.project) {
      setProject(result.project);
      setCurrentProject(result.project);
      setEditName(result.project.name);
      setEditDescription(result.project.description || '');
    }
  }, [projectId, getProject, setCurrentProject]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && projectId && !loadedRef.current) {
      loadedRef.current = true;
      loadProject();
      fetchEnvVariables(projectId);
    }
  }, [isAuthenticated, projectId, loadProject, fetchEnvVariables]);

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setIsSaving(true);

    const result = await updateProject(projectId, {
      name: editName,
      description: editDescription || undefined,
    });

    if (result.success) {
      setShowEditModal(false);
      loadProject();
    } else {
      setEditError(result.error || 'Failed to update project');
    }
    setIsSaving(false);
  };

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    const result = await deleteProject(projectId);
    if (result.success) {
      router.push(`/teams/${project?.team_id}/projects`);
    } else {
      setError(result.error || 'Failed to delete project');
    }
    setIsDeleting(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    setIsUploading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const formData = new FormData();

      // Add overwrite flag
      formData.append('overwrite', uploadOverwrite.toString());

      // Add file if one is selected, otherwise add content
      if (fileInputRef.current?.files?.[0]) {
        formData.append('file', fileInputRef.current.files[0]);
      } else {
        formData.append('content', uploadContent);
      }

      const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/env`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setShowUploadModal(false);
        setUploadContent('');
        setUploadOverwrite(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        fetchEnvVariables(projectId);
      } else {
        const data = await response.json();
        setUploadError(data.error || 'Failed to upload');
        console.error('Upload error:', response.status, data);
      }
    } catch (err) {
      setUploadError('Error uploading file');
      console.error('Upload exception:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadContent(content);
    };
    reader.onerror = () => {
      setUploadError('Failed to read file');
    };
    reader.readAsText(file);

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddVariable = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setIsAdding(true);

    const result = await updateEnvVariables(projectId, [{ key: newVarKey, value: newVarValue }]);
    if (result.success) {
      setShowAddModal(false);
      setNewVarKey('');
      setNewVarValue('');
      fetchEnvVariables(projectId);
    } else {
      setAddError(result.error || 'Failed to add variable');
    }
    setIsAdding(false);
  };

  const handleDeleteVariable = async (key: string) => {
    if (!confirm(`Delete variable "${key}"?`)) return;

    const result = await deleteEnvVariable(projectId, key);
    if (!result.success) {
      setError(result.error || 'Failed to delete variable');
    }
  };

  const handleExport = async () => {
    const result = await exportEnvFile(projectId);
    if (result.success && result.content) {
      const blob = new Blob([result.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '.env';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      setError(result.error || 'Failed to export');
    }
  };

  const copyEnvToClipboard = async () => {
    try {
      let content = '';

      if (envData && envData.variables && envData.variables.length > 0) {
        content = envData.variables.map((v) => `${v.key}=${v.value}`).join('\n');
      } else {
        const res = await exportEnvFile(projectId);
        if (res.success && res.content) content = res.content;
        else {
          setError(res.error || 'Failed to get env content');
          return;
        }
      }

      await navigator.clipboard.writeText(content);
      setError('Copied .env to clipboard');
      setTimeout(() => setError(''), 1800);
    } catch (err) {
      setError('Failed to copy .env');
      console.error(err);
    }
  };

  const fetchDecryptedValue = async (key: string) => {
    // Check if already decrypted
    if (decryptedValues.has(key)) {
      return;
    }

    setDecryptingKey(key);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      
      const response = await fetch(
        `${API_URL}/api/v1/projects/${projectId}/variables/${encodeURIComponent(key)}/decrypt`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDecryptedValues((prev) => new Map(prev).set(key, data.data.decryptedValue));
      } else {
        setError('Failed to decrypt variable');
      }
    } catch (err) {
      setError('Error decrypting variable');
      console.error(err);
    } finally {
      setDecryptingKey(null);
    }
  };

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (!next.has(key)) {
        // Revealing - fetch decrypted value
        fetchDecryptedValue(key);
        next.add(key);
      } else {
        // Hiding
        next.delete(key);
      }
      return next;
    });
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !project) {
    return null;
  }

  const variables = envData?.variables || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                EnvMate
              </Link>
              <span className="ml-4 text-gray-500">/</span>
              <Link href="/teams" className="ml-4 text-gray-700 hover:text-gray-900">
                Teams
              </Link>
              <span className="ml-4 text-gray-500">/</span>
              <Link
                href={`/teams/${project.team_id}/projects`}
                className="ml-4 text-gray-700 hover:text-gray-900"
              >
                {project.team?.name || 'Team'}
              </Link>
              <span className="ml-4 text-gray-500">/</span>
              <span className="ml-4 text-gray-900">{project.name}</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
              <button onClick={() => setError('')} className="ml-2 text-red-500">
                ×
              </button>
            </div>
          )}

          {/* Project Header */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                {project.description && (
                  <p className="mt-2 text-gray-600">{project.description}</p>
                )}
                <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                  <span>{variables.length} variable{variables.length !== 1 ? 's' : ''}</span>
                  <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Upload .env
                </button>
                {variables.length > 0 && (
                  <>
                    <button
                      onClick={handleExport}
                      className="px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Export
                    </button>
                    <button
                      onClick={copyEnvToClipboard}
                      className="px-3 py-2 ml-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Copy .env
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Environment Variables */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Environment Variables</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Add Variable
              </button>
            </div>

            {variables.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No variables</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Upload a .env file or add variables manually.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {variables.map((variable) => (
                  <div key={variable.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <code className="text-sm font-mono font-semibold text-gray-900">
                            {variable.key}
                          </code>
                          {variable.isSecret && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                              secret
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center space-x-2">
                          <code className="text-sm font-mono text-gray-600 truncate max-w-md">
                            {revealedKeys.has(variable.key)
                              ? decryptingKey === variable.key
                                ? 'Decrypting...'
                                : decryptedValues.get(variable.key) || variable.value
                              : '•'.repeat(Math.min(variable.value.length, 20))}
                          </code>
                        </div>
                        {variable.description && (
                          <p className="mt-1 text-xs text-gray-500">{variable.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleReveal(variable.key)}
                          className="p-1.5 text-gray-400 hover:text-gray-600"
                          title={revealedKeys.has(variable.key) ? 'Hide' : 'Reveal'}
                        >
                          {revealedKeys.has(variable.key) ? (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(decryptedValues.get(variable.key) || variable.value)}
                          className="p-1.5 text-gray-400 hover:text-gray-600"
                          title="Copy to clipboard"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteVariable(variable.key)}
                          className="p-1.5 text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <form onSubmit={handleUpdateProject}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Project Settings</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                {editError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                    {editError}
                  </div>
                )}
                <div>
                  <label htmlFor="editName" className="block text-sm font-medium text-gray-700">
                    Project Name
                  </label>
                  <input
                    type="text"
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="editDescription" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="editDescription"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete this project
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Delete Project</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete this project? This action cannot be undone and will delete all environment variables.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload .env Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <form onSubmit={handleUpload}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Upload .env Content</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                    {uploadError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose a .env file or paste content below
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".env,.env.*,text/plain"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
                <div>
                  <label htmlFor="envContent" className="block text-sm font-medium text-gray-700">
                    Or paste your .env file content
                  </label>
                  <textarea
                    id="envContent"
                    value={uploadContent}
                    onChange={(e) => setUploadContent(e.target.value)}
                    required
                    rows={12}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm font-mono text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="# Paste your .env content here&#10;API_KEY=your_api_key&#10;DATABASE_URL=postgres://..."
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="overwrite"
                    checked={uploadOverwrite}
                    onChange={(e) => setUploadOverwrite(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="overwrite" className="ml-2 text-sm text-gray-700">
                    Overwrite existing variables (replaces all existing variables)
                  </label>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadError('');
                    setUploadContent('');
                    setUploadOverwrite(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || (!uploadContent.trim() && !fileInputRef.current?.files?.[0])}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Variable Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <form onSubmit={handleAddVariable}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Add Variable</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                {addError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                    {addError}
                  </div>
                )}
                <div>
                  <label htmlFor="varKey" className="block text-sm font-medium text-gray-700">
                    Variable Name
                  </label>
                  <input
                    type="text"
                    id="varKey"
                    value={newVarKey}
                    onChange={(e) => setNewVarKey(e.target.value.toUpperCase())}
                    required
                    pattern="^[A-Za-z_][A-Za-z0-9_]*$"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm font-mono focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="MY_VARIABLE"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Only letters, numbers, and underscores. Must start with a letter or underscore.
                  </p>
                </div>
                <div>
                  <label htmlFor="varValue" className="block text-sm font-medium text-gray-700">
                    Value
                  </label>
                  <textarea
                    id="varValue"
                    value={newVarValue}
                    onChange={(e) => setNewVarValue(e.target.value)}
                    required
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm font-mono focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="your_value_here"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError('');
                    setNewVarKey('');
                    setNewVarValue('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !newVarKey.trim() || !newVarValue.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isAdding ? 'Adding...' : 'Add Variable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
