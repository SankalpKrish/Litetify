import { Component } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="shell">
          <h1>Something went wrong</h1>
          <p className="status">
            {this.state.error?.message ?? 'Unknown error'}
          </p>
          <button
            className="btn btn-primary"
            onClick={this.handleReset}
            style={{ marginTop: 'var(--lt-space-lg)' }}
          >
            Try again
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
