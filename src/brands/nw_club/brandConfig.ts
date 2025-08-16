import { BrandConfig } from '../../types/brand';

const brandConfig: BrandConfig = {
  name: "NW Democrats",
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
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_KEY,
  
  // Contact Information
  contactEmail: "info@nwdemocrats.org",
  contactPhone: "(386) 853-1580",
  
  // Meeting Information
  nextMeetingDate: "4th Thursday of the month",
  nextMeetingTime: "Doors open at 6:30 PM, Meeting at 7:00 PM",
  nextMeetingLocation: "DeLand Garden Club",
  meetingFrequency: "monthly on the 4th Thursday",

  socialLinks: {
    facebook: "https://www.facebook.com/NWDemocrats",
    twitter: "",
    instagram: "https://www.instagram.com/nwdemocrats/",
    youtube: "https://youtube.com/@NWDemocrats",
    bluesky: "https://bsky.app/profile/nwdemocrats.bsky.social"
  },

  // Donation Links
  actBlueUrl: "https://secure.actblue.com/donate/nwclub-sustainer",
  actBlueUrls: {
    membership: [
      "https://secure.actblue.com/page/nwannualmembership",
      "https://secure.actblue.com/page/nwclub-sustainer"
    ],
    nonMembership: [
      "https://secure.actblue.com/page/nwswag"
    ]
  },

  timezone: 'America/New_York',
};

export default { brandConfig };