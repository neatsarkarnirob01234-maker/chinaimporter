import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ShoppingCart, ShieldCheck, Truck, CreditCard, Star, ChevronLeft, ExternalLink, Loader2 } from "lucide-react";
import { formatPrice } from "../lib/utils";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Product, CartItem } from "../types";
import { toast } from "sonner";

interface ProductDetailProps {
  addToCart: (item: CartItem) => void;
}

export default function ProductDetail({ addToCart }: ProductDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    const unsubscribe = onSnapshot(doc(db, "products", id), (docSnap) => {
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
      } else {
        toast.error("Product not found");
        navigate("/");
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, navigate]);

  const handleAddToCart = () => {
    if (!product) return;
    const cartItem: CartItem = {
      id: product.id,
      title: product.title,
      price_rmb: product.price_rmb,
      image: product.image,
      quantity: quantity,
      source_url: product.source_url
    };
    addToCart(cartItem);
    toast.success("Added to cart!");
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-8">
      <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary transition-colors">
        <ChevronLeft size={20} />
        Go Back
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-100">
        {/* Image Gallery */}
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100"
          >
            <img 
              src={product.image} 
              alt={product.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://picsum.photos/seed/error/400/400";
              }}
            />
          </motion.div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100 cursor-pointer hover:border-primary transition-all">
                <img src={`https://picsum.photos/seed/p${i}/200/200`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-yellow-500">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <span className="text-sm text-gray-400">(120 Reviews)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              {product.title}
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-primary">{formatPrice(product.price_rmb)}</span>
              <span className="text-lg text-gray-400 line-through">{formatPrice(product.price_rmb * 1.5)}</span>
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-lg">30% Off</span>
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed">
            {product.description}
          </p>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <span className="font-bold text-sm">Quantity:</span>
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-lg transition-all"
                >
                  -
                </button>
                <span className="w-12 text-center font-bold">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-lg transition-all"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddToCart}
                className="flex-1 bg-primary text-white h-14 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-orange-200"
              >
                <ShoppingCart size={20} />
                Add to Cart
              </motion.button>
              <a 
                href={product.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 border-2 border-gray-200 h-14 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
              >
                <ExternalLink size={20} />
                View Source Link
              </a>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
              <Truck className="text-primary" size={24} />
              <div>
                <p className="text-sm font-bold">Fast Shipping</p>
                <p className="text-xs text-gray-500">Takes 10-15 days</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
              <ShieldCheck className="text-secondary" size={24} />
              <div>
                <p className="text-sm font-bold">Secure Payment</p>
                <p className="text-xs text-gray-500">bKash & Nagad Payment</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Specs */}
      {product.specs && product.specs.length > 0 && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6">Specifications</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
            {product.specs.map((spec, i) => (
              <div key={i} className="flex justify-between py-3 border-b border-gray-50">
                <span className="text-gray-500">{spec.label}</span>
                <span className="font-medium">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
