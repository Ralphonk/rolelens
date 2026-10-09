"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { Eye, EyeOff, KeyRound, LoaderCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "./ui/button";

export function ChangePasswordDialog({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          setError("");
          onOpenChange(next);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-card account-dialog">
          <Dialog.Close className="icon-button modal-close" aria-label="Close">
            <X size={20} />
          </Dialog.Close>
          <span className="eyebrow">SECURITY</span>
          <Dialog.Title>Change password</Dialog.Title>
          <Dialog.Description className="sr-only">
            Enter your current password and choose a new one.
          </Dialog.Description>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const currentPassword = String(data.get("currentPassword") || "");
              const newPassword = String(data.get("newPassword") || "");
              const confirmation = String(data.get("confirmation") || "");
              if (newPassword !== confirmation) {
                setError("New passwords do not match.");
                return;
              }
              if (new TextEncoder().encode(newPassword).length > 72) {
                setError("Password must be no more than 72 bytes.");
                return;
              }
              setBusy(true);
              setError("");
              try {
                await api("/auth/change-password", {
                  method: "POST",
                  body: JSON.stringify({ currentPassword, newPassword }),
                });
                onOpenChange(false);
                onChanged();
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {(
              [
                ["currentPassword", "Current password", "current-password"],
                ["newPassword", "New password", "new-password"],
                ["confirmation", "Confirm new password", "new-password"],
              ] as const
            ).map(([name, label, autoComplete]) => (
              <label key={name}>
                {label}
                <div className="password-field">
                  <input
                    name={name}
                    type={visible[name] ? "text" : "password"}
                    autoComplete={autoComplete}
                    required
                    minLength={name === "currentPassword" ? undefined : 10}
                    maxLength={72}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`${visible[name] ? "Hide" : "Show"} ${label.toLowerCase()}`}
                    onClick={() =>
                      setVisible((current) => ({
                        ...current,
                        [name]: !current[name],
                      }))
                    }
                  >
                    {visible[name] ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                {name === "newPassword" && (
                  <small>Use at least 10 characters.</small>
                )}
              </label>
            ))}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="account-dialog-actions">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button disabled={busy}>
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) :
                  "Update password"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
