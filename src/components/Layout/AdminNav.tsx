import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Users, 
  Heart, 
  CreditCard, 
  Calendar, 
  Clock, 
  UsersRound,
  Home,
  Settings,
  Upload
} from 'lucide-react';

const AdminNav: React.FC = () => {
  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: Home },
    { path: '/admin/members', label: 'Members', icon: Users },
    { path: '/admin/interests', label: 'Interests', icon: Heart },
    { path: '/admin/payments', label: 'Payments', icon: CreditCard },
    { path: '/admin/events', label: 'Events', icon: Calendar },
    { path: '/admin/volunteer-hours', label: 'Volunteer Hours', icon: Clock },
    { path: '/admin/attendance', label: 'Meeting Attendance', icon: UsersRound },
    { path: '/admin/imports', label: 'Imports', icon: Upload },
    { path: '/admin/functions', label: 'Admin Functions', icon: Settings },
  ];

  const location = useLocation();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium ${
                    isActive
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNav; 