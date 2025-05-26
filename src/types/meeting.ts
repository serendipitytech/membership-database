export type MeetingType = 'general' | 'committee' | 'special';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  description?: string;
  type: MeetingType;
  created_at?: string;
  updated_at?: string;
}

export interface MeetingAttendance {
  id: string;
  meeting_id: string;
  member_id: string;
  created_at?: string;
}

export interface MeetingWithAttendance extends Meeting {
  attendance_count?: number;
  attendees?: Array<{
    member: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
    notes?: string;
  }>;
}

export const MEETING_TYPES = {
  GENERAL: 'general',
  COMMITTEE: 'committee',
  SPECIAL: 'special'
} as const;

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  [MEETING_TYPES.GENERAL]: 'General Meeting',
  [MEETING_TYPES.COMMITTEE]: 'Committee Meeting',
  [MEETING_TYPES.SPECIAL]: 'Special Event'
};

export const MEETING_TYPE_COLORS: Record<MeetingType, { bg: string; text: string }> = {
  [MEETING_TYPES.GENERAL]: { bg: 'bg-blue-100', text: 'text-blue-800' },
  [MEETING_TYPES.COMMITTEE]: { bg: 'bg-purple-100', text: 'text-purple-800' },
  [MEETING_TYPES.SPECIAL]: { bg: 'bg-green-100', text: 'text-green-800' }
}; 