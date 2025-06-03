import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  CreditCard,
  Settings,
  LogOut,
  ClipboardList,
  Heart,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

function SidebarItem({ icon, label, to, active, collapsed }) {
  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-2 rounded transition-colors hover:bg-slate-800 ${active ? 'bg-slate-800 text-white' : 'text-slate-300'} ${collapsed ? 'justify-center' : ''}`}
    >
      {icon}
      {!collapsed && <span className="ml-3">{label}</span>}
    </Link>
  );
}

const navItems = [
  { label: 'Dashboard', to: '/admin', icon: <Home /> },
  { label: 'Members', to: '/admin/members', icon: <Users /> },
  { label: 'Events', to: '/admin/events', icon: <Calendar /> },
  { label: 'Attendance', to: '/admin/attendance', icon: <ClipboardList /> },
  { label: 'Volunteer Hours', to: '/admin/volunteer-hours', icon: <Clock /> },
  { label: 'Interests', to: '/admin/interests', icon: <Heart /> },
  { label: 'Payments', to: '/admin/payments', icon: <CreditCard /> },
  { label: 'Functions', to: '/admin/functions', icon: <Settings /> },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (err) {
      setError('Failed to log out. Please try again.');
    }
  };

  return (
    <aside className={`fixed top-0 left-0 h-screen bg-slate-900 flex flex-col transition-all duration-200 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex items-center h-16 px-4 font-bold text-xl text-white border-b border-slate-800">
        {!collapsed ? 'NW Democrats' : 'NW'}
      </div>
      <nav className="flex-1 overflow-y-auto min-h-0 py-4 space-y-1">
        {navItems.map((item) => (
          <SidebarItem
            key={item.to}
            icon={item.icon}
            label={item.label}
            to={item.to}
            active={location.pathname === item.to}
            collapsed={collapsed}
          />
        ))}
      </nav>
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-center text-slate-400 hover:text-white py-2"
        >
          {collapsed ? (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          ) : (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          )}
          {!collapsed && <span className="ml-2 text-sm">{collapsed ? 'Expand' : 'Collapse'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center justify-center text-slate-400 hover:text-white py-2 mt-2 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="h-6 w-6" />
          {!collapsed && <span className="ml-3">Logout</span>}
        </button>
        {error && (
          <div className="text-red-500 text-xs mt-2 text-center">{error}</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar; 