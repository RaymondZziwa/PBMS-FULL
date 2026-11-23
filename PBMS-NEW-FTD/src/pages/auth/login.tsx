import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import axios from "axios";
import { FiArrowRight } from "react-icons/fi";
import { fetchDataStart, fetchDataSuccess, fetchDataFailure } from "../../redux/slices/auth/userAuthSlice";
import { baseURL } from "../../libs/apiConfig";
import { AuthEndpoints } from "../../endpoints/auth/authEndpoints";
import { AuthCard, AuthLayout, Banner, CardHeading, MethodToggle, PasswordField, PrimaryButton, TextField } from "./authUi";
import { isValidEmail, isValidPhone, readApiError, toInternationalPhone, type LoginMethod } from "./authHelpers";

type BannerState = { tone: "error" | "warning" | "info"; content: ReactNode } | null;

const LoginComponent = () => {
  const [method, setMethod] = useState<LoginMethod>("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Signed out for inactivity (see useAutoLogout): say so instead of a silent login screen.
  const [banner, setBanner] = useState<BannerState>(() =>
    new URLSearchParams(window.location.search).get("reason") === "inactive"
      ? { tone: "info", content: "You were signed out after 10 minutes without activity. Sign in again to carry on." }
      : null,
  );
  const [fieldError, setFieldError] = useState<"identifier" | "password" | null>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const switchMethod = (next: LoginMethod) => {
    setMethod(next);
    setIdentifier("");
    setBanner(null);
    setFieldError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setBanner(null);
    setFieldError(null);

    const idOk = method === "email" ? isValidEmail(identifier) : isValidPhone(identifier);
    if (!idOk) {
      setFieldError("identifier");
      setBanner({
        tone: "error",
        content: method === "email" ? "Enter a valid email address." : "Enter a valid phone number, for example 772 123 456.",
      });
      return;
    }
    if (!password) {
      setFieldError("password");
      setBanner({ tone: "error", content: "Enter your password." });
      return;
    }

    setIsLoading(true);
    dispatch(fetchDataStart());
    try {
      const response = await axios.post(
        `${baseURL}${AuthEndpoints.LOGIN}`,
        {
          email: method === "email" ? identifier.trim() : toInternationalPhone(identifier),
          password,
          rememberMe,
          loginMethod: method,
        },
        { headers: { "Content-Type": "application/json" }, withCredentials: true, timeout: 15000 }
      );
      dispatch(fetchDataSuccess(response.data.user));
      navigate("/dashboard");
    } catch (error) {
      const { status, message, offline } = readApiError(error);
      if (offline) {
        setBanner({ tone: "error", content: "We can't reach the server. Check your connection and try again." });
      } else if (status === 429) {
        setBanner({
          tone: "warning",
          content: (
            <>
              Too many attempts. Wait a few minutes before trying again, or{" "}
              <Link to="/forgot-password" className="font-semibold text-[#6A4100] underline">
                reset your password
              </Link>
              .
            </>
          ),
        });
      } else if (status === 403) {
        // Account disabled / inactive: the server message says which.
        setBanner({ tone: "warning", content: `${message ?? "Your account can't sign in right now."} Contact your system administrator.` });
      } else if (status === 401 || status === 404) {
        setBanner({ tone: "error", content: "Those details don't match our records. Check them and try again." });
      } else {
        setBanner({ tone: "error", content: "Something went wrong on our side. Please try again." });
      }
      dispatch(fetchDataFailure(message ?? "Login failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Prof Bioresearch Management System"
      subtitle="The shared workspace for every Prof Bioresearch team, department and branch."
    >
      <AuthCard>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <CardHeading title="Sign in">Use your work email or phone number.</CardHeading>

          <MethodToggle value={method} onChange={switchMethod} label="Sign in with" />

          {banner && <Banner tone={banner.tone}>{banner.content}</Banner>}

          <div className="flex flex-col gap-[18px]">
            {method === "email" ? (
              <TextField
                id="login-email"
                label="Work email"
                icon="mail"
                type="email"
                autoComplete="username"
                placeholder="name@profbioresearch.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                invalid={fieldError === "identifier"}
                autoFocus
              />
            ) : (
              <TextField
                id="login-phone"
                label="Phone number"
                prefix="+256"
                type="tel"
                inputMode="numeric"
                autoComplete="username"
                placeholder="7XX XXX XXX"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                invalid={fieldError === "identifier"}
                autoFocus
              />
            )}

            <PasswordField
              id="login-password"
              label="Password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={fieldError === "password"}
              labelAside={
                <Link to="/forgot-password" className="text-sm font-semibold text-brand no-underline hover:text-brand-dark hover:underline">
                  Forgot password?
                </Link>
              }
            />

            <label htmlFor="remember" className="flex min-h-6 cursor-pointer items-center gap-2.5 text-sm text-[#2B3240]">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="m-0 h-[18px] w-[18px] accent-brand"
              />
              Keep me signed in on this device
            </label>
          </div>

          <PrimaryButton loading={isLoading} loadingText="Signing in…">
            Sign in
            <FiArrowRight aria-hidden="true" className="h-[18px] w-[18px]" />
          </PrimaryButton>
        </form>
      </AuthCard>
      <p className="m-0 text-center text-sm text-brand-muted">Need an account? Ask your system administrator.</p>
    </AuthLayout>
  );
};

export default LoginComponent;
