import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

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
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center bg-base-surface border border-base-border rounded-2xl m-4">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-base font-semibold text-text-primary mb-1">
            {this.props.fallbackTitle || 'Rendering Error'}
          </h2>
          <p className="text-xs text-text-muted max-w-md mb-6 leading-relaxed">
            {this.state.error?.message ||
              this.props.fallbackMessage ||
              'A rendering error occurred while displaying this content.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-xl transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
            <a
              href="/library"
              className="px-4 py-2 bg-base-elevated hover:bg-base-border text-text-secondary hover:text-text-primary text-xs font-medium rounded-xl transition-colors border border-base-border"
            >
              Go to Library
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
