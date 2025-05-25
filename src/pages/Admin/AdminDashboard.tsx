import React from 'react';
import Layout from '../../components/Layout/Layout';

const AdminDashboard: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to the Admin Dashboard</h2>
          <p className="text-gray-600">
            Use the navigation bar above to manage different aspects of the membership database.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard; 