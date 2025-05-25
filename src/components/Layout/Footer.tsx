import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Mail } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h3 className="text-xl font-semibold mb-4">Northwest Democrats</h3>
            <p className="text-gray-300 mb-4">
              Working together to create a more just, equitable, and democratic society through local engagement and action.
            </p>
            <div className="flex space-x-4 mt-6">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Facebook size={20} />
                <span className="sr-only">Facebook</span>
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Twitter size={20} />
                <span className="sr-only">Twitter</span>
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Instagram size={20} />
                <span className="sr-only">Instagram</span>
              </a>
              <a href="mailto:info@nwdemocrats.org" className="text-gray-300 hover:text-white transition-colors">
                <Mail size={20} />
                <span className="sr-only">Email</span>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-300 hover:text-white transition-colors">Join Us</Link>
              </li>
              <li>
                <Link to="/meetings" className="text-gray-300 hover:text-white transition-colors">Meetings</Link>
              </li>
              <li>
                <Link to="/volunteer" className="text-gray-300 hover:text-white transition-colors">Volunteer</Link>
              </li>
              <li>
                <a href="https://nwdemocrats.org" className="text-gray-300 hover:text-white transition-colors">Main Website</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
            <p className="text-gray-300 mb-2">
              <strong>Email:</strong> info@nwdemocrats.org
            </p>
            <p className="text-gray-300 mb-6">
              <strong>Meetings:</strong> Every 4th Wednesday of the month
            </p>
            <Link to="/contact" className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md transition duration-150 inline-block">
              Get in Touch
            </Link>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-12 pt-8">
          <p className="text-center text-gray-400">
            &copy; {currentYear} Northwest Democrats. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;