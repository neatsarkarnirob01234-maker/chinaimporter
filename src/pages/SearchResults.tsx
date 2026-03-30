import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { Search, Filter, SlidersHorizontal, ChevronDown } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { Product } from "../types";

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Simulate API fetch
    setTimeout(() => {
      const mockProducts: Product[] = Array(12).fill(0).map((_, i) => ({
        id: `search_${i}`,
        title: `${query} Premium Quality Item ${i + 1}`,
        price_rmb: 50 + (i * 10),
        image: `https://picsum.photos/seed/search${i}/400/400`,
        source_url: `https://1688.com/search/${i}`
      }));
      setProducts(mockProducts);
      setLoading(false);
    }, 800);
  }, [query]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Search Results for: <span className="text-primary">"{query}"</span></h1>
          <p className="text-gray-500 text-sm">{products.length} products found</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="bg-white px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold flex items-center gap-2 hover:bg-gray-50">
            <SlidersHorizontal size={16} />
            Filter
          </button>
          <div className="relative">
            <button className="bg-white px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold flex items-center gap-2 hover:bg-gray-50">
              Sorting
              <ChevronDown size={16} />
            </button>
          </div>
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
      
      {!loading && products.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <Search size={48} className="mx-auto text-gray-300" />
          <h2 className="text-xl font-bold text-gray-500">Sorry, no products found!</h2>
          <p className="text-gray-400">Try searching with different keywords.</p>
        </div>
      )}
    </div>
  );
}
