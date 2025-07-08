import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout/Layout';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import Card from '../../components/UI/Card';
import { supabase } from '../../lib/supabase';
import { Users, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SyncResult {
  added: number;
  updated: number;
  errors: string[];
}

interface ListMember {
  contact_id: string;
  email_address: string;
  first_name?: string;
  last_name?: string;
  status: string;
}

const AdminConstantContact: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [listMembers, setListMembers] = useState<ListMember[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = () => {
    // Since we moved all Constant Contact logic to backend API routes,
    // the frontend doesn't need the VITE_ prefixed environment variables anymore.
    // The backend will validate the server-side environment variables.
    setIsConfigured(true);
    testConnection();
  };

  const testConnection = async () => {
    if (!isConfigured) return;
    setConnectionStatus('checking');
    try {
      const response = await fetch('/api/constant-contact/test-connection');
      const data = await response.json();
      if (data.ok) {
        setConnectionStatus('connected');
      } else {
        // If the error is due to missing environment variables, show configuration screen
        if (data.message && data.message.includes('Missing Constant Contact environment variables')) {
          setIsConfigured(false);
        }
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  const fetchListMembers = async () => {
    if (!isConfigured) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/constant-contact/list-members');
      const data = await response.json();
      if (data.ok) {
        setListMembers(data.members);
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to fetch Constant Contact list members' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to fetch Constant Contact list members' });
    } finally {
      setIsLoading(false);
    }
  };

  const syncMembers = async () => {
    if (!isConfigured) return;
    setIsSyncing(true);
    setAlert(null);
    setSyncResult(null);
    try {
      // Fetch all members from database
      const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .eq('status', 'active');
      if (error) throw error;
      // POST to backend API
      const response = await fetch('/api/constant-contact/sync-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members }),
      });
      const result = await response.json();
      setSyncResult(result);
      if (!result.ok) {
        setAlert({ type: 'error', message: result.message || 'Sync failed' });
      } else if (result.errors && result.errors.length > 0) {
        setAlert({ type: 'warning', message: `Sync completed with ${result.errors.length} errors. ${result.added} added, ${result.updated} updated.` });
      } else {
        setAlert({ type: 'success', message: `Sync completed successfully! ${result.added} members added, ${result.updated} members updated.` });
      }
      await fetchListMembers();
    } catch (error) {
      setAlert({ type: 'error', message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'checking':
        return 'Checking...';
    }
  };

  if (!isConfigured) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Constant Contact Integration</h1>
            <p className="mt-2 text-gray-600">Manage your email list synchronization</p>
          </div>

          <Alert
            type="warning"
            message="Constant Contact is not configured. Please add the required environment variables to your Vercel project: CONSTANT_CONTACT_API_KEY, CONSTANT_CONTACT_REFRESH_TOKEN, and CONSTANT_CONTACT_LIST_ID"
            className="mb-6"
          />

          <Card className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Configuration Required</h2>
            <p className="text-gray-600 mb-4">
              To use Constant Contact integration, you need to configure the following environment variables in your Vercel project settings:
            </p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li><code className="bg-gray-100 px-2 py-1 rounded">CONSTANT_CONTACT_API_KEY</code> - Your Constant Contact API key</li>
              <li><code className="bg-gray-100 px-2 py-1 rounded">CONSTANT_CONTACT_REFRESH_TOKEN</code> - Your Constant Contact refresh token (obtained via OAuth2 PKCE)</li>
              <li><code className="bg-gray-100 px-2 py-1 rounded">CONSTANT_CONTACT_LIST_ID</code> - The ID of your Constant Contact list</li>
            </ul>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Quick Setup</h3>
              <p className="text-sm text-blue-700 mb-2">
                Run the automated setup script to obtain your refresh token:
              </p>
              <code className="text-xs bg-blue-100 px-2 py-1 rounded block">
                node scripts/setup-constant-contact.js
              </code>
              <p className="text-sm text-blue-700 mt-2">
                Then add all environment variables to your Vercel project settings (not with VITE_ prefix).
              </p>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Constant Contact Integration</h1>
          <p className="mt-2 text-gray-600">Manage your email list synchronization</p>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}

        {/* Status Card */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <h2 className="text-lg font-medium text-gray-900">Connection Status</h2>
                <p className="text-sm text-gray-600">{getStatusText()}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={connectionStatus === 'checking'}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
          </div>
        </Card>

        {/* Sync Controls */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Synchronization</h2>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={fetchListMembers}
                disabled={isLoading || !isConfigured}
              >
                <Users className="h-4 w-4 mr-2" />
                {isLoading ? 'Loading...' : 'Refresh List'}
              </Button>
              <Button
                onClick={syncMembers}
                disabled={isSyncing || !isConfigured}
                isLoading={isSyncing}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isSyncing ? 'Syncing...' : 'Sync Members'}
              </Button>
            </div>
          </div>

          {syncResult && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Last Sync Results</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-green-600 font-medium">{syncResult.added}</span> members added
                </div>
                <div>
                  <span className="text-blue-600 font-medium">{syncResult.updated}</span> members updated
                </div>
                <div>
                  <span className="text-red-600 font-medium">{syncResult.errors.length}</span> errors
                </div>
              </div>
              {syncResult.errors.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-medium text-gray-900 mb-2">Errors:</h4>
                  <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                    {syncResult.errors.map((error, index) => (
                      <li key={index} className="flex items-start">
                        <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* List Members */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Constant Contact List Members</h2>
            <span className="text-sm text-gray-600">{listMembers.length} members</span>
          </div>

          {listMembers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {listMembers.map((member) => (
                    <tr key={member.contact_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.email_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          member.status === 'SUBSCRIBED' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No list members loaded. Click "Refresh List" to load current members.</p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default AdminConstantContact; 