import { Suspense } from "react";
import LoginPage from "./LoginPage";

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
      Loading...
    </div>
  );
}

export default function LoginPageClient() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPage />
    </Suspense>
  );
}