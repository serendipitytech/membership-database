import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Members', href: '/admin/members', icon: Users },
  { name: 'Events', href: '/admin/events', icon: Calendar },
  { name: 'Attendance', href: '/admin/attendance', icon: Users },
  { name: 'Volunteer Hours', href: '/admin/volunteer-hours', icon: Clock },
  { name: 'Interests', href: '/admin/interests', icon: Heart },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Functions', href: '/admin/functions', icon: Settings },
];

const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full bg-gray-800">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-white text-xl font-bold">Admin Panel</h1>
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon
                  className={`mr-3 flex-shrink-0 h-6 w-6 ${
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
        <button
          onClick={() => {
            // Handle logout
          }}
          className="flex-shrink-0 w-full group block"
        >
          <div className="flex items-center">
            <div>
              <LogOut
                className="inline-block h-6 w-6 rounded-full text-gray-400 group-hover:text-gray-300"
                aria-hidden="true"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">Logout</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 