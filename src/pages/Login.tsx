import React, { useState } from "react";
import { motion } from "motion/react";
import { LogIn, UserPlus, Phone, Lock, Mail, User } from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Logged in successfully");
        navigate("/dashboard");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile
        await updateProfile(user, { displayName: fullName });

        // Create user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: fullName,
          phoneNumber: phone,
          walletBalance: 0,
          holdBalance: 0,
          role: 'user',
          createdAt: serverTimestamp()
        });

        toast.success("Account created successfully");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error("Firebase Auth Error: Email/Password sign-in is not enabled. Please go to Firebase Console > Authentication > Sign-in method and enable Email/Password.");
      } else {
        toast.error(error.message || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{isLogin ? "Login" : "Create Account"}</h1>
          <p className="text-gray-500 text-sm">
            {isLogin ? "Login to return to your account" : "Create a new account and start shopping"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600">Full Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  placeholder="Your Name" 
                  className="w-full bg-gray-50 h-12 pl-12 pr-4 rounded-xl outline-none focus:ring-2 ring-primary"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600">Email Address</label>
            <div className="relative">
              <input 
                type="email" 
                required
                placeholder="example@mail.com" 
                className="w-full bg-gray-50 h-12 pl-12 pr-4 rounded-xl outline-none focus:ring-2 ring-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600">Phone Number</label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  placeholder="017XXXXXXXX" 
                  className="w-full bg-gray-50 h-12 pl-12 pr-4 rounded-xl outline-none focus:ring-2 ring-primary"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600">Password</label>
            <div className="relative">
              <input 
                type="password" 
                required
                placeholder="••••••••" 
                className="w-full bg-gray-50 h-12 pl-12 pr-4 rounded-xl outline-none focus:ring-2 ring-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>

          {isLogin && (
            <div className="text-right">
              <button 
                type="button" 
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
              >
                {resetLoading ? "Sending..." : "Forgot Password?"}
              </button>
            </div>
          )}

          <motion.button 
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-primary text-white h-14 rounded-2xl font-bold shadow-xl shadow-orange-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                {isLogin ? "Login" : "Sign Up"}
              </>
            )}
          </motion.button>
        </form>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">OR</span></div>
        </div>

        <div className="text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-bold text-secondary hover:underline"
          >
            {isLogin ? "Create a new account" : "Login with existing account"}
          </button>
        </div>
      </div>
    </div>
  );
}
