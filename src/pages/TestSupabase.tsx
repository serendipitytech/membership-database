import React, { useState } from 'react';
import { testSupabaseConnection } from '../lib/test-supabase';
import Layout from '../components/Layout/Layout';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';

const TestSupabase: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const runTests = async () => {
    setIsLoading(true);
    setTestResult('Running tests...');
    setAlert(null);

    try {
      const result = await testSupabaseConnection();
      setTestResult(result ? 'All tests passed!' : 'Some tests failed. Check console for details.');
      if (result) {
        setAlert({
          type: 'success',
          message: 'All Supabase tests passed successfully!'
        });
      } else {
        setAlert({
          type: 'error',
          message: 'Some tests failed. Check the console for details.'
        });
      }
    } catch (error) {
      setTestResult(`Error running tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAlert({
        type: 'error',
        message: `Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Supabase Connection Test</h1>
        
        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600 mb-4">
            This page will test the Supabase connection and basic CRUD operations.
            Check the browser console for detailed test results.
          </p>
          
          <Button
            variant="primary"
            onClick={runTests}
            disabled={isLoading}
          >
            {isLoading ? 'Running Tests...' : 'Run Tests'}
          </Button>
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Test Results:</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {testResult}
          </pre>
        </div>
      </div>
    </Layout>
  );
};

export default TestSupabase; 