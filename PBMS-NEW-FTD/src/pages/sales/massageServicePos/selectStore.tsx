import React from 'react';
import { FaStore } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux/store';
import { useNavigate } from 'react-router-dom';

interface Store {
  id: string;
  name: string;
  authorizedPersonnel: string[];
}

interface StoreSelectionModalProps {
  visible: boolean;
  stores: Store[];
  onStoreSelect: (storeId: string, storeName: string) => void;
  setShowStoreModal: (visible: boolean) => void;
}

const StoreSelectionModal: React.FC<StoreSelectionModalProps> = ({
  visible,
  stores,
  onStoreSelect,
  setShowStoreModal
}) => {
    const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.userAuth.data);
    if (!visible) return null;

  const currentUserId = user.id;

  const userStores = stores.filter(store =>
    store.authorizedPersonnel.includes(currentUserId)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="relative bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
        {/* ❌ Close Button */}
        <button
            onClick={() => {
                setShowStoreModal(false)
                navigate('/dashboard')
            }}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition"
        >
          <IoClose className="text-2xl" />
        </button>

        <div className="text-center mb-6">
          <FaStore className="mx-auto text-4xl text-gray-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">Select Store</h2>
          <p className="text-gray-600 mt-2">
            Choose the store you want to sell from
          </p>
        </div>

        <div className="space-y-3">
          {userStores.map(store => (
            <button
              key={store.id}
              onClick={() => onStoreSelect(store.id, store.name)}
              className="w-full p-4 border border-gray-300 rounded-lg hover:border-gray-500 hover:bg-gray-50 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-800">{store.name}</h3>
            </button>
          ))}
        </div>

        {userStores.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No stores assigned to your account
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreSelectionModal;
