import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-950/40 border border-red-800 rounded-xl text-red-200 m-4 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
            <span>[Error] Fallo en la interfaz: {this.props.fallbackTitle || 'Componente'}</span>
          </div>
          <p className="text-red-300">{this.state.error?.message}</p>
          <pre className="p-3 bg-black/60 rounded text-[10px] text-zinc-400 overflow-auto max-h-48">
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs font-semibold"
          >
            Reintentar renderizado
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
