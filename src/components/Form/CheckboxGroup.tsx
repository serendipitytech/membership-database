import React from 'react';

interface Option {
  id: string;
  label: string;
}

interface CheckboxGroupProps {
  legend: string;
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  required?: boolean;
  error?: string;
  className?: string;
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  legend,
  options,
  selectedValues,
  onChange,
  required = false,
  error,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (e.target.checked) {
      onChange([...selectedValues, value]);
    } else {
      onChange(selectedValues.filter(item => item !== value));
    }
  };

  return (
    <fieldset className={`mb-4 ${className}`}>
      <legend className="text-sm font-medium text-gray-700 mb-2">
        {legend}
        {required && <span className="text-accent-600 ml-1">*</span>}
      </legend>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.id} className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id={option.id}
                name={option.id}
                type="checkbox"
                value={option.id}
                checked={selectedValues.includes(option.id)}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor={option.id} className="text-gray-700">
                {option.label}
              </label>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </fieldset>
  );
};

export default CheckboxGroup;