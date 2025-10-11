import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { FaPlus } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import useExhibitionInventoryRecords from '../../../hooks/exhibitions/useExhibitionInventory';
import type { IExhibitionInventoryRecord } from '../../../redux/types/exhibition';
import type { RootState } from '../../../redux/store';
import AddOrModifyRecord from './AddorModify';

const ExpoStockMovementRecords: React.FC = () => {
  const userId = useSelector((state: RootState) => state.userAuth.data.id);
  const { data: records = [] } = useExhibitionInventoryRecords();

  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    record: IExhibitionInventoryRecord | null;
  }>({
    isOpen: false,
    mode: 'create',
    record: null,
  });

  // Table columns definition
  const columns = [
    { key: 'item', label: 'Item', sortable: true, filterable: true },
    { key: 'store', label: 'Store', sortable: true, filterable: true },
    { key: 'unit', label: 'Unit', sortable: true, filterable: true },
    { key: 'qty', label: 'Quantity', sortable: true },
    { key: 'category', label: 'Category', sortable: true, filterable: true },
    { key: 'source', label: 'Source', sortable: true, filterable: true },
    { key: 'employee', label: 'Recorded By', sortable: true, filterable: true },
    { key: 'createdAt', label: 'Recorded On', sortable: true, filterable: true },
  ];

  // Date formatting helper
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Prepare formatted data for table
  const tableData = records.map((rec) => ({
    id: rec.id,
    item: rec.item?.name || '—',
    store: rec.store?.name || '—',
    unit: rec.unit?.name || '—',
    qty: rec.qty,
    category: rec.category,
    source: rec.source || '—',
    employee:
      `${rec.employee?.firstName || ''} ${rec.employee?.lastName || ''}`.trim() ||
      rec.employee?.id ||
      '—',
    createdAt: formatDate(rec.createdAt),
  }));

  return (
    <div className="p-6">
      {/* Header section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Exhibition Stock Movement Records
        </h2>
        <button
          onClick={() =>
            setModalProps({ isOpen: true, mode: 'create', record: null })
          }
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          Add New Record
        </button>
      </div>

      {/* Records Table */}
      <CustomTable columns={columns} data={tableData} pageSize={10} />

      {/* Add / Edit Modal */}
      <AddOrModifyRecord
        visible={modalProps.isOpen}
        mode={modalProps.mode}
        record={modalProps.record}
        employeeId={userId}
        onCancel={() =>
          setModalProps({ isOpen: false, mode: 'create', record: null })
        }
      />
    </div>
  );
};

export default ExpoStockMovementRecords;
