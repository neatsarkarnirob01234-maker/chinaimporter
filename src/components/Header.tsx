import { 
  Search, 
  Camera, 
  ShoppingCart, 
  User, 
  Menu, 
  Heart, 
  ChevronDown, 
  Smartphone, 
  Headphones, 
  MapPin, 
  Globe,
  Bell,
  Package,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useState } from "react";
import { formatPrice, formatBDT } from "../lib/utils";

import { UserProfile } from "../types";

interface HeaderProps {
  userProfile: UserProfile | null;
  cartCount: number;
}

export default function Header({ userProfile, cartCount }: HeaderProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: any) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
      {/* Top Bar */}
      <div className="bg-gray-50 border-b border-gray-100 py-2 hidden md:block">
        <div className="container mx-auto px-4 flex justify-between items-center text-[11px] font-medium text-gray-500">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <Smartphone size={14} />
              MoveOn App
            </Link>
            <Link to="/" className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <Headphones size={14} />
              Support
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/wishlist" className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <Heart size={14} />
              Wishlist
            </Link>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors">
              <MapPin size={14} />
              Ship to
            </div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors">
              <img src="https://flagcdn.com/w20/bd.png" alt="BD" className="w-4 h-3 object-cover rounded-sm" />
              EN/BDT
              <ChevronDown size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 bg-[#00A651] rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rotate-45 border-t-0 border-l-0" />
            </div>
            <span className="text-2xl font-black text-gray-900 tracking-tighter">MoveOn</span>
          </div>
        </Link>

        {/* Categories Dropdown */}
        <button className="hidden lg:flex items-center gap-2 font-bold text-sm text-gray-700 hover:text-primary transition-colors">
          Categories
          <ChevronDown size={16} />
        </button>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-3xl relative">
          <div className="flex items-center w-full bg-white border-2 border-[#00A651] rounded-lg overflow-hidden">
            <button type="button" className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm text-gray-500 border-r border-gray-200 hover:bg-gray-50">
              <Globe size={16} />
              All
              <ChevronDown size={14} />
            </button>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products or paste link"
              className="flex-1 h-10 px-4 outline-none text-sm"
            />
            <div className="flex items-center gap-3 pr-2">
              <label className="p-2 text-gray-400 hover:text-primary transition-colors cursor-pointer">
                <Camera size={20} />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={() => toast.info("Image search is being processed...")} 
                />
              </label>
              <button type="submit" className="bg-[#00A651] text-white p-2 rounded-md hover:bg-[#008c44] transition-all">
                <Sparkles size={20} className="fill-white" />
              </button>
            </div>
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-5">
          <button className="hidden lg:flex items-center gap-2 font-bold text-sm text-gray-700 hover:text-primary transition-colors">
            Services
            <ChevronDown size={16} />
          </button>

          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="relative p-2 text-gray-700 hover:text-primary transition-colors">
              <Bell size={24} />
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">0</span>
            </Link>
            
            <Link to="/dashboard" className="relative p-2 text-gray-700 hover:text-primary transition-colors">
              <Package size={24} />
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">0</span>
            </Link>

            <Link to="/cart" className="relative p-2 text-gray-700 hover:text-primary transition-colors">
              <ShoppingCart size={24} />
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">{cartCount}</span>
            </Link>

            {userProfile?.role === 'admin' && (
              <Link to="/admin" className="p-2 text-primary hover:text-orange-600 transition-colors" title="Admin Panel">
                <ShieldCheck size={24} />
              </Link>
            )}

            {!userProfile ? (
              <Link to="/login" className="p-2 text-gray-700 hover:text-primary transition-colors">
                <User size={24} />
              </Link>
            ) : (
              <Link to="/dashboard" className="w-8 h-8 bg-[#00A651] rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-emerald-50 overflow-hidden">
                {userProfile.photoURL ? (
                  <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  userProfile.displayName?.[0] || userProfile.email[0].toUpperCase()
                )}
              </Link>
            )}
          </div>

          <button className="lg:hidden p-2 text-gray-700">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </header>
  );
}
