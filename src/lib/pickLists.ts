import { supabase } from './supabase';

export interface PickListValue {
  id: string;
  value: string;  // HTML-compatible value (auto-generated)
  name: string;   // User-friendly name (what user enters)
  description: string;
  display_order: number;
  is_active: boolean;
}

export interface PickListCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
}

// Cache for pick list values
const pickListCache: Record<string, PickListValue[]> = {};

// Convert user-friendly name to HTML-compatible value
export function formatValueForHTML(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')  // Replace special chars with underscore
    .replace(/^_+|_+$/g, '')      // Remove leading/trailing underscores
    .replace(/_+/g, '_');         // Replace multiple underscores with single
}

// Format value for display
export function formatValueForDisplay(value: string): string {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function getPickListValues(categoryName: string): Promise<PickListValue[]> {
  // Check cache first
  if (pickListCache[categoryName]) {
    console.log(`Using cached values for ${categoryName}:`, pickListCache[categoryName]);
    return pickListCache[categoryName];
  }

  try {
    console.log(`Fetching values for category: ${categoryName}`);
    // First get the category ID
    const { data: categoryData, error: categoryError } = await supabase
      .from('pick_list_categories')
      .select('id')
      .eq('name', categoryName)
      .single();

    if (categoryError) {
      console.error(`Error fetching category for ${categoryName}:`, categoryError);
      return [];
    }

    if (!categoryData?.id) {
      console.error(`Category not found for ${categoryName}`);
      return [];
    }

    console.log(`Found category ID ${categoryData.id} for ${categoryName}`);

    // Then get the values
    const { data, error } = await supabase
      .from('pick_list_values')
      .select('*')
      .eq('category_id', categoryData.id)
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error(`Error fetching pick list values for ${categoryName}:`, error);
      return [];
    }

    if (!data || data.length === 0) {
      console.error(`No values found for category ${categoryName}`);
      return [];
    }

    // Format the values to use name as label
    const formattedData = data.map((item: PickListValue) => ({
      ...item,
      label: item.name // Use name for display
    }));

    console.log(`Loaded ${formattedData.length} values for ${categoryName}:`, formattedData);

    // Update cache
    pickListCache[categoryName] = formattedData;
    return formattedData;
  } catch (error) {
    console.error(`Error in getPickListValues for ${categoryName}:`, error);
    return [];
  }
}

// Function to clear cache when values are updated
export function clearPickListCache(categoryName?: string) {
  if (categoryName) {
    delete pickListCache[categoryName];
  } else {
    Object.keys(pickListCache).forEach(key => delete pickListCache[key]);
  }
}

// Common pick list categories
export const PICK_LIST_CATEGORIES = {
  EVENT_TYPES: 'event_types',
  MEMBERSHIP_TYPES: 'membership_types',
  MEMBER_STATUSES: 'member_statuses',
  PAYMENT_STATUSES: 'payment_statuses',
  PAYMENT_METHODS: 'payment_methods',
  TSHIRT_SIZES: 'tshirt_sizes',
  VOLUNTEER_CATEGORIES: 'volunteer_categories',
} as const; 