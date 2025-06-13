import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import TextField from '../components/Form/TextField';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    is_cell_phone: true,
    tshirt_size: '',
    date_of_birth: '',
    special_skills: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    health_issues: '',
    registration_date: format(new Date(), 'yyyy-MM-dd'),
    signature: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAlert(null);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: Math.random().toString(36).slice(-8), // Generate random password
      });

      if (authError) throw authError;

      // Create member record
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          id: authData.user?.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          is_cell_phone: formData.is_cell_phone,
          tshirt_size: formData.tshirt_size,
          birthdate: formData.date_of_birth,
          special_skills: formData.special_skills,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone,
          emergency_contact_relationship: formData.emergency_contact_relationship,
          health_issues: formData.health_issues,
          registration_date: formData.registration_date,
          signature: formData.signature,
          status: 'pending'
        });

      if (memberError) throw memberError;

      setAlert({
        type: 'success',
        message: 'Registration successful! Please check your email for login instructions.'
      });
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setAlert({
        type: 'error',
        message: 'Registration failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Member Registration</h1>
          <p className="mt-2 text-gray-600">Join the NW Volusia Democratic Club</p>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
              <TextField
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <div>
                <TextField
                  label="Phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
                <div className="mt-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      name="is_cell_phone"
                      checked={formData.is_cell_phone}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-600">This is a cell phone</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">T-Shirt Size</label>
                <select
                  name="tshirt_size"
                  value={formData.tshirt_size}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  required
                >
                  <option value="">Select size</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="2XL">2XL</option>
                  <option value="3XL">3XL</option>
                </select>
              </div>
              <TextField
                label="Birthdate"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Special Skills */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Tell Us More</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Special Skills and Qualifications
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  Use this space to summarize special skills and qualifications you have that you would like us to know about.
                </p>
                <textarea
                  name="special_skills"
                  value={formData.special_skills}
                  onChange={handleChange}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Emergency Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField
                label="Emergency Contact Name"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                required
              />
              <TextField
                label="Emergency Contact Phone"
                name="emergency_contact_phone"
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={handleChange}
                required
              />
              <TextField
                label="Relationship to Emergency Contact"
                name="emergency_contact_relationship"
                value={formData.emergency_contact_relationship}
                onChange={handleChange}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Health Issues to be Aware of
                </label>
                <textarea
                  name="health_issues"
                  value={formData.health_issues}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Agreement & Signature */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Agreement & Signature</h2>
            <div className="space-y-6">
              <div className="prose prose-sm text-gray-600">
                <p>
                  By adding my name and the date, I affirm that I am now registered with the Volusia County Supervisor of Elections to vote as a member of the Democratic Party. I understand and agree that I have a continuing obligation to inform the NW Volusia Democratic Club immediately, should there be any change in my voter registration.
                </p>
                <p className="mt-4">
                  If you have any questions or require additional information, please email Membership Chair info@nwdemocrats.org or text/call 386-853-1580
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextField
                  label="Registration Date"
                  name="registration_date"
                  type="date"
                  value={formData.registration_date}
                  onChange={handleChange}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Signature</label>
                  <input
                    type="text"
                    name="signature"
                    value={formData.signature}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-handwriting"
                    required
                    placeholder="Type your full name to sign"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Registering...' : 'Register'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default RegisterPage; 