import React, { useState, useMemo } from "react";
import { FaSearch, FaFilter, FaSort, FaSortUp, FaSortDown, FaTimes } from "react-icons/fa";

type Column = {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row?: any) => any;
};

interface CustomTableProps {
  columns: Column[];
  data: Record<string, any>[];
  pageSize?: number;
  onRowClick?: (row: Record<string, any>) => void;
  loading?: boolean;
  emptyMessage?: string;
  getRowClass?: (row: any) => string
}

const NestedCustomTable: React.FC<CustomTableProps> = ({ 
  columns, 
  data, 
  pageSize = 10,
  onRowClick,
  loading = false,
  emptyMessage = "No results found",
  getRowClass
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [columnFilterInputs, setColumnFilterInputs] = useState<Record<string, string>>({});

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Handle column filter input change
  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilterInputs(prev => ({ ...prev, [key]: value }));
  };

  // Apply column filters
  const applyColumnFilters = () => {
    setActiveFilters(columnFilterInputs);
    setCurrentPage(1);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({});
    setColumnFilterInputs({});
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Remove individual filter
  const removeFilter = (key: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
    setColumnFilterInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[key];
      return newInputs;
    });
  };

  // Handle row click
  const handleRowClick = (row: Record<string, any>) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  // Improved search function that handles nested objects
  const searchThroughObject = (obj: any, searchTerm: string): boolean => {
    if (!obj || typeof obj !== 'object') {
      return String(obj).toLowerCase().includes(searchTerm.toLowerCase());
    }

    // Search through all values in the object, including nested ones
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (typeof value === 'object' && value !== null) {
          // Recursively search nested objects
          if (searchThroughObject(value, searchTerm)) {
            return true;
          }
        } else {
          // Search primitive values
          if (String(value).toLowerCase().includes(searchTerm.toLowerCase())) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Filtered, searched, and sorted data
  const processedData = useMemo(() => {
    let result = [...data];
    
    // Apply global search with improved nested object handling
    if (searchTerm) {
      result = result.filter(row => searchThroughObject(row, searchTerm));
    }
    
    // Apply column filters
    if (Object.keys(activeFilters).length > 0) {
      result = result.filter(row =>
        Object.entries(activeFilters).every(([key, value]) => {
          const cellValue = row[key];
          // Handle nested objects in column filters
          if (typeof cellValue === 'object' && cellValue !== null) {
            return searchThroughObject(cellValue, value);
          }
          return String(cellValue).toLowerCase().includes(value.toLowerCase());
        })
      );
    }
    
    // Apply sorting with improved nested object handling
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Handle nested objects in sorting
        const getSortableValue = (value: any): any => {
          if (typeof value === 'object' && value !== null) {
            // For nested objects, try to find a string representation
            return JSON.stringify(value);
          }
          return value;
        };

        const aSort = getSortableValue(aValue);
        const bSort = getSortableValue(bValue);

        // Handle date sorting
        if (sortConfig.key === 'createdAt' || sortConfig.key === 'updatedAt' || 
            sortConfig.key === 'startDate' || sortConfig.key === 'endDate') {
          const dateA = new Date(aSort).getTime();
          const dateB = new Date(bSort).getTime();
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        
        // Handle numeric sorting
        if (typeof aSort === 'number' && typeof bSort === 'number') {
          return sortConfig.direction === 'asc' ? aSort - bSort : bSort - aSort;
        }
        
        // Default string sorting
        if (aSort < bSort) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aSort > bSort) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return result;
  }, [data, searchTerm, activeFilters, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [currentPage, processedData, pageSize]);

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header with search and filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search across all fields..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            {(searchTerm || Object.keys(activeFilters).length > 0) && (
              <button
                onClick={clearAllFilters}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaTimes className="mr-1" />
                Clear All
              </button>
            )}
            
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center px-4 py-2.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              <FaFilter className="mr-2" />
              Column Filters
            </button>
          </div>
        </div>

        {/* Active filters */}
        {Object.keys(activeFilters).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(activeFilters).map(([key, value]) => (
              <span 
                key={key} 
                className="inline-flex items-center bg-gray-50 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                {columns.find(col => col.key === key)?.label}: {value}
                <button 
                  onClick={() => removeFilter(key)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filter panel */}
      {isFilterOpen && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Columns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {columns
              .filter(col => col.filterable !== false)
              .map((col) => (
                <div key={col.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {col.label}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Filter ${col.label}...`}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      value={columnFilterInputs[col.key] || ""}
                      onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && applyColumnFilters()}
                    />
                    {columnFilterInputs[col.key] && (
                      <button
                        onClick={() => {
                          handleColumnFilterChange(col.key, "");
                          removeFilter(col.key);
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={applyColumnFilters}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th 
                  key={col.key} 
                  className={`p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider 
                    ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center">
                    {col.label}
                    {col.sortable !== false && (
                      <span className="ml-1">
                        {sortConfig?.key === col.key ? (
                          sortConfig.direction === 'asc' ? (
                            <FaSortUp className="inline" />
                          ) : (
                            <FaSortDown className="inline" />
                          )
                        ) : (
                          <FaSort className="inline opacity-30" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                  </div>
                  <p className="mt-2 text-gray-500">Loading data...</p>
                </td>
              </tr>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <tr 
                  key={idx} 
                  className={`hover:bg-gray-50 transition-colors ${
                  getRowClass ? getRowClass(row) : ''
                } ${onRowClick ? 'cursor-pointer hover:bg-blue-50' : ''}`}

                  onClick={() => handleRowClick(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="p-3 text-sm text-gray-700">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="p-8 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center">
                    <FaFilter className="text-3xl text-gray-300 mb-2" />
                    <p className="font-medium">{emptyMessage}</p>
                    <p className="text-sm mt-1">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {processedData.length > 0 && !loading && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(currentPage * pageSize, processedData.length)}
            </span> of{" "}
            <span className="font-medium">{processedData.length}</span> results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 mx-1 rounded-md text-sm ${
                      currentPage === pageNum
                        ? 'bg-gray-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="mx-1 text-gray-500">...</span>}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NestedCustomTable;