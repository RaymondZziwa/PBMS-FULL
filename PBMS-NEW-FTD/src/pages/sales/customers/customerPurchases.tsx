import React, { useState, useEffect } from 'react';
import { FaSearch, FaMoneyBillWave, FaShoppingCart, FaProjectDiagram, FaEye, FaFileInvoice, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'sonner';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import ImagePreviewModal from '../../../custom/modals/imagePreviewModal';
import CustomTable from '../../../custom/table/customTable';
import useClients from '../../../hooks/sales/useClients';
import { apiRequest } from '../../../libs/apiConfig';
import type { IClient } from '../../../redux/types/sales';
import { formatDate } from '../../../libs/dateFormatter';

interface ProjectPurchase {
  id: string;
  clientId: string;
  projectId: string;
  status: string;
  saleTotal: string;
  downPayment: string;
  numberOfInstallments: number;
  installmentAmount: string;
  deliveryNoteImage: string | null;
  cashierId: string;
  updatedAt: string;
  createdAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    contact: string;
  };
  project: {
    id: string;
    name: string;
    price: string;
  };
  employee: {
    id: string;
    firstName: string;
    lastName: string;
  };
  ProjectPayments: Array<{
    id: string;
    saleId: string;
    amount: string;
    exhibitionId: string;
    paymentMethod: string;
    referenceId: string | null;
    notes: string | null;
    receiptImage: string | null;
    bankDepositSlipImage: string | null;
    cashierId: string;
    updatedAt: string;
    createdAt: string;
    employee: {
      firstName: string;
      lastName: string;
    };
  }>;
}

interface ShopPurchase {
  id: string;
  clientId: string;
  items: Array<{
    id: string;
    categoryId: string;
    name: string;
    price: string;
    barcode: string | null;
    updatedAt: string;
    createdAt: string;
    category: {
      id: string;
      name: string;
      updatedAt: string;
      createdAt: string;
    };
    quantity: number;
    discount: number;
    total: number;
  }>;
  servedBy: string;
  storeId: string;
  status: string;
  total: string;
  balance: string;
  paymentMethods: Array<{
    type: string;
    amount: number;
  }>;
  notes: string;
  updatedAt: string;
  createdAt: string;
  store: {
    id: string;
    name: string;
    branchId: string;
    deptId: string;
    authorizedPersonnel: string[];
    updatedAt: string;
    createdAt: string;
  };
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    gender: string;
    email: string;
    tel: string;
    password: string;
    salary: string;
    hasAccess: boolean;
    isActive: boolean;
    profileImage: string | null;
    roleId: string;
    branchId: string;
    deptId: string | null;
    updatedAt: string;
    createdAt: string;
  };
}

interface ClientPurchasesResponse {
  projectPurchases: ProjectPurchase[];
  shopPurchases: ShopPurchase[];
}

