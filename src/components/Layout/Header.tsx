import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, UserCircle } from 'lucide-react';
import { getCurrentUser } from '../../lib/supabase';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { user } = await getCurrentUser();
      setIsLoggedIn(!!user);
    };
    
    checkAuth();
  }, [location.pathname]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-primary-700 font-bold text-xl">NW Democrats</span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <nav className="hidden md:flex space-x-8 items-center">
            <Link 
              to="/" 
              className={`text-gray-600 hover:text-primary-700 px-3 py-2 text-sm font-medium ${location.pathname === '/' ? 'text-primary-700 border-b-2 border-primary-500' : ''}`}
            >
              Home
            </Link>
            <Link 
              to="/register" 
              className={`text-gray-600 hover:text-primary-700 px-3 py-2 text-sm font-medium ${location.pathname === '/register' ? 'text-primary-700 border-b-2 border-primary-500' : ''}`}
            >
              Join
            </Link>
            <a 
              href="https://www.mobilize.us/nwdems/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-primary-700 px-3 py-2 text-sm font-medium"
            >
              Events
            </a>
            {isLoggedIn ? (
              <Link to="/account" className="ml-4">
                <button className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md flex items-center transition duration-150">
                  <UserCircle className="mr-2 h-5 w-5" />
                  <span>My Account</span>
                </button>
              </Link>
            ) : (
              <Link to="/login" className="ml-4">
                <button className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md transition duration-150">
                  Sign In
                </button>
              </Link>
            )}
          </nav>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-primary-700 hover:bg-gray-100 focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              to="/" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/' ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/register" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/register' ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Join
            </Link>
            <a 
              href="https://www.mobilize.us/nwdems/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              Events
            </a>
            {isLoggedIn ? (
              <Link 
                to="/account" 
                className="block px-3 py-2 rounded-md text-base font-medium bg-primary-600 text-white hover:bg-primary-700"
                onClick={() => setIsMenuOpen(false)}
              >
                My Account
              </Link>
            ) : (
              <Link 
                to="/login" 
                className="block px-3 py-2 rounded-md text-base font-medium bg-primary-600 text-white hover:bg-primary-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;