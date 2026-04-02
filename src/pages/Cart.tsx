import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Trash2, ShoppingBag, ArrowRight, ChevronLeft } from "lucide-react";
import { formatPrice, formatBDT } from "../lib/utils";
import { CartItem } from "../types";

interface CartProps {
  cart: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
}

export default function Cart({ cart, updateQuantity, removeFromCart }: CartProps) {
  const fixDriveUrl = (url: string) => {
    if (!url) return url;
    let fixedUrl = url;
    if (url.includes('lh3.googleusercontent.com/d/')) {
      fixedUrl = url.replace('lh3.googleusercontent.com/d/', 'drive.google.com/uc?export=view&id=');
    }
    if (fixedUrl.startsWith('//')) {
      fixedUrl = 'https:' + fixedUrl;
    }
    return fixedUrl;
  };

  const subtotal = cart.reduce((acc, item) => {
    const price = item.price_bdt || Math.round(item.price_rmb * 18.0);
    return acc + (price * item.quantity);
  }, 0);
  const shipping = 500; // Mock shipping cost

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
          <ShoppingBag size={48} />
        </div>
        <h2 className="text-2xl font-bold">Your cart is empty!</h2>
        <p className="text-gray-500">Start shopping now and grab the best deals.</p>
        <Link to="/">
          <button className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-orange-200">
            Start Shopping
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Cart ({cart.length})</h1>
        <Link to="/" className="text-primary font-bold flex items-center gap-2 hover:underline">
          <ChevronLeft size={20} />
          Add More Products
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map(item => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex gap-4 items-center"
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-50 shrink-0">
                <img src={fixDriveUrl(item.image)} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{item.title}</h3>
                {item.selectedVariants && Object.entries(item.selectedVariants).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(item.selectedVariants).map(([key, value]) => (
                      <span key={key} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-medium">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-primary font-bold mt-1">
                  {item.price_bdt ? formatBDT(item.price_bdt) : formatPrice(item.price_rmb)}
                </p>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center bg-gray-100 rounded-xl p-1 scale-90 origin-left">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-bold">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all"
                    >
                      +
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-400 hover:text-red-600 p-2 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-xl font-bold border-b pb-4">Order Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatBDT(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Shipping Charge (Est.)</span>
                <span>{formatBDT(shipping)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-4 border-t">
                <span>Total</span>
                <span className="text-primary">{formatBDT(subtotal + shipping)}</span>
              </div>
            </div>

            <Link to="/checkout">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-primary text-white h-14 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-orange-200 mt-4"
              >
                Proceed to Checkout
                <ArrowRight size={20} />
              </motion.button>
            </Link>
          </div>

          <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
            <p className="text-sm text-orange-800 leading-relaxed">
              <strong>Note:</strong> Shipping charges may vary based on product weight. Final shipping charges will be determined after measuring the exact weight upon arrival in Bangladesh.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
