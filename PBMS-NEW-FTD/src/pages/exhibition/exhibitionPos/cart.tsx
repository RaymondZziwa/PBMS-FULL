import React from 'react';
import { FaTrash, FaShoppingCart, FaMoneyBillWave } from 'react-icons/fa';
import type { ICartItem } from '../../../redux/types/sales';


interface CartProps {
  cart: ICartItem[];
  onQuantityChange: (itemId: string, quantity: number) => void;
  onDiscountChange: (itemId: string, discount: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  total: number;
}

const Cart: React.FC<CartProps> = ({
  cart,
  onQuantityChange,
  onDiscountChange,
  onRemoveItem,
  onClearCart,
  onCheckout,
  total,
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* Cart Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FaShoppingCart className="mr-2" />
            Cart
          </h2>
          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {cart.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <FaShoppingCart className="text-4xl mx-auto mb-4 opacity-50" />
            <p>Cart is empty</p>
            <p className="text-sm">Add items to get started</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-800">{item.name}</h3>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {/* Quantity Control */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quantity:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Discount Input */}
                <div>
                  <label className="text-sm text-gray-600 block mb-1">
                    Discount (UGX):
                  </label>
                  <input
                    type="number"
                    value={item.discount}
                    onChange={(e) => onDiscountChange(item.id, Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                    min="0"
                    max={item.price * item.quantity}
                  />
                </div>

                {/* Item Total */}
                <div className="flex justify-between text-sm">
                  <span>Total:</span>
                  <span className="font-semibold">
                    {item.total.toLocaleString()} UGX
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Footer */}
      {cart.length > 0 && (
        <div className="p-4 border-t bg-white">
          <div className="space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{total.toLocaleString()} UGX</span>
            </div>
            
            <button
              onClick={onCheckout}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <FaMoneyBillWave className="mr-2" />
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;