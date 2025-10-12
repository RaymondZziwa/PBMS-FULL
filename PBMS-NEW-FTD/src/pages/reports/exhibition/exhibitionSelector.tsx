// components/exhibitionSelector.tsx
import React from 'react';
import { Building, X } from 'lucide-react';
import useExhibition from '../../../hooks/exhibitions/useExhibition';

interface ExhibitionSelectorProps {
  onExhibitionSelect: (exhibitionIds: string[]) => void;
  selectedExhibitions: string[];
  multiple?: boolean;
}

const ExhibitionSelector: React.FC<ExhibitionSelectorProps> = ({
  onExhibitionSelect,
  selectedExhibitions,
  multiple = true,
}) => {
  const { data: exhibitions, loading } = useExhibition();

  const handleExhibitionSelect = (exhibitionId: string) => {
    if (multiple) {
      // Toggle selection in multiple mode
      const newSelection = selectedExhibitions.includes(exhibitionId)
        ? selectedExhibitions.filter(id => id !== exhibitionId)
        : [...selectedExhibitions, exhibitionId];
      onExhibitionSelect(newSelection);
    } else {
      // Single selection mode - only allow one at a time
      if (selectedExhibitions.includes(exhibitionId)) {
        // If clicking the already selected one, deselect it
        onExhibitionSelect([]);
      } else {
        // Select the new one
        onExhibitionSelect([exhibitionId]);
      }
    }
  };

  const removeExhibition = (exhibitionId: string) => {
    onExhibitionSelect(selectedExhibitions.filter(id => id !== exhibitionId));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <Building className="w-5 h-5 mr-2" />
        {multiple ? 'Select Exhibitions to Compare' : 'Select Exhibition'}
      </h2>

      {/* Selection Mode Indicator */}
      {multiple && (
        <div className="mb-3 text-sm text-gray-600">
          {selectedExhibitions.length === 0 
            ? 'Select exhibitions to compare (you can select multiple)'
            : `${selectedExhibitions.length} exhibition${selectedExhibitions.length !== 1 ? 's' : ''} selected`
          }
        </div>
      )}
      
      {/* Selected Exhibitions */}
      {selectedExhibitions.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Selected Exhibition{selectedExhibitions.length !== 1 ? 's' : ''}:
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedExhibitions.map(exhibitionId => {
              const exhibition = exhibitions?.find(e => e.id === exhibitionId);
              return exhibition ? (
                <span
                  key={exhibitionId}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800"
                >
                  {exhibition.name}
                  <button
                    onClick={() => removeExhibition(exhibitionId)}
                    className="ml-2 hover:text-teal-600 focus:outline-none"
                    aria-label={`Remove ${exhibition.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Exhibition List */}
      <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
            <span className="ml-2 text-gray-600">Loading exhibitions...</span>
          </div>
        ) : exhibitions && exhibitions.length > 0 ? (
          exhibitions.map(exhibition => (
            <button
              key={exhibition.id}
              onClick={() => handleExhibitionSelect(exhibition.id)}
              className={`w-full text-left px-4 py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors ${
                selectedExhibitions.includes(exhibition.id)
                  ? 'bg-teal-50 border-l-4 border-l-teal-600'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{exhibition.name}</span>
                {selectedExhibitions.includes(exhibition.id) && (
                  <div className="w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="py-8 text-center text-gray-500">
            No exhibitions available
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {multiple && exhibitions && exhibitions.length > 0 && (
        <div className="flex justify-between mt-4">
          <button
            onClick={() => onExhibitionSelect([])}
            disabled={selectedExhibitions.length === 0}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Clear Selection
          </button>
          <button
            onClick={() => onExhibitionSelect(exhibitions.map(e => e.id))}
            disabled={selectedExhibitions.length === exhibitions.length}
            className="px-4 py-2 text-sm text-teal-600 hover:text-teal-800 font-medium disabled:text-teal-400 disabled:cursor-not-allowed"
          >
            Select All ({exhibitions.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default ExhibitionSelector;