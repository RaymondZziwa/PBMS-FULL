import { useState, useMemo } from 'react';
import { FaPlus } from 'react-icons/fa';
import CustomTable from '../../custom/table/customTable';
import AddOrModifyManufacturing from './AddorModify';
import CompleteManufacturingModal from './CompleteManufacturing';
import useManufacturing from '../../hooks/manufacturing/useManufacturing';

// Temporary mock data - will be replaced with actual API data later
interface IManufacturingRecord {
  id: string;
  storeId: string;
  storeName: string;
  primaryUnitId?: string;
  primaryUnit?: {
    id: string;
    name: string;
    abr?: string;
  };
  totalQuantity: number; // in primary unit
  unitId: string;
  unitName: string;
  estimatedOutput: number; // estimated number of output units/pieces
  actualOutput?: number; // actual number of output units/pieces
  status?: 'PENDING' | 'NORMAL' | 'WASTAGE_DETECTED' | 'GOOD_UTILIZATION';
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number; // in primary unit
  }>;
  createdAt: string;
}

const ManufacturingManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IManufacturingRecord | null>(null);

  // Fetch manufacturing records from API
  const { data: manufacturingData, loading, refresh } = useManufacturing();

  // Transform API data to match the interface
  const manufacturingRecords: IManufacturingRecord[] = useMemo(() => {
    if (!manufacturingData || !Array.isArray(manufacturingData)) return [];
    
    return manufacturingData.map((record: any) => ({
      id: record.id,
      storeId: record.storeId,
      storeName: record.store?.name || 'Unknown Store',
      primaryUnitId: record.primaryUnitId,
      primaryUnit: record.primaryUnit ? {
        id: record.primaryUnit.id,
        name: record.primaryUnit.name,
        abr: record.primaryUnit.abr,
      } : undefined,
      totalQuantity: record.totalQuantity,
      unitId: record.unitId,
      unitName: record.unit?.name || 'Unknown Unit',
      estimatedOutput: record.estimatedOutput,
      actualOutput: record.actualOutput,
      status: record.status || 'PENDING',
      items: Array.isArray(record.items) ? record.items : [],
      createdAt: record.createdAt,
    }));
  }, [manufacturingData]);

  // Table columns configuration
  const columns = [
    { key: 'storeName', label: 'Store', sortable: true, filterable: true },
    { key: 'primaryUnit', label: 'Primary Unit', sortable: true, filterable: true },
    { key: 'totalQuantity', label: 'Total Quantity', sortable: true, filterable: false },
    { key: 'unitName', label: 'Packing Unit', sortable: true, filterable: true },
    { key: 'estimatedOutput', label: 'Estimated Output', sortable: true, filterable: false },
    { key: 'actualOutput', label: 'Actual Output', sortable: true, filterable: false },
    { key: 'status', label: 'Status', sortable: true, filterable: true },
    { key: 'createdAt', label: 'Created At', sortable: true, filterable: false },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  // Format date for display
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      NORMAL: { label: 'Normal', className: 'bg-blue-100 text-blue-800' },
      WASTAGE_DETECTED: { label: 'Wastage', className: 'bg-red-100 text-red-800' },
      GOOD_UTILIZATION: { label: 'Good', className: 'bg-green-100 text-green-800' },
    };
    const statusInfo = statusMap[status] || statusMap.PENDING;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Prepare data for table
  const tableData = manufacturingRecords.map((record) => ({
    ...record,
    primaryUnit: record.primaryUnit?.abr || record.primaryUnit?.name || 'N/A',
    totalQuantity: `${record.totalQuantity.toFixed(2)} ${record.primaryUnit?.abr || record.primaryUnit?.name || ''}`,
    estimatedOutput: record.estimatedOutput.toLocaleString(),
    actualOutput: record.actualOutput ? record.actualOutput.toLocaleString() : '-',
    status: getStatusBadge(record.status || 'PENDING'),
    createdAt: formatDate(record.createdAt),
    actions: (
      <div className="flex gap-3">
        <button
          className="text-blue-600 hover:text-blue-800 transition-colors"
          onClick={() => {
            setSelectedRecord(record);
            setIsModalOpen(true);
          }}
        >
          View
        </button>
        {record.status === 'PENDING' && (
          <button
            className="text-green-600 hover:text-green-800 transition-colors"
            onClick={() => {
              setSelectedRecord(record);
              setIsCompleteModalOpen(true);
            }}
          >
            Complete Record
          </button>
        )}
      </div>
    ),
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Product Manufacturing</h2>
        <button
          onClick={() => {
            setSelectedRecord(null);
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <FaPlus className="mr-2" />
          New Manufacturing Record
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <p className="text-gray-600">Loading manufacturing records...</p>
        </div>
      ) : (
        <CustomTable columns={columns} data={tableData} pageSize={10} />
      )}

      <AddOrModifyManufacturing
        visible={isModalOpen}
        record={selectedRecord}
        onCancel={() => {
          setIsModalOpen(false);
          setSelectedRecord(null);
        }}
        onSuccess={() => {
          refresh(); // Refresh the list after successful creation
        }}
      />

      <CompleteManufacturingModal
        visible={isCompleteModalOpen}
        record={selectedRecord}
        onCancel={() => {
          setIsCompleteModalOpen(false);
          setSelectedRecord(null);
        }}
        onSuccess={() => {
          refresh(); // Refresh the list after successful completion
          setIsCompleteModalOpen(false);
          setSelectedRecord(null);
        }}
      />
    </div>
  );
};

export default ManufacturingManagement;

