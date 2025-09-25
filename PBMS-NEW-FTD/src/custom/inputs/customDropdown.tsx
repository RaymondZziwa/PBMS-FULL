import React, { useState, useEffect, useRef } from 'react';
import { FaChevronDown, FaTimes, FaCheck } from 'react-icons/fa';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string[]; // Keep as array for compatibility, but only use first item
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  maxHeight?: number;
  singleSelect?: boolean; // Add this prop for single selection
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select options",
  searchPlaceholder = "Search...",
  disabled = false,
  maxHeight = 200,
  singleSelect = false, // Default to multi-select for backward compatibility
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // FIXED: Updated toggleOption to handle single selection
  const toggleOption = (optionValue: string) => {
    if (singleSelect) {
      // For single selection: if already selected, clear selection; otherwise select only this one
      if (value.includes(optionValue)) {
        onChange([]);
      } else {
        onChange([optionValue]);
      }
    } else {
      // Original multi-select behavior
      if (value.includes(optionValue)) {
        onChange(value.filter(v => v !== optionValue));
      } else {
        onChange([...value, optionValue]);
      }
    }
  };

  const clearSelection = () => {
    onChange([]);
  };

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // FIXED: For single select, only show the first selected item
  const selectedLabels = singleSelect && value.length > 0 
    ? [options.find(opt => opt.value === value[0])?.label || '']
    : value.map(val => options.find(opt => opt.value === val)?.label || '');

  // FIXED: Remove individual item removal for single select
  const removeItem = (index: number) => {
    if (singleSelect) {
      // For single select, clear the entire selection
      onChange([]);
    } else {
      // For multi-select, remove specific item
      onChange(value.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Dropdown trigger */}
      <div
        className={`
          w-full
          border border-gray-300
          rounded-md
          px-3 py-2
          text-[#3d5aa0]
          placeholder-gray-400
          focus:border-blue-500 
          focus:ring-2 
          focus:ring-blue-200
          focus:outline-none
          disabled:bg-gray-50
          disabled:text-gray-400
          transition-colors
          duration-200
          flex items-center justify-between
          cursor-pointer
          min-h-[42px]
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedLabels.filter(label => label).length > 0 ? (
            selectedLabels.filter(label => label).map((label, index) => (
              <span
                key={index}
                className="bg-blue-100 text-[#3d5aa0] text-sm px-2 py-1 rounded flex items-center"
              >
                {label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(index);
                  }}
                  className="ml-1 text-[#3d5aa0] hover:text-blue-800"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center">
          {value.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearSelection();
              }}
              className="text-gray-400 hover:text-gray-600 mr-1"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          )}
          <FaChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="
                w-full
                border border-gray-300
                rounded-md
                px-3 py-2
                text-sm
                text-gray-700
                placeholder-gray-400
                focus:border-blue-500 
                focus:ring-2 
                focus:ring-blue-200
                focus:outline-none
              "
            />
          </div>

          {/* Options list */}
          <div 
            className="overflow-y-auto"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <div
                    key={option.value}
                    className={`
                      px-4 py-2 text-sm cursor-pointer flex items-center
                      ${isSelected ? 'bg-blue-50 text-[#3d5aa0]' : 'hover:bg-gray-100 text-gray-700'}
                    `}
                    onClick={() => toggleOption(option.value)}
                  >
                    <div
                      className={`
                        w-5 h-5 border rounded mr-3 flex items-center justify-center
                        ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
                        ${singleSelect ? 'rounded-full' : 'rounded'} // Circle for single select
                      `}
                    >
                      {isSelected && (
                        singleSelect ? (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        ) : (
                          <FaCheck className="w-3 h-3 text-white" />
                        )
                      )}
                    </div>
                    {option.label}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No options found
              </div>
            )}
          </div>

          {/* Select all/none buttons - Hide for single select */}
          {!singleSelect && filteredOptions.length > 0 && (
            <div className="flex justify-between p-2 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  const allValues = filteredOptions.map(opt => opt.value);
                  onChange([...new Set([...value, ...allValues])]);
                }}
                className="text-sm text-[#3d5aa0] hover:text-blue-800"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => {
                  const filteredValues = filteredOptions.map(opt => opt.value);
                  onChange(value.filter(v => !filteredValues.includes(v)));
                }}
                className="text-sm text-[#3d5aa0] hover:text-blue-800"
              >
                Deselect All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;