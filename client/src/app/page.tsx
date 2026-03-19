import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-zinc-900 dark:text-white mb-4">
            🔐 EnvMate
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Secure Environment Variable Management Platform for developers and teams
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Encrypted Storage
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              AES-256-GCM encryption for all your environment variables
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Team Collaboration
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              Share secrets securely with role-based access control
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="text-3xl mb-3">📁</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Project Organization
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              Organize variables by project and environment type
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-8 shadow-sm mb-8">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4">
            Development Status
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            This project is currently in development. Use the link below to test the API connection.
          </p>
          <Link
            href="/health-test"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            <span>🏥</span>
            Test API Connection
          </Link>
        </div>

        {/* Quick Start */}
        <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-xl p-8">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
            Quick Start
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <div>
                <p className="text-zinc-900 dark:text-white font-medium">Start the server</p>
                <code className="text-zinc-600 dark:text-zinc-400">cd server && npm run dev</code>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <div>
                <p className="text-zinc-900 dark:text-white font-medium">Start the client</p>
                <code className="text-zinc-600 dark:text-zinc-400">cd client && npm run dev</code>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <div>
                <p className="text-zinc-900 dark:text-white font-medium">Visit the app</p>
                <code className="text-zinc-600 dark:text-zinc-400">http://localhost:3000</code>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-zinc-500 dark:text-zinc-500">
          <p>EnvMate - Secure Environment Variable Management</p>
        </footer>
      </main>
    </div>
  );
}

