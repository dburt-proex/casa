import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

type Props = {
  name: string;
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[${this.props.name}] view crashed`, error, info);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.name !== this.props.name && this.state.error) {
      this.setState({ error: null });
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="max-w-3xl rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">{this.props.name} could not render</h2>
        </div>
        <p className="mt-3 text-sm text-red-100/80">
          This view hit a client-side error. The rest of CASA is still available from the sidebar.
        </p>
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-red-500/20 bg-black/20 p-3 text-xs text-red-100/80">
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={this.reset}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600/30 px-4 py-2 text-sm font-medium text-red-50 hover:bg-red-600/40"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }
}
