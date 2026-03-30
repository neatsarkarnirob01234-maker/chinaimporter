import { useState, useEffect } from "react";
import BannerSlider from "../components/BannerSlider";
import ProductCard from "../components/ProductCard";
import { Product } from "../types";
import { Zap, TrendingUp, Star } from "lucide-react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        const fetchedProducts = querySnapshot.docs.map(doc => ({
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
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="space-y-12">
      <BannerSlider />

      {/* Flash Deals */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-red-100 p-2 rounded-xl text-red-600">
              <Zap size={24} fill="currentColor" />
            </div>
            <h2 className="text-2xl font-bold">Flash Deals</h2>
          </div>
          <button className="text-primary font-bold hover:underline">See All</button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-100 animate-pulse rounded-2xl aspect-[3/4]" />
            ))
          ) : (
            products.slice(0, 4).map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>

      {/* Trending Products */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
              <TrendingUp size={24} />
            </div>
            <h2 className="text-2xl font-bold">Trending Products</h2>
          </div>
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
