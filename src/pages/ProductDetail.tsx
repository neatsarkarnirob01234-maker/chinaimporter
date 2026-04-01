import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ShoppingCart, ShieldCheck, Truck, CreditCard, Star, ChevronLeft, ExternalLink, Loader2, TrendingUp } from "lucide-react";
import { formatPrice, formatBDT } from "../lib/utils";
import { doc, onSnapshot, query, collection, where, limit } from "firebase/firestore";
import { db } from "../firebase";
import { Product, CartItem } from "../types";
import { toast } from "sonner";
import ProductCard from "../components/ProductCard";

interface ProductDetailProps {
  addToCart: (item: CartItem) => void;
}

export default function ProductDetail({ addToCart }: ProductDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>("");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  const displayPrice = product?.price_bdt ? formatBDT(product.price_bdt) : (product ? formatPrice(product.price_rmb) : '');
  const originalPrice = product?.price_bdt ? formatBDT(product.price_bdt * 1.2) : (product ? formatPrice(product.price_rmb * 1.2) : '');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    const unsubscribe = onSnapshot(doc(db, "products", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Product;
        setProduct(data);
        setActiveImage(data.image || (data.images && data.images[0]) || "");

        // Fetch related products
        if (data.category) {
          const q = query(
            collection(db, "products"), 
            where("category", "==", data.category),
            limit(5)
          );
          onSnapshot(q, (snap) => {
            setRelatedProducts(snap.docs
              .map(d => ({ id: d.id, ...d.data() } as Product))
              .filter(p => p.id !== id)
              .slice(0, 4)
            );
          });
        }
      } else {
        toast.error("Product not found");
        navigate("/");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, navigate]);

  const handleAddToCart = () => {
    if (!product) return;

    // Check if all variants are selected
    if (product.variants && product.variants.length > 0) {
      const unselected = product.variants.find(v => !selectedVariants[v.name]);
      if (unselected) {
        toast.error(`Please select ${unselected.name}`);
        return;
      }
    }

    const cartItem: CartItem = {
      ...product,
      image: activeImage || product.image,
      quantity: quantity,
      selectedVariants
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

  const allImages = product.images && product.images.length > 0 
    ? product.images 
    : [product.image];

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
            key={activeImage}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100"
          >
            <img 
              src={activeImage} 
              alt={product.title}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://picsum.photos/seed/error/400/400";
              }}
            />
          </motion.div>
          <div className="grid grid-cols-4 gap-4">
            {allImages.slice(0, 4).map((img, i) => (
              <div 
                key={i} 
                onClick={() => setActiveImage(img)}
                className={`aspect-square rounded-xl overflow-hidden bg-gray-50 border cursor-pointer transition-all ${activeImage === img ? 'border-primary' : 'border-gray-100 hover:border-primary'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
              <span className="text-3xl font-bold text-primary">{displayPrice}</span>
              <span className="text-lg text-gray-400 line-through">{originalPrice}</span>
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-lg">30% Off</span>
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed">
            {product.description}
          </p>

          {product.variants && product.variants.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-gray-100">
              {product.variants.map((variant, i) => (
                <div key={i} className="space-y-3">
                  <span className="font-bold text-sm uppercase tracking-wider text-gray-400">{variant.name}:</span>
                  <div className="flex flex-wrap gap-2">
                    {variant.options.map((option, j) => (
                      <button 
                        key={j}
                        onClick={() => setSelectedVariants({...selectedVariants, [variant.name]: option})}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                          selectedVariants[variant.name] === option 
                            ? 'bg-primary text-white border-primary shadow-lg shadow-orange-100' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

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
                className="flex-1 bg-gray-900 text-white h-14 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200"
              >
                <ExternalLink size={20} />
                View Original
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
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full" />
            Specifications
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0 border-t border-gray-100">
            {product.specs.map((spec, i) => (
              <div key={i} className="flex justify-between py-4 border-b border-gray-50 group hover:bg-gray-50/50 px-2 transition-colors">
                <span className="text-gray-500 text-sm font-medium">{spec.label}</span>
                <span className="font-bold text-sm text-gray-900">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Related Products */}
      <section className="pt-12 border-t border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 uppercase">
            <TrendingUp className="text-blue-500" size={24} />
            Related Products
          </h2>
          <Link to="/products" className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">View All</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {relatedProducts.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
