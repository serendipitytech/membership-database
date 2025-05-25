import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { Plus, Edit2, Trash2, ChevronRight } from 'lucide-react';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<InterestCategory[]>([]);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [editingCategory, setEditingCategory] = useState<InterestCategory | null>(null);
  const [editingInterest, setEditingInterest] = useState<Interest | null>(null);
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
        await fetchCategories();
      } catch (error) {
        console.error('Error checking admin status:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [navigate]);

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('interest_categories')
        .select('*')
        .order('display_order');
      
      if (categoriesError) throw categoriesError;

      const { data: interestsData, error: interestsError } = await supabase
        .from('interests')
        .select('*')
        .order('display_order');
      
      if (interestsError) throw interestsError;

      const categoriesWithInterests = categoriesData.map(category => ({
        ...category,
        interests: interestsData.filter(interest => interest.category_id === category.id)
      }));

      setCategories(categoriesWithInterests);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load interest categories'
      });
    }
  };

  const handleSaveCategory = async (category: Partial<InterestCategory>) => {
    try {
      if (editingCategory?.id) {
        // Update existing category
        const { error } = await supabase
          .from('interest_categories')
          .update(category)
          .eq('id', editingCategory.id);
        
        if (error) throw error;
      } else {
        // Create new category
        const { error } = await supabase
          .from('interest_categories')
          .insert([category]);
        
        if (error) throw error;
      }

      setAlert({
        type: 'success',
        message: `Category ${editingCategory?.id ? 'updated' : 'created'} successfully`
      });
      setEditingCategory(null);
      await fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      setAlert({
        type: 'error',
        message: 'Failed to save category'
      });
    }
  };

  const handleSaveInterest = async (interest: Partial<Interest>) => {
    try {
      if (editingInterest?.id) {
        // Update existing interest
        const { error } = await supabase
          .from('interests')
          .update(interest)
          .eq('id', editingInterest.id);
        
        if (error) throw error;
      } else {
        // Create new interest
        const { error } = await supabase
          .from('interests')
          .insert([interest]);
        
        if (error) throw error;
      }

      setAlert({
        type: 'success',
        message: `Interest ${editingInterest?.id ? 'updated' : 'created'} successfully`
      });
      setEditingInterest(null);
      await fetchCategories();
    } catch (error) {
      console.error('Error saving interest:', error);
      setAlert({
        type: 'error',
        message: 'Failed to save interest'
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('interest_categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;

      setAlert({
        type: 'success',
        message: 'Category deleted successfully'
      });
      await fetchCategories();
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

      setAlert({
        type: 'success',
        message: 'Interest deleted successfully'
      });
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting interest:', error);
      setAlert({
        type: 'error',
        message: 'Failed to delete interest'
      });
    }
  };

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
                  <Button
                    onClick={() => setEditingCategory(category)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteCategory(category.id)}
                    variant="danger"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <Button
                    onClick={() => setEditingInterest({ category_id: category.id, name: '', description: '', display_order: category.interests.length })}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Interest
                  </Button>
                </div>

                <div className="space-y-2">
                  {category.interests.map((interest) => (
                    <div
                      key={interest.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">{interest.name}</h4>
                        {interest.description && (
                          <p className="text-sm text-gray-600">{interest.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => setEditingInterest(interest)}
                          variant="outline"
                          size="sm"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteInterest(interest.id)}
                          variant="danger"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                    name: formData.get('name') as string,
                    description: formData.get('description') as string,
                    display_order: parseInt(formData.get('display_order') as string),
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
                  handleSaveInterest({
                    category_id: editingInterest.category_id,
                    name: formData.get('name') as string,
                    description: formData.get('description') as string,
                    display_order: parseInt(formData.get('display_order') as string),
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