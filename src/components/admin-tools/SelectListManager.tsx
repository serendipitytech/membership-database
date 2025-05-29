import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  getPickListValues,
  PICK_LIST_CATEGORIES,
  formatValueForHTML,
  formatValueForDisplay,
  clearPickListCache,
  PickListCategory,
  PickListValue
} from '../../lib/pickLists';
import { Plus, Edit2, Trash2, Check, X, ArrowUp, ArrowDown } from 'lucide-react';
import Button from '../UI/Button';
import Alert from '../UI/Alert';

const SelectListManager: React.FC = () => {
  // State for categories and values
  const [categories, setCategories] = useState<PickListCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PickListCategory | null>(null);
  const [values, setValues] = useState<PickListValue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  // Modal/dialog state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PickListCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', display_order: 0 });
  const [showValueModal, setShowValueModal] = useState(false);
  const [editingValue, setEditingValue] = useState<PickListValue | null>(null);
  const [valueForm, setValueForm] = useState({ name: '', description: '', display_order: 0 });

  // Load categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Load values when category changes
  useEffect(() => {
    if (selectedCategory) fetchValues(selectedCategory.name);
    else setValues([]);
  }, [selectedCategory]);

  const fetchCategories = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('pick_list_categories')
      .select('*')
      .order('display_order');
    if (error) setAlert({ type: 'error', message: 'Failed to load categories' });
    setCategories(data || []);
    setIsLoading(false);
  };

  const fetchValues = async (categoryName: string) => {
    setIsLoading(true);
    const vals = await getPickListValues(categoryName);
    setValues(vals);
    setIsLoading(false);
  };

  // Category CRUD
  const openCategoryModal = (cat?: PickListCategory) => {
    setEditingCategory(cat || null);
    setCategoryForm(cat ? { name: cat.name, description: cat.description, display_order: cat.display_order } : { name: '', description: '', display_order: 0 });
    setShowCategoryModal(true);
  };
  const saveCategory = async () => {
    setIsLoading(true);
    if (editingCategory) {
      // Update
      const { error } = await supabase
        .from('pick_list_categories')
        .update({ ...categoryForm })
        .eq('id', editingCategory.id);
      if (error) setAlert({ type: 'error', message: 'Failed to update category' });
      else setAlert({ type: 'success', message: 'Category updated' });
    } else {
      // Create
      const { error } = await supabase
        .from('pick_list_categories')
        .insert([{ ...categoryForm }]);
      if (error) setAlert({ type: 'error', message: 'Failed to create category' });
      else setAlert({ type: 'success', message: 'Category created' });
    }
    setShowCategoryModal(false);
    fetchCategories();
    setIsLoading(false);
  };
  const deleteCategory = async (cat: PickListCategory) => {
    if (!window.confirm('Delete this category?')) return;
    setIsLoading(true);
    const { error } = await supabase
      .from('pick_list_categories')
      .delete()
      .eq('id', cat.id);
    if (error) setAlert({ type: 'error', message: 'Failed to delete category' });
    else setAlert({ type: 'success', message: 'Category deleted' });
    if (selectedCategory?.id === cat.id) setSelectedCategory(null);
    fetchCategories();
    setIsLoading(false);
  };

  // Value CRUD
  const openValueModal = (val?: PickListValue) => {
    setEditingValue(val || null);
    setValueForm(val ? { name: val.name, description: val.description, display_order: val.display_order } : { name: '', description: '', display_order: 0 });
    setShowValueModal(true);
  };
  const saveValue = async () => {
    if (!selectedCategory) return;
    setIsLoading(true);
    if (editingValue) {
      // Update
      const { error } = await supabase
        .from('pick_list_values')
        .update({ ...valueForm, value: formatValueForHTML(valueForm.name) })
        .eq('id', editingValue.id);
      if (error) setAlert({ type: 'error', message: 'Failed to update value' });
      else setAlert({ type: 'success', message: 'Value updated' });
    } else {
      // Create
      const { error } = await supabase
        .from('pick_list_values')
        .insert([{ ...valueForm, value: formatValueForHTML(valueForm.name), category_id: selectedCategory.id, is_active: true }]);
      if (error) setAlert({ type: 'error', message: 'Failed to create value' });
      else setAlert({ type: 'success', message: 'Value created' });
    }
    setShowValueModal(false);
    clearPickListCache(selectedCategory.name);
    fetchValues(selectedCategory.name);
    setIsLoading(false);
  };
  const deleteValue = async (val: PickListValue) => {
    if (!window.confirm('Delete this value?')) return;
    setIsLoading(true);
    const { error } = await supabase
      .from('pick_list_values')
      .delete()
      .eq('id', val.id);
    if (error) setAlert({ type: 'error', message: 'Failed to delete value' });
    else setAlert({ type: 'success', message: 'Value deleted' });
    clearPickListCache(selectedCategory?.name);
    fetchValues(selectedCategory?.name || '');
    setIsLoading(false);
  };

  // UI
  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Category List */}
      <div className="md:w-1/4 w-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">Categories</h3>
          <Button size="sm" onClick={() => openCategoryModal()}><Plus className="w-4 h-4" /></Button>
        </div>
        <ul className="bg-white rounded shadow divide-y">
          {categories.map(cat => (
            <li key={cat.id} className={`flex items-center justify-between px-3 py-2 cursor-pointer ${selectedCategory?.id === cat.id ? 'bg-primary-50' : ''}`}
                onClick={() => setSelectedCategory(cat)}>
              <span>{cat.name}</span>
              <span className="flex gap-1">
                <button onClick={e => { e.stopPropagation(); openCategoryModal(cat); }}><Edit2 className="w-4 h-4 text-blue-500" /></button>
                <button onClick={e => { e.stopPropagation(); deleteCategory(cat); }}><Trash2 className="w-4 h-4 text-red-500" /></button>
              </span>
            </li>
          ))}
        </ul>
      </div>
      {/* Value List */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">{selectedCategory ? `Values for "${selectedCategory.name}"` : 'Select a category'}</h3>
          {selectedCategory && <Button size="sm" onClick={() => openValueModal()}><Plus className="w-4 h-4" /></Button>}
        </div>
        {selectedCategory ? (
          <ul className="bg-white rounded shadow divide-y">
            {values.map(val => (
              <li key={val.id} className="flex items-center justify-between px-3 py-2">
                <span>{val.name}</span>
                <span className="flex gap-1">
                  <button onClick={() => openValueModal(val)}><Edit2 className="w-4 h-4 text-blue-500" /></button>
                  <button onClick={() => deleteValue(val)}><Trash2 className="w-4 h-4 text-red-500" /></button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-400">Select a category to view values.</div>
        )}
      </div>
      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h4 className="font-semibold mb-4">{editingCategory ? 'Edit Category' : 'Add Category'}</h4>
            <div className="mb-2">
              <label className="block text-sm font-medium">Name</label>
              <input className="w-full border rounded px-2 py-1" value={categoryForm.name} onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium">Description</label>
              <input className="w-full border rounded px-2 py-1" value={categoryForm.description} onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium">Display Order</label>
              <input type="number" className="w-full border rounded px-2 py-1" value={categoryForm.display_order} onChange={e => setCategoryForm(f => ({ ...f, display_order: Number(e.target.value) }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" onClick={() => setShowCategoryModal(false)} variant="secondary">Cancel</Button>
              <Button size="sm" onClick={saveCategory}>{editingCategory ? 'Save' : 'Add'}</Button>
            </div>
          </div>
        </div>
      )}
      {/* Value Modal */}
      {showValueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h4 className="font-semibold mb-4">{editingValue ? 'Edit Value' : 'Add Value'}</h4>
            <div className="mb-2">
              <label className="block text-sm font-medium">Name</label>
              <input className="w-full border rounded px-2 py-1" value={valueForm.name} onChange={e => setValueForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium">Description</label>
              <input className="w-full border rounded px-2 py-1" value={valueForm.description} onChange={e => setValueForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium">Display Order</label>
              <input type="number" className="w-full border rounded px-2 py-1" value={valueForm.display_order} onChange={e => setValueForm(f => ({ ...f, display_order: Number(e.target.value) }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" onClick={() => setShowValueModal(false)} variant="secondary">Cancel</Button>
              <Button size="sm" onClick={saveValue}>{editingValue ? 'Save' : 'Add'}</Button>
            </div>
          </div>
        </div>
      )}
      {/* Alert */}
      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} className="fixed bottom-4 right-4 z-50" />
      )}
    </div>
  );
};

export default SelectListManager; 