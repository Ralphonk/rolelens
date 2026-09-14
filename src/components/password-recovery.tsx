import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "./ui/button";

export function PasswordRecovery({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<"email" | "otp" | "password" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const deadline = useRef(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const inFlight = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, []);
  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try { await action(); } catch (e) { setError((e as Error).message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function send() {
    await api("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) });
    deadline.current = Date.now() + 60_000; setRemaining(60); setCode(Array(6).fill("")); setStep("otp");
  }
  function fillDigits(index: number, value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    const start = digits.length === 6 ? 0 : index;
    setCode(previous => { const next = [...previous]; if (!digits) next[index] = ""; else [...digits].forEach((digit, offset) => { if (start + offset < 6) next[start + offset] = digit; }); return next; });
    if (digits) inputs.current[Math.min(start + digits.length, 5)]?.focus();
  }
  return <div className="auth-screen" key={step}>
    <Dialog.Title>{step === "email" ? "Forgot your password?" : step === "otp" ? "Check your inbox" : step === "password" ? "Choose a new password" : "You're all set"}</Dialog.Title>
    <Dialog.Description>{step === "email" ? "Enter your account email to request a verification code." : step === "otp" ? `If an account exists for ${email}, a 6-digit code has been sent. Check spam too. Codes expire in 10 minutes.` : step === "password" ? "Use a unique password with at least 10 characters." : "Password updated successfully. All previous sessions have been signed out."}</Dialog.Description>
    {step !== "done" && <form key={step} onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void run(async () => {
        if (step === "email") await send();
        if (step === "otp") {
          const result = await api<{ token: string }>("/auth/password-reset/verify", { method: "POST", body: JSON.stringify({ email, code: code.join("") }) });
          setToken(result.token); setCode(Array(6).fill("")); setStep("password");
        }
        if (step === "password") {
          if (data.get("password") !== data.get("confirm")) throw new Error("Passwords do not match.");
          await api("/auth/password-reset/complete", { method: "POST", body: JSON.stringify({ token, password: data.get("password") }) });
          setToken(""); setStep("done");
        }
      });
    }}>
      {step === "email" && <label>Email<input autoFocus type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy} onChange={e => setEmail(e.target.value)} /></label>}
      {step === "otp" && <div className="otp-boxes" role="group" aria-label="Six-digit verification code">{code.map((digit, index) => <input key={index} ref={node => { inputs.current[index] = node; }} autoFocus={index === 0} aria-label={`Digit ${index + 1}`} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} pattern="[0-9]" required value={digit} disabled={busy} onChange={e => fillDigits(index, e.target.value)} onPaste={e => { e.preventDefault(); fillDigits(index, e.clipboardData.getData("text")); }} onFocus={e => e.target.select()} onKeyDown={e => {
        if (e.key === "Backspace" && !digit && index > 0) inputs.current[index - 1]?.focus();
        if (e.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
        if (e.key === "ArrowRight" && index < 5) inputs.current[index + 1]?.focus();
      }} />)}</div>}
      {step === "password" && <>{["password", "confirm"].map((name, index) => <label key={name}>{index ? "Confirm password" : "New password"}<div className="password-field"><input autoFocus={!index} name={name} type={show ? "text" : "password"} autoComplete="new-password" minLength={10} maxLength={72} required disabled={busy} /><button className="icon-button" type="button" aria-label={show ? "Hide passwords" : "Show passwords"} onClick={() => setShow(!show)}>{show ? <Eye size={18} /> : <EyeOff size={18} />}</button></div></label>)}</>}
      {error && <p className="error" role="alert">{error}</p>}
      <Button disabled={busy || (step === "otp" && code.some(digit => !digit))} aria-busy={busy}>{busy ? <LoaderCircle size={18} className="spin" aria-label="Please wait" /> : step === "email" ? "Send verification code" : step === "otp" ? "Verify code" : "Update password"}</Button>
      {step === "otp" && <><button className="text-button" type="button" disabled={busy || remaining > 0} onClick={() => void run(send)}>{remaining ? `Resend code in ${remaining}s` : "Resend code"}</button><button className="text-button" type="button" disabled={busy} onClick={() => { setStep("email"); setError(""); }}>Use a different email</button></>}
      {step === "password" && <button className="text-button" type="button" disabled={busy} onClick={() => { setToken(""); setStep("email"); setError(""); }}>Start over</button>}
    </form>}
    <button className="text-button recovery-back" disabled={busy} onClick={onBack}>Back to sign in</button>
  </div>;
}
