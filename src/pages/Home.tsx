import { useState, useEffect } from "react";
import BannerSlider from "../components/BannerSlider";
import ProductCard from "../components/ProductCard";
import { Product, UserProfile } from "../types";
import { Zap, TrendingUp, Star, Plus, Settings, LayoutDashboard, LayoutGrid } from "lucide-react";
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

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Categories</h2>
          <Link to="/categories" className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">See All</Link>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {categoriesLoading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />
            ))
          ) : (
            categories.slice(0, 8).map((cat, i) => (
              <Link 
                key={i} 
                to={`/category/${cat.name}`}
                className="flex flex-col items-center gap-3 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:border-primary transition-all duration-300">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <LayoutGrid size={20} />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-500 text-center uppercase tracking-tight group-hover:text-primary transition-colors">{cat.name}</span>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Flash Deals */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 p-2.5 rounded-2xl text-white shadow-lg shadow-red-100">
              <Zap size={24} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Flash Deals</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Limited time offers</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ends in:</span>
            <div className="flex items-center gap-1.5">
              {[
                { label: 'H', value: '08' },
                { label: 'M', value: '45' },
                { label: 'S', value: '12' }
              ].map((unit, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="bg-black text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm">
                    {unit.value}
                  </div>
                  {i < 2 && <span className="text-black font-black">:</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {loading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-100 animate-pulse rounded-2xl aspect-[3/4]" />
            ))
          ) : (
            products.slice(0, 8).map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>

      {/* Trending Products */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-100">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Trending Now</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Most popular items</p>
            </div>
          </div>
          <Link to="/products" className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">View All Products</Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {loading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-100 animate-pulse rounded-2xl aspect-[3/4]" />
            ))
          ) : (
            products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>

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
