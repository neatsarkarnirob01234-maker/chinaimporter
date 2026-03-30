import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile, CartItem } from "./types";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import SearchResults from "./pages/SearchResults";
import Wishlist from "./pages/Wishlist";

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => 
      i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    ));
  };

  const clearCart = () => setCart([]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        const userRef = doc(db, "users", user.uid);
        unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserProfile(snapshot.data() as UserProfile);
          }
          setIsAuthReady(true);
        }, (error) => {
          console.error("Profile snapshot error:", error);
          setIsAuthReady(true);
        });
      } else {
        setUserProfile(null);
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  if (!isAuthReady) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">Initializing China-BD Sourcing...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" richColors />
      <MainLayout userProfile={userProfile} cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/product/:id" element={<ProductDetail addToCart={addToCart} />} />
          <Route path="/cart" element={<Cart cart={cart} updateQuantity={updateQuantity} removeFromCart={removeFromCart} />} />
          <Route path="/checkout" element={<Checkout userProfile={userProfile} cart={cart} clearCart={clearCart} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard userProfile={userProfile} />} />
          <Route path="/admin" element={<Admin userProfile={userProfile} />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
