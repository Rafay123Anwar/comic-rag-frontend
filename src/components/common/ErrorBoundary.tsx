import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);

    // Global check for 401 Unauthorized errors
    const errorStr = (error?.message || '').toLowerCase();
    const status = (error as unknown as { response?: { status?: number }; status?: number })?.response?.status ||
      (error as unknown as { status?: number })?.status;

    const is401 =
      status === 401 ||
      errorStr.includes('401') ||
      errorStr.includes('unauthorized') ||
      errorStr.includes('session has expired');

    const isChunkError =
      errorStr.includes('dynamically imported module') ||
      errorStr.includes('module script') ||
      errorStr.includes('mime type') ||
      errorStr.includes('text/html');

    if (isChunkError) {
      const hasRetried = typeof window !== 'undefined' ? sessionStorage.getItem('chunk_reload_retry') : null;
      if (!hasRetried && typeof window !== 'undefined') {
        sessionStorage.setItem('chunk_reload_retry', 'true');
        window.location.reload();
        return;
      }
    }

    if (is401) {
      localStorage.removeItem('auth_token');
      try {
        useAuthStore.getState().logout();
      } catch {}

      if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('chunk_reload_retry');
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const errorStr = (this.state.error?.message || '').toLowerCase();
      const isChunkError =
        errorStr.includes('dynamically imported module') ||
        errorStr.includes('module script') ||
        errorStr.includes('mime type') ||
        errorStr.includes('text/html');

      const is401 =
        errorStr.includes('401') ||
        errorStr.includes('unauthorized') ||
        errorStr.includes('session has expired');

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center bg-base-surface border border-base-border rounded-2xl m-4">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-base font-semibold text-text-primary mb-1">
            {isChunkError
              ? 'New Update Available'
              : is401
              ? 'Session Expired'
              : (this.props.fallbackTitle || 'Rendering Error')}
          </h2>
          <p className="text-xs text-text-muted max-w-md mb-6 leading-relaxed">
            {isChunkError
              ? 'A new version of Comic RAG has been deployed. Please reload the page to load the updated application.'
              : is401
              ? 'Your session has expired or you are unauthenticated. Please log in again.'
              : (this.state.error?.message ||
                this.props.fallbackMessage ||
                'A rendering error occurred while displaying this content.')}
          </p>
          <div className="flex items-center gap-3">
            {isChunkError ? (
              <button
                onClick={this.handleReload}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Page
              </button>
            ) : (
              <>
                {!is401 && (
                  <button
                    onClick={this.handleReset}
                    className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Try again
                  </button>
                )}
                <a
                  href="/login"
                  className="px-4 py-2 bg-base-elevated hover:bg-base-border text-text-secondary hover:text-text-primary text-xs font-medium rounded-xl transition-colors border border-base-border cursor-pointer"
                >
                  Go to Login
                </a>
              </>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
