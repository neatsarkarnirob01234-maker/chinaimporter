import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertCircle, 
  ChevronRight, 
  LogOut,
  RefreshCcw,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  ShieldCheck,
  Smartphone,
  Building2
} from "lucide-react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  getDocs,
  serverTimestamp,
  doc,
  updateDoc,
  increment
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { formatPrice, formatBDT } from "../lib/utils";
import { Order, OrderStatus, UserProfile, RefundRequest } from "../types";
import OrderTracking from "../components/OrderTracking";
import { toast } from "sonner";

interface DashboardProps {
  userProfile: UserProfile | null;
}

export default function Dashboard({ userProfile }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'wallet'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<'bkash' | 'bank'>('bkash');
  const [bkashNumber, setBkashNumber] = useState("");
  const [bankDetails, setBankDetails] = useState({
    accountName: "",
    accountNumber: "",
    bankName: "",
    branchName: ""
  });

  const fixDriveUrl = (url: string) => {
    if (!url) return url;
    let fixedUrl = url;
    if (url.includes('lh3.googleusercontent.com/d/')) {
      fixedUrl = url.replace('lh3.googleusercontent.com/d/', 'drive.google.com/uc?export=view&id=');
    }
    if (fixedUrl.startsWith('//')) {
      fixedUrl = 'https:' + fixedUrl;
    }
    return fixedUrl;
  };

  const fetchDashboardData = async () => {
    if (!userProfile) return;

    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', userProfile.uid),
        orderBy('createdAt', 'desc')
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);

      const refundsQuery = query(
        collection(db, 'refundRequests'),
        where('userId', '==', userProfile.uid),
        orderBy('createdAt', 'desc')
      );
      const refundsSnapshot = await getDocs(refundsQuery);
      const refundsData = refundsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RefundRequest));
      setRefundRequests(refundsData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userProfile]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const handleWithdrawRequest = async () => {
    const amount = Number(withdrawAmount);
    if (!userProfile || isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    if (amount > userProfile.walletBalance) {
      toast.error("Insufficient wallet balance");
      return;
    }

    try {
      // Create refund request
      const refundData: any = {
        userId: userProfile.uid,
        userEmail: userProfile.email,
        userName: userProfile.displayName,
        userPhone: userProfile.phoneNumber || "",
        amount,
        status: 'Pending',
        paymentMethod: withdrawMethod === 'bkash' ? 'bKash' : 'Bank',
        createdAt: serverTimestamp()
      };

      if (withdrawMethod === 'bkash') {
        refundData.paymentNumber = bkashNumber;
      } else {
        refundData.bankAccountName = bankDetails.accountName;
        refundData.bankAccountNumber = bankDetails.accountNumber;
        refundData.bankName = bankDetails.bankName;
        refundData.bankBranch = bankDetails.branchName;
      }

      const refundRef = await addDoc(collection(db, 'refundRequests'), refundData);

      // Deduct from wallet balance
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        walletBalance: increment(-amount),
        lastRefundId: refundRef.id
      });

      setIsWithdrawModalOpen(false);
      setWithdrawAmount("");
      setBkashNumber("");
      setBankDetails({ accountName: "", accountNumber: "", bankName: "", branchName: "" });
      toast.success("Withdrawal request submitted");
    } catch (error) {
      toast.error("Failed to submit request");
    }
  };

  const handleClaimAdmin = async () => {
    if (!userProfile) return;
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        role: 'admin'
      });
      toast.success("Admin privileges claimed successfully!");
    } catch (error) {
      console.error("Error claiming admin:", error);
      toast.error("Failed to claim admin privileges. Make sure you are logged in with the correct email.");
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <Clock size={32} />
          </div>
          <p className="text-gray-500 font-medium">Please login to view your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-orange-100">
            {userProfile.displayName?.[0] || userProfile.email[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold">My Dashboard</h1>
            <div className="flex items-center gap-2">
              <p className="text-gray-500">Welcome, {userProfile.displayName || userProfile.email}!</p>
              {userProfile.email === "neatsarkarnirob01234@gmail.com" && userProfile.role !== 'admin' && (
                <button 
                  onClick={handleClaimAdmin}
                  className="flex items-center gap-1 bg-black text-white text-[10px] px-2 py-0.5 rounded-lg font-bold hover:bg-gray-800 transition-all"
                >
                  <ShieldCheck size={12} />
                  Claim Admin
                </button>
              )}
              {userProfile.role === 'admin' && (
                <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                  <ShieldCheck size={12} />
                  ADMIN
                </span>
              )}
            </div>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-all self-start"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-2">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'orders' ? 'bg-primary text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <Package size={20} />
            My Orders
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'wallet' ? 'bg-primary text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <Wallet size={20} />
            Wallet Balance
          </button>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'orders' ? (
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-4">
                  <Package className="mx-auto text-gray-300" size={48} />
                  <p className="text-gray-500 font-bold">You have no orders</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Order ID</p>
                        <p className="font-bold text-primary">#{order.orderNumber || order.id.slice(0,8)}</p>
                        <p className="text-[8px] text-gray-300 font-mono">Internal: {order.id.slice(0,8)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Date</p>
                        <p className="text-sm font-medium">
                          {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-US') : 'Processing...'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Payment</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          order.paymentType === 'Full' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {order.paymentType === 'Full' ? 'FULL PAID' : 'PARTIAL PAID'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Price</p>
                        <p className="font-bold text-primary">{formatBDT(order.totalAmount)}</p>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Order Items */}
                      <div className="flex flex-wrap gap-4 mb-8">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                            <div className="w-12 h-12 bg-white rounded-xl overflow-hidden border border-gray-100">
                              <img src={fixDriveUrl(item.image)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="min-w-0 pr-2">
                              <h4 className="font-bold text-[10px] truncate max-w-[120px]">{item.title}</h4>
                              {item.selectedVariants && Object.entries(item.selectedVariants).length > 0 && (
                                <p className="text-[8px] text-gray-400 truncate max-w-[120px]">
                                  {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                </p>
                              )}
                              <p className="text-[10px] text-gray-500">Qty: {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Tracker */}
                      <OrderTracking status={order.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Wallet Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-primary to-orange-600 rounded-3xl p-8 text-white shadow-xl shadow-orange-200">
                  <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                      <p className="text-orange-100 text-sm font-medium">Current Balance (Normal)</p>
                      <h2 className="text-4xl font-bold">{formatBDT(userProfile.walletBalance)}</h2>
                    </div>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <Wallet size={24} />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsWithdrawModalOpen(true)}
                      className="bg-white text-primary px-6 py-2 rounded-xl font-bold text-sm hover:bg-orange-50 transition-all"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                      <p className="text-gray-400 text-sm font-medium">Hold Balance (Hold)</p>
                      <h2 className="text-4xl font-bold text-gray-900">{formatBDT(userProfile.holdBalance)}</h2>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 text-primary rounded-2xl flex items-center justify-center">
                      <RefreshCcw size={24} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    If the order is cancelled or out of stock, your money will be stored here. You can move it to your wallet for shopping.
                  </p>
                </div>
              </div>

              {/* Refund Requests */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-bold">Withdrawal Requests (Refunds)</h3>
                  <RefreshCcw size={18} className="text-gray-300" />
                </div>
                <div className="divide-y divide-gray-50">
                  {refundRequests.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-sm">
                      No withdrawal requests found
                    </div>
                  ) : (
                    refundRequests.map(request => (
                      <div key={request.id} className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            request.status === 'Completed' ? 'bg-green-50 text-green-500' :
                            request.status === 'Pending' ? 'bg-yellow-50 text-yellow-500' :
                            'bg-red-50 text-red-500'
                          }`}>
                            {request.status === 'Completed' ? <ArrowUpRight size={20} /> : <Clock size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold">Withdrawal Request</p>
                            <p className="text-[10px] text-gray-400">
                              {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString('en-US') : 'Processing...'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            request.status === 'Completed' ? 'text-green-600' : 'text-gray-900'
                          }`}>
                            -{formatBDT(request.amount)}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{request.status}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setIsWithdrawModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold mb-2">Withdraw Money</h2>
              <p className="text-gray-500 mb-6 text-sm">Request to withdraw money from your wallet.</p>
              
              <div className="space-y-6 mb-8 overflow-y-auto max-h-[60vh] pr-2">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Withdrawal Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setWithdrawMethod('bkash')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        withdrawMethod === 'bkash' ? 'border-primary bg-orange-50 text-primary' : 'border-gray-100 hover:border-gray-200 text-gray-500'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${withdrawMethod === 'bkash' ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                        <Smartphone size={20} />
                      </div>
                      <span className="text-xs font-bold">bKash</span>
                    </button>
                    <button 
                      onClick={() => setWithdrawMethod('bank')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        withdrawMethod === 'bank' ? 'border-primary bg-orange-50 text-primary' : 'border-gray-100 hover:border-gray-200 text-gray-500'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${withdrawMethod === 'bank' ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                        <Building2 size={20} />
                      </div>
                      <span className="text-xs font-bold">Bank</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Amount (BDT)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none font-bold pr-24"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                    />
                    <button 
                      onClick={() => setWithdrawAmount(userProfile?.walletBalance.toString() || "0")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-primary/20 transition-all uppercase"
                    >
                      Withdraw All
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400">Max withdrawable: {formatBDT(userProfile?.walletBalance || 0)}</p>
                </div>

                {withdrawMethod === 'bkash' ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">bKash Number</label>
                    <input 
                      type="text" 
                      placeholder="01XXX-XXXXXX"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none font-bold"
                      value={bkashNumber}
                      onChange={e => setBkashNumber(e.target.value)}
                    />
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Account Holder Name</label>
                      <input 
                        type="text" 
                        placeholder="Full Name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none font-bold"
                        value={bankDetails.accountName}
                        onChange={e => setBankDetails({...bankDetails, accountName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Account Number</label>
                      <input 
                        type="text" 
                        placeholder="Account Number"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none font-bold"
                        value={bankDetails.accountNumber}
                        onChange={e => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Bank Name</label>
                        <input 
                          type="text" 
                          placeholder="Bank Name"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none font-bold"
                          value={bankDetails.bankName}
                          onChange={e => setBankDetails({...bankDetails, bankName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Branch Name</label>
                        <input 
                          type="text" 
                          placeholder="Branch Name"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none font-bold"
                          value={bankDetails.branchName}
                          onChange={e => setBankDetails({...bankDetails, branchName: e.target.value})}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <button 
                onClick={handleWithdrawRequest}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
              >
                Send Request
                <ArrowUpRight size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
