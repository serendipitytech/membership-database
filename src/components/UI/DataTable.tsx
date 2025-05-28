import React, { useState, useMemo, ChangeEvent } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number);
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Search...',
  className = ''
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | ((row: T) => string | number);
    direction: 'asc' | 'desc';
  } | null>(null);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter(row => {
      return columns.some(column => {
        const value = typeof column.accessor === 'function'
          ? column.accessor(row)
          : row[column.accessor];

        if (value === null || value === undefined) return false;
        
        // Handle nested objects
        if (typeof value === 'object') {
          return Object.values(value).some(nestedValue => 
            String(nestedValue).toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  }, [data, searchTerm, columns]);

  // Sort data based on sort configuration
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = typeof sortConfig.key === 'function' 
        ? sortConfig.key(a)
        : a[sortConfig.key];
      const bValue = typeof sortConfig.key === 'function'
        ? sortConfig.key(b)
        : b[sortConfig.key];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Handle nested objects
      if (typeof aValue === 'object' && typeof bValue === 'object') {
        const aString = JSON.stringify(aValue);
        const bString = JSON.stringify(bValue);
        const comparison = aString < bString ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  const handleSort = (column: Column<T>) => {
    // Make all columns sortable by default
    setSortConfig((current: { key: keyof T | ((row: T) => string | number); direction: 'asc' | 'desc'; } | null) => {
      if (!current || current.key !== column.accessor) {
        return { key: column.accessor, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key: column.accessor, direction: 'desc' };
      }
      return null;
    });
  };

  const renderSortIcon = (column: Column<T>) => {
    // Make all columns sortable by default
    if (!sortConfig || sortConfig.key !== column.accessor) {
      return <ChevronUp className="h-4 w-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className={className}>
      {searchable && (
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  onClick={() => handleSort(column)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {renderSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                    {column.render
                      ? column.render(
                          typeof column.accessor === 'function'
                            ? column.accessor(row)
                            : row[column.accessor],
                          row
                        )
                      : typeof column.accessor === 'function'
                      ? column.accessor(row)
                      : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable; 