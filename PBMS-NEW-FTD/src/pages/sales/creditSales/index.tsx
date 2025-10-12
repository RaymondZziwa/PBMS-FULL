import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
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

    const handleCollectPayment = (sale: ISale) => {
        setSelectedSale(sale);
        setShowPaymentModal(true);
    };

    const handlePaymentCollected = () => {
        refresh(selectedStore);
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
                        currentUser={{ id: user.id }}
                        />
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