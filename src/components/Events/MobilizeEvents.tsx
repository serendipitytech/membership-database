import React, { useState, useEffect } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { brandConfig } from '../../brand';

interface MobilizeEvent {
  id: number;
  title: string;
  description: string;
  featured_image_url: string;
  timezone: string;
  location: {
    venue: string;
    address_lines: string[];
    locality: string;
    region: string;
    postal_code: string;
  };
  timeslots: Array<{
    id: number;
    start_date: number;
    end_date: number;
  }>;
}

const MobilizeEvents: React.FC = () => {
  const [events, setEvents] = useState<MobilizeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(
          `${brandConfig.supabaseUrl}/functions/v1/mobilize-events`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setEvents(data.data.slice(0, 3)); // Get first 3 upcoming events
      } catch (err) {
        setError('Failed to load events');
        console.error('Error fetching events:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 h-48 rounded-t-lg"></div>
            <div className="p-4">
              <div className="h-6 bg-gray-200 rounded mb-3"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Unable to load events. Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {events.map((event) => (
        <Card key={event.id} className="flex flex-col h-full">
          {event.featured_image_url && (
            <img
              src={event.featured_image_url}
              alt={event.title}
              className="w-full h-48 object-cover rounded-t-lg"
            />
          )}
          <div className="p-6 flex-1">
            <h3 className="text-xl font-heading font-semibold mb-3">{event.title}</h3>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {format(new Date(event.timeslots[0].start_date), 'MMMM d, yyyy')}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                {format(new Date(event.timeslots[0].start_date), 'h:mm a')}
              </div>
              {event.location && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  {event.location.venue}
                </div>
              )}
            </div>
          </div>
          <div className="p-6 pt-0 mt-auto">
            <a 
              href={`https://www.mobilize.us/nwdems/event/${event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full"
            >
              <Button variant="outline" fullWidth>
                View Details & RSVP
              </Button>
            </a>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MobilizeEvents;