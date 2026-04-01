import { Search, Camera, ShoppingCart, User, Menu, Heart } from "lucide-react";
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
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">
            S
          </div>
          <span className="text-xl font-bold tracking-tight hidden sm:block">
            Sourcing<span className="text-primary">Pro</span>
          </span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative group">
          <div className="relative flex items-center w-full bg-gray-100 rounded-2xl border-2 border-transparent focus-within:border-primary focus-within:bg-white transition-all duration-200">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Products..."
              className="w-full h-12 px-5 bg-transparent outline-none text-sm"
            />
            <div className="flex items-center gap-2 pr-3">
              <label className="p-2 text-gray-500 hover:text-primary transition-colors cursor-pointer">
                <Camera size={20} />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={() => toast.info("Image search is being processed...")} 
                />
              </label>
              <button type="submit" className="bg-primary text-white p-2 rounded-xl hover:bg-orange-600 transition-all">
                <Search size={20} />
              </button>
            </div>
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {userProfile && (
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Wallet</span>
              <span className="text-sm font-black text-primary">{formatBDT(userProfile.walletBalance)}</span>
            </div>
          )}

          <Link to="/wishlist">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-gray-600 hover:text-primary relative"
            >
              <Heart size={24} />
            </motion.button>
          </Link>
          
          <Link to="/cart">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-gray-600 hover:text-primary relative"
            >
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {cartCount}
                </span>
              )}
            </motion.button>
          </Link>

          <div className="hidden sm:flex items-center gap-2">
            <Link to="/dashboard" className="p-2 text-gray-600 hover:text-primary" title="Dashboard">
              <User size={24} />
            </Link>
            {userProfile?.role === 'admin' && (
              <Link to="/admin" className="p-2 text-primary hover:bg-orange-50 rounded-xl transition-all" title="Admin Panel">
                <Menu size={24} />
              </Link>
            )}
          </div>
          
          {!userProfile ? (
            <Link to="/login" className="hidden sm:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl hover:bg-gray-200 transition-all">
              <span className="text-sm font-medium">Login</span>
            </Link>
          ) : (
            <div className="hidden sm:flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xs">
                {userProfile.displayName?.[0] || userProfile.email[0].toUpperCase()}
              </div>
              <div className="text-[10px] leading-tight max-w-[120px]">
                <p className="font-bold text-gray-900 truncate">{userProfile.displayName || 'User'}</p>
                <p className="text-gray-500 truncate">{userProfile.email}</p>
                <p className="text-primary font-bold">{formatBDT(userProfile.walletBalance)}</p>
              </div>
            </div>
          )}
          
          <button className="sm:hidden p-2 text-gray-600">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </header>
  );
}
