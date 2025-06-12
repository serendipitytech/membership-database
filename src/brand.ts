import { BrandConfig } from './types/brand';
import swClubConfig from './brands/sw_club/brandConfig';
import nwClubConfig from './brands/nw_club/brandConfig';

// Map of available brand configurations
const brandConfigs: Record<string, BrandConfig> = {
  'sw_club': swClubConfig.brandConfig,
  'nw_club': nwClubConfig.brandConfig
};

// Get the brand name from environment variable
const brandName = import.meta.env.VITE_BRAND || 'nw_club';
const normalizedBrandName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '_');

// Create a promise that resolves with the brand config
export const brandConfigPromise = Promise.resolve(brandConfigs[normalizedBrandName] || {
  name: "Default Brand",
  logo: "/logo.svg",
  colors: {
    primary: {
      DEFAULT: '#174265',
      50: '#f0f7ff',
      100: '#e0f1ff',
      200: '#b9e3ff',
      300: '#7dcfff',
      400: '#5ac1ee',
      500: '#174265',
      600: '#174265',
      700: '#174265',
      800: '#174265',
      900: '#174265',
    },
    secondary: {
      DEFAULT: '#5ac1ee',
      50: '#f0f9ff',
      100: '#e0f7ff',
      200: '#b9efff',
      300: '#7de7ff',
      400: '#5ac1ee',
      500: '#5ac1ee',
      600: '#38a3d1',
      700: '#2b89b3',
      800: '#236f95',
      900: '#1d5a7a',
    }
  },
  supabaseUrl: '',
  supabaseKey: '',
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

// Export the brand config (this will be undefined until the promise resolves)
export let brandConfig: BrandConfig;

// Initialize the brand config
brandConfigPromise.then(config => {
  brandConfig = config;
});
