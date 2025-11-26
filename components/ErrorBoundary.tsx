
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 max-w-md w-full text-center">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">出错了</h1>
            <p className="text-slate-500 mb-6 text-sm">
              应用程序遇到意外错误。请尝试刷新页面。
              <br />
              <span className="text-xs text-slate-400 mt-2 block font-mono bg-slate-100 p-2 rounded overflow-hidden text-ellipsis whitespace-nowrap">
                {this.state.error?.message || 'Unknown Error'}
              </span>
            </p>
            <div className="flex space-x-3 justify-center">
                <button
                onClick={() => window.location.reload()}
                className="flex items-center bg-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition shadow-sm"
                >
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新页面
                </button>
                <button
                onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                }}
                className="text-xs text-slate-400 hover:text-red-500 underline px-2"
                >
                清除缓存并重置
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
