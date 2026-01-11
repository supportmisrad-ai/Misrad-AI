
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { TriangleAlert, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  // Explicitly defining props for stricter TS environments to avoid "Property 'props' does not exist" error
  declare props: Readonly<Props>;

  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <TriangleAlert size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">אופס! משהו השתבש</h1>
            <p className="text-slate-500 mb-6 leading-relaxed">
              המערכת נתקלה בשגיאה בלתי צפויה. הצוות הטכני קיבל דיווח אוטומטי על התקלה.
            </p>
            
            <div className="bg-slate-100 p-3 rounded-lg text-left text-xs font-mono text-slate-500 mb-6 overflow-hidden">
                {this.state.error?.toString()}
            </div>

            <div className="flex gap-3 justify-center">
                <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                    <RefreshCw size={18} /> רענן עמוד
                </button>
                <button 
                    onClick={() => window.location.href = '/'}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-xl font-bold transition-all"
                >
                    <Home size={18} /> דף הבית
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
