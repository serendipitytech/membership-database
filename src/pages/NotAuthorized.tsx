import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NotAuthorized = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold mb-4">Not Authorized</h1>
      <p className="text-lg text-gray-600 mb-2">You do not have permission to view this page.</p>
      <p className="text-sm text-gray-400">Redirecting to the home page in 5 seconds...</p>
    </div>
  );
};

export default NotAuthorized; 