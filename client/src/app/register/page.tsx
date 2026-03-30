import { Suspense } from "react";
import RegisterPage from "./RegisterPage";

function RegisterFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
      Loading...
    </div>
  );
}

export default function RegisterPageClient() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterPage />
    </Suspense>
  );
}