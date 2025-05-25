import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { Clock, Download, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface VolunteerHour {
  id: string;
  member_id: string;
  date: string;
  hours: number;
  description: string;
  category: string;
  created_at: string;
  member: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const AdminVolunteerHours: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [volunteerHours, setVolunteerHours] = useState<VolunteerHour[]>([]);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { user } = await getCurrentUser();
        
        if (!user) {
          navigate('/login');
          return;
        }
        
        const { data: adminData } = await supabase
          .from('admins')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (!adminData) {
          navigate('/');
          return;
        }
        
        setIsAdmin(true);
        await fetchVolunteerHours();
      } catch (error) {
        console.error('Error checking admin status:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [navigate]);

  const fetchVolunteerHours = async () => {
    try {
      const { data, error } = await supabase
        .from('volunteer_hours')
        .select(`
          *,
          member:members(first_name, last_name, email)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      setVolunteerHours(data || []);
    } catch (error) {
      console.error('Error fetching volunteer hours:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load volunteer hours'
      });
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Member Name', 'Email', 'Hours', 'Category', 'Description'];
    const csvData = volunteerHours.map(record => [
      format(new Date(record.date), 'yyyy-MM-dd'),
      `${record.member.first_name} ${record.member.last_name}`,
      record.member.email,
      record.hours,
      record.category || 'N/A',
      record.description
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `volunteer-hours-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const filteredHours = volunteerHours.filter(record => {
    const searchMatch = 
      record.member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const categoryMatch = selectedCategory === 'all' || record.category === selectedCategory;
    
    return searchMatch && categoryMatch;
  });

  const totalHours = filteredHours.reduce((sum, record) => sum + record.hours, 0);
  const uniqueVolunteers = new Set(filteredHours.map(record => record.member_id)).size;
  const categories = Array.from(new Set(volunteerHours.map(record => record.category).filter(Boolean)));

  if (isLoading || !isAdmin) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Volunteer Hours</h1>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-5 w-5 mr-2" />
            Export CSV
          </Button>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-primary-50">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-600">Total Hours</p>
                  <p className="text-3xl font-bold text-primary-900">{totalHours}</p>
                </div>
                <Clock className="h-8 w-8 text-primary-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-primary-50">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-600">Unique Volunteers</p>
                  <p className="text-3xl font-bold text-primary-900">{uniqueVolunteers}</p>
                </div>
                <Clock className="h-8 w-8 text-primary-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-primary-50">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-600">Categories</p>
                  <p className="text-3xl font-bold text-primary-900">{categories.length}</p>
                </div>
                <Clock className="h-8 w-8 text-primary-500" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHours.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(record.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {record.member.first_name} {record.member.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {record.member.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.hours}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                        {record.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {record.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminVolunteerHours;