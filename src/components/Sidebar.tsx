import { ChevronRight, Smartphone, Watch, Shirt, Home, Zap, Gift, MoreHorizontal } from "lucide-react";
import { motion } from "motion/react";

const categories = [
  { name: "Electronics", icon: Smartphone, sub: ["Mobile", "Laptop", "Accessories"] },
  { name: "Fashion", icon: Shirt, sub: ["Men", "Women", "Kids"] },
  { name: "Watch & Jewelry", icon: Watch, sub: ["Smart Watch", "Analog", "Jewelry"] },
  { name: "Home & Living", icon: Home, sub: ["Kitchen", "Decor", "Furniture"] },
  { name: "Gadgets", icon: Zap, sub: ["Power Bank", "Headphone", "Speaker"] },
  { name: "Gift Items", icon: Gift, sub: ["Birthday", "Wedding", "Others"] },
  { name: "More", icon: MoreHorizontal, sub: [] },
];

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-secondary p-4 text-white font-bold flex items-center gap-2">
          <Menu size={20} />
          All Categories
        </div>
        <nav className="py-2">
          {categories.map((cat, i) => (
            <div key={i} className="group relative">
              <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50 hover:text-primary transition-all text-sm font-medium text-gray-700">
                <div className="flex items-center gap-3">
                  <cat.icon size={18} className="text-gray-400 group-hover:text-primary" />
                  {cat.name}
                </div>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-primary" />
              </button>
              
              {/* Submenu Hover */}
              {cat.sub.length > 0 && (
                <div className="absolute left-full top-0 w-64 bg-white shadow-xl border border-gray-100 rounded-r-2xl hidden group-hover:block z-50 py-4 min-h-full">
                  <div className="px-6 mb-4">
                    <h4 className="font-bold text-gray-900 border-b pb-2">{cat.name}</h4>
                  </div>
                  {cat.sub.map((sub, j) => (
                    <button key={j} className="w-full text-left px-6 py-2 hover:text-primary text-sm text-gray-600 transition-colors">
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function Menu({ size }: { size: number }) {
  return <MoreHorizontal size={size} />;
}
