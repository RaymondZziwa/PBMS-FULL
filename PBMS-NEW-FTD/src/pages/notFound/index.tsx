import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCompass, FiHome } from "react-icons/fi";
import Button from "../../ui/Button";

/** Shown for any address that isn't a page in the system. */
const NotFound = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const canGoBack = typeof window !== "undefined" && window.history.length > 1;

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-12 font-inter">
      <div className="w-full max-w-lg text-center">
        <div className="relative mx-auto mb-8 h-36 w-36">
          <div aria-hidden="true" className="absolute inset-0 rounded-full bg-subtle" />
          <div aria-hidden="true" className="absolute inset-4 rounded-full border-2 border-dashed border-brand/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <FiCompass aria-hidden="true" className="h-14 w-14 text-brand-text" />
          </div>
        </div>
        <p className="m-0 font-display text-sm font-semibold uppercase tracking-[0.2em] text-brand-text">Error 404</p>
        <h1 className="m-0 mt-2 font-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
          This page doesn't exist
        </h1>
        <p className="m-0 mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-brand-muted">
          The link may be old, or the address was typed wrong. Nothing has been lost. Head back and pick a page from the menu.
        </p>
        <p className="m-0 mt-4 inline-block max-w-full truncate rounded-md border border-line bg-surface-2 px-3 py-1.5 font-mono text-xs text-ink-soft">
          {pathname}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          {canGoBack && (
            <Button variant="secondary" icon={<FiArrowLeft aria-hidden="true" />} onClick={() => navigate(-1)}>
              Go back
            </Button>
          )}
          <Button icon={<FiHome aria-hidden="true" />} onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
