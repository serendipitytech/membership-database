import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import TextField from '../components/Form/TextField';
import SelectField from '../components/Form/SelectField';
import CheckboxGroup from '../components/Form/CheckboxGroup';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import Card from '../components/UI/Card';
import { getInterestCategories, registerMember, updateMemberInterests } from '../lib/supabase';

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  membership_type: string;
}

const initialFormData: FormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  membership_type: '',
};

interface InterestCategory {
  id: string;
  name: string;
  interests: Array<{
    id: string;
    name: string;
  }>;
}

const RegistrationPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInterests = async () => {
      const { categories, error } = await getInterestCategories();
      if (error) {
        console.error('Error fetching interests:', error);
        return;
      }
      
      setInterestCategories(categories || []);
    };
    
    fetchInterests();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInterestChange = (values: string[]) => {
    setSelectedInterests(values);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (step === 1 && (!formData.first_name || !formData.last_name || !formData.email)) {
      setAlert({
        type: 'error',
        message: 'Please fill in all required fields'
      });
      return;
    }
    
    if (step === 1) {
      // Move to next step
      setStep(2);
      setAlert(null);
      return;
    }
    
    setIsSubmitting(true);
    setAlert(null);
    
    try {
      // Register member
      const { member, error } = await registerMember({
        ...formData,
        status: 'pending', // Pending payment
        created_at: new Date().toISOString(),
      });
      
      if (error) {
        throw error;
      }
      
      // Add interests
      if (selectedInterests.length > 0 && member) {
        const { error: interestError } = await updateMemberInterests(
          member.id,
          selectedInterests
        );
        
        if (interestError) {
          console.error('Error adding interests:', interestError);
        }
      }
      
      // Show success message
      setAlert({
        type: 'success',
        message: 'Registration successful! Redirecting to payment...'
      });
      
      // Redirect to payment page (ActBlue) after short delay
      setTimeout(() => {
        navigate('/payment', { state: { memberId: member?.id } });
      }, 2000);
      
    } catch (error) {
      console.error('Registration error:', error);
      setAlert({
        type: 'error',
        message: 'There was an error processing your registration. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPersonalInfoForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          id="first_name"
          label="First Name"
          value={formData.first_name}
          onChange={handleChange}
          required
        />
        <TextField
          id="last_name"
          label="Last Name"
          value={formData.last_name}
          onChange={handleChange}
          required
        />
      </div>
      
      <TextField
        id="email"
        label="Email Address"
        type="email"
        value={formData.email}
        onChange={handleChange}
        required
      />
      
      <TextField
        id="phone"
        label="Phone Number"
        type="tel"
        value={formData.phone}
        onChange={handleChange}
      />
      
      <TextField
        id="address"
        label="Street Address"
        value={formData.address}
        onChange={handleChange}
      />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TextField
          id="city"
          label="City"
          value={formData.city}
          onChange={handleChange}
          className="col-span-2"
        />
        <SelectField
          id="state"
          label="State"
          options={[
            { value: 'WA', label: 'Washington' },
            { value: 'OR', label: 'Oregon' },
            { value: 'ID', label: 'Idaho' },
            // Add more states as needed
          ]}
          value={formData.state}
          onChange={handleChange}
        />
        <TextField
          id="zip"
          label="Zip Code"
          value={formData.zip}
          onChange={handleChange}
        />
      </div>
      
      <SelectField
        id="membership_type"
        label="Membership Type"
        options={[
          { value: 'individual', label: 'Individual ($25/year)' },
          { value: 'family', label: 'Family ($40/year)' },
          { value: 'student', label: 'Student/Limited Income ($10/year)' },
          { value: 'sustaining', label: 'Sustaining Member ($100/year)' },
        ]}
        value={formData.membership_type}
        onChange={handleChange}
        required
      />
    </div>
  );

  const renderInterestsForm = () => (
    <div className="space-y-6">
      <p className="text-gray-600">
        Please select areas where you'd like to get involved or receive more information.
      </p>
      
      {interestCategories.map((category) => (
        <Card key={category.id} className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">{category.name}</h3>
          <CheckboxGroup
            legend={`Select ${category.name}`}
            options={category.interests.map(interest => ({
              id: interest.id,
              label: interest.name
            }))}
            selectedValues={selectedInterests}
            onChange={handleInterestChange}
          />
        </Card>
      ))}
      
      <div className="flex justify-between mt-6">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => setStep(1)}
        >
          Back
        </Button>
        <Button 
          type="submit" 
          isLoading={isSubmitting}
        >
          Complete Registration
        </Button>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Membership Registration</h1>
          <p className="mt-2 text-gray-600">
            Join the Northwest Democrats and help make a difference in our community.
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
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {/* Progress Steps */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex">
              <div className={`flex-1 text-center relative ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className="flex items-center justify-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= 1 ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    1
                  </div>
                </div>
                <p className="mt-1 text-sm">Personal Info</p>
              </div>
              <div className="w-full flex items-center justify-center">
                <div className={`h-1 w-full ${step >= 2 ? 'bg-primary-500' : 'bg-gray-200'}`}></div>
              </div>
              <div className={`flex-1 text-center ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className="flex items-center justify-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= 2 ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    2
                  </div>
                </div>
                <p className="mt-1 text-sm">Interests</p>
              </div>
              <div className="w-full flex items-center justify-center">
                <div className={`h-1 w-full ${step >= 3 ? 'bg-primary-500' : 'bg-gray-200'}`}></div>
              </div>
              <div className={`flex-1 text-center ${step >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className="flex items-center justify-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= 3 ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    3
                  </div>
                </div>
                <p className="mt-1 text-sm">Payment</p>
              </div>
            </div>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {step === 1 ? renderPersonalInfoForm() : renderInterestsForm()}
            
            {step === 1 && (
              <div className="mt-6 flex justify-end">
                <Button type="submit">
                  Continue
                </Button>
              </div>
            )}
          </form>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Already a member? <Link to="/login" className="text-primary-600 hover:text-primary-500">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RegistrationPage;