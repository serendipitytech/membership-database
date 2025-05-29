import React, { useState } from 'react';
import { ListChecks, Upload } from 'lucide-react';
import Layout from '../../components/Layout/Layout';
import SelectListManager from '../../components/admin-tools/SelectListManager';
import ImportManager from '../../components/admin-tools/ImportManager';

const ADMIN_TOOLS = [
  {
    key: 'select-list',
    label: 'Select List Management',
    icon: <ListChecks className="w-5 h-5 mr-2" />,
    component: <SelectListManager />,
  },
  {
    key: 'data-imports',
    label: 'Data Imports',
    icon: <Upload className="w-5 h-5 mr-2" />,
    component: <ImportManager />,
  },
  // Add more tools here in the future
];

const AdminFunctions: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<string | null>(ADMIN_TOOLS[0].key);

  const currentTool = ADMIN_TOOLS.find(tool => tool.key === selectedTool);

  return (
    <Layout>
      <div className="flex flex-col md:flex-row h-full min-h-[60vh] bg-gray-50 rounded-lg shadow p-4">
        {/* Sidebar Navigation */}
        <nav className="md:w-64 w-full md:border-r border-b md:border-b-0 border-gray-200 mb-4 md:mb-0">
          <ul className="flex md:flex-col flex-row gap-2 md:gap-0">
            {ADMIN_TOOLS.map(tool => (
              <li key={tool.key}>
                <button
                  className={`flex items-center w-full px-4 py-3 rounded-md text-left transition-colors text-sm font-medium mb-2 md:mb-0 md:mr-0 mr-2 ${
                    selectedTool === tool.key
                      ? 'bg-primary-100 text-primary-700 font-semibold'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                  onClick={() => setSelectedTool(tool.key)}
                >
                  {tool.icon}
                  {tool.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {/* Main Content */}
        <div className="flex-1 p-4">
          {currentTool ? (
            currentTool.component
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <span className="text-2xl mb-2">🛠️</span>
              <span>Select an admin function to get started.</span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminFunctions; 