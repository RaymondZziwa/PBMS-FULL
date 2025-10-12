// hooks/useAuth.ts or utils/auth.ts
import { useDispatch } from 'react-redux';
import { apiRequest } from '../libs/apiConfig';
import { logout } from '../redux/slices/auth/userAuthSlice';

export const useAuth = () => {
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      // Call backend logout to clear cookies
      await apiRequest('/api/auth/logout', 'POST');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if backend call fails, clear frontend state
    } finally {
      // Clear Redux state
      dispatch(logout());
      
      // Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies (frontend fallback)
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      });
      
      // Navigate to login
      window.location.href = '/';
    }
  };

  return { handleLogout };
};