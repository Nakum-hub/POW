import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info as InfoIcon } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    const toast: Toast = { id, message, type };

    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 space-y-3 pointer-events-none">
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastComponent({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const bgColor = toast.type === 'success' ? 'bg-emerald-50 border-emerald-200' :
                   toast.type === 'error' ? 'bg-red-50 border-red-200' :
                   'bg-blue-50 border-blue-200';

  const textColor = toast.type === 'success' ? 'text-emerald-900' :
                    toast.type === 'error' ? 'text-red-900' :
                    'text-blue-900';

  const iconColor = toast.type === 'success' ? 'text-emerald-600' :
                    toast.type === 'error' ? 'text-red-600' :
                    'text-blue-600';

  const Icon = toast.type === 'success' ? CheckCircle :
               toast.type === 'error' ? AlertCircle :
               InfoIcon;

  return (
    <div
      className={`pointer-events-auto ${bgColor} border rounded-lg shadow-md p-4 flex items-start gap-3 animate-in fade-in slide-in-from-right-4 duration-200`}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
      <span className={`text-sm font-medium ${textColor} flex-1`}>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className={`flex-shrink-0 ${textColor} hover:opacity-70 transition-opacity`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
