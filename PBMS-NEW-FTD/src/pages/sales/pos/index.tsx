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

interface POSStore {
  storeId: string;
  storeName: string;
  timestamp: number;
}

const PointOfSale: React.FC = () => {
  const { data: stores } = useStores();
  const store = JSON.parse(localStorage.getItem('posStore') || '{}');
  const {data: allItems, refresh: getStockLevels} = useStoreInventory(store.storeId);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [cart, setCart] = useState<ICartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    // Check for stored store selection
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

    // Load cart from localStorage
    const savedCart = localStorage.getItem('posCart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('posCart', JSON.stringify(cart));
  }, [cart]);

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
    const item = allItems?.find(i => i.item.barcode.toString() === barcode);
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
    <div className="flex bg-gray-100">
      {/* Items Section - 70% */}
      <div className="w-3/4 p-4">
        <ItemsGrid
          items={allItems || []}
          selectedStore={selectedStore}
          filterCategory={filterCategory}
          onCategoryChange={setFilterCategory}
          onAddToCart={handleAddToCart}
          onBarcodeScan={handleBarcodeScan}
        />
      </div>

      {/* Cart Section - 30% */}
      <div className="w-1/4 bg-white border-l">
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
          getStockLevels(store.storeId);
        }}
      />
    </div>
  );
};

export default PointOfSale;