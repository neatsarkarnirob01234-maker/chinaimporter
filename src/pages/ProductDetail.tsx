import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingCart, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  Star, 
  ChevronLeft, 
  ExternalLink, 
  Loader2, 
  TrendingUp, 
  Heart,
  Info,
  Plus,
  Minus,
  Check,
  Share2,
  MapPin,
  Edit2,
  Play,
  ChevronDown,
  ChevronsRight,
  Clock,
  Shield
} from "lucide-react";
import { formatPrice, formatBDT } from "../lib/utils";
import { doc, getDoc, getDocs, query, collection, where, limit } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Product, CartItem } from "../types";
import { toast } from "sonner";
import ProductCard from "../components/ProductCard";

interface ProductDetailProps {
  addToCart: (item: CartItem) => void;
}

export default function ProductDetail({ addToCart }: ProductDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>("");
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'specification' | 'description' | 'reviews'>('specification');
  
  // Variant selection states
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({});

  const colorVariant = useMemo(() => product?.variants?.find(v => v.name.toLowerCase().includes('color')), [product]);
  const sizeVariant = useMemo(() => product?.variants?.find(v => 
    v.name.toLowerCase().includes('size') || 
    v.name.toLowerCase().includes('capacity') ||
    v.name.toLowerCase().includes('memory') ||
    v.name.toLowerCase().includes('specification')
  ), [product]);

  const sizes = useMemo(() => sizeVariant ? sizeVariant.options : [], [sizeVariant]);
  const sizeLabel = sizeVariant ? sizeVariant.name : 'Size';
  const colorLabel = colorVariant ? colorVariant.name : 'Color';

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

  const isSizeChart = (url: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('size') || 
           lower.includes('table') || 
           lower.includes('chart') || 
           lower.includes('banner') ||
           lower.includes('尺码') || 
           lower.includes('尺寸') || 
           lower.includes('表') ||
           lower.includes('建议');
  };

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!id) return;
      setLoading(true);
      
      try {
        const docSnap = await getDoc(doc(db, "products", id));
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(data);
          setActiveImage(fixDriveUrl(data.image || (data.images && data.images[0]) || ""));
          
          // Initialize variant selection
          if (data.variants && data.variants.length > 0) {
            const cVar = data.variants.find(v => v.name.toLowerCase().includes('color') || v.name.toLowerCase().includes('colour') || v.name.toLowerCase().includes('variant'));
            if (cVar) {
              const firstOpt = cVar.options[0];
              setSelectedColor(firstOpt);
              if (data.variantImages && data.variantImages[firstOpt]) {
                setActiveImage(fixDriveUrl(data.variantImages[firstOpt]));
              } else {
                // Smart fallback for initial image: skip size charts
                const productImages = (data.images && data.images.length > 0 ? data.images : [data.image]).filter(img => !isSizeChart(img));
                if (productImages.length > 0) {
                  setActiveImage(fixDriveUrl(productImages[0]));
                }
              }
            }
          }

          // Fetch related products
          if (data.category) {
            const q = query(
              collection(db, "products"), 
              where("category", "==", data.category),
              limit(5)
            );
            const relatedSnap = await getDocs(q);
            setRelatedProducts(relatedSnap.docs
              .map(d => ({ id: d.id, ...d.data() } as Product))
              .filter(p => p.id !== id)
              .slice(0, 4)
            );
          }
        } else {
          toast.error("Product not found");
          navigate("/");
        }
      } catch (error) {
        console.error("Error fetching product details:", error);
        handleFirestoreError(error, OperationType.GET, `products/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id, navigate]);

  const totalQuantity = useMemo(() => {
    const values = Object.values(sizeQuantities) as number[];
    return values.length > 0 ? values.reduce((acc: number, curr: number) => acc + curr, 0) : 0;
  }, [sizeQuantities]);

  const unitPriceBDT = product?.price_bdt || 0;
  const totalPriceBDT = unitPriceBDT * totalQuantity;

  const handleAddToCart = () => {
    if (!product) return;

    const selectedEntries = (Object.entries(sizeQuantities) as [string, number][]).filter(([_, q]) => q > 0);
    
    if (selectedEntries.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    // Add each selected size to cart
    selectedEntries.forEach(([size, qty]) => {
      const cartItem: CartItem = {
        ...product,
        image: activeImage || product.image,
        quantity: qty,
        selectedVariants: { 
          [colorLabel]: selectedColor,
          [sizeLabel]: size
        }
      };
      addToCart(cartItem);
    });
    
    toast.success("Added to cart!");
  };

  const handleBuyNow = () => {
    handleAddToCart();
    if (totalQuantity > 0) navigate("/cart");
  };

  const updateSizeQty = (size: string, delta: number) => {
    setSizeQuantities(prev => ({
      ...prev,
      [size]: Math.max(0, (prev[size] || 0) + delta)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00A651]" size={48} />
      </div>
    );
  }

  if (!product) return null;

  const allImages = product.images && product.images.length > 0 
    ? product.images 
    : [product.image];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/" className="hover:text-[#00A651] transition-colors">Home</Link>
        <span>&gt;</span>
        <span className="text-gray-900 font-medium">Product Details</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-4 space-y-4">
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 relative group">
            <img 
              src={fixDriveUrl(activeImage)} 
              alt={product.title}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {allImages.map((img, i) => (
              <button 
                key={i} 
                onClick={() => setActiveImage(fixDriveUrl(img))}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all relative ${activeImage === fixDriveUrl(img) ? 'border-[#00A651]' : 'border-transparent hover:border-gray-200'}`}
              >
                <img src={fixDriveUrl(img)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                {i === 0 && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play size={16} className="text-white fill-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Middle: Product Info & Selection */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {product.title}
            </h1>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">399 Sold</span>
              <div className="flex items-center gap-4">
                <button className="text-gray-400 hover:text-red-500 transition-colors">
                  <Heart size={20} />
                </button>
                <button className="text-gray-400 hover:text-blue-500 transition-colors">
                  <Share2 size={20} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                <img src="https://flagcdn.com/w20/cn.png" alt="CN" className="w-4 h-3 object-cover rounded-sm" />
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">From China</span>
              </div>
              <ChevronsRight size={14} className="text-gray-300" />
              <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                <img src="https://flagcdn.com/w20/bd.png" alt="BD" className="w-4 h-3 object-cover rounded-sm" />
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">To Bangladesh</span>
              </div>
            </div>

            {/* Tiered Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center space-y-1 shadow-sm">
                <p className="text-2xl font-black text-gray-900">৳{unitPriceBDT.toFixed(2)}</p>
                <p className="text-[11px] text-gray-500 font-medium">1-9999 Pcs</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center space-y-1 shadow-sm">
                <p className="text-2xl font-black text-gray-900">৳{(unitPriceBDT * 0.9).toFixed(2)}</p>
                <p className="text-[11px] text-gray-500 font-medium">&gt;10000 Pcs</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="font-bold">Service:</span>
              <span className="text-gray-600">Ships within 48 hours</span>
            </div>

            {/* Variant Selection */}
            {colorVariant && (
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-900">{colorLabel}: <span className="text-[#00A651] font-medium">{selectedColor}</span></p>
                <div className="flex flex-wrap gap-3">
                  {colorVariant.options.map((opt, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        setSelectedColor(opt);
                        if (product.variantImages && product.variantImages[opt]) {
                          setActiveImage(fixDriveUrl(product.variantImages[opt]));
                        } else {
                          // Smart fallback: Try to find an image that isn't a size chart
                          const productImages = allImages.filter(img => !isSizeChart(img));
                          if (productImages.length >= colorVariant.options.length) {
                            setActiveImage(fixDriveUrl(productImages[i]));
                          } else if (productImages[i]) {
                            setActiveImage(fixDriveUrl(productImages[i]));
                          } else if (productImages[0]) {
                            setActiveImage(fixDriveUrl(productImages[0]));
                          }
                        }
                      }}
                      className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${selectedColor === opt ? 'border-[#00A651] bg-emerald-50 text-[#00A651]' : 'border-gray-200 hover:border-gray-400 text-gray-600'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!colorVariant && allImages.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-900">Color: <span className="text-gray-500 font-medium">{selectedColor || 'Default'}</span></p>
                <div className="flex flex-wrap gap-3">
                  {allImages.slice(0, 4).map((img, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        setSelectedColor(`Variant ${i+1}`);
                        setActiveImage(fixDriveUrl(img));
                      }}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${selectedColor === `Variant ${i+1}` ? 'border-[#00A651] ring-1 ring-[#00A651]' : 'border-gray-200 hover:border-gray-400'}`}
                    >
                      <img src={fixDriveUrl(img)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Table or Single Quantity Selector */}
            {sizes.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-4 font-bold text-xs">{sizeLabel}</th>
                      <th className="px-6 py-4 font-bold text-xs">Price</th>
                      <th className="px-6 py-4 font-bold text-xs">Stock</th>
                      <th className="px-6 py-4 font-bold text-xs text-center">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sizes.map((size) => (
                      <tr key={size} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{size}</td>
                        <td className="px-6 py-4 font-medium text-gray-700">{unitPriceBDT.toFixed(2)}</td>
                        <td className="px-6 py-4 text-gray-500">6369</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-4">
                            <button 
                              onClick={() => updateSizeQty(size, -1)}
                              className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-6 text-center font-bold text-gray-900">{sizeQuantities[size] || 0}</span>
                            <button 
                              onClick={() => updateSizeQty(size, 1)}
                              className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sizes.length > 5 && (
                  <button className="w-full py-3 text-xs font-bold text-gray-500 flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors border-t border-gray-100">
                    Show More <ChevronDown size={14} />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-sm font-bold text-gray-700 uppercase">Quantity</span>
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => updateSizeQty('default', -1)}
                    className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-500 border border-gray-200"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-8 text-center text-lg font-black text-gray-900">{sizeQuantities['default'] || 0}</span>
                  <button 
                    onClick={() => updateSizeQty('default', 1)}
                    className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-500 border border-gray-200"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Summary & Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  Shipping<span className="text-red-500">*</span>
                </h3>
                <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                  <MapPin size={14} className="text-gray-400" />
                  To Bangladesh
                </div>
              </div>

              <div className="bg-gray-50/80 rounded-xl p-4 space-y-2 relative border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">Sweater,</span>
                  <span className="text-xs font-bold text-[#00A651]">৳820/Kg</span>
                  <span className="text-[10px] bg-emerald-100 text-[#00A651] px-2 py-0.5 rounded-md font-bold">Slot</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  <Truck size={14} className="text-gray-400" />
                  By Air - MoveOn Global Shipping
                </div>
                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <Edit2 size={16} />
                </button>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-medium">Product Quantity</span>
                  <span className="font-bold text-gray-900">{totalQuantity}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-medium">Product Price</span>
                  <span className="font-bold text-gray-900">৳{totalPriceBDT.toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-gray-900">Total Cost</span>
                    <p className="text-[9px] text-gray-400 font-medium leading-tight">
                      + China Local Courier Charge & Shipping Charge.
                    </p>
                  </div>
                  <span className="text-xl font-black text-gray-900">৳{totalPriceBDT.toFixed(0)}</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 text-center leading-tight font-medium">
                চায়না লোকাল ডেলিভারি চার্জ কার্ট পেজে যোগ হবে
              </p>

              <div className="space-y-3">
                <button 
                  onClick={handleBuyNow}
                  className="w-full bg-[#00A651] text-white h-12 rounded-lg font-bold hover:bg-[#008c44] transition-all shadow-sm"
                >
                  Buy Now
                </button>
                <button 
                  onClick={handleAddToCart}
                  className="w-full bg-white text-[#00A651] border border-[#00A651] h-12 rounded-lg font-bold hover:bg-emerald-50 transition-all shadow-sm"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>

          {/* MoveDrop Banner */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white relative overflow-hidden group cursor-pointer">
            <div className="relative z-10 space-y-4">
              <h3 className="text-xl font-black leading-tight">
                Dropship this product with MoveDrop!
              </h3>
              <p className="text-xs font-medium text-orange-100 leading-relaxed">
                No stock, No risk!<br />
                Just sell and grow your business.
              </p>
              <button className="bg-white text-orange-600 px-4 py-2 rounded-lg font-bold text-xs shadow-lg hover:bg-orange-50 transition-all">
                Start Dropshipping
              </button>
            </div>
            <img 
              src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=400" 
              alt="" 
              className="absolute right-[-20px] bottom-[-20px] w-32 h-32 object-cover opacity-20 group-hover:scale-110 transition-transform duration-500"
            />
          </div>

          {/* Assurance */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">MoveOn Assurance</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <Shield size={16} />
                </div>
                <span>100% money back guarantee</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <Clock size={16} />
                </div>
                <span>On time guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="flex border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('specification')}
            className={`px-8 py-4 text-xs font-bold uppercase tracking-wider transition-all relative ${activeTab === 'specification' ? 'text-[#00A651]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Specification
            {activeTab === 'specification' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00A651]" />}
          </button>
          <button 
            onClick={() => setActiveTab('description')}
            className={`px-8 py-4 text-xs font-bold uppercase tracking-wider transition-all relative ${activeTab === 'description' ? 'text-[#00A651]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Description
            {activeTab === 'description' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00A651]" />}
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'specification' && (
              <motion.div 
                key="spec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0 border-t border-l border-gray-100"
              >
                {product.specs && product.specs.length > 0 ? (
                  product.specs.map((spec, i) => (
                    <div key={i} className="flex border-b border-r border-gray-100">
                      <div className="w-1/3 bg-gray-50/50 px-4 py-3 text-[10px] font-bold text-gray-500 uppercase flex items-center">
                        {spec.label}
                      </div>
                      <div className="w-2/3 px-4 py-3 text-[11px] text-gray-700 font-medium flex items-center">
                        {spec.value}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-12 text-center text-gray-400 text-sm italic border-b border-r border-gray-100">
                    No specifications available for this product.
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'description' && (
              <motion.div 
                key="desc"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="prose prose-sm max-w-none text-gray-600 leading-relaxed"
              >
                {product.details ? (
                  <div dangerouslySetInnerHTML={{ __html: product.details.replace(/\n/g, '<br/>') }} />
                ) : product.description ? (
                  <p>{product.description}</p>
                ) : (
                  <div className="py-12 text-center text-gray-400 text-sm italic">
                    No detailed description available.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Related Products */}
      <section className="pt-12 border-t border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 uppercase">
            <TrendingUp className="text-blue-500" size={20} />
            Related Products
          </h2>
          <Link to="/" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">View All</Link>
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
