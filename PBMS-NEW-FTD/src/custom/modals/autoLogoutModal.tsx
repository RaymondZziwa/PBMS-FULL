import { FiClock, FiLogOut } from "react-icons/fi";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import { WARNING_MS } from "../../hooks/useAutoLogout";

type Props = {
  isOpen: boolean;
  timeLeft: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
};

/** "You're about to be signed out" with a live countdown. Esc keeps the session. */
export const AutoLogoutWarning = ({ isOpen, timeLeft, onStayLoggedIn, onLogout }: Props) => {
  const total = WARNING_MS / 1000;
  const pct = Math.max(0, Math.min(1, timeLeft / total));
  const r = 34;
  const c = 2 * Math.PI * r;
  const mm = Math.floor(timeLeft / 60);
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <Modal
      open={isOpen}
      onClose={onStayLoggedIn}
      size="sm"
      role="alertdialog"
      title="Still there?"
      description="For security, you'll be signed out soon because there's been no activity."
      footer={
        <>
          <Button variant="secondary" icon={<FiLogOut aria-hidden="true" />} onClick={onLogout}>
            Sign out now
          </Button>
          <Button onClick={onStayLoggedIn} data-autofocus>
            Stay signed in
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-5">
        <div className="relative h-20 w-20 flex-none" aria-hidden="true">
          <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" className="stroke-line" />
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
              className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${timeLeft <= 15 ? "stroke-[#D92D20]" : "stroke-brand"}`}
            />
          </svg>
          <FiClock className="absolute inset-0 m-auto h-6 w-6 text-brand-muted" />
        </div>
        <div>
          <p className="m-0 text-sm text-brand-muted">Signing you out in</p>
          <p role="timer" className="m-0 font-display text-4xl font-semibold tabular-nums text-brand-ink">
            {mm}:{ss}
          </p>
          <p className="m-0 mt-1 text-xs text-brand-muted">Anything you haven't saved will be lost.</p>
        </div>
      </div>
    </Modal>
  );
};

export default AutoLogoutWarning;
