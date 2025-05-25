import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import TextField from '../components/Form/TextField';
import SelectField from '../components/Form/SelectField';
import Alert from '../components/UI/Alert';
import { getCurrentUser, logVolunteerHours } from '../lib/supabase';
import { Clock, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface VolunteerFormData {
  date: string;
  hours: string;
  description: string;
  category: string;
}

const initialFormData: VolunteerFormData = {
  date: format(new Date(), 'yyyy-MM-dd'),
  hours: '',
  description: '',
  category: '',
};

const volunteerCategories = [
  { value: 'event', label: 'Event Support' },
  { value: 'phone_bank', label: 'Phone Banking' },
  { value: 'canvassing', label: 'Canvassing' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'other', label: 'Other' },
];

const VolunteerPage: React.FC = () => {
  const [formData, setFormData] = useState<VolunteerFormData>(initialFormData);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { user } = await getCurrentUser();
      setIsLoggedIn(!!user);
      setUserId(user?.id || null);
    };
    
    checkAuth();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoggedIn || !userId) {
      setAlert({
        type: 'warning',
        message: 'Please sign in to log volunteer hours'
      });
      return;
    }
    
    if (!formData.date || !formData.hours || !formData.description || !formData.category) {
      setAlert({
        type: 'error',
        message: 'Please fill in all required fields'
      });
      return;
    }
    
    setIsSubmitting(true);
    setAlert(null);
    
    try {
      const hoursValue = parseFloat(formData.hours);
      
      if (isNaN(hoursValue) || hoursValue <= 0) {
        throw new Error('Please enter a valid number of hours');
      }
      
      const { record, error } = await logVolunteerHours({
        member_id: userId,
        date: formData.date,
        hours: hoursValue,
        description: formData.description,
        category: formData.category,
        created_at: new Date().toISOString(),
      });
      
      if (error) {
        throw error;
      }
      
      setAlert({
        type: 'success',
        message: 'Volunteer hours logged successfully'
      });
      
      // Reset form
      setFormData(initialFormData);
      
    } catch (error) {
      console.error('Error logging hours:', error);
      setAlert({
        type: 'error',
        message: typeof error === 'object' && error !== null && 'message' in error ? 
          String(error.message) : 
          'There was an error logging your volunteer hours. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Volunteer Portal</h1>
          <p className="text-gray-600">
            Track your volunteer hours and help us make a difference in our community.
          </p>
        </div>
        
        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center p-4">
              <div className="p-3 bg-primary-100 rounded-full mb-4">
                <Clock className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Log Hours</h3>
              <p className="text-gray-600 mb-4">
                Record your volunteer time to help us track community impact.
              </p>
              <Button 
                onClick={() => document.getElementById('log-hours-form')?.scrollIntoView({ behavior: 'smooth' })}
                variant="outline"
                size="sm"
              >
                Log Hours
              </Button>
            </div>
          </Card>
          
          <Card className="text-center hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center p-4">
              <div className="p-3 bg-primary-100 rounded-full mb-4">
                <Calendar className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Upcoming Opportunities</h3>
              <p className="text-gray-600 mb-4">
                Find events and activities where you can volunteer your time.
              </p>
                <a 
                  href="https://www.mobilize.us/nwdems/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">View Opportunities</Button>
                </a>
            </div>
          </Card>
          
          <Card className="text-center hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center p-4">
              <div className="p-3 bg-primary-100 rounded-full mb-4">
                <FileText className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Your Impact</h3>
              <p className="text-gray-600 mb-4">
                View your volunteer history and total contribution.
              </p>
              <Button 
                onClick={() => navigate('/account')}
                variant="outline"
                size="sm"
              >
                View History
              </Button>
            </div>
          </Card>
        </div>
        
        <div id="log-hours-form" className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-primary-50 border-b border-primary-100">
            <h2 className="text-xl font-semibold text-primary-800">Log Your Volunteer Hours</h2>
          </div>
          
          {!isLoggedIn ? (
            <div className="p-6">
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  Please sign in to log your volunteer hours.
                </p>
                <Button 
                  onClick={() => navigate('/login')}
                  variant="primary"
                >
                  Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <TextField
                  id="date"
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
                <TextField
                  id="hours"
                  label="Number of Hours"
                  type="number"
                  value={formData.hours}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <SelectField
                id="category"
                label="Volunteer Category"
                options={volunteerCategories}
                value={formData.category}
                onChange={handleChange}
                required
                className="mb-4"
              />
              
              <div className="mb-4">
                <label 
                  htmlFor="description" 
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description <span className="text-accent-600">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Describe what you did during your volunteer time"
                ></textarea>
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                >
                  Submit Hours
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default VolunteerPage;