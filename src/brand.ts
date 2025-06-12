export interface BrandConfig {
  name: string;
  logo: string;
  colors: {
    primary: {
      DEFAULT: string;
      [key: string]: string;
    };
    secondary: {
      DEFAULT: string;
      [key: string]: string;
    };
  };
  supabaseUrl: string;
  supabaseKey: string;
  // Contact Information
  contactEmail: string;
  contactPhone: string;
  // Meeting Information
  nextMeetingDate?: string;
  nextMeetingTime?: string;
  nextMeetingLocation?: string;
  meetingFrequency?: string;
  // Social Media Links
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    bluesky?: string;
  };
}

// Dynamically import the brand config based on the VITE_BRAND environment variable
const brandName = import.meta.env.VITE_BRAND || 'nw_club';
// Ensure the brand name matches the directory structure (with underscore)
const normalizedBrandName = brandName.replace('club', '_club');

// Create a promise that resolves with the brand config
export const brandConfigPromise = import(`./brands/${normalizedBrandName}/brandConfig`)
  .then(module => {
    if (!module.brandConfig) {
      throw new Error('Brand config not found');
    }
    return module.brandConfig as BrandConfig;
  });

// Export the brand config (this will be undefined until the promise resolves)
export let brandConfig: BrandConfig;

// Initialize the brand config
brandConfigPromise.then(config => {
  brandConfig = config;
}).catch(error => {
  console.error('Failed to load brand config:', error);
  // Provide a default config
  brandConfig = {
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
    contactPhone: ''
  };
});
