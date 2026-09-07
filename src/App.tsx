import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Spinner } from './components/common/Spinner';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute';
import { useAuthStore } from './stores/authStore';

const HomePage = lazy(() => import('./pages/HomePage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const ReaderPage = lazy(() => import('./pages/ReaderPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));

function PageFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-[#08080a]">
      <Spinner size="lg" />
    </div>
  );
}

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <AppLayout>
        <ErrorBoundary fallbackTitle="Application Error" fallbackMessage="An unexpected error occurred in the application.">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public Authentication Routes */}
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <LoginPage />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <SignupPage />
                  </PublicOnlyRoute>
                }
              />

              {/* Protected Application Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/library"
                element={
                  <ProtectedRoute>
                    <LibraryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/comics/:comicId"
                element={
                  <ProtectedRoute>
                    <ReaderPage />
                  </ProtectedRoute>
                }
              />

              {/* 404 Fallback */}
              <Route
                path="*"
                element={
                  <div className="h-screen flex flex-col items-center justify-center bg-[#08080a] gap-4">
                    <h1 className="text-4xl font-comic text-[#f3f3f6]">404</h1>
                    <p className="text-text-secondary font-mono text-xs">PAGE NOT FOUND</p>
                    <a href="/" className="text-xs font-mono uppercase text-[#ffd23f] hover:underline transition-colors">
                      ← Return Home
                    </a>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AppLayout>
    </BrowserRouter>
  );
}
