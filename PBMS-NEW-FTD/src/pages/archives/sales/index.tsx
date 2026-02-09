import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchLegacySales,
  type LegacyBranch,
  type LegacySalesType,
  type LegacySaleRecord,
} from '../../../libs/legacyArchiveApi';
import CustomDateInput from '../../../custom/inputs/customDateSelector';

interface SalesFilters {
  startDate?: string;
  endDate?: string;
}

const ArchiveSalesRecords: React.FC = () => {
  const [salesRecords, setSalesRecords] = useState<LegacySaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SalesFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [legacyBranch, setLegacyBranch] = useState<LegacyBranch>('equatorial');
  const [salesType, setSalesType] = useState<LegacySalesType>('shop');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchSalesRecords = useCallback(async (searchFilters: SalesFilters = {}) => {
    try {
      setLoading(true);
      const response = await fetchLegacySales(
        legacyBranch,
        legacyBranch === 'masanafu' ? 'shop' : salesType,
        {
          startDate: searchFilters.startDate,
          endDate: searchFilters.endDate,
        }
      );
      setSalesRecords(response.report || []);
    } catch (err) {
      console.error('Error fetching sales records:', err);
      setError('Failed to load sales records. Please ensure the legacy API is running.');
    } finally {
      setLoading(false);
    }
  }, [legacyBranch, salesType]);

  useEffect(() => {
    fetchSalesRecords();
  }, [fetchSalesRecords]);

  const handleFilterChange = (field: keyof SalesFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    fetchSalesRecords(filters);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    fetchSalesRecords();
  };

  const displayedRecords = useMemo(() => {
    if (!searchTerm) return salesRecords;
    const term = searchTerm.toLowerCase();
    return salesRecords.filter((record) => {
      const receipt = String(record.receiptNumber ?? '').toLowerCase();
      const customer = String(record.customerNames ?? '').toLowerCase();
      return receipt.includes(term) || customer.includes(term);
    });
  }, [salesRecords, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [legacyBranch, salesType, filters.startDate, filters.endDate, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(displayedRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayedRecords.slice(start, start + pageSize);
  }, [currentPage, displayedRecords]);

  const getPaymentMethod = (record: LegacySaleRecord) => {
    if (record.paymentMethod) return record.paymentMethod;
    const pm = record['paymentmethod'];
    return typeof pm === 'string' ? pm : undefined;
  };

  const formatMoney = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '-';
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num)) return '-';
    return `${num.toLocaleString(undefined, { maximumFractionDigits: 0 })} UGX`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading legacy sales records...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Sales Records</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Archive Sales Records</h1>
        <p className="text-gray-600 mt-1">
          Historical sales data from the legacy system
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Legacy Branch
            </label>
            <select
              value={legacyBranch}
              onChange={(e) => setLegacyBranch(e.target.value as LegacyBranch)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3d5aa0] focus:border-transparent"
            >
              <option value="equatorial">Equatorial</option>
              <option value="masanafu">Masanafu</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sales Type
            </label>
            <select
              value={legacyBranch === 'masanafu' ? 'shop' : salesType}
              onChange={(e) => setSalesType(e.target.value as LegacySalesType)}
              disabled={legacyBranch === 'masanafu'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3d5aa0] focus:border-transparent disabled:bg-gray-100"
            >
              <option value="shop">Shop Sales</option>
              <option value="massage">Massage Sales</option>
            </select>
          </div>

          <CustomDateInput
            label="Start Date"
            value={filters.startDate || ''}
            onChange={(value) => handleFilterChange('startDate', value)}
          />

          <CustomDateInput
            label="End Date"
            value={filters.endDate || ''}
            onChange={(value) => handleFilterChange('endDate', value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Receipt # / Customer"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3d5aa0] focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-4">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-[#3d5aa0] text-white rounded-md hover:bg-[#2f477f] focus:outline-none focus:ring-2 focus:ring-[#3d5aa0] focus:ring-offset-2"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Sales Records ({displayedRecords.length} records) - {legacyBranch}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-28 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt #
                </th>
                <th className="w-48 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="w-28 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="w-40 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRecords.map((record, idx) => (
                <tr key={String(record.receiptNumber ?? idx)} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                    {record.receiptNumber || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    <span className="block truncate" title={String(record.customerNames ?? '-')}
                    >
                      {record.customerNames || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                    {record.saleDate || record.createdAt || record.createdat || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {formatMoney(record.totalAmount)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                    {getPaymentMethod(record) || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {displayedRecords.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * pageSize, displayedRecords.length)}</span> of{' '}
              <span className="font-medium">{displayedRecords.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
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
                      className={`w-8 h-8 mx-0.5 rounded-md text-xs ${
                        currentPage === pageNum
                          ? 'bg-[#3d5aa0] text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {displayedRecords.length === 0 && (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sales records found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No sales records match your criteria or the legacy API is not accessible.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchiveSalesRecords;
