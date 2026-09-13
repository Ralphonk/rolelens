import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { X, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
export function AuthDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: (u: User, registered: boolean) => void;
}) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [show, setShow] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-card">
          <Dialog.Close className="icon-button modal-close" aria-label="Close">
            <X size={20} />
          </Dialog.Close>
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <Dialog.Title>
            {register ? "Create your workspace" : "Welcome back."}
          </Dialog.Title>
          <Dialog.Description>
            Save resumes and match reports in your private workspace.
          </Dialog.Description>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const data = Object.fromEntries(new FormData(e.currentTarget));
              try {
                const user = await api<User>(
                  "/auth/" + (register ? "register" : "login"),
                  { method: "POST", body: JSON.stringify(data) },
                );
                onSuccess(user, register);
                onOpenChange(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {register && (
              <label>
                Your name
                <input
                  name="name"
                  required
                  maxLength={80}
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              Email
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  required
                  minLength={10}
                  maxLength={72}
                  autoComplete={register ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </label>
            {register && (
              <small>At least 10 characters. Use a unique password.</small>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : register ? (
                "Create account"
              ) : (
                "Sign in"
              )}
            </Button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
