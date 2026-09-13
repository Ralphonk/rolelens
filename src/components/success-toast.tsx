import { Check, X } from "lucide-react";
import { useEffect } from "react";

export function SuccessToast({ message, onDismiss }: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  return <div className="success-toast" role="status" aria-live="polite">
    <span className="success-toast-icon"><Check size={18} /></span>
    <span>{message}</span>
    <button className="icon-button" aria-label="Dismiss notification" onClick={onDismiss}><X size={17} /></button>
  </div>;
}
