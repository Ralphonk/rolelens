"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, KeyRound, LogOut, Pencil } from "lucide-react";
import { LogoutDialog } from "./logout-dialog";
import { EditProfileDialog } from "./edit-profile-dialog";
import { ChangePasswordDialog } from "./change-password-dialog";
import { AccountAvatar } from "./account-avatar";
import type { User } from "@/lib/types";

export function AccountMenu({
  user,
  disabled,
  onSignOut,
  onProfileSaved,
  onPasswordChanged,
}: {
  user: User;
  disabled: boolean;
  onSignOut: () => Promise<void>;
  onProfileSaved: (user: User) => void;
  onPasswordChanged: () => void;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (menu.current && !menu.current.contains(event.target as Node))
        menu.current.open = false;
    }
    function closeEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector<HTMLElement>("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, []);

  function openDialog(dialog: "edit" | "password") {
    if (menu.current) menu.current.open = false;
    if (dialog === "edit") setEditOpen(true);
    else setPasswordOpen(true);
  }

  return (
    <>
      <details className="account-menu topbar-user" ref={menu}>
        <summary aria-label={`Account menu for ${user.name}`}>
          <span className="topbar-user-meta">
            <AccountAvatar user={user} />
            <span className="topbar-user-text">
              <b>{user.name}</b>
              <small>{user.email}</small>
            </span>
          </span>
          <ChevronDown
            className="account-menu-chevron"
            size={16}
            aria-hidden="true"
          />
        </summary>
        <div className="account-menu-panel">
          <div className="account-menu-identity">
            <b>{user.name}</b>
            <small>{user.email}</small>
          </div>
          <button
            className="account-menu-action"
            onClick={() => openDialog("edit")}
          >
            <Pencil size={17} aria-hidden="true" />
            <span>
              <b>Edit profile</b>
              <small>Name and profile photo</small>
            </span>
          </button>
          <button
            className="account-menu-action"
            onClick={() => openDialog("password")}
          >
            <KeyRound size={17} aria-hidden="true" />
            <span>
              <b>Change password</b>
              <small>Keep your account secure</small>
            </span>
          </button>
          <div className="account-menu-divider" />
          <LogoutDialog
            disabled={disabled}
            onConfirm={onSignOut}
            trigger={
              <button
                className="account-menu-action account-menu-signout"
                disabled={disabled}
              >
                <LogOut size={17} aria-hidden="true" /> Sign out
              </button>
            }
          />
        </div>
      </details>
      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
        onSaved={onProfileSaved}
      />
      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        onChanged={onPasswordChanged}
      />
    </>
  );
}
