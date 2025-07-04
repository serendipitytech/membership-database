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

// These will be populated from the pick list system
export let EVENT_TYPES: Record<string, string> = {};
export let EVENT_TYPE_LABELS: Record<string, string> = {};
export let EVENT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {};

// Function to update event types from pick list values
export const updateEventTypes = (values: PickListValue[]) => {
  EVENT_TYPES = {};
  EVENT_TYPE_LABELS = {};
  EVENT_TYPE_COLORS = {};

  values.forEach((value) => {
    EVENT_TYPES[value.value] = value.value;
    EVENT_TYPE_LABELS[value.value] = value.description || value.value;
    
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