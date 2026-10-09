import { Check, CircleAlert, X } from "lucide-react";
import { useEffect } from "react";

export function SuccessToast({
  message,
  onDismiss,
  variant = "success",
}: {
  message: string;
  onDismiss: () => void;
  variant?: "success" | "error";
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  return (
    <div
      className={`success-toast ${variant === "error" ? "toast-error" : ""}`}
      role={variant === "error" ? "alert" : "status"}
    >
      <span className="success-toast-icon">
        {variant === "error" ? <CircleAlert size={18} /> : <Check size={18} />}
      </span>
      <span>{message}</span>
      <button
        className="icon-button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <X size={17} />
      </button>
    </div>
  );
}
