import React, { useState } from 'react';
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
  const [internalValue, setInternalValue] = useState(value);

  // Only use internalValue for tel fields, otherwise use value
  const inputValue = type === 'tel' ? internalValue : value;

  // Sync internalValue with value prop if it changes externally
  React.useEffect(() => {
    if (type === 'tel') setInternalValue(value);
  }, [value, type]);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (type === 'tel') {
      setInternalValue(formatPhoneNumber(e.target.value));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (type === 'tel') {
      // Only allow digits
      const digitsOnly = e.target.value.replace(/\D/g, '');
      setInternalValue(digitsOnly);
      // Call parent onChange with digits only
      onChange({ ...e, target: { ...e.target, value: digitsOnly } });
    } else {
      onChange(e);
    }
  };

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
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-full px-3 py-2 border ${
          error ? 'border-red-500' : 'border-gray-300'
        } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
        required={required}
        placeholder={placeholder}
        autoComplete={type === 'tel' ? 'tel' : undefined}
      />
      {type === 'tel' && (
        <p className="mt-1 text-xs text-gray-500">Enter digits only, no spaces or dashes.</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default TextField;