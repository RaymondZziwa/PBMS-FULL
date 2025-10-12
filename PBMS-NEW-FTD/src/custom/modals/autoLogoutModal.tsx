import React from 'react';

interface AutoLogoutWarningProps {
  isOpen: boolean;
  timeLeft: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export const AutoLogoutWarning: React.FC<AutoLogoutWarningProps> = ({
  isOpen,
  timeLeft,
  onStayLoggedIn,
  onLogout,
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Session Timeout Warning
        </h2>
        
        <p className="text-gray-600 mb-4">
          Your session will expire due to inactivity in{' '}
          <span className="font-semibold text-red-600">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </p>
        
        <p className="text-sm text-gray-500 mb-6">
          Do you want to stay logged in?
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onLogout}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Log Out
          </button>
          <button
            onClick={onStayLoggedIn}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
};