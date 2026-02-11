import { useEffect, useState } from 'react';
import { FaTrash, FaEye } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import { SALESENDPOINTS } from '../../../endpoints/sales/salesEndpoints';
import useCreditSale from '../../../hooks/sales/useCreditSales';
import type { ISale, POSStore } from '../../../redux/types/sales';
import StoreSelectionModal from '../pos/selectStore';
import useStores from '../../../hooks/inventory/useStores';
import CollectCreditPaymentModal from './collectPayments';
import { FaMoneyBill1Wave } from 'react-icons/fa6';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux/store';

const CreditSalesManagement = () => {
    const { data: stores } = useStores();
    const user = useSelector((state: RootState) => state.userAuth.data)
    
    // Initialize selectedStore from localStorage
    const [selectedStore, setSelectedStore] = useState<string | null>(() => {
        const storedStore = localStorage.getItem('posStore');
        if (storedStore) {
            const storeData: POSStore = JSON.parse(storedStore);
            // Check if store selection is less than 24 hours old
            if (Date.now() - storeData.timestamp < 24 * 60 * 60 * 1000) {
                return storeData.storeId;
            } else {
                localStorage.removeItem('posStore');
            }
        }
        return null;
    });
    
    const [showStoreModal, setShowStoreModal] = useState(!selectedStore);
    const { data, refresh } = useCreditSale(selectedStore);
    const [creditSales, setCreditSales] = useState<ISale[]>(data || []);

      const [selectedSale, setSelectedSale] = useState<ISale | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);

    const handleCollectPayment = (sale: ISale) => {
        setSelectedSale(sale);
        setShowPaymentModal(true);
    };

    const handlePaymentCollected = () => {
        refresh(selectedStore);
    };

    const handleViewSale = (sale: ISale) => {
        setSelectedSale(sale);
        setShowViewModal(true);
    };

    useEffect(() => {
        setCreditSales(data || []);
    }, [data]);

    const [modalProps, setModalProps] = useState<{
        isOpen: boolean;
        mode: 'create' | 'edit' | '';
        sale: ISale | null;
    }>({
        isOpen: false,
        mode: 'create',
        sale: null
    });

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const deleteCreditSale = async () => {
        try {
            if (modalProps.sale) {
                await apiRequest(
                    SALESENDPOINTS.POS.delete(modalProps.sale.id),
                    'DELETE',
                    ''
                );
                refresh(selectedStore);
                setIsDeleteModalOpen(false);
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Something went wrong');
        }
    };

    // Table columns configuration
    const columns = [
        { key: 'clientName', label: 'Client', sortable: true, filterable: true },
        { key: 'amount', label: 'Amount (UGX)', sortable: true, filterable: false },
        { key: 'balance', label: 'Balance (UGX)', sortable: true, filterable: false },
        { key: 'status', label: 'Status', sortable: true, filterable: true },
        { key: 'createdAt', label: 'Created At', sortable: true, filterable: false },
        { key: 'actions', label: 'Actions', sortable: false, filterable: false },
    ];

    const formatDate = (date: string | Date) =>
        new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });

    const tableData = creditSales.map(sale => ({
        ...sale,
        clientName: sale.client ? `${sale.client.firstName} ${sale.client.lastName}` : 'Unknown Client',
        amount: typeof sale.total === 'number' ? sale.total.toLocaleString() : String(sale.total),
        createdAt: formatDate(sale.createdAt),
        actions: (
            <div className="flex gap-3">
                <div className="relative group">
                    <button
                        className="text-green-600 hover:text-green-800 transition-colors"
                        onClick={() => handleViewSale(sale)}
                    >
                        <FaEye />
                    </button>
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        View Sale
                    </span>
                </div>

                <div className="relative group">
                    <button
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        onClick={() => handleCollectPayment(sale)}
                    >
                        <FaMoneyBill1Wave />
                    </button>
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        Collect Payment
                    </span>
                </div>

                <div className="relative group">
                    <button
                        className="text-red-600 hover:text-red-800 transition-colors"
                        onClick={() => {
                            setModalProps({ isOpen: false, mode: '', sale });
                            setIsDeleteModalOpen(true);
                        }}
                    >
                        <FaTrash />
                    </button>
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        Delete
                    </span>
                </div>
            </div>
        )
    }));

    const handleStoreSelect = (storeId: string, storeName: string) => {
        const storeData: POSStore = {
            storeId,
            storeName,
            timestamp: Date.now()
        };
        localStorage.setItem('posStore', JSON.stringify(storeData));
        setSelectedStore(storeId);
        setShowStoreModal(false);
        toast.success(`Store set to ${storeName}`);
    };

    // Show store selection modal if no store is selected
    if (!selectedStore) {
        return (
            <StoreSelectionModal
                visible={showStoreModal}
                stores={stores || []}
                onStoreSelect={handleStoreSelect}
                setShowStoreModal={setShowStoreModal}
            />
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Credit Sales</h2>
            </div>

            <CustomTable columns={columns} data={tableData} pageSize={10} />

                  {selectedSale && (
                        <CollectCreditPaymentModal
                        visible={showPaymentModal}
                        sale={selectedSale}
                        onClose={() => {
                            setShowPaymentModal(false);
                            setSelectedSale(null);
                        }}
                        onPaymentCollected={handlePaymentCollected}
                        currentUser={{ id: user.id, name: `${user.firstName} ${user.lastName}` }}
                        />
                    )}

            {/* View Sale Items Modal */}
            {selectedSale && showViewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">
                                Sale Details - {selectedSale.client?.firstName} {selectedSale.client?.lastName}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowViewModal(false);
                                    setSelectedSale(null);
                                }}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-4">
                            <div>
                                <span className="font-semibold">Sale ID:</span> #{selectedSale.id}
                            </div>
                            <div>
                                <span className="font-semibold">Status:</span>{' '}
                                <span className={`px-2 py-1 rounded text-xs ${
                                    selectedSale.status === 'FULLY_PAID'
                                        ? 'bg-green-100 text-green-800'
                                        : selectedSale.status === 'PARTIALLY_PAID'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {selectedSale.status}
                                </span>
                            </div>
                            <div>
                                <span className="font-semibold">Total:</span> UGX {Number(selectedSale.total).toLocaleString()}
                            </div>
                            <div>
                                <span className="font-semibold">Balance:</span> UGX {Number(selectedSale.balance).toLocaleString()}
                            </div>
                            <div>
                                <span className="font-semibold">Store:</span> {selectedSale.store?.name}
                            </div>
                            <div>
                                <span className="font-semibold">Served By:</span> {selectedSale.employee?.firstName} {selectedSale.employee?.lastName}
                            </div>
                            <div>
                                <span className="font-semibold">Date:</span> {new Date(selectedSale.createdAt).toLocaleString()}
                            </div>
                            {selectedSale.notes && (
                                <div className="col-span-2">
                                    <span className="font-semibold">Notes:</span> {selectedSale.notes}
                                </div>
                            )}
                        </div>

                        <h4 className="text-lg font-semibold mb-3">Items</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-4 py-2 text-left">Item</th>
                                        <th className="border border-gray-300 px-4 py-2 text-left">Barcode</th>
                                        <th className="border border-gray-300 px-4 py-2 text-right">Qty</th>
                                        <th className="border border-gray-300 px-4 py-2 text-right">Unit Price</th>
                                        <th className="border border-gray-300 px-4 py-2 text-right">Discount</th>
                                        <th className="border border-gray-300 px-4 py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedSale.items.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-4 py-2">{item.name}</td>
                                            <td className="border border-gray-300 px-4 py-2">{item.barcode}</td>
                                            <td className="border border-gray-300 px-4 py-2 text-right">{item.quantity}</td>
                                            <td className="border border-gray-300 px-4 py-2 text-right">
                                                UGX {Number(item.price).toLocaleString()}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2 text-right">
                                                UGX {Number(item.discount).toLocaleString()}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2 text-right">
                                                UGX {Number(item.total).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100 font-semibold">
                                        <td colSpan={5} className="border border-gray-300 px-4 py-2 text-right">
                                            Total:
                                        </td>
                                        <td className="border border-gray-300 px-4 py-2 text-right">
                                            UGX {selectedSale.items.reduce((sum, item) => sum + Number(item.total), 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => {
                                    setShowViewModal(false);
                                    setSelectedSale(null);
                                }}
                                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CustomDeleteModal
                visible={isDeleteModalOpen}
                onCancel={() => setIsDeleteModalOpen(false)}
                onConfirm={deleteCreditSale}
            />
        </div>
    );
};

export default CreditSalesManagement;