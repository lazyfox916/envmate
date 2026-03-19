'use client';

import { useState } from 'react';
import { api, HealthData, ApiResponse } from '@/lib/api';

export default function HealthTestPage() {
  const [response, setResponse] = useState<ApiResponse<HealthData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await api.healthCheck();
      setResponse(result);
      if (!result.success) {
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
          EnvMate - Health Check Test
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          Test the connection between the Next.js client and Express server.
        </p>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Server Health Check
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Endpoint: <code className="bg-zinc-100 dark:bg-zinc-700 px-2 py-1 rounded">GET /api/v1/health</code>
          </p>

          <button
            onClick={checkHealth}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            {loading ? 'Checking...' : 'Check Health'}
          </button>
        </div>

        {response && (
          <div
            className={`rounded-lg p-6 ${
              response.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}
          >
            <h3
              className={`text-lg font-semibold mb-3 ${
                response.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              }`}
            >
              {response.success ? '✓ Connection Successful!' : '✗ Connection Failed'}
            </h3>

            {response.success && response.data && (
              <div className="space-y-2">
                <p className="text-green-700 dark:text-green-300">
                  <span className="font-medium">Status:</span> {response.data.status}
                </p>
                <p className="text-green-700 dark:text-green-300">
                  <span className="font-medium">Timestamp:</span> {response.data.timestamp}
                </p>
                {response.data.version && (
                  <p className="text-green-700 dark:text-green-300">
                    <span className="font-medium">API Version:</span> {response.data.version}
                  </p>
                )}
              </div>
            )}

            {!response.success && (
              <p className="text-red-700 dark:text-red-300">
                <span className="font-medium">Error:</span> {response.error}
              </p>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200">
                View Raw Response
              </summary>
              <pre className="mt-2 bg-zinc-100 dark:bg-zinc-800 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {error && !response && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              ✗ Error
            </h3>
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">
              Make sure the server is running on{' '}
              <code className="bg-red-100 dark:bg-red-900 px-2 py-1 rounded">
                http://localhost:5000
              </code>
            </p>
          </div>
        )}

        <div className="mt-8 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Quick Start</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              Start the server: <code className="bg-white dark:bg-zinc-700 px-1 rounded">cd server && npm run dev</code>
            </li>
            <li>
              Start the client: <code className="bg-white dark:bg-zinc-700 px-1 rounded">cd client && npm run dev</code>
            </li>
            <li>Click the &quot;Check Health&quot; button above</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
