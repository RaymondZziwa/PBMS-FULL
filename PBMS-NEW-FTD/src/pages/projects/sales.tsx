import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaSearch, FaFilter, FaTrash, FaEdit, FaExclamationTriangle, FaFileUpload, FaEye } from 'react-icons/fa';
import useProjectSale from '../../hooks/projects/useProjectSale';
import type { IProjectSale } from '../../redux/types/sales';
import AddOrModifyProjectSale from './AddorModifySale';
import CustomDropdown from '../../custom/inputs/customDropdown';
import NestedCustomTable from '../../custom/table/nestedCustomTable';
import { toast } from 'sonner';
import { PROJECTENDPOINTS } from '../../endpoints/projects/projectEndpoints';
import { apiRequest } from '../../libs/apiConfig';
import CustomDeleteModal from '../../custom/modals/customDeleteModal';
import UploadEvidenceModal from './uploadEvidenceModal';
import ImagePreviewModal from '../../custom/modals/imagePreviewModal';

const ProjectSales: React.FC = () => {
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const { data: sales, loading, refresh } = useProjectSale();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedSaleForUpload, setSelectedSaleForUpload] = useState<IProjectSale | null>(null);
      const [modalProps, setModalProps] = useState<{
        isOpen: boolean;
        mode: 'create' | 'edit' | '';
        projectSale: IProjectSale | null;
      }>({
        isOpen: false,
        mode: 'create',
        projectSale: null
      });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<IProjectSale | null>(null);

    // Handle upload delivery note action
  const handleUploadDeliveryNote = (sale: IProjectSale, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSaleForUpload(sale);
    setIsUploadModalOpen(true);
  };

  const deleteProjectSale = async () => {
    try {
      if (selectedSale) {
        await apiRequest(PROJECTENDPOINTS.PROJECT_SALES.delete(selectedSale.id), "DELETE", '');
        refresh();
        setIsDeleteModalOpen(false);
        setSelectedSale(null);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
    }
  }

  // Handle edit action
  const handleEdit = (sale: IProjectSale, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event propagation
      setModalProps({ isOpen: true, mode: 'edit', projectSale: sale });
      setIsCreateModalOpen(true)
  };

  // Handle delete action
  const handleDelete = (sale: IProjectSale, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event propagation
    setSelectedSale(sale);
    setIsDeleteModalOpen(true);
  };

  // Table columns configuration
  const columns = [
    { 
      key: 'deliveryNoteStatus', 
      label: 'Delivery Note', 
      sortable: true, 
      filterable: true,
      render: (value: any, row: IProjectSale) => (
        <div className="flex items-center gap-2">
          {row.deliveryNoteImage === null ? (
            <>
              <FaExclamationTriangle className="text-yellow-500" />
              <span className="text-yellow-600 font-medium">Missing</span>
            </>
          ) : (
            <span className="text-green-600 font-medium">Available</span>
          )}
        </div>
      )
    },
    { 
      key: 'client', 
      label: 'Client Name', 
      sortable: true, 
      filterable: true,
      render: (value: any, row: IProjectSale) => 
        `${row.client?.firstName} ${row.client?.lastName}`
    },
    { 
      key: 'project', 
      label: 'Project', 
      sortable: true, 
      filterable: true,
      render: (value: any, row: IProjectSale) => row.project?.name
    },
    { 
      key: 'saleTotal', 
      label: 'Total (UGX)', 
      sortable: true, 
      filterable: true,
      render: (value: number, row: IProjectSale) => `${row.saleTotal.toLocaleString()}`
    },
    { 
      key: 'totalPaid', 
      label: 'Paid (UGX)', 
      sortable: true, 
      filterable: true,
      render: (value: number, row: IProjectSale) => `${(parseInt(row.saleTotal) - row.remainingBalance || '0').toLocaleString()}`
    },
    { 
      key: 'remainingBalance', 
      label: 'Balance (UGX)', 
      sortable: true, 
      filterable: true,
      render: (value: number, row: IProjectSale) => `${row.remainingBalance?.toLocaleString() || '0'}`
    },
    { 
      key: 'paymentProgress', 
      label: 'Progress', 
      sortable: true, 
      filterable: false,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5 flex-1">
            <div 
              className={`h-2.5 rounded-full ${
                value >= 100 ? 'bg-green-600' :
                value >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`} 
              style={{ width: `${Math.min(value, 100)}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-600 w-10">{Math.round(value)}%</span>
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true, 
      filterable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'FULLY_PAID' ? 'bg-green-100 text-green-800' :
          value === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value.replace('_', ' ')}
        </span>
      )
    },
    { 
      key: 'installments', 
      label: 'Installments', 
      sortable: true, 
      filterable: false,
      render: (value: any, row: IProjectSale) => 
        `${row.ProjectPayments?.length || 0}/${row.numberOfInstallments}`
    },
    { 
      key: 'createdAt', 
      label: 'Created Date', 
      sortable: true, 
      filterable: false,
      render: (value: Date) => new Date(value).toLocaleDateString()
    },
    {
  key: 'actions',
  label: 'Actions',
  sortable: false,
  filterable: false,
  render: (value: any, row: IProjectSale) => (
    <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
      {/* Upload / Update Delivery Note */}
      <div className="relative group">
        <button
          className={`transition-colors ${
            row.deliveryNoteImage === null 
              ? 'text-yellow-600 hover:text-yellow-800' 
              : 'text-green-600 hover:text-green-800'
          }`}
          onClick={(e) => handleUploadDeliveryNote(row, e)}
          title={
            row.deliveryNoteImage === null
              ? 'Upload Delivery Note'
              : 'Update Delivery Note'
          }
        >
          <FaFileUpload />
        </button>
        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          {row.deliveryNoteImage === null
            ? 'Upload Delivery Note'
            : 'Update Delivery Note'}
        </span>
      </div>

      {/* 👁️ Preview Button (only if image exists) */}
      {row.deliveryNoteImage && (
        <div className="relative group">
          <button
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => {
              console.log('image', row.deliveryNoteImage)
              setPreviewImage(row.deliveryNoteImage);
              setPreviewTitle(`Delivery Note - ${row.project?.name || row.id}`);
            }}
          >
            <FaEye />
          </button>
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Preview Delivery Note
          </span>
        </div>
      )}

      {/* ✏️ Edit Button */}
      <div className="relative group">
        <button
          className="text-blue-600 hover:text-blue-800 transition-colors"
          onClick={(e) => handleEdit(row, e)}
        >
          <FaEdit />
        </button>
        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Edit
        </span>
      </div>

      {/* 🗑️ Delete Button */}
      <div className="relative group">
        <button
          className="text-red-600 hover:text-red-800 transition-colors"
          onClick={(e) => handleDelete(row, e)}
        >
          <FaTrash />
        </button>
        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Delete
        </span>
      </div>
    </div>
  )
}

  ];

  // Filter sales based on search and status
  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.client?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.client?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.project?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle row click to navigate to payments page
  const handleRowClick = (sale: IProjectSale) => {
    navigate(`/projects/sales/${sale.id}/payments`);
  };

  // Format table data with row classes for highlighting
  // Format table data with row classes for highlighting
  const tableData = filteredSales.map(sale => {
    const hasMissingDeliveryNote = sale.deliveryNoteImage === null;
    
    return {
      ...sale,
      deliveryNoteStatus: hasMissingDeliveryNote ? 'missing' : 'available',
      createdAt: sale.createdAt, // Keep as string for the render function to handle
    };
  });

  // Function to get row class based on delivery note status
  const getRowClass = (row: IProjectSale) => {
    return row.deliveryNoteImage === null 
      ? 'bg-yellow-50 border-l-4 border-l-yellow-400 hover:bg-yellow-100' 
      : '';
  };

  // Check if there are any sales with missing delivery notes
  const hasMissingDeliveryNotes = sales.some(sale => sale.deliveryNoteImage === null);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Project Sales</h1>
          <p className="text-gray-600">Manage all project sales and installment payments</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          New Project Sale
        </button>
      </div>

      {/* Warning message for missing delivery notes */}
      {hasMissingDeliveryNotes && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
          <FaExclamationTriangle className="text-yellow-500 text-xl" />
          <div>
            <p className="text-yellow-800 font-medium">
              Delivery Note Alert
            </p>
            <p className="text-yellow-700 text-sm">
              Some sales are missing delivery note images. These rows are highlighted in yellow.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by client or project name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <CustomDropdown
                options={[
                { label: "All Status", value: "all" },
                { label: "Fully Paid", value: "FULLY_PAID" },
                { label: "Partially Paid", value: "PARTIALLY_PAID" },
                { label: "Unpaid", value: "UNPAID" }
                ]}
                value={[statusFilter]}
                singleSelect
                onChange={(val: string[]) => setStatusFilter(val[0] || "all")}
                placeholder="Filter by status"
            />
            </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-600">Total Sales</h3>
          <p className="text-2xl font-bold text-gray-800">{sales.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-600">Fully Paid</h3>
          <p className="text-2xl font-bold text-gray-800">
            {sales.filter(s => s.status === 'FULLY_PAID').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-gray-600">Partially Paid</h3>
          <p className="text-2xl font-bold text-gray-800">
            {sales.filter(s => s.status === 'PARTIALLY_PAID').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-gray-600">Unpaid</h3>
          <p className="text-2xl font-bold text-gray-800">
            {sales.filter(s => s.status === 'UNPAID').length}
          </p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <NestedCustomTable
          columns={columns}
          data={tableData}
          pageSize={10}
          onRowClick={handleRowClick}
          loading={loading}
          emptyMessage="No sales found. Create your first sale to get started."
           getRowClass={getRowClass}
        />
      </div>

      {/* Create Sale Modal */}
      <AddOrModifyProjectSale
        visible={isCreateModalOpen}
              onCancel={() => setIsCreateModalOpen(false)} 
              projectSale={modalProps.projectSale}
      />
          
      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedSale(null);
        }}
        onConfirm={deleteProjectSale}
      />

      <UploadEvidenceModal
        visible={isUploadModalOpen}
        onCancel={() => {
          setIsUploadModalOpen(false);
          setSelectedSaleForUpload(null);
        } }
        onSuccess={() => {
          refresh();
          setIsUploadModalOpen(false);
        }}
        projectSale={selectedSaleForUpload} projectPayment={null} type={'DeliveryNote'} />
      
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          title={previewTitle}
          onClose={() => {
            setPreviewImage(null);
            setPreviewTitle('');
          }}
        />
      )}

    </div>
  );
};

export default ProjectSales;