const ClientPurchases: React.FC = () => {
  const { data: clients, loading: clientsLoading } = useClients();
  const [selectedClient, setSelectedClient] = useState<IClient | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [purchases, setPurchases] = useState<ClientPurchasesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'projects' | 'shop'>('projects');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<ProjectPurchase['ProjectPayments'][0] | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('Selected Client ID:', selectedClientId);
    console.log('Selected Client:', selectedClient);
    console.log('Clients data:', clients);
    console.log('Clients loading:', clientsLoading);
  }, [selectedClientId, selectedClient, clients, clientsLoading]);

  // Fetch purchases when client ID changes
  useEffect(() => {
    if (selectedClientId && selectedClientId.trim() !== '') {
      console.log('Fetching purchases for client ID:', selectedClientId);
      fetchClientPurchases(selectedClientId);
    } else {
      console.log('No client ID selected, clearing purchases');
      setPurchases(null);
    }
  }, [selectedClientId]);

  const fetchClientPurchases = async (clientId: string) => {
    console.log('Starting to fetch purchases for client:', clientId);
    setLoading(true);
    try {
      const response = await apiRequest(
        `/api/clients/fetch-purchases/${clientId}`,
        "GET"
      );
      console.log('Purchase response received:', response);
      setPurchases(response.data);
      toast.success('Client purchases loaded successfully');
    } catch (error: any) {
      console.log('Error fetching purchases:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to fetch client purchases';
      toast.error(errorMessage);
      setPurchases(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle client selection
  const handleClientSelect = (selectedValues: string[]) => {
    console.log('Dropdown selected values:', selectedValues);
    const clientId = selectedValues[0];
    
    if (clientId && clientId.trim() !== '') {
      setSelectedClientId(clientId);
      // Find and set the full client object
      const client = clients?.find(c => c.id === clientId) || null;
      setSelectedClient(client);
      console.log('Setting client:', client);
    } else {
      console.log('Clearing client selection');
      setSelectedClientId('');
      setSelectedClient(null);
    }
  };

  // Calculate totals
  const projectTotal = purchases?.projectPurchases?.reduce((sum, purchase) => 
    sum + parseInt(purchase.saleTotal || '0'), 0) || 0;

  const shopTotal = purchases?.shopPurchases?.reduce((sum, purchase) => 
    sum + parseInt(purchase.total || '0'), 0) || 0;

  const totalPaidProjects = purchases?.projectPurchases?.reduce((sum, purchase) => 
    sum + (purchase.ProjectPayments?.reduce((paymentSum, payment) => 
      paymentSum + parseInt(payment.amount || '0'), 0) || 0), 0) || 0;

  const totalPaidShop = purchases?.shopPurchases?.reduce((sum, purchase) => 
    sum + (parseInt(purchase.total || '0') - parseInt(purchase.balance || '0')), 0) || 0;

  // Project Purchases Columns
  const projectColumns = [
    {
      key: 'deliveryNoteStatus',
      label: 'Delivery Note',
      sortable: true,
      filterable: true,
      render: (value: any, row: ProjectPurchase) => (
        <div className="flex items-center gap-2">
          {row.deliveryNoteImage ? (
            <span className="text-green-600 font-medium">Available</span>
          ) : (
            <div className="flex items-center gap-1 text-yellow-600">
              <FaExclamationTriangle />
              <span className="font-medium">Missing</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'project',
      label: 'Project',
      sortable: true,
      filterable: true,
      render: (value: any, row: ProjectPurchase) => row.project?.name || 'N/A'
    },
    {
      key: 'saleTotal',
      label: 'Total (UGX)',
      sortable: true,
      filterable: true,
      render: (value: string) => `${parseInt(value || '0').toLocaleString()} UGX`
    },
    {
      key: 'paidAmount',
      label: 'Paid (UGX)',
      sortable: true,
      filterable: true,
      render: (value: any, row: ProjectPurchase) => {
        const paid = row.ProjectPayments?.reduce((sum, payment) => sum + parseInt(payment.amount || '0'), 0) || 0;
        return `${paid.toLocaleString()} UGX`;
      }
    },
    {
      key: 'balance',
      label: 'Balance (UGX)',
      sortable: true,
      filterable: true,
      render: (value: any, row: ProjectPurchase) => {
        const paid = row.ProjectPayments?.reduce((sum, payment) => sum + parseInt(payment.amount || '0'), 0) || 0;
        const balance = parseInt(row.saleTotal || '0') - paid;
        return `${balance.toLocaleString()} UGX`;
      }
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
          {value?.replace('_', ' ') || 'UNKNOWN'}
        </span>
      )
    },
    {
      key: 'installments',
      label: 'Installments',
      sortable: true,
      filterable: false,
      render: (value: any, row: ProjectPurchase) => 
        `${row.ProjectPayments?.length || 0}/${row.numberOfInstallments || 0}`
    },
    {
      key: 'payments',
      label: 'Payments',
      sortable: false,
      filterable: false,
      render: (value: any, row: ProjectPurchase) => (
        <div className="flex gap-2 flex-wrap">
          {row.ProjectPayments?.map((payment, index) => (
            <button
              key={payment.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPayment(payment);
              }}
              className="flex items-center gap-1 px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors"
            >
              <FaMoneyBillWave className="w-3 h-3" />
              {index + 1}
            </button>
          )) || []}
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Purchase Date',
      sortable: true,
      filterable: false,
      render: (value: string) => formatDate(value)
    }
  ];

  // Shop Purchases Columns
  const shopColumns = [
    {
      key: 'items',
      label: 'Items',
      sortable: false,
      filterable: true,
      render: (value: any, row: ShopPurchase) => (
        <div>
          {row.items?.map((item, index) => (
            <div key={item.id} className="text-sm">
              {item.quantity}x {item.name} - {parseInt(item.price || '0').toLocaleString()} UGX
            </div>
          )) || []}
        </div>
      )
    },
    {
      key: 'total',
      label: 'Total (UGX)',
      sortable: true,
      filterable: true,
      render: (value: string) => `${parseInt(value || '0').toLocaleString()} UGX`
    },
    {
      key: 'balance',
      label: 'Balance (UGX)',
      sortable: true,
      filterable: true,
      render: (value: string) => `${parseInt(value || '0').toLocaleString()} UGX`
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
          {value?.replace('_', ' ') || 'UNKNOWN'}
        </span>
      )
    },
    {
      key: 'paymentMethods',
      label: 'Payment Methods',
      sortable: false,
      filterable: true,
      render: (value: any, row: ShopPurchase) => (
        <div className="text-sm">
          {row.paymentMethods?.map((method, index) => (
            <div key={index}>
              {method.type}: {method.amount.toLocaleString()} UGX
            </div>
          )) || []}
          {(!row.paymentMethods || row.paymentMethods.length === 0) && (
            <div className="text-gray-500">No payment methods</div>
          )}
        </div>
      )
    },
    {
      key: 'store',
      label: 'Store',
      sortable: true,
      filterable: true,
      render: (value: any, row: ShopPurchase) => row.store?.name || 'N/A'
    },
    {
      key: 'createdAt',
      label: 'Purchase Date',
      sortable: true,
      filterable: false,
      render: (value: string) => formatDate(value)
    }
  ];

  // Filter data based on search term
  const filteredProjectPurchases = purchases?.projectPurchases?.filter(purchase =>
    purchase.project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.status?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredShopPurchases = purchases?.shopPurchases?.filter(purchase =>
    purchase.items?.some(item => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    purchase.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.store?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Client Purchases</h1>
          <p className="text-gray-600">View all purchases made by clients</p>
        </div>
      </div>

      {/* Client Selection */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Client
            </label>
            <CustomDropdown
              options={clients?.map((client: IClient) => ({
                label: `${client.firstName} ${client.lastName} (${client.contact})`,
                value: client.id
              })) || []}
              value={selectedClientId ? [selectedClientId] : []}
              onChange={handleClientSelect}
              placeholder="Search and select a client..."
              singleSelect
              loading={clientsLoading}
            />
          </div>
          
          {selectedClient && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="font-medium text-gray-800">
                {selectedClient.firstName} {selectedClient.lastName}
              </h3>
              <p className="text-sm text-gray-600">{selectedClient.contact}</p>
              <p className="text-xs text-gray-500">Client ID: {selectedClient.id}</p>
            </div>
          )}
        </div>
      </div>

      {selectedClient && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-600">
              <div className="flex items-center">
                <FaProjectDiagram className="text-gray-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Project Purchases</h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {purchases?.projectPurchases?.length || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    {projectTotal.toLocaleString()} UGX
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-600">
              <div className="flex items-center">
                <FaShoppingCart className="text-gray-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Shop Purchases</h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {purchases?.shopPurchases?.length || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    {shopTotal.toLocaleString()} UGX
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
              <div className="flex items-center">
                <FaMoneyBillWave className="text-green-500 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Total Paid</h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {(totalPaidProjects + totalPaidShop).toLocaleString()} UGX
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
              <div className="flex items-center">
                <FaFileInvoice className="text-blue-500 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Total Balance</h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {((projectTotal + shopTotal) - (totalPaidProjects + totalPaidShop)).toLocaleString()} UGX
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Tabs */}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search purchases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>
              
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'projects'
                      ? 'bg-gray-600 text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Project Purchases
                </button>
                <button
                  onClick={() => setActiveTab('shop')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'shop'
                      ? 'bg-gray-600 text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Shop Purchases
                </button>
              </div>
            </div>
          </div>

          {/* Purchases Table */}
          <div className="bg-white rounded-lg shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-gray-600">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                </div>
                <p className="mt-2">Loading purchases...</p>
              </div>
            ) : activeTab === 'projects' ? (
              <CustomTable
                columns={projectColumns}
                data={filteredProjectPurchases}
                pageSize={10}
                emptyMessage="No project purchases found for this client."
              />
            ) : (
              <CustomTable
                columns={shopColumns}
                data={filteredShopPurchases}
                pageSize={10}
                emptyMessage="No shop purchases found for this client."
              />
            )}
          </div>
        </>
      )}

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Payment Details
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Amount:</label>
                <p className="text-lg font-semibold">
                  {parseInt(selectedPayment.amount || '0').toLocaleString()} UGX
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Payment Method:</label>
                <p className="text-gray-800">{selectedPayment.paymentMethod || 'N/A'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Date:</label>
                <p className="text-gray-800">
                  {new Date(selectedPayment.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Served By:</label>
                <p className="text-gray-800">
                  {selectedPayment.employee?.firstName} {selectedPayment.employee?.lastName}
                </p>
              </div>

              {selectedPayment.referenceId && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Reference ID:</label>
                  <p className="text-gray-800 font-mono">{selectedPayment.referenceId}</p>
                </div>
              )}

              {selectedPayment.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes:</label>
                  <p className="text-gray-800">{selectedPayment.notes}</p>
                </div>
              )}

              {/* Receipt Image */}
              {selectedPayment.receiptImage && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2">Receipt:</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewImage({
                        url: selectedPayment.receiptImage!,
                        title: 'Payment Receipt'
                      })}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <FaEye />
                      View Receipt
                    </button>
                  </div>
                </div>
              )}

              {/* Bank Deposit Slip */}
              {selectedPayment.bankDepositSlipImage && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2">Bank Deposit Slip:</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewImage({
                        url: selectedPayment.bankDepositSlipImage!,
                        title: 'Bank Deposit Slip'
                      })}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <FaEye />
                      View Deposit Slip
                    </button>
                  </div>
                </div>
              )}

              {!selectedPayment.receiptImage && !selectedPayment.bankDepositSlipImage && (
                <div className="text-gray-500 text-sm">
                  No supporting documents available for this payment.
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage.url}
          title={previewImage.title}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
};

export default ClientPurchases;