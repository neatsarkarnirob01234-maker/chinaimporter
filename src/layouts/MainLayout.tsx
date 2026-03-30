import { ReactNode } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { MessageCircle } from "lucide-react";
import { motion } from "motion/react";

import { UserProfile } from "../types";

interface MainLayoutProps {
  children: ReactNode;
  userProfile: UserProfile | null;
  cartCount: number;
}

export default function MainLayout({ children, userProfile, cartCount }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header userProfile={userProfile} cartCount={cartCount} />
      
      <main className="flex-1 container mx-auto px-4 py-8 flex gap-8">
        <Sidebar />
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </main>

      {/* Floating WhatsApp Chat */}
      <motion.a
        href="https://wa.me/8801234567890"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl z-50 hover:bg-[#128C7E] transition-colors"
      >
        <MessageCircle size={32} />
      </motion.a>

      <footer className="bg-white border-t border-gray-200 py-12 mt-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Sourcing<span className="text-primary">Pro</span></h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              The most trusted medium for direct product import from China for Bangladeshi buyers. We provide 100% payment security and fast delivery.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Important Links</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-primary">About Us</a></li>
              <li><a href="#" className="hover:text-primary">Shipping Policy</a></li>
              <li><a href="#" className="hover:text-primary">Refund Policy</a></li>
              <li><a href="#" className="hover:text-primary">Terms & Conditions</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-primary">Help Center</a></li>
              <li><a href="#" className="hover:text-primary">Order Tracking</a></li>
              <li><a href="#" className="hover:text-primary">Payment Methods</a></li>
              <li><a href="#" className="hover:text-primary">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Newsletter</h4>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Your Email" 
                className="bg-gray-100 px-4 py-2 rounded-xl text-sm outline-none focus:ring-2 ring-primary flex-1"
              />
              <button className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold">Subscribe</button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-gray-100 text-center text-gray-400 text-xs">
          © {new Date().getFullYear()} SourcingPro BD. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
