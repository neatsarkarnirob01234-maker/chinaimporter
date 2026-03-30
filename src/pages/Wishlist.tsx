import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Product } from "../types";
import { formatPrice } from "../lib/utils";

export default function Wishlist() {
  const [items, setItems] = useState<Product[]>([
    { id: "1", title: "Premium Wireless Earbuds", price_rmb: 85, image: "https://picsum.photos/seed/p1/400/400", source_url: "https://1688.com/1" },
    { id: "3", title: "Men's Casual Sneakers", price_rmb: 45, image: "https://picsum.photos/seed/p3/400/400", source_url: "https://1688.com/3" },
  ]);

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
          <Heart size={48} />
        </div>
        <h2 className="text-2xl font-bold">আপনার উইশলিস্ট খালি!</h2>
        <p className="text-gray-500">পছন্দের পণ্যগুলো এখানে জমা করে রাখুন।</p>
        <Link to="/">
          <button className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-orange-200">
            পণ্য খুঁজুন
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">আমার উইশলিস্ট ({items.length})</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {items.map(product => (
          <motion.div 
            key={product.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group"
          >
            <div className="relative aspect-square overflow-hidden bg-gray-50">
              <img src={product.image} alt={product.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <button 
                onClick={() => removeItem(product.id)}
                className="absolute top-2 right-2 bg-white/90 backdrop-blur p-2 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[2.5rem]">{product.title}</h3>
              <p className="text-lg font-bold text-primary">{formatPrice(product.price_rmb)}</p>
              <button className="w-full bg-secondary text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
                <ShoppingCart size={16} />
                কার্টে যোগ করুন
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
