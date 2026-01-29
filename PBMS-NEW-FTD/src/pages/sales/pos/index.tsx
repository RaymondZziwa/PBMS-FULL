import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import StoreSelectionModal from './selectStore';
import type { IItem } from '../../../redux/types/inventory';
import ItemsGrid from './itemGrid';
import Cart from './cart';
import useStores from '../../../hooks/inventory/useStores';
import type { ICartItem } from '../../../redux/types/sales';
import CheckoutModal from './checkoutModal';
import useStoreInventory from '../../../hooks/inventory/useStoreInventory';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux/store';

interface POSStore {
  storeId: number;
  storeName: string;
  timestamp: number;
}

const PointOfSale: React.FC = () => {
  const { data: stores } = useStores();
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const {data: allItems, refresh: getStockLevels} = useStoreInventory(selectedStore?.toString() || '');
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [cart, setCart] = useState<ICartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
    const user = useSelector((state: RootState) => state.userAuth.data);

  const currentUserId = user?.id;

  const userStores = stores?.filter(store =>
    store.authorizedPersonnel?.includes(Number(currentUserId))
  ) || [];

  useEffect(() => {
    // Check for stored store selection
    try {
      const storedStore = localStorage.getItem('posStore');
      if (storedStore) {
        const storeData: POSStore = JSON.parse(storedStore);
        // Check if store selection is less than 24 hours old
        if (Date.now() - storeData.timestamp < 24 * 60 * 60 * 1000) {
          setSelectedStore(storeData.storeId);
        } else {
          localStorage.removeItem('posStore');
          setShowStoreModal(true);
        }
      } else {
        setShowStoreModal(true);
      }
    } catch (error) {
      // If stored data is corrupted, clear it and show store modal
      localStorage.removeItem('posStore');
      setShowStoreModal(true);
    }

    // Load cart from localStorage
    try {
      const savedCart = localStorage.getItem('posCart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (error) {
      // If cart data is corrupted, clear it
      localStorage.removeItem('posCart');
      setCart([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('posCart', JSON.stringify(cart));
  }, [cart]);

  const handleStoreSelect = (storeId: string, storeName: string) => {
    const storeData: POSStore = {
      storeId: Number(storeId),
      storeName,
      timestamp: Date.now()
    };
    localStorage.setItem('posStore', JSON.stringify(storeData));
    setSelectedStore(Number(storeId));
    setShowStoreModal(false);
    toast.success(`Store set to ${storeName}`);
  };

  const handleAddToCart = (item: IItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ?
            { 
              ...cartItem, 
              quantity: cartItem.quantity + 1,
              total: (cartItem.quantity + 1) * Number(cartItem.price) - cartItem.discount
            }
            : cartItem
        );
      } else {
        return [...prevCart, {
          ...item,
          quantity: 1,
          discount: 0,
          total: Number(item.price)
        }];
      }
    });
  };

  const handleBarcodeScan = (barcode: string) => {
    const item = allItems?.find(i => i.item.barcode && i.item.barcode.toString() === barcode);
    if (item) {
      handleAddToCart(item.item);
      toast.success(`Added ${item.item.name} to cart`);
    } else {
      toast.error('Item not found');
    }
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveFromCart(itemId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, total: (item.price * newQuantity) - item.discount }
          : item
      )
    );
  };

  const handleDiscountChange = (itemId: string, discount: number) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId
          ? { ...item, discount, total: (item.price * item.quantity) - discount }
          : item
      )
    );
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
    toast.success('Cart cleared');
  };

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.total), 0);

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
    <div className="flex bg-gray-100 h-screen overflow-hidden">
      {/* Items Section - 70% */}
      <div className="w-[70%] p-4">
        <ItemsGrid
          items={(allItems || []).filter((item) => item.item.showInPos === true)}
          selectedStore={selectedStore?.toString() || ''}
          filterCategory={filterCategory}
          onCategoryChange={setFilterCategory}
          onAddToCart={handleAddToCart}
          onBarcodeScan={handleBarcodeScan}
          stores={userStores}
          activeStore={selectedStore?.toString() || ''}
          onStoreChange={(storeId, storeName) => {
            setSelectedStore(storeId);
            toast.success(`Store changed to ${storeName}`);
          }}
        />
      </div>

      {/* Cart Section - 30% */}
      <div className="w-[30%] bg-white border-l h-screen flex flex-col">
        <Cart
          cart={cart}
          onQuantityChange={handleQuantityChange}
          onDiscountChange={handleDiscountChange}
          onRemoveItem={handleRemoveFromCart}
          onClearCart={handleClearCart}
          onCheckout={() => setShowCheckout(true)}
          total={cartTotal}
        />
      </div>

      <CheckoutModal
        visible={showCheckout}
        cart={cart}
        total={cartTotal}
        onClose={() => setShowCheckout(false)}
        onCompleteSale={() => {
          setCart([]);
          setShowCheckout(false);
          if (selectedStore) {
            getStockLevels(selectedStore.toString());
          }
        }}
      />
    </div>
  );
};

export default PointOfSale;