import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import TextField from '../../components/Form/TextField';
import SelectField from '../../components/Form/SelectField';
import { Plus, Trash2, Edit2, Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { Event, EventType, EVENT_TYPES, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, updateEventTypes } from '../../types/event';
import { getPickListValues, PICK_LIST_CATEGORIES } from '../../lib/pickLists';

const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('');
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
    loadEventTypes();
  }, []);

  const loadEventTypes = async () => {
    try {
      // First, ensure the event_types category exists
      const { data: categoryData, error: categoryError } = await supabase
        .from('pick_list_categories')
        .select('id')
        .eq('name', PICK_LIST_CATEGORIES.EVENT_TYPES)
        .single();

      let categoryId;
      if (categoryError && categoryError.code === 'PGRST116') {
        // Category doesn't exist, create it
        const { data: newCategory, error: createError } = await supabase
          .from('pick_list_categories')
          .insert([{
            name: PICK_LIST_CATEGORIES.EVENT_TYPES,
            description: 'Types of events',
            display_order: 1
          }])
          .select()
          .single();

        if (createError) throw createError;
        categoryId = newCategory.id;
      } else if (categoryError) {
        throw categoryError;
      } else {
        categoryId = categoryData.id;
      }

      // Now get the values
      const { data: values, error: valuesError } = await supabase
        .from('pick_list_values')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('display_order');

      if (valuesError) throw valuesError;

      // If no values exist, create some default ones
      if (!values || values.length === 0) {
        const defaultTypes = [
          { value: 'general', description: 'General Event', display_order: 1 },
          { value: 'board', description: 'Board Meeting', display_order: 2 },
          { value: 'committee', description: 'Committee Meeting', display_order: 3 },
          { value: 'special', description: 'Special Event', display_order: 4 }
        ];

        const { data: newValues, error: insertError } = await supabase
          .from('pick_list_values')
          .insert(defaultTypes.map(type => ({
            ...type,
            category_id: categoryId,
            is_active: true
          })))
          .select();

        if (insertError) throw insertError;
        updateEventTypes(newValues || []);
        if (newValues && newValues.length > 0) {
          setType(newValues[0].value);
        }
      } else {
        updateEventTypes(values);
        if (values.length > 0) {
          setType(values[0].value);
        }
      }
    } catch (error) {
      console.error('Error loading event types:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load event types'
      });
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load events'
      });
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) {
      setAlert({
        type: 'error',
        message: 'Please fill in all required fields'
      });
      return;
    }

    try {
      // Ensure we're using the exact date string from the input
      const eventData = {
        title,
        date,
        time,
        location,
        description,
        type: type || EVENT_TYPES.GENERAL // Default to GENERAL if not specified
      };

      if (selectedEvent) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', selectedEvent.id);

        if (error) throw error;
      } else {
        // Create new event
        const { error } = await supabase
          .from('events')
          .insert([eventData]);

        if (error) throw error;
      }

      // Refresh events list
      await fetchEvents();

      // Reset form
      setSelectedEvent(null);
      setTitle('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setTime('12:00');
      setLocation('');
      setDescription('');
      setType('');

      setAlert({
        type: 'success',
        message: `Event ${selectedEvent ? 'updated' : 'created'} successfully`
      });
    } catch (error) {
      console.error('Error saving event:', error);
      setAlert({
        type: 'error',
        message: 'Failed to save event. Please try again.'
      });
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event? This will also delete all associated attendance records.')) {
      return;
    }

    try {
      // Delete associated attendance records first
      const { error: attendanceError } = await supabase
        .from('event_attendance')
        .delete()
        .eq('event_id', eventId);

      if (attendanceError) throw attendanceError;

      // Delete the event
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (eventError) throw eventError;

      // Refresh events list
      await fetchEvents();

      setAlert({
        type: 'success',
        message: 'Event deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      setAlert({
        type: 'error',
        message: 'Failed to delete event'
      });
    }
  };

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setTitle(event.title);
    // Ensure we're using the exact date from the database
    setDate(event.date);
    setTime(event.time);
    setLocation(event.location || '');
    setDescription(event.description || '');
    setType(event.type);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Events</h1>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}

        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedEvent ? 'Edit Event' : 'Create New Event'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-12 gap-4 mb-6">
                <div className="col-span-4">
                  <TextField
                    label="Event Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <TextField
                    label="Date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <TextField
                    label="Time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <TextField
                    label="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <SelectField
                    id="type"
                    label="Event Type"
                    value={type}
                    onChange={(e) => setType(e.target.value as EventType)}
                    options={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({
                      value,
                      label
                    }))}
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <TextField
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-4">
                {selectedEvent && (
                  <Button
                    type="button"
                    onClick={() => {
                      setSelectedEvent(null);
                      setTitle('');
                      setDate(format(new Date(), 'yyyy-MM-dd'));
                      setTime('12:00');
                      setLocation('');
                      setDescription('');
                      setType('');
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" variant="primary">
                  {selectedEvent ? 'Update Event' : 'Create Event'}
                </Button>
              </div>
            </form>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Events List</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{event.title}</div>
                        {event.description && (
                          <div className="text-sm text-gray-500">{event.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {format(new Date(event.date), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          {event.time}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {event.location ? (
                          <div className="flex items-center text-sm text-gray-900">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            {event.location}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No location specified</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          EVENT_TYPE_COLORS[event.type]?.bg || 'bg-gray-100'
                        } ${EVENT_TYPE_COLORS[event.type]?.text || 'text-gray-800'}`}>
                          {EVENT_TYPE_LABELS[event.type] || event.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(event)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit event"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete event"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminEvents; 