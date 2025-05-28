import { format, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

const timeZone = 'America/New_York';

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  return format(utcToZonedTime(parseISO(dateString), timeZone), 'MMM d, yyyy');
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}; 