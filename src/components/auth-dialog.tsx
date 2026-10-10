import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { X, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { PasswordRecovery } from "./password-recovery";
export function AuthDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: (u: User, registered: boolean) => void;
}) {
  const [recovery, setRecovery] = useState(false);
  const [pending, setPending] = useState<{ name: string; email: string; password: string } | null>(null);
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);
  function fillDigits(index: number, value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    const start = digits.length === 6 ? 0 : index;
    setCode(previous => {
      const next = [...previous];
      if (!digits) next[index] = "";
      else [...digits].forEach((digit, offset) => { if (start + offset < 6) next[start + offset] = digit; });
      return next;
    });
    if (digits) codeInputs.current[Math.min(start + digits.length, 5)]?.focus();
  }
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [show, setShow] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={(value) => { if (!value) { setRecovery(false); setPending(null); setCode(Array(6).fill("")); } onOpenChange(value); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-card auth-modal-card">
          <Dialog.Close className="icon-button modal-close" aria-label="Close">
            <X size={20} />
          </Dialog.Close>
          <div className="auth-modal-scroll">
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          {recovery ? <PasswordRecovery onBack={() => { setRecovery(false); setRegister(false); setError(""); }} /> : pending ? <div className="auth-screen">
            <Dialog.Title>Check your inbox</Dialog.Title>
            <Dialog.Description>Enter the six-digit code sent to {pending.email}. It expires in 10 minutes.</Dialog.Description>
            <form onSubmit={async event => {
              event.preventDefault(); setBusy(true); setError("");
              try {
                const user = await api<User>("/auth/registration/verify", { method: "POST", body: JSON.stringify({ email: pending.email, code: code.join("") }) });
                setPending(null); setCode(Array(6).fill("")); onSuccess(user, true); onOpenChange(false);
              } catch (e) { setError((e as Error).message); }
              finally { setBusy(false); }
            }}>
              <div className="otp-boxes" role="group" aria-label="Six-digit verification code">{code.map((digit, index) => <input key={index} ref={node => { codeInputs.current[index] = node; }} autoFocus={index === 0} aria-label={`Digit ${index + 1}`} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} pattern="[0-9]" required value={digit} disabled={busy} onChange={e => fillDigits(index, e.target.value)} onPaste={e => { e.preventDefault(); fillDigits(index, e.clipboardData.getData("text")); }} onFocus={e => e.target.select()} onKeyDown={e => {
                if (e.key === "Backspace" && !digit && index > 0) codeInputs.current[index - 1]?.focus();
                if (e.key === "ArrowLeft" && index > 0) codeInputs.current[index - 1]?.focus();
                if (e.key === "ArrowRight" && index < 5) codeInputs.current[index + 1]?.focus();
              }} />)}</div>
              {error && <p className="error" role="alert">{error}</p>}
              <Button disabled={busy || code.some(digit => !digit)}>{busy ? <LoaderCircle className="spin" size={18} /> : "Sign up"}</Button>
              <button type="button" className="text-button" disabled={busy || remaining > 0} onClick={async () => {
                setBusy(true); setError("");
                try { await api("/auth/registration/request", { method: "POST", body: JSON.stringify(pending) }); setCode(Array(6).fill("")); setRetryAt(Date.now() + 60_000); setRemaining(60); }
                catch (e) { setError((e as Error).message); }
                finally { setBusy(false); }
              }}>{remaining ? `Resend code in ${remaining}s` : "Resend code"}</button>
              <button type="button" className="text-button" disabled={busy} onClick={() => { setPending(null); setCode(Array(6).fill("")); setError(""); }}>Change signup details</button>
            </form>
          </div> : <div className="auth-screen" key={register ? "register" : "login"}>
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
                if (register) {
                  const details = { name: String(data.name), email: String(data.email), password: String(data.password) };
                  await api("/auth/registration/request", { method: "POST", body: JSON.stringify(details) });
                  setPending(details); setRetryAt(Date.now() + 60_000); setRemaining(60);
                } else {
                  const user = await api<User>("/auth/login", { method: "POST", body: JSON.stringify(data) });
                  onSuccess(user, false); onOpenChange(false);
                }
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
            {!register && <button type="button" className="text-button" disabled={busy} onClick={() => setRecovery(true)}>Forgot password?</button>}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : register ? (
                "Sign up"
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
          </div>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
