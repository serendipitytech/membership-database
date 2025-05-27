// Phone number formatting
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
};

// ZIP code validation
export const validateZipCode = (zip: string): boolean => {
  return /^\d{5}$/.test(zip);
};

// Email validation
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Phone number validation (allows formatted or unformatted)
export const validatePhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
};

// Date validation (must be in the past)
export const validateDate = (date: string): boolean => {
  const inputDate = new Date(date);
  const today = new Date();
  return inputDate < today;
};

// Required field validation
export const validateRequired = (value: string | boolean): boolean => {
  if (typeof value === 'boolean') {
    return value === true;
  }
  return value.trim().length > 0;
};

// Name validation (letters, spaces, hyphens, and apostrophes only)
export const validateName = (name: string): boolean => {
  return /^[A-Za-z\s\-']+$/.test(name);
};

// Address validation (letters, numbers, spaces, and common address characters)
export const validateAddress = (address: string): boolean => {
  return /^[A-Za-z0-9\s\.,#\-']+$/.test(address);
};

// City validation (letters, spaces, hyphens, and periods)
export const validateCity = (city: string): boolean => {
  return /^[A-Za-z\s\-\.]+$/.test(city);
};

// Voter ID validation (alphanumeric)
export const validateVoterId = (id: string): boolean => {
  return /^[A-Za-z0-9]+$/.test(id);
};

// Precinct validation (numbers and optional letters)
export const validatePrecinct = (precinct: string): boolean => {
  return /^[A-Za-z0-9]+$/.test(precinct);
}; 