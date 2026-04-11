import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Product } from "../types";
import ProductCard from "../components/ProductCard";
import { LayoutGrid, ChevronRight } from "lucide-react";

export default function Category() {
  const { categoryName } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!categoryName) return;
      setLoading(true);
      
      try {
        const q = query(
          collection(db, "products"), 
          where("category", "==", categoryName)
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedProducts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Error fetching category products:", error);
        handleFirestoreError(error, OperationType.GET, `products?category=${categoryName}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryName]);

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-widest">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link>
        <ChevronRight size={12} />
        <span className="text-gray-900">{categoryName}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-primary p-2.5 rounded-2xl text-white shadow-lg shadow-orange-100">
          <LayoutGrid size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">{categoryName}</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            {products.length} Products Found
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-gray-100 animate-pulse rounded-2xl aspect-[3/4]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white p-20 rounded-3xl border border-gray-100 text-center space-y-4 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
            <LayoutGrid size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">No products found</h3>
          <p className="text-gray-500 max-w-xs mx-auto">We couldn't find any products in this category. Try exploring other categories.</p>
          <Link to="/" className="inline-block bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-100">
            Go Back Home
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
