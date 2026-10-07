import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, X, Info } from "lucide-react";

const getIcon = (type) => {
  switch (type) {
    case "success":
      return <CheckCircle size={20} className="text-green-500" />;
    case "warning":
      return <AlertCircle size={20} className="text-red-500" />;
    case "info":
    default:
      return <Info size={20} className="text-blue-500" />;
  }
};

const getBgColor = (type) => {
  switch (type) {
    case "success":
      return "bg-green-50/90 border-green-200";
    case "warning":
      return "bg-red-50/90 border-red-200";
    case "info":
    default:
      return "bg-blue-50/90 border-blue-200";
  }
};

export default function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md ${getBgColor(
              toast.type
            )}`}
          >
            <div className="shrink-0 mt-0.5">{getIcon(toast.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-800">
                {toast.title}
              </p>
              {toast.message && (
                <p className="text-[11px] text-gray-600 mt-1 line-clamp-3">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="mt-0.5 shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
