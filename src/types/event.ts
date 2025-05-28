import { PickListValue } from '../lib/pickLists';

export type EventType = string;

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  description?: string;
  type: EventType;
  attendance_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EventAttendance {
  id: string;
  event_id: string;
  member_id: string;
  created_at?: string;
}

export interface EventWithAttendance extends Event {
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

// Initialize with default values
export const EVENT_TYPES: Record<string, string> = {
  GENERAL: 'general',
  BOARD: 'board',
  COMMITTEE: 'committee',
  SPECIAL: 'special'
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  [EVENT_TYPES.GENERAL]: 'General Event',
  [EVENT_TYPES.BOARD]: 'Board Meeting',
  [EVENT_TYPES.COMMITTEE]: 'Committee Meeting',
  [EVENT_TYPES.SPECIAL]: 'Special Event'
};

export const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  [EVENT_TYPES.GENERAL]: { bg: 'bg-blue-100', text: 'text-blue-800' },
  [EVENT_TYPES.BOARD]: { bg: 'bg-purple-100', text: 'text-purple-800' },
  [EVENT_TYPES.COMMITTEE]: { bg: 'bg-green-100', text: 'text-green-800' },
  [EVENT_TYPES.SPECIAL]: { bg: 'bg-yellow-100', text: 'text-yellow-800' }
};

// Function to update event types from pick list values
export const updateEventTypes = (values: PickListValue[]) => {
  // Clear existing values
  Object.keys(EVENT_TYPES).forEach(key => delete EVENT_TYPES[key]);
  Object.keys(EVENT_TYPE_LABELS).forEach(key => delete EVENT_TYPE_LABELS[key]);
  Object.keys(EVENT_TYPE_COLORS).forEach(key => delete EVENT_TYPE_COLORS[key]);

  // Add new values
  values.forEach((value) => {
    EVENT_TYPES[value.value.toUpperCase()] = value.value;
    // Use the value itself for the label, formatted for display
    const formattedLabel = value.value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    EVENT_TYPE_LABELS[value.value] = formattedLabel;
    
    // Assign colors based on value
    switch (value.value) {
      case 'general':
        EVENT_TYPE_COLORS[value.value] = { bg: 'bg-blue-100', text: 'text-blue-800' };
        break;
      case 'board':
        EVENT_TYPE_COLORS[value.value] = { bg: 'bg-purple-100', text: 'text-purple-800' };
        break;
      case 'committee':
        EVENT_TYPE_COLORS[value.value] = { bg: 'bg-green-100', text: 'text-green-800' };
        break;
      case 'special':
        EVENT_TYPE_COLORS[value.value] = { bg: 'bg-yellow-100', text: 'text-yellow-800' };
        break;
      default:
        EVENT_TYPE_COLORS[value.value] = { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  });
}; 