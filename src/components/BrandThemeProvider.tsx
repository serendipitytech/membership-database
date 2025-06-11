import React from 'react';
import { brandColors } from '../utils/colors';

interface BrandThemeProviderProps {
  children: React.ReactNode;
}

export const BrandThemeProvider: React.FC<BrandThemeProviderProps> = ({ children }) => {
  // Set primary colors
  Object.entries(brandColors.primary).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--color-primary-${key}`, value);
  });

  // Set secondary colors
  Object.entries(brandColors.secondary).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--color-secondary-${key}`, value);
  });

  return <>{children}</>;
}; 