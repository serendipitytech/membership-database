import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import { getMemberByEmail, getCurrentUser } from '../lib/supabase';
import { CreditCard, ExternalLink } from 'lucide-react';
import { brandConfig } from '../brand';

const PaymentPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [membershipType, setMembershipType] = useState('');
  const [membershipFee, setMembershipFee] = useState(0);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const memberId = location.state?.memberId;

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        // If we have a memberId from registration flow, use it
        if (memberId) {
          // In a real app, fetch member data using the ID
          setMembershipType('individual');
          setMembershipFee(25);
          setIsLoading(false);
          return;
        }
        
        // Otherwise check if user is logged in
        const { user } = await getCurrentUser();
        
        if (!user) {
          navigate('/login');
          return;
        }
        
        const { member, error } = await getMemberByEmail(user.email || '');
        
        if (error || !member) {
          console.error('Error fetching member data:', error);
          navigate('/register');
          return;
        }
        
        // Set membership type and fee based on member data
        setMembershipType(member.membership_type || 'individual');
        
        // Calculate fee based on membership type
        let fee = 25; // default for individual
        
        switch (member.membership_type) {
          case 'individual':
            fee = 25;
            break;
          case 'family':
            fee = 40;
            break;
          case 'student':
            fee = 10;
            break;
          case 'sustaining':
            fee = 100;
            break;
          default:
            fee = 25;
        }
        
        setMembershipFee(fee);
        
      } catch (error) {
        console.error('Error:', error);
        setAlert({
          type: 'error',
          message: 'There was an error loading your payment information. Please try again.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMemberData();
  }, [memberId, navigate]);

  const handleActBluePayment = () => {
    // Redirect to ActBlue with the static sustainer URL
    window.location.href = 'https://secure.actblue.com/donate/nwclub-sustainer';
    
    setAlert({
      type: 'info',
      message: 'Redirecting to ActBlue for payment processing...'
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
            <div className="h-64 bg-gray-200 rounded mb-8"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-primary-100">
            <CreditCard className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">Membership Payment</h1>
          <p className="mt-2 text-gray-600">
            Complete your membership by making a payment
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
        
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Summary</h2>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between mb-2">
                <p className="text-gray-600">Membership Type:</p>
                <p className="text-gray-900 capitalize">{membershipType}</p>
              </div>
              <div className="flex justify-between mb-2">
                <p className="text-gray-600">Duration:</p>
                <p className="text-gray-900">1 Year</p>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-4 mt-4">
                <p>Total:</p>
                <p>${membershipFee}.00</p>
              </div>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Method</h2>
            
            <p className="text-gray-600 mb-6">
              We use ActBlue for secure payment processing. You will be redirected to complete your payment.
            </p>
            
            <Button
              onClick={handleActBluePayment}
              fullWidth
              className="mb-4"
            >
              Pay with ActBlue <ExternalLink className="ml-1 h-4 w-4" />
            </Button>
            
            <p className="text-sm text-gray-500 text-center">
              By proceeding, you agree to our terms and conditions.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default PaymentPage;