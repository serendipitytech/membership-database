import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {isAdminPage ? (
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <main className="flex-1 min-h-0">
            {children}
          </main>
        </div>
      ) : (
        <main className="flex-grow">
          {children}
        </main>
      )}
      <Footer />
    </div>
  );
};

export default Layout;