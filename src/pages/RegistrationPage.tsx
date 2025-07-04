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
import { getPickListValues, PICK_LIST_CATEGORIES } from '../lib/pickLists';
import {
  formatPhoneNumber,
  validateZipCode,
  validateEmail,
  validatePhoneNumber,
  validateDate,
  validateRequired,
  validateName,
  validateAddress,
  validateCity,
  validateVoterId,
  validatePrecinct
} from '../lib/formValidation';
import { brandConfig } from '../brand';

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_cell_phone: boolean;
  address: string;
  city: string;
  state: string;
  zip: string;
  membership_type: string;
  birthdate: string;
  tshirt_size: string;
  precinct: string;
  voter_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  tell_us_more: string;
  signature: string;
}

const initialFormData: FormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  is_cell_phone: false,
  address: '',
  city: '',
  state: 'FL',
  zip: '',
  membership_type: '',
  birthdate: '',
  tshirt_size: '',
  precinct: '',
  voter_id: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  tell_us_more: '',
  signature: '',
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
  const [isLoading, setIsLoading] = useState(true);
  const [membershipTypes, setMembershipTypes] = useState<Array<{value: string, label: string}>>([]);
  const [shirtSizes, setShirtSizes] = useState<Array<{value: string, label: string}>>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch interests
        const { categories, error } = await getInterestCategories();
        if (error) {
          console.error('Error fetching interests:', error);
          return;
        }
        setInterestCategories(categories || []);

        // Fetch membership types
        const membershipValues = await getPickListValues(PICK_LIST_CATEGORIES.MEMBERSHIP_TYPES);
        console.log('Loaded membership types:', membershipValues); // Debug log
        if (!membershipValues || membershipValues.length === 0) {
          console.error('No membership types found');
          setAlert({
            type: 'error',
            message: 'Failed to load membership types. Please try again.'
          });
          return;
        }
        setMembershipTypes(membershipValues.map(value => ({
          value: value.value,
          label: value.name
        })));

        // Fetch shirt sizes
        const shirtValues = await getPickListValues(PICK_LIST_CATEGORIES.TSHIRT_SIZES);
        console.log('Loaded shirt sizes:', shirtValues); // Debug log
        if (!shirtValues || shirtValues.length === 0) {
          console.error('No shirt sizes found');
          setAlert({
            type: 'error',
            message: 'Failed to load shirt sizes. Please try again.'
          });
          return;
        }
        setShirtSizes(shirtValues.map(value => ({
          value: value.value,
          label: value.name
        })));

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setAlert({
          type: 'error',
          message: 'Failed to load form data. Please try again.'
        });
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const validateField = (name: string, value: string | boolean): string | null => {
    // Skip validation for optional fields
    if (name === 'is_cell_phone' || name === 'precinct' || name === 'voter_id' || name === 'tell_us_more') {
      return null;
    }

    // For phone numbers, ensure we have a value before validating
    if ((name === 'phone' || name === 'emergency_contact_phone')) {
      if (!value) {
        return 'Please enter a valid 10-digit phone number';
      }
      // Ensure we're working with a string and get raw digits
      const digits = String(value).replace(/\D/g, '');
      console.log(`Validating field ${name}:`, { original: value, digits, length: digits.length });
      return digits.length === 10 ? null : 'Please enter a valid 10-digit phone number';
    }

    switch (name) {
      case 'first_name':
      case 'last_name':
        return validateName(value as string) ? null : 'Please enter a valid name';
      case 'email':
        return validateEmail(value as string) ? null : 'Please enter a valid email address';
      case 'zip':
        return validateZipCode(value as string) ? null : 'Please enter a valid 5-digit ZIP code';
      case 'birthdate':
        return validateDate(value as string) ? null : 'Please enter a valid date in the past';
      case 'address':
        return validateAddress(value as string) ? null : 'Please enter a valid address';
      case 'city':
        return validateCity(value as string) ? null : 'Please enter a valid city name';
      case 'voter_id':
        return value ? (validateVoterId(value as string) ? null : 'Please enter a valid voter ID') : null;
      case 'precinct':
        return value ? (validatePrecinct(value as string) ? null : 'Please enter a valid precinct number') : null;
      case 'signature':
        return validateRequired(value as string) ? null : 'Please provide your electronic signature';
      default:
        return validateRequired(value) ? null : 'This field is required';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // For phone numbers, store only digits
    if (name === 'phone' || name === 'emergency_contact_phone') {
      const digits = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: digits }));
      return;
    }
    
    // Update form data directly for all other fields
    setFormData(prev => ({ ...prev, [name]: value }));

    // Validate other fields
    const error = validateField(name, value);
    setFieldErrors(prev => ({
      ...prev,
      [name]: error || ''
    }));
  };

  const handleInterestChange = (values: string[]) => {
    setSelectedInterests(values);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    const errors: Record<string, string> = {};
    Object.entries(formData).forEach(([name, value]) => {
      // Skip validation for optional fields
      if (name === 'is_cell_phone' || name === 'precinct' || name === 'voter_id' || name === 'tell_us_more') {
        return;
      }

      // For phone numbers, validate the raw digits
      if (name === 'phone' || name === 'emergency_contact_phone') {
        const digits = String(value).replace(/\D/g, '');
        console.log(`Validating ${name}:`, { original: value, digits, length: digits.length });
        if (digits.length !== 10) {
          errors[name] = 'Please enter a valid 10-digit phone number';
        }
        return;
      }
      
      const error = validateField(name, value);
      if (error) {
        errors[name] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      console.log('Validation errors:', errors);
      setFieldErrors(errors);
      setAlert({
        type: 'error',
        message: 'Please correct the errors in the form'
      });
      // Scroll to top of the form
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (step === 1) {
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
        // Check for duplicate email error
        if (error.code === '23505' && error.message?.includes('members_email_key')) {
          setAlert({
            type: 'error',
            message: 'This email address is already registered. Please use a different email or sign in if you already have an account.'
          });
          // Go back to step 1 and highlight the email field
          setStep(1);
          setFieldErrors(prev => ({
            ...prev,
            email: 'This email is already registered'
          }));
          return;
        }
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
      // Scroll to top on error
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
          error={fieldErrors['first_name']}
        />
        <TextField
          id="last_name"
          label="Last Name"
          value={formData.last_name}
          onChange={handleChange}
          required
          error={fieldErrors['last_name']}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          id="email"
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          error={fieldErrors['email']}
        />
        <div className="space-y-2">
          <TextField
            id="phone"
            label="Phone Number"
            type="tel"
            value={formatPhoneNumber(formData.phone)}
            onChange={handleChange}
            required
            error={fieldErrors['phone']}
            placeholder="(555) 555-5555"
          />
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_cell_phone"
              checked={formData.is_cell_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, is_cell_phone: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="is_cell_phone" className="ml-2 block text-sm text-gray-700">
              This is a cell phone number
            </label>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          id="birthdate"
          label="Birthdate"
          type="date"
          value={formData.birthdate}
          onChange={handleChange}
          required
          error={fieldErrors['birthdate']}
        />
        <SelectField
          id="tshirt_size"
          label="T-Shirt Size"
          value={formData.tshirt_size}
          onChange={handleChange}
          options={[
            { value: '', label: 'Select size' },
            ...shirtSizes
          ]}
        />
      </div>
      
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Membership Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            id="membership_type"
            label="Select Membership Type"
            value={formData.membership_type}
            onChange={handleChange}
            required
            options={[
              { value: '', label: 'Select membership type' },
              ...membershipTypes
            ]}
          />
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Membership Benefits</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Access to member-only events and meetings</li>
              <li>• Voting rights in club elections</li>
              <li>• Regular updates on local Democratic activities</li>
              <li>• Opportunities to volunteer and make a difference</li>
            </ul>
          </div>
        </div>
      </div>
      
      <TextField
        id="address"
        label="Street Address"
        value={formData.address}
        onChange={handleChange}
        required
        error={fieldErrors['address']}
      />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TextField
          id="city"
          label="City"
          value={formData.city}
          onChange={handleChange}
          className="col-span-2"
          required
          error={fieldErrors['city']}
        />
        <SelectField
          id="state"
          label="State"
          value={formData.state}
          onChange={handleChange}
          options={[
            { value: 'AL', label: 'Alabama' },
            { value: 'AK', label: 'Alaska' },
            { value: 'AZ', label: 'Arizona' },
            { value: 'AR', label: 'Arkansas' },
            { value: 'CA', label: 'California' },
            { value: 'CO', label: 'Colorado' },
            { value: 'CT', label: 'Connecticut' },
            { value: 'DE', label: 'Delaware' },
            { value: 'FL', label: 'Florida' },
            { value: 'GA', label: 'Georgia' },
            { value: 'HI', label: 'Hawaii' },
            { value: 'ID', label: 'Idaho' },
            { value: 'IL', label: 'Illinois' },
            { value: 'IN', label: 'Indiana' },
            { value: 'IA', label: 'Iowa' },
            { value: 'KS', label: 'Kansas' },
            { value: 'KY', label: 'Kentucky' },
            { value: 'LA', label: 'Louisiana' },
            { value: 'ME', label: 'Maine' },
            { value: 'MD', label: 'Maryland' },
            { value: 'MA', label: 'Massachusetts' },
            { value: 'MI', label: 'Michigan' },
            { value: 'MN', label: 'Minnesota' },
            { value: 'MS', label: 'Mississippi' },
            { value: 'MO', label: 'Missouri' },
            { value: 'MT', label: 'Montana' },
            { value: 'NE', label: 'Nebraska' },
            { value: 'NV', label: 'Nevada' },
            { value: 'NH', label: 'New Hampshire' },
            { value: 'NJ', label: 'New Jersey' },
            { value: 'NM', label: 'New Mexico' },
            { value: 'NY', label: 'New York' },
            { value: 'NC', label: 'North Carolina' },
            { value: 'ND', label: 'North Dakota' },
            { value: 'OH', label: 'Ohio' },
            { value: 'OK', label: 'Oklahoma' },
            { value: 'OR', label: 'Oregon' },
            { value: 'PA', label: 'Pennsylvania' },
            { value: 'RI', label: 'Rhode Island' },
            { value: 'SC', label: 'South Carolina' },
            { value: 'SD', label: 'South Dakota' },
            { value: 'TN', label: 'Tennessee' },
            { value: 'TX', label: 'Texas' },
            { value: 'UT', label: 'Utah' },
            { value: 'VT', label: 'Vermont' },
            { value: 'VA', label: 'Virginia' },
            { value: 'WA', label: 'Washington' },
            { value: 'WV', label: 'West Virginia' },
            { value: 'WI', label: 'Wisconsin' },
            { value: 'WY', label: 'Wyoming' }
          ]}
          required
        />
        <TextField
          id="zip"
          label="ZIP Code"
          value={formData.zip}
          onChange={handleChange}
          required
          error={fieldErrors['zip']}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          id="precinct"
          label="Precinct Number"
          value={formData.precinct}
          onChange={handleChange}
          error={fieldErrors['precinct']}
        />
        <TextField
          id="voter_id"
          label="Voter ID Number"
          value={formData.voter_id}
          onChange={handleChange}
          error={fieldErrors['voter_id']}
        />
      </div>
      
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h3 className="text-lg font-semibold mb-4">Emergency Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField
            id="emergency_contact_name"
            label="Emergency Contact Name"
            value={formData.emergency_contact_name}
            onChange={handleChange}
            required
            error={fieldErrors['emergency_contact_name']}
          />
          <TextField
            id="emergency_contact_phone"
            label="Emergency Contact Phone"
            type="tel"
            value={formatPhoneNumber(formData.emergency_contact_phone)}
            onChange={handleChange}
            required
            error={fieldErrors['emergency_contact_phone']}
            placeholder="(555) 555-5555"
          />
          <TextField
            id="emergency_contact_relationship"
            label="Relationship"
            value={formData.emergency_contact_relationship}
            onChange={handleChange}
            required
            error={fieldErrors['emergency_contact_relationship']}
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label 
          htmlFor="tell_us_more" 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Tell Us More
        </label>
        <textarea
          id="tell_us_more"
          name="tell_us_more"
          value={formData.tell_us_more}
          onChange={handleChange}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 min-h-[200px]"
          placeholder="Tell us more about your experience, skills, and expertise that you'd like us to be aware of"
        />
      </div>

      <div className="border-t border-gray-200 pt-4 mt-4">
        <h3 className="text-lg font-semibold mb-4">Acknowledgment</h3>
        
        <div className="bg-gray-50 p-6 rounded-lg mb-4">
          <p className="text-sm text-gray-700 mb-4">
            By adding my name and the date, I affirm that I am now registered with the Volusia County Supervisor of Elections to vote as a member of the Democratic Party. I understand and agree that I have a continuing obligation to inform the NW Volusia Democratic Club immediately, should there be any change in my voter registration.
          </p>
          <p className="text-sm text-gray-700">
            If you have any questions or require additional information, please email info@nwdemocrats.org or text/call 386-853-1580.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="signature" className="block text-sm font-medium text-gray-700 mb-1">
              Electronic Signature
            </label>
            <TextField
              id="signature"
              value={formData.signature}
              onChange={handleChange}
              placeholder="Type your full name to sign"
              className="font-['Caveat'] text-xl"
              required
              error={fieldErrors['signature']}
            />
            <p className="mt-1 text-sm text-gray-500">
              By typing your name above, you are providing your electronic signature
            </p>
          </div>
        </div>
      </div>
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
          <p className="text-lg text-gray-600 mb-8">
            Join {brandConfig.name} and help make a difference in our community.
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

// Helper function to format display names
const formatDisplayName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default RegistrationPage;