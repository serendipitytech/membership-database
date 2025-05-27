import React from 'react';
import { formatPhoneNumber } from '../../lib/formValidation';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  required?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
}

const TextField: React.FC<TextFieldProps> = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  error,
  className = '',
  placeholder
}) => {
  // Format phone numbers for display
  const displayValue = type === 'tel' ? formatPhoneNumber(value) : value;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        id={id}
        name={id}
        value={displayValue}
        onChange={onChange}
        className={`w-full px-3 py-2 border ${
          error ? 'border-red-500' : 'border-gray-300'
        } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
        required={required}
        placeholder={placeholder}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default TextField;