import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface InterestCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
  interests: Interest[];
}

interface Interest {
  id: string;
  category_id: string;
  name: string;
  description: string;
  display_order: number;
}

const AdminInterests: React.FC = () => {
  const [categories, setCategories] = useState<InterestCategory[]>([]);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [editingCategory, setEditingCategory] = useState<InterestCategory | null>(null);
  const [editingInterest, setEditingInterest] = useState<Interest | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminStatus();
    fetchCategories();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is an admin using the is_admin function
      const { data: isAdmin, error: adminError } = await supabase
        .rpc('is_admin', { user_id: user.id });

      if (adminError || !isAdmin) {
        setAlert({
          type: 'error',
          message: 'You do not have permission to access this page'
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAlert({
        type: 'error',
        message: 'Error verifying admin status'
      });
      navigate('/');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('interest_categories')
        .select(`
          id,
          name,
          display_order,
          interests (
            id,
            name,
            display_order
          )
        `)
        .order('display_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load interest categories'
      });
    }
  };

  const handleSaveCategory = async (category: InterestCategory) => {
    try {
      if (category.id) {
        // Update existing category
        const { error } = await supabase
          .from('interest_categories')
          .update({
            name: category.name,
            description: category.description,
            display_order: category.display_order
          })
          .eq('id', category.id);

        if (error) throw error;
      } else {
        // Create new category
        const { error } = await supabase
          .from('interest_categories')
          .insert([{
            name: category.name,
            description: category.description,
            display_order: category.display_order
          }]);

        if (error) throw error;
      }

      // Refresh categories
      await fetchCategories();
      setAlert({
        type: 'success',
        message: `Category ${category.id ? 'updated' : 'created'} successfully`
      });
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      setAlert({
        type: 'error',
        message: `Failed to ${category.id ? 'update' : 'create'} category`
      });
    }
  };

  const handleSaveInterest = async (categoryId: string, interest: Interest) => {
    try {
      // First check if we're authenticated and an admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAlert({
          type: 'error',
          message: 'You must be logged in to perform this action'
        });
        return;
      }

      // Check if user is an admin using the is_admin function
      const { data: isAdmin, error: adminError } = await supabase
        .rpc('is_admin', { user_id: user.id });

      if (adminError || !isAdmin) {
        setAlert({
          type: 'error',
          message: 'You do not have permission to perform this action'
        });
        return;
      }

      if (interest.id) {
        // Update existing interest
        const { error } = await supabase
          .from('interests')
          .update({
            name: interest.name,
            description: interest.description,
            display_order: interest.display_order
          })
          .eq('id', interest.id);

        if (error) {
          console.error('Update error details:', error);
          throw error;
        }
      } else {
        // Create new interest
        console.log('Creating new interest:', {
          name: interest.name,
          category_id: categoryId,
          description: interest.description,
          display_order: interest.display_order
        });

        const { error } = await supabase
          .from('interests')
          .insert([{
            name: interest.name,
            category_id: categoryId,
            description: interest.description,
            display_order: interest.display_order
          }]);

        if (error) {
          console.error('Insert error details:', error);
          throw error;
        }
      }

      // Refresh categories
      await fetchCategories();
      setAlert({
        type: 'success',
        message: `Interest ${interest.id ? 'updated' : 'created'} successfully`
      });
      setEditingInterest(null);
    } catch (error: any) {
      console.error('Error saving interest:', error);
      setAlert({
        type: 'error',
        message: `Failed to ${interest.id ? 'update' : 'create'} interest: ${error.message}`
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      // First delete all interests in this category
      const { error: interestsError } = await supabase
        .from('interests')
        .delete()
        .eq('category_id', categoryId);

      if (interestsError) throw interestsError;

      // Then delete the category
      const { error: categoryError } = await supabase
        .from('interest_categories')
        .delete()
        .eq('id', categoryId);

      if (categoryError) throw categoryError;

      // Refresh categories
      await fetchCategories();
      setAlert({
        type: 'success',
        message: 'Category deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      setAlert({
        type: 'error',
        message: 'Failed to delete category'
      });
    }
  };

  const handleDeleteInterest = async (interestId: string) => {
    try {
      const { error } = await supabase
        .from('interests')
        .delete()
        .eq('id', interestId);

      if (error) throw error;

      // Refresh categories
      await fetchCategories();
      setAlert({
        type: 'success',
        message: 'Interest deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting interest:', error);
      setAlert({
        type: 'error',
        message: 'Failed to delete interest'
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Interests</h1>
          <Button
            onClick={() => setEditingCategory({ name: '', description: '', display_order: categories.length })}
            variant="primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Category
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

        <div className="space-y-6">
          {categories.map((category) => (
            <Card key={category.id} className="overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="text-primary-600 hover:text-primary-900"
                    title="Edit category"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete category"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-900">Interests</h4>
                  <Button
                    onClick={() => setEditingInterest({ category_id: category.id, name: '', description: '', display_order: category.interests.length })}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Interest
                  </Button>
                </div>
                <div className="space-y-4">
                  {category.interests.map((interest) => (
                    <div key={interest.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h5 className="text-sm font-medium text-gray-900">{interest.name}</h5>
                        {interest.description && (
                          <p className="text-sm text-gray-600 mt-1">{interest.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingInterest(interest)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit interest"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteInterest(interest.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete interest"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Category Edit Modal */}
        {editingCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {editingCategory.id ? 'Edit Category' : 'New Category'}
                </h2>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleSaveCategory({
                    id: editingCategory.id,
                    name: formData.get('name') as string,
                    description: formData.get('description') as string,
                    display_order: parseInt(formData.get('display_order') as string) || 0,
                    interests: editingCategory.interests || []
                  });
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingCategory.name}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        name="description"
                        defaultValue={editingCategory.description}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Display Order</label>
                      <input
                        type="number"
                        name="display_order"
                        defaultValue={editingCategory.display_order}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingCategory(null)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                      Save
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* Interest Edit Modal */}
        {editingInterest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {editingInterest.id ? 'Edit Interest' : 'New Interest'}
                </h2>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleSaveInterest(editingInterest.category_id, {
                    id: editingInterest.id,
                    name: formData.get('name') as string,
                    description: formData.get('description') as string,
                    display_order: parseInt(formData.get('display_order') as string) || 0,
                    category_id: editingInterest.category_id
                  });
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingInterest.name}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        name="description"
                        defaultValue={editingInterest.description}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Display Order</label>
                      <input
                        type="number"
                        name="display_order"
                        defaultValue={editingInterest.display_order}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingInterest(null)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                      Save
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminInterests;