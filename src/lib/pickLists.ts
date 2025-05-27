import { supabase } from './supabase';

export interface PickListValue {
  id: string;
  value: string;
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

export async function getPickListValues(categoryName: string): Promise<PickListValue[]> {
  // Check cache first
  if (pickListCache[categoryName]) {
    return pickListCache[categoryName];
  }

  try {
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

    // Format the values to use value as label
    const formattedData = (data || []).map((item: PickListValue) => ({
      ...item,
      label: item.value // Use value as the label
    }));

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