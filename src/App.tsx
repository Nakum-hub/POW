import { useEffect, type ReactNode } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { RevenueProvider } from './contexts/RevenueContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Skills from './views/Skills';
import Repositories from './views/Repositories';
import Search from './views/Search';
import Explainer from './views/Explainer';
import Settings from './views/Settings';
import Landing from './views/Landing';
import PublicProfile from './views/PublicProfile';
import Pipeline from './views/Pipeline';
import Billing from './views/Billing';

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950" />
        <p className="text-sm text-slate-600">Loading workspace...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function LandingOrDashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
}

function SearchRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (user) {
    return (
      <Layout>
        <Search />
      </Layout>
    );
  }

  return <Search />;
}

function ScrollRestoration() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
}

function EnvironmentBadge() {
  const { loading, mode, modeMessage } = useAuth();

  if (loading || mode !== 'demo' || import.meta.env.VITE_SHOW_ENVIRONMENT_BADGE !== 'true') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-xs rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium leading-5 text-amber-900 shadow-lg">
      {modeMessage || 'Sandbox workspace is active.'}
    </div>
  );
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <AppProvider>
            <RevenueProvider>
              <ToastProvider>
                <EnvironmentBadge />
                <ScrollRestoration />
                <Routes>
                  <Route path="/" element={<LandingOrDashboard />} />
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <Login />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/skills"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Skills />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/repos"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Repositories />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/search" element={<SearchRoute />} />
                  <Route
                    path="/pipeline"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Pipeline />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/billing"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Billing />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/explainer"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Explainer />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Settings />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/dev/:githubId" element={<PublicProfile />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ToastProvider>
            </RevenueProvider>
          </AppProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
