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
        <div className="flex flex-1 min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-0">
            <main className="flex-1 overflow-auto ml-64 pl-6">
              {children}
            </main>
            <div className="ml-64">
              <div className="pl-6 -ml-64">
                <Footer />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </>
      )}
    </div>
  );
};

export default Layout;