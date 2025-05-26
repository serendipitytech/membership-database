import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import TextField from '../components/Form/TextField';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import { Mail, Lock } from 'lucide-react';
import { signInWithPassword, sendMagicLink } from '../lib/supabase';
import { AuthError } from '@supabase/supabase-js';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [loginMethod, setLoginMethod] = useState<'password' | 'email'>('password');
  const navigate = useNavigate();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setAlert({
        type: 'error',
        message: 'Please enter both email and password'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await signInWithPassword(email, password);
      
      if (error) {
        throw error;
      }
      
      if (data?.user) {
        navigate('/account');
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error instanceof AuthError ? error.message : 'There was an error signing in. Please try again.';
      setAlert({
        type: 'error',
        message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setAlert({
        type: 'error',
        message: 'Please enter your email address'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await sendMagicLink(email);
      
      if (error) {
        throw error;
      }
      
      setAlert({
        type: 'success',
        message: 'Check your email for the login link'
      });
    } catch (error) {
      console.error('Email login error:', error);
      const message = error instanceof AuthError ? error.message : 'There was an error sending the login link. Please try again.';
      setAlert({
        type: 'error',
        message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (loginMethod === 'password') {
      handlePasswordLogin(e);
    } else {
      handleEmailLogin(e);
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
          <div className="flex justify-center space-x-4 mb-6">
            <button
              type="button"
              onClick={() => setLoginMethod('password')}
              className={`flex items-center px-4 py-2 rounded-md ${
                loginMethod === 'password'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Lock className="w-4 h-4 mr-2" />
              Password
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`flex items-center px-4 py-2 rounded-md ${
                loginMethod === 'email'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Link
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <TextField
              id="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            {loginMethod === 'password' && (
              <TextField
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}
            
            <div>
              <Button
                type="submit"
                isLoading={isSubmitting}
                fullWidth
              >
                {loginMethod === 'password' ? 'Sign In' : 'Send Login Link'}
              </Button>
            </div>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Not a member yet?{' '}
              <button 
                type="button"
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