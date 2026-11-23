import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { Alert, Button, PasswordToggle, TextInput } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Member } from "../lib/types";

const rules = (p: string) => [
  { ok: p.length >= 8, text: "At least 8 characters" },
  { ok: /[A-Za-z]/.test(p) && /\d/.test(p), text: "Letters and numbers" },
];

/** First sign-in: replace the temporary password. Also used from Settings. */
export const PasswordForm = ({ first, onDone }: { first?: boolean; onDone: (m: Member) => void }) => {
  const { signedIn } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!current) er.currentPassword = first ? "Enter the temporary password we sent you" : "Enter your current password";
    if (rules(next).some((r) => !r.ok)) er.newPassword = "Use at least 8 characters with letters and numbers";
    if (next !== confirm) er.confirm = "The passwords don't match";
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const r = await api<{ token: string; member: Member }>("/api/club/me/password", { body: { currentPassword: current, newPassword: next } });
      signedIn(r.token, r.member);
      onDone(r.member);
    } catch (err) {
      if (err instanceof ApiError && err.field) setErrors({ [err.field]: err.message });
      else setErrors({ form: err instanceof Error ? err.message : "Couldn't change the password" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {errors.form && <Alert tone="error">{errors.form}</Alert>}
      <TextInput label={first ? "Temporary password" : "Current password"} required type={show ? "text" : "password"} autoComplete="current-password" value={current} onChange={setCurrent} error={errors.currentPassword} right={<PasswordToggle shown={show} onToggle={() => setShow(!show)} />} />
      <TextInput label="New password" required type={show ? "text" : "password"} autoComplete="new-password" value={next} onChange={setNext} error={errors.newPassword} />
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[13px]">
        {rules(next).map((r) => (
          <li key={r.text} className={r.ok ? "text-good" : "text-ink-muted"}>{r.ok ? "✓" : "•"} {r.text}</li>
        ))}
      </ul>
      <TextInput label="Type the new password again" required type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
      <Button type="submit" size="lg" block loading={busy}>{first ? "Save and continue" : "Change password"}</Button>
    </form>
  );
};

const ChangePassword = () => {
  const nav = useNavigate();
  const { member, signOut } = useAuth();
  return (
    <AuthLayout>
      <h1 className="m-0 font-display text-3xl font-semibold">Set your password</h1>
      <p className="m-0 mt-2 text-ink-muted">Welcome{member ? `, ${member.firstName}` : ""}! Replace the temporary password we sent you with one only you know.</p>
      <div className="mt-6">
        <PasswordForm first onDone={(m) => nav(m.status === "AWAITING_PAYMENT" ? "/pay" : "/", { replace: true })} />
      </div>
      <button type="button" onClick={signOut} className="mt-6 self-center text-sm text-ink-muted underline-offset-2 hover:underline">Sign out</button>
    </AuthLayout>
  );
};

export default ChangePassword;
