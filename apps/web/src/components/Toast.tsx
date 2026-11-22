import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) =>
    setItems((prev) => prev.filter((item) => item.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 rounded-lg border border-[#2A2A32] bg-[#17171B] px-3.5 py-2.5 text-sm shadow-xl"
          >
            {item.kind === "success" && (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
            {item.kind === "error" && (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            {item.kind === "info" && (
              <Info className="h-4 w-4 text-[#7C5CFF] shrink-0" />
            )}
            <span className="text-zinc-100 flex-1">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
