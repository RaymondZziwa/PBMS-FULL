// hooks/useAutoLogoutDebug.ts (for testing)
import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { apiRequest } from '../libs/apiConfig';
import type { RootState } from '../redux/store';
import { logout } from '../redux/slices/auth/userAuthSlice';

const WARNING_TIME = 30 * 1000; // 30 seconds warning (for testing)
const AUTO_LOGOUT_TIME = 10* 60 * 1000; // 1 minute total (for testing)

export const useAutoLogout = () => {
  const dispatch = useDispatch();
  const { data: user } = useSelector((state: RootState) => state.userAuth);
  const logoutTimerRef = useRef<number>();
  const warningTimerRef = useRef<number>();
  const countdownRef = useRef<number>();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(WARNING_TIME / 1000);

  const events = useRef([
    'mousedown', 'mousemove', 'keypress', 'keydown', 'scroll', 
    'touchstart', 'click', 'wheel', 'input', 'focus'
  ]);

  const handleLogout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', 'POST');
    } catch (error) {
      console.error('Auto logout error:', error);
    } finally {
      dispatch(logout());
      localStorage.clear();
      sessionStorage.clear();
      
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
      });
      
      window.location.href = '/?message=Session expired due to inactivity';
    }
  }, [dispatch]);

  const showWarningDialog = useCallback(() => {
    setShowWarning(true);
    
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
    }
    
    countdownRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(countdownRef.current);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [handleLogout]);

  const resetTimer = useCallback(() => {
    
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
    }
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
    }
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
    }

    setShowWarning(false);
    setTimeLeft(WARNING_TIME / 1000);

    warningTimerRef.current = window.setTimeout(() => {
      showWarningDialog();
    }, AUTO_LOGOUT_TIME - WARNING_TIME);

    logoutTimerRef.current = window.setTimeout(() => {
      handleLogout();
    }, AUTO_LOGOUT_TIME);

  }, [handleLogout, showWarningDialog]);

  const handleUserActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const handleStayLoggedIn = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!user?.id) return;

    events.current.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    resetTimer();

    return () => {
      if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current);
      if (warningTimerRef.current) window.clearTimeout(warningTimerRef.current);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      
      events.current.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, [user?.id, handleUserActivity, resetTimer]);

  return { 
    showWarning, 
    timeLeft, 
    handleStayLoggedIn,
    resetTimer 
  };
};