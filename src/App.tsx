import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile } from "./types";
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const unsubscribeProfile = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUserProfile(doc.data() as UserProfile);
          }
        });
        return () => unsubscribeProfile();
      } else {
        setUserProfile(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Toaster position="top-center" richColors />
      <MainLayout userProfile={userProfile}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout userProfile={userProfile} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard userProfile={userProfile} />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
