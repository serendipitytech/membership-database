import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import TextField from '../components/Form/TextField';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import { sendMagicLink } from '../lib/supabase';
import { Mail } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setAlert({
        type: 'error',
        message: 'Please enter your email address'
      });
      return;
    }
    
    setIsSubmitting(true);
    setAlert(null);
    
    try {
      const { error } = await sendMagicLink(email);
      
      if (error) {
        throw error;
      }
      
      setAlert({
        type: 'success',
        message: 'Magic link sent! Please check your email to sign in.'
      });
      
      // Clear form
      setEmail('');
      
    } catch (error) {
      console.error('Login error:', error);
      setAlert({
        type: 'error',
        message: 'There was an error sending the magic link. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-primary-100">
            <Mail className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">Sign In</h1>
          <p className="mt-2 text-gray-600">
            Access your NW Democrats membership account
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
        
        <div className="bg-white py-8 px-6 shadow-md rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <TextField
              id="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <div>
              <Button
                type="submit"
                isLoading={isSubmitting}
                fullWidth
              >
                Send Magic Link
              </Button>
            </div>
          </form>
          
          <div className="mt-6">
            <p className="text-center text-sm text-gray-600">
              We'll send you a magic link to your email that will sign you in instantly.
            </p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Not a member yet?{' '}
              <button 
                onClick={() => navigate('/register')}
                className="text-primary-600 hover:text-primary-500"
              >
                Join Now
              </button>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;