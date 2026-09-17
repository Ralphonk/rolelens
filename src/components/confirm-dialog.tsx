import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState, type ReactNode } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "./ui/button";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel = "Deleting…",
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const cancel = useRef<HTMLButtonElement>(null);

  async function confirmAction() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await onConfirm();
      setOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "That action could not be completed. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setError("");
        setOpen(next);
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className="modal-card confirm-dialog"
          role="alertdialog"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancel.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="card-icon confirm-dialog-icon">
            <Trash2 size={22} />
          </div>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="confirm-dialog-actions">
            <Button
              ref={cancel}
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="button-danger"
              disabled={pending}
              onClick={confirmAction}
              aria-busy={pending}
            >
              {pending ? (
                <>
                  <LoaderCircle className="spin" size={18} aria-hidden="true" />
                  {pendingLabel}
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
