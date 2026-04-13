import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogIn, UserPlus, Phone, Lock, Mail, User, X, Loader2 } from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
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

  // OTP Reset states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'password'>('email');
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSendOTP = async () => {
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }
    setResetLoading(true);
    try {
      const res = await window.fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      
      toast.success("OTP sent to your email!");
      setResetStep('otp');
      setShowResetModal(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }
    setResetLoading(true);
    try {
      const res = await window.fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");

      toast.success("OTP verified!");
      setResetStep('password');
    } catch (error: any) {
      toast.error(error.message || "Verification failed");
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setResetLoading(true);
    try {
      const res = await window.fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      toast.success("Password reset successfully! You can now login.");
      setShowResetModal(false);
      setResetStep('email');
      setIsLogin(true);
    } catch (error: any) {
      toast.error(error.message || "Reset failed");
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
                onClick={handleSendOTP}
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

      {/* OTP Reset Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Reset Password</h2>
                <button onClick={() => setShowResetModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              {resetStep === 'otp' && (
                <div className="space-y-4">
                  <p className="text-gray-500 text-sm">We've sent a 6-digit code to <span className="font-bold text-gray-900">{email}</span>. Please enter it below.</p>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">OTP Code</label>
                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="123456" 
                      className="w-full bg-gray-50 h-14 text-center text-2xl font-bold tracking-[10px] rounded-2xl outline-none focus:ring-2 ring-primary"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <button 
                    onClick={handleVerifyOTP}
                    disabled={resetLoading || otp.length !== 6}
                    className="w-full bg-primary text-white h-14 rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {resetLoading ? <Loader2 className="animate-spin" /> : "Verify OTP"}
                  </button>
                  <button 
                    onClick={handleSendOTP}
                    className="w-full text-sm text-gray-500 hover:text-primary font-medium"
                  >
                    Resend Code
                  </button>
                </div>
              )}

              {resetStep === 'password' && (
                <div className="space-y-4">
                  <p className="text-gray-500 text-sm">OTP Verified! Now set your new password.</p>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">New Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      className="w-full bg-gray-50 h-12 px-4 rounded-xl outline-none focus:ring-2 ring-primary"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Confirm Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      className="w-full bg-gray-50 h-12 px-4 rounded-xl outline-none focus:ring-2 ring-primary"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleResetPassword}
                    disabled={resetLoading || !newPassword || newPassword !== confirmPassword}
                    className="w-full bg-primary text-white h-14 rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {resetLoading ? <Loader2 className="animate-spin" /> : "Reset Password"}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
