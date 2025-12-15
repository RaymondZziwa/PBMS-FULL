import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaEye, FaPlus, FaPlusCircle, FaTrash } from 'react-icons/fa';
import useSupplier from '../../../hooks/inventory/useSupplier';
import CustomTable from '../../../custom/table/customTable';
import type { ISupplier } from '../../../redux/types/supplyMgt';
import AddOrModifySupplyModal from './AddorModifySupplyModal';
import PreviewSupplyModal from './previewSupply';
import { formatDate } from '../../../libs/dateFormatter';
import { toast } from 'sonner';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';
import { apiRequest } from '../../../libs/apiConfig';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import ProcessPaymentModal from './processPayment';

interface SupplyDemo {
  id: string;
  itemName: string;
  qty: number;
  unit: string;
  value: number;
  balance: number;
  paymentStatus: string;
  receivedBy: string;
  createdAt: string;
  original: any;
}

const SupplierDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: suppliers, refresh } = useSupplier();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentSupply, setSelectedPaymentSupply] = useState<any>(null);


  const [supplier, setSupplier] = useState<ISupplier | null>(null);
  const [supplies, setSupplies] = useState<SupplyDemo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<any>(null);
  const [previewSupply, setPreviewSupply] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState()

  // Handle preview
  const handlePreview = (supply: any) => {
    setPreviewSupply(supply);
    setIsPreviewOpen(true);
  };

  // Map supplier supplies
  useEffect(() => {
    if (suppliers && id) {
      const found = suppliers.find((s: ISupplier) => s.id === id);
      setSupplier(found || null);

      const mappedSupplies = (found?.Supply || []).map((s) => ({
        id: s.id,
        itemName: s.item?.name || '-',
        qty: s.qty,
        unit: s.uom?.name || '-',
        value: Number(s.value),
        balance: Number(s.balance),
        paymentStatus: s.paymentStatus,
        receivedBy: `${s.employee?.firstName} ${s.employee?.lastName}`,
        createdAt: formatDate(s.createdAt),
        original: s,
      }));

      setSupplies(mappedSupplies);
    }
  }, [id, suppliers]);

  // Handle Add Payment
const handleAddPayment = (supply: any) => {
  setSelectedPaymentSupply(supply);
  setIsPaymentModalOpen(true);
};


  // ✅ Handle Modify — open modal in edit mode
  const handleModify = (supply: any) => {
    setEditingSupply(supply); // store the record to edit
    setIsModalOpen(true);
  };

  // Handle Delete
  const handleDelete = async () => {
     try {
            await apiRequest(
              InventoryEndpoints.SUPPLY.SUPPLIES.delete(selectedSupply.id),
              'DELETE',
              ''
            );
            refresh();
        } catch (error: any) {
          toast.error(error?.response?.data?.message || 'Error deleting supply');
        }
  };

  // Table Columns
  const columns = useMemo(
    () => [
      { key: 'itemName', label: 'Item Name', sortable: true },
      { key: 'qty', label: 'Quantity', sortable: true },
      { key: 'unit', label: 'UOM', sortable: true },
      {
        key: 'value',
        label: 'Value (UGX)',
        render: (v: number) => v.toLocaleString(),
      },
      {
        key: 'balance',
        label: 'Balance (UGX)',
        render: (v: number) => v.toLocaleString(),
      },
      {
        key: 'paymentStatus',
        label: 'Payment Status',
        render: (v: string) => (
          <span
            className={`font-semibold ${
              v === 'PAID'
                ? 'text-green-600'
                : v === 'UNPAID'
                ? 'text-red-600'
                : 'text-yellow-600'
            }`}
          >
            {v}
          </span>
        ),
      },
      { key: 'receivedBy', label: 'Received By' },
      { key: 'createdAt', label: 'Created At', sortable: true },

      // ACTIONS COLUMN
      {
        key: 'actions',
        label: 'Actions',
        render: (_: any, row: SupplyDemo) => (
          <div className="flex gap-3">
            {/* Preview */}
            <div className="relative group">
              <button
                onClick={() => handlePreview(row.original)}
                className="text-green-600 hover:text-green-800 transition-colors"
              >
                <FaEye />
              </button>
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Preview
              </span>
            </div>

            {/* Add Payment */}
            {(row.paymentStatus === 'UNPAID' || row.paymentStatus === 'PARTIALLY_PAID') && (
              <div className="relative group">
                <button
                  onClick={() => handleAddPayment(row.original)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FaPlusCircle />
                </button>
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  Add Payment
                </span>
              </div>
            )}

            {/* Modify */}
            {row.paymentStatus === 'UNPAID' && (
              <div className="relative group">
                <button
                  onClick={() => handleModify(row.original)}
                  className="text-yellow-600 hover:text-yellow-800 transition-colors"
                >
                  <FaEdit />
                </button>
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  Edit Supply
                </span>
              </div>
            )}

            {/* Delete */}
            {row.paymentStatus === 'UNPAID' && (
              <div className="relative group">
                <button
                  onClick={() => {
                    setSelectedSupply(row.original)
                    setIsDeleteModalOpen(true)
                  }}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <FaTrash />
                </button>
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  Delete
                </span>
              </div>
            )}
          </div>
        ),
      },
    ],
    []
  );

  if (!supplier) {
    return <div className="p-6 text-gray-600">Loading supplier details...</div>;
  }

  return (
    <div className="p-6 mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/inventory/suppliers" className="flex items-center text-gray-600 hover:text-gray-800">
          <FaArrowLeft className="mr-2" /> Back to Suppliers
        </Link>
        <h2 className="text-2xl font-semibold text-gray-800">Supplier Details</h2>
      </div>

      {/* Supplier Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-700 mb-4">Supplier Information</h3>
        <div className="grid grid-cols-2 gap-4 text-gray-700">
          <p><span className="font-semibold">First Name:</span> {supplier.firstName}</p>
          <p><span className="font-semibold">Last Name:</span> {supplier.lastName}</p>
          <p><span className="font-semibold">Contact:</span> {supplier.contact}</p>
          <p><span className="font-semibold">Address:</span> {supplier.address || 'N/A'}</p>
        </div>
      </div>

      {/* Supplies Table */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-700">Supplies History</h3>
          <button
            onClick={() => {
              setEditingSupply(null); // reset if adding new
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 transition"
          >
            <FaPlus /> Add Supply
          </button>
        </div>

        <CustomTable
          columns={columns}
          data={supplies}
          pageSize={5}
          getRowClass={(row) =>
            row.paymentStatus === 'PAID'
              ? 'bg-green-50'
              : row.paymentStatus === 'UNPAID'
              ? 'bg-red-50'
              : 'bg-yellow-50'
          }
        />
      </div>

      {/* Add/Edit Supply Modal */}
      <AddOrModifySupplyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        supplierId={id!}
        existingSupply={editingSupply} // 👈 Pass selected supply
      />

      {/* Preview Modal */}
      <PreviewSupplyModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        supply={previewSupply}
      />

      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
      />

      <ProcessPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        supplyId={selectedPaymentSupply?.id}
      />

    </div>
  );
};

export default SupplierDetails;
