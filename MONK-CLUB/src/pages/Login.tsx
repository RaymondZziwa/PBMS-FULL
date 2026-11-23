import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { Alert, Button, PasswordToggle, TextInput } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Member } from "../lib/types";

/** Sign in with the email or phone number on the application. */
const Login = () => {
  const { signedIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { notice?: string } };
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return setError("Enter your email or phone number and your password.");
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ token: string; member: Member }>("/api/club/auth/login", { body: { identifier: identifier.trim(), password }, auth: false });
      signedIn(r.token, r.member);
      nav("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="m-0 font-display text-3xl font-semibold">Welcome back</h1>
      <p className="m-0 mt-2 text-ink-muted">Sign in to your Amatugunda Monk Club account.</p>
      {loc.state?.notice && <div className="mt-6"><Alert tone="success">{loc.state.notice}</Alert></div>}
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <TextInput label="Email or phone number" required autoComplete="username" inputMode="email" value={identifier} onChange={setIdentifier} placeholder="you@example.com or 0772 123456" autoFocus />
        <TextInput
          label="Password"
          required
          type={show ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          right={<PasswordToggle shown={show} onToggle={() => setShow(!show)} />}
        />
        <Button type="submit" size="lg" block loading={busy}>Sign in</Button>
      </form>
      <p className="m-0 mt-3 text-sm text-ink-muted">Forgot your password? Call Prof Bioresearch and we'll send you a new temporary one.</p>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-5 text-center">
        <p className="m-0 font-semibold">New to Amatugunda Monk Club?</p>
        <p className="m-0 mt-1 text-sm text-ink-muted">Apply in a few minutes. We'll review your application and send your sign-in details.</p>
        <Link to="/register" className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl border border-brand text-[15px] font-semibold text-brand-text no-underline hover:bg-subtle">
          Apply to join
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Login;
