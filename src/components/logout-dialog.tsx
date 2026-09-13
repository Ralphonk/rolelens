import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { Button } from "./ui/button";

export function LogoutDialog({ disabled, onConfirm }: {
  disabled: boolean;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const cancel = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);

  async function confirmLogout() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      await onConfirm();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to log out. Please try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return <Dialog.Root open={open} onOpenChange={(next) => {
    if (inFlight.current) return;
    setError("");
    setOpen(next);
  }}>
    <Dialog.Trigger asChild>
      <button className="icon-button" aria-label="Sign out" disabled={disabled}>
        <LogOut size={18} />
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="modal-overlay" />
      <Dialog.Content className="modal-card logout-dialog" role="alertdialog"
        onOpenAutoFocus={(event) => { event.preventDefault(); cancel.current?.focus(); }}
        onEscapeKeyDown={(event) => { if (inFlight.current) event.preventDefault(); }}
        onInteractOutside={(event) => event.preventDefault()}>
        <div className="card-icon"><LogOut size={22} /></div>
        <Dialog.Title>Log out of RoleLens?</Dialog.Title>
        <Dialog.Description>
          Your saved resumes and reports will stay in your account. Unsaved work will be cleared.
        </Dialog.Description>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="logout-actions">
          <Button ref={cancel} variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={pending} onClick={confirmLogout} aria-busy={pending}>
            {pending ? <><LoaderCircle className="spin" size={18} aria-hidden="true" /> Logging out…</> : "Yes, log out"}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
