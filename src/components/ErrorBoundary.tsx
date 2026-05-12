import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-8">
          <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-50">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="mb-2 text-xl font-semibold text-gray-900">Something went wrong</h1>
            <p className="mb-6 text-sm text-gray-600">
              {this.state.error?.message || 'An unexpected error interrupted the page.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
