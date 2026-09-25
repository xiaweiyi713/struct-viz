import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";

const HomePage = lazy(() => import("./pages/HomePage"));
const SubjectPage = lazy(() => import("./pages/SubjectPage"));
const SandboxPage = lazy(() => import("./pages/SandboxPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

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
      <ErrorBoundary label="应用">
        <Routes>
          <Route path="/" element={<Suspense fallback={<LoadingFallback />}><HomePage /></Suspense>} />
          <Route path="/subject/:subjectId" element={<Suspense fallback={<LoadingFallback />}><SubjectPage /></Suspense>} />
          <Route
            path="/sandbox"
            element={
              <ErrorBoundary label="沙盒">
                <Suspense fallback={<LoadingFallback />}>
                  <SandboxPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route path="*" element={<Suspense fallback={<LoadingFallback />}><NotFoundPage /></Suspense>} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
