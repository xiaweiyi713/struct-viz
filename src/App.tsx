import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";

const SandboxPage = lazy(() => import("./pages/SandboxPage"));

function LoadingFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400">加载中...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/sandbox"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <SandboxPage />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
