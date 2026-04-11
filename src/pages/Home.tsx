import { useState, useEffect } from "react";
import BannerSlider from "../components/BannerSlider";
import ProductCard from "../components/ProductCard";
import { Product, UserProfile } from "../types";
import { Zap, TrendingUp, Star, Plus, Settings, LayoutDashboard, LayoutGrid, ChevronLeft, ChevronRight, Globe, Headphones } from "lucide-react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useCategories } from "../contexts/CategoryContext";

interface HomeProps {
  userProfile: UserProfile | null;
}

export default function Home({ userProfile }: HomeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const { categories, loading: categoriesLoading } = useCategories();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Products
        const qProducts = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(20));
        const productsSnapshot = await getDocs(qProducts);
        const fetchedProducts = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));

        if (fetchedProducts.length > 0) {
          setProducts(fetchedProducts);
        } else {
          // Fallback to mock products if none in DB
          const mockProducts: Product[] = [
            { id: "1", title: "Premium Wireless Earbuds with Noise Cancellation", price_rmb: 85, image: "https://picsum.photos/seed/p1/400/400", source_url: "https://1688.com/1" },
            { id: "2", title: "Smart Watch Series 8 - Global Version", price_rmb: 150, image: "https://picsum.photos/seed/p2/400/400", source_url: "https://1688.com/2" },
            { id: "3", title: "Men's Casual Sneakers - Breathable Mesh", price_rmb: 45, image: "https://picsum.photos/seed/p3/400/400", source_url: "https://1688.com/3" },
            { id: "4", title: "Portable Power Bank 20000mAh Fast Charging", price_rmb: 65, image: "https://picsum.photos/seed/p4/400/400", source_url: "https://1688.com/4" },
            { id: "5", title: "Professional Hair Trimmer for Men", price_rmb: 35, image: "https://picsum.photos/seed/p5/400/400", source_url: "https://1688.com/5" },
            { id: "6", title: "Kitchen Gadget Set - 12 Pieces", price_rmb: 95, image: "https://picsum.photos/seed/p6/400/400", source_url: "https://1688.com/6" },
            { id: "7", title: "Women's Designer Handbag - Luxury Collection", price_rmb: 220, image: "https://picsum.photos/seed/p7/400/400", source_url: "https://1688.com/7" },
            { id: "8", title: "LED RGB Gaming Mouse Pad - Extra Large", price_rmb: 25, image: "https://picsum.photos/seed/p8/400/400", source_url: "https://1688.com/8" },
          ];
          setProducts(mockProducts);
          toast.info("Showing example products. Add your own in the Admin Panel!");
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'home_data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-12 relative">
      {/* Admin Quick Access */}
      {userProfile?.role === 'admin' && (
        <div className="fixed bottom-24 right-8 z-40 flex flex-col gap-3">
          <Link 
            to="/admin?tab=sourcing" 
            className="bg-primary text-white p-4 rounded-full shadow-2xl hover:bg-orange-600 transition-all flex items-center gap-2 group"
          >
            <Plus size={24} />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold whitespace-nowrap">Add Product</span>
          </Link>
          <Link 
            to="/admin" 
            className="bg-secondary text-white p-4 rounded-full shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-2 group"
          >
            <LayoutDashboard size={24} />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold whitespace-nowrap">Admin Dashboard</span>
          </Link>
        </div>
      )}

      <BannerSlider />

      {/* Categories & Expertise Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Categories */}
        <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">Top Categories</h2>
            <div className="flex gap-2">
              <button className="p-2 rounded-full border border-gray-100 hover:bg-gray-50 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button className="p-2 rounded-full border border-gray-100 hover:bg-gray-50 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { name: "Bag", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=200" },
              { name: "Shoes", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=200" },
              { name: "Jackets", image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=200" },
              { name: "Gadgets", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=200" }
            ].map((cat, i) => (
              <Link key={i} to={`/category/${cat.name}`} className="flex flex-col items-center gap-3 group">
                <div className="w-full aspect-square rounded-2xl overflow-hidden border border-gray-100 group-hover:border-primary transition-all">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <span className="text-xs font-bold text-gray-600 group-hover:text-primary transition-colors">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Our Expertise */}
        <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">Our Expertise</h2>
            <Link to="/" className="text-[10px] font-bold text-gray-400 hover:text-primary uppercase tracking-widest">See all</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: "Ship for Me Request", icon: <Globe size={24} />, color: "bg-emerald-50 text-emerald-500" },
              { name: "Request for Quotation", icon: <TrendingUp size={24} />, color: "bg-blue-50 text-blue-500" },
              { name: "Talk to the Expert", icon: <Headphones size={24} />, color: "bg-rose-50 text-rose-500" },
              { name: "Cost Calculator", icon: <LayoutGrid size={24} />, color: "bg-indigo-50 text-indigo-500" }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold text-gray-600 leading-tight">{item.name}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Global Shipping Services Title */}
      <div className="text-center py-8">
        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Global Shipping Services</h2>
      </div>

      {/* Product Hive Section */}
      <section className="space-y-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Explore our MoveOn global product hive
          </h2>
          
          <div className="flex flex-wrap gap-3">
            {["Fashion", "Appliances", "Men's Shoes"].map((tab) => (
              <button
                key={tab}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all border ${
                  tab === "Fashion" 
                    ? "bg-white text-[#00A651] border-[#00A651]" 
                    : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
          {loading ? (
            Array(10).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-100 animate-pulse rounded-2xl aspect-[3/4]" />
            ))
          ) : (
            products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>

      {/* Flash Deals (Moving below or removing if redundant) */}
      <section className="hidden" />

      {/* Trust Badges */}
      <section className="bg-white rounded-3xl p-8 border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-8 shadow-sm">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-primary">
            <Star size={32} fill="currentColor" />
          </div>
          <h3 className="font-bold text-lg">Best Quality</h3>
          <p className="text-gray-500 text-sm">Products from verified suppliers directly from China.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-secondary">
            <Zap size={32} fill="currentColor" />
          </div>
          <h3 className="font-bold text-lg">Fast Shipping</h3>
          <p className="text-gray-500 text-sm">Delivery within 10-15 days of ordering.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
            <ShieldCheck size={32} fill="currentColor" />
          </div>
          <h3 className="font-bold text-lg">Secure Payment</h3>
          <p className="text-gray-500 text-sm">Your payment is 100% secure with us.</p>
        </div>
      </section>
    </div>
  );
}

function ShieldCheck({ size, fill }: { size: number, fill?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill={fill || "none"} 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
