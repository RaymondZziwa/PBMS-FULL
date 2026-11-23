import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FiArrowLeft, FiCheck } from "react-icons/fi";
import { baseURL } from "../../libs/apiConfig";
import { AuthEndpoints } from "../../endpoints/auth/authEndpoints";
import {
  AuthCard,
  AuthLayout,
  Banner,
  CardHeading,
  CheckList,
  MethodToggle,
  OtpInput,
  PasswordField,
  PrimaryButton,
  StepIndicator,
  TextField,
} from "./authUi";
import {
  isValidEmail,
  isValidPhone,
  maskIdentifier,
  passwordChecks,
  passwordStrength,
  readApiError,
  STRENGTH,
  toInternationalPhone,
  type LoginMethod,
} from "./authHelpers";

type Step = "request" | "verify" | "reset" | "done";
type BannerState = { tone: "error" | "warning" | "info"; content: ReactNode } | null;

const RESEND_SECONDS = 45;
const EMPTY_CODE = ["", "", "", "", "", ""];

const post = <T,>(endpoint: string, body: unknown) =>
  axios.post<T>(`${baseURL}${endpoint}`, body, {
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
    timeout: 15000,
  });

const backLinkClass =
  "inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-brand no-underline hover:text-brand-dark hover:underline";

const ForgotPassword = () => {
  const [step, setStep] = useState<Step>("request");
  const [method, setMethod] = useState<LoginMethod>("email");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState<string[]>(EMPTY_CODE);
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [invalid, setInvalid] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const stepRef = useRef<HTMLDivElement>(null);

  // Resend countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [secondsLeft]);

  // Move focus to the new step so screen readers announce it
  useEffect(() => {
    stepRef.current?.focus();
  }, [step]);

  const goTo = (next: Step) => {
    setBanner(null);
    setInvalid(false);
    setStep(next);
  };

  const sentTo = identifier ? maskIdentifier(method, identifier) : "";
  const apiIdentifier = method === "email" ? identifier.trim() : toInternationalPhone(identifier);

  const offlineBanner: BannerState = {
    tone: "error",
    content: "We can't reach the server. Check your connection and try again.",
  };

  /* ---------- Step 1: request a code ---------- */
  const sendCode = async (isResend = false) => {
    setBanner(null);
    setInvalid(false);
    const ok = method === "email" ? isValidEmail(identifier) : isValidPhone(identifier);
    if (!ok) {
      setInvalid(true);
      setBanner({
        tone: "error",
        content: method === "email" ? "Enter a valid email address." : "Enter a valid phone number, for example 772 123 456.",
      });
      return;
    }
    setLoading(true);
    try {
      await post(AuthEndpoints.FORGOT_PASSWORD, { method, identifier: apiIdentifier });
      setCode(EMPTY_CODE);
      setSecondsLeft(RESEND_SECONDS);
      if (isResend) {
        setBanner({ tone: "info", content: "If an account matches, a new code is on its way. Use the newest code you receive." });
      } else {
        goTo("verify");
      }
    } catch (error) {
      const { offline, message } = readApiError(error);
      setBanner(offline ? offlineBanner : { tone: "error", content: message ?? "We couldn't send a code. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const onRequest = (e: FormEvent) => {
    e.preventDefault();
    if (!loading) void sendCode(false);
  };

  /* ---------- Step 2: verify the code ---------- */
  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const joined = code.join("");
    if (!/^\d{6}$/.test(joined)) {
      setInvalid(true);
      setBanner({ tone: "error", content: "Enter all 6 digits of the code." });
      return;
    }
    setLoading(true);
    setBanner(null);
    setInvalid(false);
    try {
      const res = await post<{ data: { resetToken: string } }>(AuthEndpoints.VERIFY_RESET_CODE, {
        method,
        identifier: apiIdentifier,
        code: joined,
      });
      setResetToken(res.data.data.resetToken);
      setCode(EMPTY_CODE);
      goTo("reset");
    } catch (error) {
      const { offline, status, message } = readApiError(error);
      setCode(EMPTY_CODE);
      if (offline) setBanner(offlineBanner);
      else if (status === 429) {
        setSecondsLeft(0);
        setBanner({ tone: "warning", content: message ?? "Too many wrong codes. Request a new code." });
      } else {
        setInvalid(true);
        setBanner({ tone: "error", content: message ?? "That code is wrong or has expired." });
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Step 3: choose a new password ---------- */
  const checks = passwordChecks(password, confirm);
  const strength = passwordStrength(password);
  const allChecksPass = checks.every((c) => c.ok);

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!allChecksPass) {
      setInvalid(true);
      setBanner({ tone: "error", content: "Your new password doesn't meet all the rules below yet." });
      return;
    }
    setLoading(true);
    setBanner(null);
    setInvalid(false);
    try {
      await post(AuthEndpoints.RESET_PASSWORD, { resetToken, newPassword: password });
      setPassword("");
      setConfirm("");
      setResetToken("");
      goTo("done");
    } catch (error) {
      const { offline, message } = readApiError(error);
      setBanner(
        offline
          ? offlineBanner
          : {
              tone: "error",
              content: (
                <>
                  {message ?? "We couldn't update your password."}{" "}
                  <button type="button" onClick={startOver} className="font-semibold text-[#8A2A1C] underline">
                    Start again
                  </button>
                </>
              ),
            }
      );
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setCode(EMPTY_CODE);
    setResetToken("");
    setPassword("");
    setConfirm("");
    setSecondsLeft(0);
    goTo("request");
  };

  const asideCopy =
    step === "done"
      ? "All done. Your account is secured with your new password."
      : "Three quick steps: get a code, confirm it, choose a new password.";

  return (
    <AuthLayout title="Account recovery" subtitle={asideCopy}>
      <div ref={stepRef} tabIndex={-1} className="flex flex-col gap-5 outline-none">
        {step === "request" && (
          <>
            <Link to="/" className={backLinkClass}>
              <FiArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back to sign in
            </Link>
            <AuthCard>
              <form onSubmit={onRequest} noValidate className="flex flex-col gap-6">
                <StepIndicator current={1} />
                <CardHeading title="Reset your password">
                  Enter the email or phone number on your account and we'll send you a 6-digit code.
                </CardHeading>
                <MethodToggle
                  value={method}
                  onChange={(m) => {
                    setMethod(m);
                    setIdentifier("");
                    setBanner(null);
                    setInvalid(false);
                  }}
                  label="Send code to"
                  phoneLabel="Phone (SMS)"
                />
                {banner && <Banner tone={banner.tone}>{banner.content}</Banner>}
                {method === "email" ? (
                  <TextField
                    id="fr-email"
                    label="Work email"
                    icon="mail"
                    type="email"
                    autoComplete="email"
                    placeholder="name@profbioresearch.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    invalid={invalid}
                    autoFocus
                  />
                ) : (
                  <TextField
                    id="fr-phone"
                    label="Phone number"
                    prefix="+256"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="7XX XXX XXX"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    invalid={invalid}
                    autoFocus
                  />
                )}
                <PrimaryButton loading={loading} loadingText="Sending code…">
                  Send reset code
                </PrimaryButton>
                <Banner tone="info">
                  If an account matches, the code arrives within a minute. For your security we don't say whether an account exists.
                </Banner>
              </form>
            </AuthCard>
          </>
        )}

        {step === "verify" && (
          <>
            <button type="button" onClick={startOver} className={backLinkClass}>
              <FiArrowLeft aria-hidden="true" className="h-4 w-4" />
              Use a different email or phone
            </button>
            <AuthCard>
              <form onSubmit={onVerify} noValidate className="flex flex-col gap-6">
                <StepIndicator current={2} />
                <CardHeading title="Enter your code">
                  If an account matches, we sent a 6-digit code to <strong className="text-brand-ink">{sentTo}</strong>. It expires in 30 minutes.
                </CardHeading>
                {banner && <Banner tone={banner.tone}>{banner.content}</Banner>}
                <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                  <legend className="mb-2 p-0 text-sm font-semibold text-[#2B3240]">Verification code</legend>
                  <OtpInput value={code} onChange={setCode} disabled={loading} invalid={invalid} />
                </fieldset>
                <PrimaryButton loading={loading} loadingText="Checking…">
                  Verify code
                </PrimaryButton>
                <div aria-live="polite" className="flex min-h-11 items-center justify-center gap-1 text-sm text-brand-muted">
                  <span>Didn't get it?</span>
                  {secondsLeft > 0 ? (
                    <span>
                      Resend in{" "}
                      <strong className="tabular-nums text-brand-ink">
                        {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                      </strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void sendCode(true)}
                      disabled={loading}
                      className="min-h-11 px-1 font-semibold text-brand hover:text-brand-dark hover:underline disabled:opacity-60"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </form>
            </AuthCard>
            <p className="m-0 text-center text-[13px] text-brand-muted">After 5 wrong codes you'll need to request a new one.</p>
          </>
        )}

        {step === "reset" && (
          <AuthCard>
            <form onSubmit={onReset} noValidate className="flex flex-col gap-6">
              <StepIndicator current={3} />
              <CardHeading title="Choose a new password">Pick something you haven't used for PBMS before.</CardHeading>
              {banner && <Banner tone={banner.tone}>{banner.content}</Banner>}
              <div className="flex flex-col gap-2">
                <PasswordField
                  id="np-1"
                  label="New password"
                  showIcon={false}
                  autoComplete="new-password"
                  placeholder="At least 10 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="np-strength np-rules"
                  invalid={invalid && !allChecksPass}
                  autoFocus
                />
                <div aria-hidden="true" className="mt-1 grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 rounded-sm transition-colors"
                      style={{ background: i <= strength ? STRENGTH[strength].color : "#E2E6EF" }}
                    />
                  ))}
                </div>
                <span id="np-strength" className="text-[13px] text-brand-muted">
                  Strength: <strong className="text-brand-ink">{STRENGTH[strength].label}</strong>
                </span>
              </div>
              <PasswordField
                id="np-2"
                label="Confirm new password"
                showIcon={false}
                autoComplete="new-password"
                placeholder="Type it again"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                invalid={invalid && password !== confirm}
              />
              <div id="np-rules">
                <CheckList items={checks} />
              </div>
              <PrimaryButton loading={loading} loadingText="Saving…">
                Update password
              </PrimaryButton>
            </form>
          </AuthCard>
        )}

        {step === "done" && (
          <>
            <AuthCard className="items-center pt-12 text-center">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#E6F3EC] text-[#1F7A4D]">
                <FiCheck role="img" aria-label="Success" className="h-[34px] w-[34px]" strokeWidth={2.5} />
              </div>
              <CardHeading title="Password updated">You can now sign in with your new password.</CardHeading>
              <Link
                to="/"
                className="mt-2 flex h-[50px] w-full items-center justify-center rounded-[10px] bg-brand text-base font-semibold text-white no-underline hover:bg-brand-dark hover:text-white"
              >
                Back to sign in
              </Link>
            </AuthCard>
            <Banner tone="warning">Didn't change your password? Tell your system administrator straight away.</Banner>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
