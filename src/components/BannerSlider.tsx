import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, ShieldCheck, Truck, CreditCard, Image as ImageIcon } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

export default function BannerSlider() {
  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "banners"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBanners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (fetchedBanners.length > 0) {
        setSlides(fetchedBanners);
      } else {
        // Fallback to default slides
        setSlides([
          {
            title: "Import Directly from China",
            subtitle: "Best quality at the lowest price",
            image: "https://picsum.photos/seed/banner1/1200/400",
            icon: "ShieldCheck",
            color: "bg-primary",
          },
          {
            title: "Fast Delivery Guaranteed",
            subtitle: "Directly to your doorstep",
            image: "https://picsum.photos/seed/banner2/1200/400",
            icon: "Truck",
            color: "bg-secondary",
          },
          {
            title: "Secure Payment System",
            subtitle: "Pay with bKash, Nagad & Bank",
            image: "https://picsum.photos/seed/banner3/1200/400",
            icon: "CreditCard",
            color: "bg-green-600",
          },
        ]);
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'banners'));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides]);

  if (loading || slides.length === 0) {
    return <div className="w-full h-[300px] sm:h-[400px] bg-gray-100 animate-pulse rounded-3xl" />;
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck': return ShieldCheck;
      case 'Truck': return Truck;
      case 'CreditCard': return CreditCard;
      default: return ImageIcon;
    }
  };

  return (
    <div className="relative w-full h-[300px] sm:h-[400px] rounded-3xl overflow-hidden group shadow-xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <img
            src={slides[current].image}
            alt={slides[current].title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center px-8 sm:px-16">
            <div className="max-w-lg text-white">
              {(() => {
                const Icon = getIcon(slides[current].icon);
                return (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className={(slides[current].color || "bg-primary") + " w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg"}
                  >
                    <Icon size={24} />
                  </motion.div>
                );
              })()}
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl sm:text-5xl font-bold mb-4 leading-tight"
              >
                {slides[current].title}
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg sm:text-xl text-gray-200 mb-8"
              >
                {slides[current].subtitle}
              </motion.p>
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white text-gray-900 px-8 py-3 rounded-2xl font-bold hover:bg-primary hover:text-white transition-all shadow-xl"
              >
                Shop Now
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <button
        onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
      >
        <ChevronRight size={24} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              current === i ? "w-8 bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
