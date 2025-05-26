import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clearPickListCache, PICK_LIST_CATEGORIES } from '../lib/pickLists';

// Utility functions for name formatting
const formatDisplayName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatDatabaseName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

interface PickListCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
}

interface PickListValue {
  id: string;
  category_id: string;
  value: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

const AdminFunctions: React.FC = () => {
  const [categories, setCategories] = useState<PickListCategory[]>([]);
  const [values, setValues] = useState<PickListValue[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState<'category' | 'value'>('category');
  const [editingItem, setEditingItem] = useState<PickListCategory | PickListValue | null>(null);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    value: '',
    display_order: 0,
    is_active: true,
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminStatus();
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

      // If we get here, user is an admin, so fetch the data
      fetchCategories();
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
    const { data, error } = await supabase
      .from('pick_list_categories')
      .select('*')
      .order('display_order');
    
    if (error) {
      console.error('Error fetching categories:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load categories'
      });
      return;
    }
    
    setCategories(data || []);
    if (data && data.length > 0) {
      setSelectedCategory(data[0].id);
    }
  };

  const fetchValues = async (categoryId: string) => {
    const { data, error } = await supabase
      .from('pick_list_values')
      .select('*')
      .eq('category_id', categoryId)
      .order('display_order');
    
    if (error) {
      console.error('Error fetching values:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load values'
      });
      return;
    }
    
    setValues(data || []);
  };

  useEffect(() => {
    if (selectedCategory) {
      fetchValues(selectedCategory);
    }
  }, [selectedCategory]);

  const handleOpenDialog = (type: 'category' | 'value', item?: PickListCategory | PickListValue) => {
    setDialogType(type);
    setEditingItem(item || null);
    if (item) {
      setFormData({
        name: 'name' in item ? item.name : '',
        description: item.description || '',
        value: 'value' in item ? item.value : '',
        display_order: item.display_order,
        is_active: 'is_active' in item ? item.is_active : true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        value: '',
        display_order: 0,
        is_active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
  };

  const handleSave = async () => {
    try {
      if (dialogType === 'category') {
        const categoryData = {
          name: formatDatabaseName(formData.name),
          description: formData.description,
          display_order: formData.display_order,
        };

        if (editingItem) {
          const { error } = await supabase
            .from('pick_list_categories')
            .update(categoryData)
            .eq('id', editingItem.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('pick_list_categories')
            .insert([categoryData]);
          
          if (error) throw error;
        }
      } else {
        if (editingItem) {
          const { error } = await supabase
            .from('pick_list_values')
            .update({
              value: formData.value,
              description: formData.description,
              display_order: formData.display_order,
              is_active: formData.is_active,
            })
            .eq('id', editingItem.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('pick_list_values')
            .insert([{
              category_id: selectedCategory,
              value: formData.value,
              description: formData.description,
              display_order: formData.display_order,
              is_active: formData.is_active,
            }]);
          
          if (error) throw error;
        }
      }

      clearPickListCache();
      setAlert({
        type: 'success',
        message: `${dialogType === 'category' ? 'Category' : 'Value'} ${editingItem ? 'updated' : 'created'} successfully`
      });
      
      handleCloseDialog();
      
      // Store the current selected category
      const currentCategory = selectedCategory;
      
      // Fetch categories and values
      await fetchCategories();
      
      // Restore the selected category
      setSelectedCategory(currentCategory);
      if (currentCategory) {
        fetchValues(currentCategory);
      }
    } catch (error) {
      console.error(`Error ${editingItem ? 'updating' : 'creating'} ${dialogType}:`, error);
      setAlert({
        type: 'error',
        message: `Failed to ${editingItem ? 'update' : 'create'} ${dialogType}`
      });
    }
  };

  const handleDelete = async (type: 'category' | 'value', id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const table = type === 'category' ? 'pick_list_categories' : 'pick_list_values';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;

      clearPickListCache();
      setAlert({
        type: 'success',
        message: `${type === 'category' ? 'Category' : 'Value'} deleted successfully`
      });
      
      fetchCategories();
      if (selectedCategory) {
        fetchValues(selectedCategory);
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      setAlert({
        type: 'error',
        message: `Failed to delete ${type}`
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Functions</h1>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Categories Section */}
          <Card className="col-span-1">
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Category
                  </label>
                  <select
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  >
                    <option value="">Select a category...</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {formatDisplayName(category.name)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCategory && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-medium text-gray-900">
                        {formatDisplayName(categories.find(c => c.id === selectedCategory)?.name || '')}
                      </h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleOpenDialog('category', categories.find(c => c.id === selectedCategory))}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit category"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete('category', selectedCategory)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete category"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {categories.find(c => c.id === selectedCategory)?.description}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <Button
                    variant="primary"
                    onClick={() => handleOpenDialog('category')}
                    className="flex items-center w-full justify-center"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add New Category
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Values Section */}
          <Card className="col-span-2">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Pick List Values</h2>
                  {selectedCategory && (
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDisplayName(categories.find(c => c.id === selectedCategory)?.name || '')}
                    </p>
                  )}
                </div>
                <Button
                  variant="primary"
                  onClick={() => handleOpenDialog('value')}
                  className="flex items-center"
                  disabled={!selectedCategory}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Value
                </Button>
              </div>
              {selectedCategory ? (
                <div className="space-y-4">
                  {values.length > 0 ? (
                    values.map((value) => (
                      <div key={value.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{formatDisplayName(value.value)}</h3>
                          {value.description && (
                            <p className="text-sm text-gray-600 mt-1">{value.description}</p>
                          )}
                          <div className="flex items-center mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              value.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {value.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleOpenDialog('value', value)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit value"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete('value', value.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete value"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No values found for this category. Click "Add Value" to create one.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select a category to view and manage its values.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Dialog */}
        {openDialog && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={handleCloseDialog}
            ></div>
            
            {/* Modal */}
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <div 
                  className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {editingItem ? 'Edit' : 'Add'} {dialogType === 'category' ? 'Category' : 'Value'}
                    </h3>
                    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                      <div className="space-y-4">
                        {dialogType === 'category' ? (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Name</label>
                              <input
                                type="text"
                                value={editingItem ? formatDisplayName(formData.name) : formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                required
                                placeholder="Enter a friendly name (e.g., Shoe Colors)"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Value</label>
                              <input
                                type="text"
                                value={editingItem ? formatDisplayName(formData.value) : formData.value}
                                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                required
                                placeholder="Enter a friendly name (e.g., Red Shoes)"
                              />
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                                Active
                              </label>
                            </div>
                          </>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Display Order</label>
                          <input
                            type="number"
                            value={formData.display_order}
                            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            min="0"
                          />
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCloseDialog}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                          {editingItem ? 'Save Changes' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminFunctions; 