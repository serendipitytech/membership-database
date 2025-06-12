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