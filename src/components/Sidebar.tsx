import { ChevronRight, Smartphone, Watch, Shirt, Home, Zap, Gift, MoreHorizontal, Menu as MenuIcon, Package } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { useCategories } from "../contexts/CategoryContext";

export default function Sidebar() {
  const { categories, loading } = useCategories();

  const getIcon = (name: string) => {
    switch (name) {
      case 'Electronics': return Smartphone;
      case 'Fashion': return Shirt;
      case 'Watch & Jewelry': return Watch;
      case 'Home & Living': return Home;
      case 'Gadgets': return Zap;
      case 'Gift Items': return Gift;
      default: return Package;
    }
  };

  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
        <div className="bg-secondary p-4 text-white font-bold flex items-center gap-2">
          <MenuIcon size={20} />
          All Categories
        </div>
        <nav className="py-2">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-10 mx-4 my-2 bg-gray-100 animate-pulse rounded-lg" />
            ))
          ) : (
            categories.map((cat, i) => {
              const Icon = getIcon(cat.name);
              return (
                <div key={i} className="group relative">
                  <Link 
                    to={`/search?category=${encodeURIComponent(cat.name)}`}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50 hover:text-primary transition-all text-sm font-medium text-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="text-gray-400 group-hover:text-primary" />
                      {cat.name}
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-primary" />
                  </Link>
                  
                  {/* Submenu Hover */}
                  {cat.sub && cat.sub.length > 0 && (
                    <div className="absolute left-full top-0 w-64 bg-white shadow-xl border border-gray-100 rounded-r-2xl hidden group-hover:block z-50 py-4 min-h-full">
                      <div className="px-6 mb-4">
                        <h4 className="font-bold text-gray-900 border-b pb-2">{cat.name}</h4>
                      </div>
                      {cat.sub.map((sub: string, j: number) => (
                        <Link 
                          key={j} 
                          to={`/search?category=${encodeURIComponent(cat.name)}&sub=${encodeURIComponent(sub)}`}
                          className="block w-full text-left px-6 py-2 hover:text-primary text-sm text-gray-600 transition-colors"
                        >
                          {sub}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>
      </div>
    </aside>
  );
}
