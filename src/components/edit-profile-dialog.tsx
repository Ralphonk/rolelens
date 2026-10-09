"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Upload, X } from "lucide-react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { AccountAvatar } from "./account-avatar";
import { PhotoCropDialog } from "./photo-crop-dialog";
import { Button } from "./ui/button";

export function EditProfileDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSaved: (user: User) => void;
}) {
  const [name, setName] = useState(user.name);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(
    user.avatarDataUrl ?? null,
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(user.name);
      setAvatarDataUrl(user.avatarDataUrl ?? null);
      setError("");
    }
  }, [open, user.name, user.avatarDataUrl]);

  return (
    <>
      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          if (!busy && !file && !previewOpen) onOpenChange(next);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content className="modal-card account-dialog">
            <Dialog.Close
              className="icon-button modal-close"
              aria-label="Close"
            >
              <X size={20} />
            </Dialog.Close>
            <span className="eyebrow">ACCOUNT</span>
            <Dialog.Title>Edit profile</Dialog.Title>
            <Dialog.Description className="sr-only">
              Update your name and profile photo. Your email address stays the
              same.
            </Dialog.Description>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const saved = await api<User>("/auth/profile", {
                    method: "PATCH",
                    body: JSON.stringify({ name, avatarDataUrl }),
                  });
                  onSaved(saved);
                  onOpenChange(false);
                } catch (cause) {
                  setError((cause as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="profile-photo-row">
                {avatarDataUrl ? (
                  <button
                    type="button"
                    className="profile-photo-open"
                    aria-label="View profile photo"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <AccountAvatar
                      user={{ ...user, avatarDataUrl }}
                      className="profile-photo-preview"
                    />
                  </button>
                ) : (
                  <AccountAvatar
                    user={{ ...user, avatarDataUrl }}
                    className="profile-photo-preview"
                  />
                )}
                <div>
                  <input
                    ref={picker}
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const selected = event.target.files?.[0];
                      event.target.value = "";
                      if (!selected) return;
                      if (
                        !["image/jpeg", "image/png", "image/webp"].includes(
                          selected.type,
                        ) ||
                        selected.size > 2 * 1024 * 1024
                      ) {
                        setError(
                          "Choose a JPG, PNG, or WebP photo under 2 MB.",
                        );
                        return;
                      }
                      setError("");
                      setFile(selected);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => picker.current?.click()}
                  >
                    <Upload size={16} /> Choose photo
                  </Button>
                  <small>JPG, PNG or WebP · Max 2 MB</small>
                  {avatarDataUrl && (
                    <button
                      className="text-button remove-photo"
                      type="button"
                      onClick={() => {
                        setAvatarDataUrl(null);
                      }}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
              <label>
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                />
              </label>
              <label>
                Email
                <input
                  value={user.email}
                  disabled
                  aria-describedby="profile-email-note"
                />
              </label>
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
                  {busy ? <LoaderCircle size={18} className="spin" /> : null}{" "}
                  Save changes
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <PhotoCropDialog
        file={file}
        onClose={() => setFile(null)}
        onSave={(photo) => {
          setAvatarDataUrl(photo);
          setFile(null);
        }}
      />
      <Dialog.Root open={previewOpen} onOpenChange={setPreviewOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay photo-preview-overlay" />
          <Dialog.Content className="modal-card photo-preview-dialog">
            <Dialog.Close
              className="icon-button modal-close"
              aria-label="Close photo"
            >
              <X size={20} />
            </Dialog.Close>
            <Dialog.Title>Profile photo</Dialog.Title>
            <Dialog.Description className="sr-only">
              Larger view of your saved profile photo.
            </Dialog.Description>
            {avatarDataUrl && (
              <img src={avatarDataUrl} alt={`Profile photo of ${name}`} />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
