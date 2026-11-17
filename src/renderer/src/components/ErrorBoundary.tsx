import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Label shown in the failure panel, e.g. the view that failed. */
  fallbackTitle?: string;
  /**
   * When true the panel fills its container and cannot be dismissed — used for
   * the application root, where there is nothing left to fall back to.
   */
  isFatal?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Contains a render failure to the subtree that caused it.
 *
 * Mounted at the application root and around each top-level view: without a
 * boundary a single throw blanks the whole window, and a desktop app has no
 * address bar to recover from.
 */
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

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const title = this.props.fallbackTitle || 'Component';

    return (
      <div
        className={`flex flex-col items-center justify-center p-6 bg-canvas text-ink-primary ${
          this.props.isFatal ? 'h-screen w-screen' : 'h-full w-full'
        }`}
      >
        <div className="w-full max-w-2xl bg-surface-lowest border border-rose-500/40 rounded-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-hairline bg-surface-low flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              UI Error · {title}
            </span>
          </div>

          <div className="p-5 space-y-3">
            <p className="text-xs text-ink-secondary font-body">
              This panel was isolated to prevent the error from propagating. The rest of the application remains operational.
            </p>

            <pre className="p-3 bg-canvas-stone border border-hairline rounded-xs text-[10px] font-mono text-ink-secondary overflow-auto max-h-48 whitespace-pre-wrap">
              {this.state.error?.message}
              {this.state.error?.stack ? `\n\n${this.state.error.stack}` : ''}
            </pre>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-action hover:bg-action-hover active:bg-action-active text-white text-xs font-semibold uppercase tracking-wider transition-colors rounded-xs flex items-center gap-2"
              >
                Retry
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-surface-container hover:bg-surface-high text-ink-primary text-xs font-semibold uppercase tracking-wider transition-colors rounded-xs border border-hairline flex items-center gap-2"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
