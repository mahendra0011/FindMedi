import { Component } from 'react';
import { Button } from '@/components/ui/button';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // If it's a Vite chunk loading error after HMR/rebuild, auto-reload once
    if (error?.message && /Failed to fetch dynamically imported module/i.test(error.message)) {
      const hasReloaded = sessionStorage.getItem('vite_chunk_retry');
      if (!hasReloaded) {
        sessionStorage.setItem('vite_chunk_retry', 'true');
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    sessionStorage.removeItem('vite_chunk_retry');
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  handleGoHome = () => {
    sessionStorage.removeItem('vite_chunk_retry');
    window.location.href = '/';
  };

  handleReload = () => {
    sessionStorage.removeItem('vite_chunk_retry');
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      sessionStorage.clear();
    } catch { /* ignore */ }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || String(this.state.error || 'Unknown error');
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-lg w-full bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4 border border-destructive/20">
              <span className="text-2xl font-bold text-destructive">!</span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-4 text-sm">
              An unexpected error occurred in this view. You can reload or return to the home page.
            </p>

            <div className="p-3 bg-muted/60 rounded-xl text-left font-mono text-xs text-muted-foreground overflow-auto max-h-32 mb-6 border border-border/50 select-all">
              {errorMsg}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={this.handleReload} className="gap-2">
                Refresh Page
              </Button>
              <Button variant="outline" onClick={this.handleGoHome}>
                Go to Home
              </Button>
              <Button variant="ghost" size="sm" onClick={this.handleReset} className="text-xs text-muted-foreground">
                Try Again
              </Button>
            </div>

            <div className="mt-6 pt-4 border-t border-border/40">
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="text-xs text-muted-foreground/70 hover:text-destructive transition-colors underline"
              >
                Clear session & return to home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

