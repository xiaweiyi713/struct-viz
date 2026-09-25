import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** 出错区域的名称，用于错误文案 */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * 捕获子树渲染异常，避免整个应用白屏。
 * 出错时显示可恢复的错误页（可返回首页或重试）。
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown): void {
    console.error("[ErrorBoundary]", this.props.label ?? "app", error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">🛠️</div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              页面遇到了问题
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
              {this.props.label ? `「${this.props.label}」` : ""}渲染时发生错误，应用已防止崩溃扩散。
            </p>
            {this.state.message && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-6 font-mono break-all">
                {this.state.message}
              </p>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                重试
              </button>
              <a
                href="/"
                className="px-5 py-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
              >
                返回首页
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
