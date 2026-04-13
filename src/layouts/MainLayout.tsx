import { ReactNode, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

import { UserProfile } from "../types";

interface MainLayoutProps {
  children: ReactNode;
  userProfile: UserProfile | null;
  cartCount: number;
}

export default function MainLayout({ children, userProfile, cartCount }: MainLayoutProps) {
  const [footerSettings, setFooterSettings] = useState({
    description: 'The most trusted medium for direct product import from China for Bangladeshi buyers. We provide 100% payment security and fast delivery.',
    importantLinks: [
      { label: 'About Us', url: '#' },
      { label: 'Shipping Policy', url: '#' },
      { label: 'Refund Policy', url: '#' },
      { label: 'Terms & Conditions', url: '#' }
    ],
    supportLinks: [
      { label: 'Help Center', url: '#' },
      { label: 'Order Tracking', url: '#' },
      { label: 'Payment Methods', url: '#' },
      { label: 'Contact Us', url: '#' }
    ],
    copyrightText: `© ${new Date().getFullYear()} SourcingPro BD. All rights reserved.`
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'footer'), (snapshot) => {
      if (snapshot.exists()) {
        setFooterSettings(snapshot.data() as any);
      }
    });
    return () => unsubscribe();
  }, []);

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
              {footerSettings.description}
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Important Links</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              {footerSettings.importantLinks.map((link, idx) => (
                <li key={idx}>
                  {link.url === '#' || !link.url ? (
                    <span className="opacity-50 cursor-default">{link.label}</span>
                  ) : link.url.startsWith('http') ? (
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">{link.label}</a>
                  ) : (
                    <Link to={`/p/${link.url.toLowerCase().replace(/ /g, '-')}`} className="hover:text-primary">{link.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              {footerSettings.supportLinks.map((link, idx) => (
                <li key={idx}>
                  {link.url === '#' || !link.url ? (
                    <span className="opacity-50 cursor-default">{link.label}</span>
                  ) : link.url.startsWith('http') ? (
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">{link.label}</a>
                  ) : (
                    <Link to={`/p/${link.url.toLowerCase().replace(/ /g, '-')}`} className="hover:text-primary">{link.label}</Link>
                  )}
                </li>
              ))}
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
          {footerSettings.copyrightText}
        </div>
      </footer>
    </div>
  );
}
