import { PickListValue } from '../lib/pickLists';

export type MeetingType = string;

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

// These will be populated from the pick list system
export let MEETING_TYPES: Record<string, string> = {};
export let MEETING_TYPE_LABELS: Record<string, string> = {};
export let MEETING_TYPE_COLORS: Record<string, { bg: string; text: string }> = {};

// Function to update meeting types from pick list values
export const updateMeetingTypes = (values: PickListValue[]) => {
  MEETING_TYPES = {};
  MEETING_TYPE_LABELS = {};
  MEETING_TYPE_COLORS = {};

  values.forEach((value) => {
    MEETING_TYPES[value.value] = value.value;
    MEETING_TYPE_LABELS[value.value] = value.description || value.value;
    
    // Assign colors based on value
    switch (value.value) {
      case 'general':
        MEETING_TYPE_COLORS[value.value] = { bg: 'bg-blue-100', text: 'text-blue-800' };
        break;
      case 'board':
        MEETING_TYPE_COLORS[value.value] = { bg: 'bg-purple-100', text: 'text-purple-800' };
        break;
      case 'committee':
        MEETING_TYPE_COLORS[value.value] = { bg: 'bg-green-100', text: 'text-green-800' };
        break;
      case 'special':
        MEETING_TYPE_COLORS[value.value] = { bg: 'bg-yellow-100', text: 'text-yellow-800' };
        break;
      default:
        MEETING_TYPE_COLORS[value.value] = { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  });
}; 