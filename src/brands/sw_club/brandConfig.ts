import { BrandConfig } from '../../types/brand';

const brandConfig: BrandConfig = {
  name: "SW Democrats",
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
  contactEmail: "info@swvolusiademocrats.org",
  contactPhone: "(386) 853-1580",
  
  // Meeting Information
  nextMeetingDate: "2nd Thursday of the month",
  nextMeetingTime: "Doors open at 6:30 PM, Meeting at 7:00 PM",
  nextMeetingLocation: "Port Orange Regional Library",
  meetingFrequency: "monthly on the 2nd Thursday",

  socialLinks: {
    facebook: "https://www.facebook.com/swvdems",
    twitter: "https://x.com/swvdems",
    instagram: "https://www.instagram.com/swvolusiadems/",
    youtube: "https://www.youtube.com/@SWVDems",
    bluesky: ""
  },

  // Donation Links
  actBlueUrl: "https://secure.actblue.com/donate/swvdems",
  actBlueUrls: {
    membership: [],
    nonMembership: []
  }
  timezone: 'America/New_York',
};

export default { brandConfig }; 

