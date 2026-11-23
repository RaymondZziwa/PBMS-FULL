import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { apiRequest } from "../libs/apiConfig";
import type { RootState } from "../redux/store";
import { logout } from "../redux/slices/auth/userAuthSlice";

/** Sign out after this long without activity. */
export const IDLE_MS = 10 * 60 * 1000;
/** Warn this long before signing out. */
export const WARNING_MS = 60 * 1000;

const ACTIVITY_KEY = "pbms.lastActivity"; // shared by all open tabs
const KEEP_ON_SIGN_OUT = ["pbms.theme"]; // preferences that survive sign-out
const EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "wheel"] as const;

const readActivity = () => {
  const v = Number(localStorage.getItem(ACTIVITY_KEY));
  return Number.isFinite(v) && v > 0 ? v : Date.now();
};

/**
 * Signs the person out after IDLE_MS without activity in any open tab, with a
 * WARNING_MS countdown first. Uses the wall clock (not long timers), so it is
 * right even after the laptop sleeps or the tab sits in the background.
 * While the warning is up, only "Stay signed in" keeps the session; moving the
 * mouse towards the dialog no longer dismisses it.
 */
export const useAutoLogout = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.userAuth?.data?.id);
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(Math.round(WARNING_MS / 1000));
  const warningRef = useRef(false);
  const lastWrite = useRef(0);
  const titleRef = useRef<string | null>(null);

  const markActive = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastWrite.current < 5000) return; // don't write on every mouse move
    lastWrite.current = now;
    try {
      localStorage.setItem(ACTIVITY_KEY, String(now));
    } catch {
      /* ignore */
    }
  }, []);

  const restoreTitle = () => {
    if (titleRef.current !== null) {
      document.title = titleRef.current;
      titleRef.current = null;
    }
  };

  const handleLogout = useCallback(async () => {
    restoreTitle();
    try {
      await apiRequest("/api/auth/logout", "POST");
    } catch {
      /* signing out locally anyway */
    } finally {
      dispatch(logout());
      const keep = KEEP_ON_SIGN_OUT.map((k) => [k, localStorage.getItem(k)] as const);
      localStorage.clear();
      sessionStorage.clear();
      keep.forEach(([k, v]) => v !== null && localStorage.setItem(k, v));
      window.location.href = "/?reason=inactive";
    }
  }, [dispatch]);

  const handleStayLoggedIn = useCallback(() => {
    warningRef.current = false;
    setShowWarning(false);
    restoreTitle();
    markActive(true);
  }, [markActive]);

  useEffect(() => {
    if (!userId) return;
    markActive(true);

    const onActivity = () => {
      if (!warningRef.current) markActive();
    };
    EVENTS.forEach((e) => document.addEventListener(e, onActivity, { passive: true }));

    let loggingOut = false;
    const tick = () => {
      const remaining = IDLE_MS - (Date.now() - readActivity());
      if (remaining <= 0) {
        if (!loggingOut) {
          loggingOut = true;
          handleLogout();
        }
        return;
      }
      if (remaining <= WARNING_MS) {
        const secs = Math.ceil(remaining / 1000);
        setTimeLeft(secs);
        if (!warningRef.current) {
          warningRef.current = true;
          setShowWarning(true);
        }
        // Show the countdown in the tab title too, in case they're in another tab.
        if (titleRef.current === null) titleRef.current = document.title;
        document.title = `Signing out in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")} · PBMS`;
      } else if (warningRef.current) {
        // Activity in another tab, or "Stay signed in" there.
        warningRef.current = false;
        setShowWarning(false);
        restoreTitle();
      }
    };
    const interval = window.setInterval(tick, 1000);
    const onStorage = (e: StorageEvent) => e.key === ACTIVITY_KEY && tick();
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", tick);
      EVENTS.forEach((e) => document.removeEventListener(e, onActivity));
      restoreTitle();
    };
  }, [userId, markActive, handleLogout]);

  return { showWarning, timeLeft, handleStayLoggedIn, handleLogout, resetTimer: handleStayLoggedIn };
};
