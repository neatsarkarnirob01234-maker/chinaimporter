import React from "react";
import { motion } from "motion/react";
import { Truck, Star, CheckCircle2, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { Product } from "../types";
import { formatPrice, formatBDT } from "../lib/utils";

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
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

  const productImage = fixDriveUrl(product.image || (product.images && product.images[0]) || "");
  const displayPrice = product.price_bdt ? formatBDT(product.price_bdt) : formatPrice(product.price_rmb);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-xl overflow-hidden group transition-all duration-300"
    >
      <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden rounded-2xl bg-gray-50 border border-gray-100">
        <img 
          src={productImage || "https://picsum.photos/seed/no-image/400/400"} 
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('picsum.photos/seed/error')) {
              target.src = "https://picsum.photos/seed/error/400/400";
            }
          }}
        />
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
          <img src="https://flagcdn.com/w20/cn.png" alt="CN" className="w-3 h-2 object-cover rounded-sm" />
          CN
        </div>
      </Link>
      
      <div className="pt-3 pb-2 space-y-1.5">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-[13px] font-medium text-gray-700 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {product.title}
          </h3>
        </Link>
        
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-1">
            <Star size={12} className="text-orange-400 fill-orange-400" />
            <span className="font-bold text-gray-600">5</span>
          </div>
          <span className="font-medium">5K Sold</span>
        </div>

        <div className="text-lg font-black text-[#00A651]">
          {displayPrice}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Math.random() > 0.5 ? (
              <div className="flex items-center gap-1 bg-[#00A651] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                <CheckCircle2 size={10} />
                Verified
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                <Award size={10} />
                Top Rated
              </div>
            )}
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase">MOQ: 1</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 pt-1">
          <Truck size={12} className="text-gray-400" />
          CN to BD: 10-12 days
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
