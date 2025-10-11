import { useState } from 'react';
import CustomTable from '../../../custom/table/customTable';
import useStockMovement from '../../../hooks/inventory/useStockMovement';
import type { IStockMovement } from '../../../redux/types/inventory';
import { FaPlus } from 'react-icons/fa';
import AddOrModifyRecord from './AddorModify';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux/store';

const StockMovementRecords = () => {
    const user = useSelector((state: RootState) => state.userAuth.data.id)
    const { data: records } = useStockMovement()
      const [modalProps, setModalProps] = useState<{
        isOpen: boolean;
        mode: 'create' | 'edit' | '';
        record: IStockMovement | null;
      }>({
        isOpen: false,
        mode: 'create',
        record: null
      });


  // Table columns
  const columns = [
    { key: 'item', label: 'Item', sortable: true, filterable: true },
    { key: 'store', label: 'Store', sortable: true, filterable: true },
    { key: 'unit', label: 'Unit', sortable: true, filterable: true },
    { key: 'qty', label: 'Quantity', sortable: true, filterable: false },
    { key: 'category', label: 'Category', sortable: true, filterable: true },
    { key: 'employee', label: 'Recorded By', sortable: true, filterable: true },
    { key: 'createdAt', label: 'Created At', sortable: true, filterable: true },
  ];

  // Date formatting helper
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Prepare data for table
  const tableData = records.map((rec) => ({
    ...rec,
    item: rec.item?.name || '—',
    store: rec.store?.name || '—',
    unit: rec.unit?.name || '—',
    qty: rec.qty,
    category: rec.category, // RESTOCK / DEPLETION / ADJUSTMENT
    employee: `${rec.employee?.firstName || ''} ${rec.employee?.lastName || ''}`.trim() || rec.employee?.id,
    createdAt: formatDate(rec.createdAt),
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Stock Movement Records</h2>
              <button
                onClick={() => setModalProps({ isOpen: true, mode: 'create', record: null })}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FaPlus className="mr-2" />
                Add New Record
              </button>
            </div>

      <CustomTable
        columns={columns}
        data={tableData}
        pageSize={10}
        />
        <AddOrModifyRecord
        visible={modalProps.isOpen}
              record={modalProps.record}
              employeeId={user}
        onCancel={() => setModalProps({ isOpen: false, mode: 'create', record: null })}
      />
    </div>
  );
};

export default StockMovementRecords;
