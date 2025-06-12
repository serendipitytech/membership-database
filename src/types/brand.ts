export interface BrandConfig {
  name: string;
  logo: string;
  colors: {
    primary: {
      DEFAULT: string;
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    secondary: {
      DEFAULT: string;
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
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
  // Donation Links
  actBlueUrl: string;
  actBlueUrls: {
    membership: string[];
    nonMembership: string[];
  };
} 