import { BrandConfig } from '../../types/brand';

const brandConfig: BrandConfig = {
  name: "SW Volusia Democrats",
  logo: "/logo.svg",
  colors: {
    primary: {
      DEFAULT: '#174265',
      50: '#f0f7ff',
      100: '#e0f1ff',
      200: '#b9e3ff',
      300: '#7dcfff',
      400: '#5ac1ee', // Light blue brand color
      500: '#174265', // Dark blue brand color
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
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_KEY,
  
  // Contact Information
  contactEmail: "info@swvdems.org",
  contactPhone: "(386) 320-3365",
  
  // Meeting Information
  nextMeetingDate: "2nd Thursday of the month",
  nextMeetingTime: "Pizza at 5:30 PM, Meeting at 6:00 PM",
  nextMeetingLocation: "Enterprise Museum",
  meetingFrequency: "360 Main Street, Enterprise, FL",

  socialLinks: {
    facebook: "https://facebook.com/swdems",
    twitter: "https://twitter.com/swdems",
    instagram: "https://instagram.com/swdems",
    youtube: "https://youtube.com/@swdems"
  }
};

export default { brandConfig }; 

