import React from "react";
import { motion } from "motion/react";
import { ShoppingCart, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Product } from "../types";
import { formatPrice, formatBDT } from "../lib/utils";

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const displayPrice = product.price_bdt ? formatBDT(product.price_bdt) : formatPrice(product.price_rmb);
  const originalPrice = product.price_bdt ? formatBDT(product.price_bdt * 1.2) : formatPrice(product.price_rmb * 1.2);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all duration-300"
    >
      <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-gray-50">
        <img 
          src={product.image || (product.images && product.images[0]) || "https://picsum.photos/seed/no-image/400/400"} 
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('picsum.photos/seed/error')) {
              target.src = "https://picsum.photos/seed/error/400/400";
            }
          }}
        />
        <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg">
          CHINA DIRECT
        </div>
      </Link>
      
      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[2.5rem] mb-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
        </Link>
        
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400 line-through">
              {originalPrice}
            </p>
            <p className="text-lg font-bold text-primary">
              {displayPrice}
            </p>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="bg-secondary text-white p-2 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            <ShoppingCart size={18} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
