import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Mail, Youtube } from 'lucide-react';
import { brandConfigPromise } from '../../brand';
import { BrandConfig } from '../../brand';

const BlueSkyIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2c1.5 2 3.5 3 6 3 1 0 2-.2 3-.5-1.2 2.7-3.2 5-6.5 6.5 3.3 1.5 5.3 3.8 6.5 6.5-1 .3-2 .5-3 .5-2.5 0-4.5-1-6-3-1.5 2-3.5 3-6 3-1 0-2-.2-3-.5 1.2-2.7 3.2-5 6.5-6.5C5.2 9.5 3.2 7.2 2 4.5c1 .3 2 .5 3 .5 2.5 0 4.5-1 6-3z"/>
  </svg>
);

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [brandInfo, setBrandInfo] = useState<{
    name: string;
    contactEmail: string;
    contactPhone: string;
    socialLinks: NonNullable<BrandConfig['socialLinks']>;
  }>({
    name: 'Loading...',
    contactEmail: '',
    contactPhone: '',
    socialLinks: {
      facebook: '',
      twitter: '',
      instagram: '',
      youtube: '',
      bluesky: ''
    }
  });

  useEffect(() => {
    brandConfigPromise.then(config => {
      setBrandInfo({
        name: config.name,
        contactEmail: config.contactEmail,
        contactPhone: config.contactPhone,
        socialLinks: config.socialLinks || {
          facebook: '',
          twitter: '',
          instagram: '',
          youtube: '',
          bluesky: ''
        }
      });
    }).catch(error => {
      console.error('Failed to load brand config:', error);
      setBrandInfo({
        name: 'Welcome',
        contactEmail: '',
        contactPhone: '',
        socialLinks: {
          facebook: '',
          twitter: '',
          instagram: '',
          youtube: '',
          bluesky: ''
        }
      });
    });
  }, []);
  
  return (
    <footer className="bg-gray-800 text-white pt-8 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-3">{brandInfo.name}</h3>
            <p className="text-gray-300 mb-4">
              Working together to create a more just, equitable, and democratic society through local engagement and action.
            </p>
            <div className="flex space-x-4">
              {brandInfo.socialLinks.facebook && (
                <a href={brandInfo.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
                  <Facebook size={20} />
                  <span className="sr-only">Facebook</span>
                </a>
              )}
              {brandInfo.socialLinks.youtube && (
                <a href={brandInfo.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
                  <Youtube size={20} />
                  <span className="sr-only">YouTube</span>
                </a>
              )}
              {brandInfo.socialLinks.twitter && (
                <a href={brandInfo.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
                  <Twitter size={20} />
                  <span className="sr-only">Twitter</span>
                </a>
              )}
              {brandInfo.socialLinks.instagram && (
                <a href={brandInfo.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
                  <Instagram size={20} />
                  <span className="sr-only">Instagram</span>
                </a>
              )}
              {brandInfo.socialLinks.bluesky && (
                <a href={brandInfo.socialLinks.bluesky} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
                  <BlueSkyIcon />
                  <span className="sr-only">BlueSky</span>
                </a>
              )}
              {brandInfo.contactEmail && (
                <a href={`mailto:${brandInfo.contactEmail}`} className="text-gray-300 hover:text-white transition-colors">
                  <Mail size={20} />
                  <span className="sr-only">Email</span>
                </a>
              )}
            </div>
          </div>
          
          <div>
            {/* Empty middle column */}
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-3">Contact Us</h3>
            {brandInfo.contactEmail && (
              <p className="text-gray-300 mb-2">
                <strong>Email:</strong> <a href={`mailto:${brandInfo.contactEmail}`}>{brandInfo.contactEmail}</a>
              </p>
            )}
            {brandInfo.contactPhone && (
              <p className="text-gray-300">
                <strong>Phone:</strong> {brandInfo.contactPhone}
              </p>
            )}
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-6">
          <p className="text-center text-gray-400">
            &copy; {currentYear} {brandInfo.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;