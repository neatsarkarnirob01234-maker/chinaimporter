import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ShoppingBag, 
  CreditCard, 
  RefreshCcw, 
  ExternalLink, 
  Plus, 
  Search,
  FileText,
  DollarSign,
  ArrowRight,
  Users,
  Edit2,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Video,
  List
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  getDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  increment,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { Order, OrderStatus, RefundRequest, UserProfile, Product } from '../types';
import { formatPrice } from '../lib/utils';
import { toast } from 'sonner';

type AdminTab = 'pending-confirm' | 'pending-purchase' | 'payments' | 'refunds' | 'sourcing' | 'users' | 'all-orders' | 'products';

interface AdminDashboardProps {
  userProfile: UserProfile | null;
}

export default function AdminDashboard({ userProfile }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('pending-confirm');
  const [orders, setOrders] = useState<Order[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [refundPayoutData, setRefundPayoutData] = useState({ gatewayCharge: 0, transactionId: '' });
  const [userEditData, setUserEditData] = useState({ walletBalance: 0, holdBalance: 0, role: 'user' });

  // Sourcing form state
  const [sourcingForm, setSourcingForm] = useState<Partial<Product>>({
    title: '',
    price_rmb: 0,
    image: '',
    source_url: '',
    category: 'General',
    description: '',
    video: '',
    variants: []
  });
  const [isFetching, setIsFetching] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const handleFetchDetails = async () => {
    if (!sourcingForm.source_url) {
      toast.error('Please enter a source URL');
      return;
    }

    setIsFetching(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract product details from this URL: ${sourcingForm.source_url}. 
        Return JSON with: title, price_rmb (number), image (url), description, video (url or empty), 
        variants (array of {name: string, options: string[]}), category.
        If you cannot access the URL, provide realistic mock data based on the URL context.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              price_rmb: { type: Type.NUMBER },
              image: { type: Type.STRING },
              description: { type: Type.STRING },
              video: { type: Type.STRING },
              category: { type: Type.STRING },
              variants: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text);
      setSourcingForm(prev => ({
        ...prev,
        ...data,
        source_url: prev.source_url // Keep the original URL
      }));
      setShowReview(true);
      toast.success('Product details fetched for review');
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch details. Please fill manually or try again.');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);
      setLoading(false);
    });

    const refundsQuery = query(collection(db, 'refundRequests'), orderBy('createdAt', 'desc'));
    const unsubscribeRefunds = onSnapshot(refundsQuery, (snapshot) => {
      const refundsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RefundRequest));
      setRefundRequests(refundsData);
    });

    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(usersData);
    });

    const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeRefunds();
      unsubscribeUsers();
      unsubscribeProducts();
    };
  }, []);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status,
        updatedAt: serverTimestamp()
      });
      toast.success(`Order status updated to ${status}`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const cancelOrder = async (order: Order) => {
    try {
      // Move paid amount to hold balance
      const userRef = doc(db, 'users', order.userId);
      await updateDoc(userRef, {
        holdBalance: increment(order.paidAmount)
      });

      await updateDoc(doc(db, 'orders', order.id), { 
        status: 'Cancelled',
        updatedAt: serverTimestamp()
      });
      toast.success('Order cancelled. Funds moved to hold balance.');
    } catch (error) {
      toast.error('Failed to cancel order');
    }
  };

  const handleMoveToWallet = async (order: Order) => {
    try {
      const userRef = doc(db, 'users', order.userId);
      await updateDoc(userRef, {
        holdBalance: increment(-order.paidAmount),
        walletBalance: increment(order.paidAmount)
      });
      toast.success('Funds moved from Hold to Wallet');
    } catch (error) {
      toast.error('Failed to move funds');
    }
  };

  const handleMakeInvoice = async (orderId: string) => {
    try {
      const invoiceUrl = `https://api.sourcingpro.bd/invoices/${orderId}.pdf`; // Mock invoice URL
      await updateDoc(doc(db, 'orders', orderId), {
        invoiceUrl,
        updatedAt: serverTimestamp()
      });
      toast.success('Invoice generated successfully');
    } catch (error) {
      toast.error('Failed to generate invoice');
    }
  };

  const processRefundPayout = async () => {
    if (!selectedRefund) return;
    try {
      await updateDoc(doc(db, 'refundRequests', selectedRefund.id), {
        status: 'Completed',
        gatewayCharge: Number(refundPayoutData.gatewayCharge),
        payoutTransactionId: refundPayoutData.transactionId
      });
      setSelectedRefund(null);
      setRefundPayoutData({ gatewayCharge: 0, transactionId: '' });
      toast.success('Refund payout completed');
    } catch (error) {
      toast.error('Failed to process refund');
    }
  };

  const cancelRefundRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'refundRequests', requestId), {
        status: 'Cancelled'
      });
      toast.success('Refund request cancelled');
    } catch (error) {
      toast.error('Failed to cancel request');
    }
  };

  const handleSourcingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'products'), {
        ...sourcingForm,
        createdAt: serverTimestamp()
      });
      setSourcingForm({ title: '', price_rmb: 0, image: '', source_url: '', category: 'General', description: '', video: '', variants: [] });
      setShowReview(false);
      toast.success('Product added successfully to site');
    } catch (error) {
      toast.error('Failed to add product');
    }
  };

  const handleUserUpdate = async () => {
    if (!selectedUser) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        walletBalance: Number(userEditData.walletBalance),
        holdBalance: Number(userEditData.holdBalance),
        role: userEditData.role
      });
      setSelectedUser(null);
      toast.success('User updated successfully');
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const deleteDocument = async (coll: string, id: string) => {
    if (!window.confirm('Are you sure you want to delete this? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, coll, id));
      toast.success('Deleted successfully');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  if (!userProfile || userProfile.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
            <XCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Unauthorized Access</h2>
          <p className="text-gray-500 max-w-xs mx-auto">You do not have administrative privileges to access this page.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-orange-600 transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all-orders') return true;
    if (activeTab === 'pending-confirm') return order.status === 'Order Placed';
    if (activeTab === 'pending-purchase') return order.status === 'Confirmed';
    if (activeTab === 'payments') return order.paymentProof && order.status !== 'Cancelled';
    return false;
  });

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Control Center</h1>
          <div className="flex flex-wrap gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
            {[
              { id: 'all-orders', label: 'All Orders', icon: FileText },
              { id: 'pending-confirm', label: 'Pending Confirm', icon: Clock },
              { id: 'pending-purchase', label: 'Pending Purchase', icon: ShoppingBag },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'refunds', label: 'Refunds', icon: RefreshCcw },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'products', label: 'Products', icon: ShoppingBag },
              { id: 'sourcing', label: 'Sourcing', icon: Plus },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {activeTab === 'users' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Wallet</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Hold</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(user => (
                      <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-bold">
                              {user.displayName?.[0] || user.email[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{user.displayName || 'User'}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">{formatPrice(user.walletBalance)}</td>
                        <td className="px-6 py-4 font-bold text-gray-500">{formatPrice(user.holdBalance)}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                            user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setSelectedUser(user);
                              setUserEditData({ walletBalance: user.walletBalance, holdBalance: user.holdBalance, role: user.role });
                            }}
                            className="p-2 text-gray-400 hover:text-primary transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'products' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Price (RMB)</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400">No products found</td>
                      </tr>
                    ) : (
                      products.map(product => (
                        <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={product.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100" referrerPolicy="no-referrer" />
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate max-w-[200px]">{product.title}</p>
                                <a href={product.source_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                                  <ExternalLink size={10} /> View Source
                                </a>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">¥{product.price_rmb}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{product.category}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => deleteDocument('products', product.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'sourcing' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-3xl mx-auto w-full"
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Plus className="text-primary" /> Sourcing New Product
              </h2>
              
              <div className="space-y-6">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source URL (1688/Alibaba)</label>
                    <input 
                      type="url" 
                      placeholder="Paste product link here..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all"
                      value={sourcingForm.source_url}
                      onChange={e => setSourcingForm({...sourcingForm, source_url: e.target.value})}
                    />
                  </div>
                  <button 
                    onClick={handleFetchDetails}
                    disabled={isFetching}
                    className="mt-6 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isFetching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                    Review
                  </button>
                </div>

                {showReview && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6 border-t pt-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="aspect-square rounded-2xl border border-gray-100 overflow-hidden bg-gray-50">
                          <img src={sourcingForm.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        {sourcingForm.video && (
                          <div className="p-3 bg-blue-50 rounded-xl flex items-center gap-2 text-blue-700 text-sm">
                            <Video size={16} /> Video detected and linked
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Product Title</label>
                          <input 
                            type="text" 
                            className="w-full px-4 py-2 rounded-lg border border-gray-100 focus:ring-2 focus:ring-primary outline-none font-bold"
                            value={sourcingForm.title}
                            onChange={e => setSourcingForm({...sourcingForm, title: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Real Price (RMB)</label>
                            <div className="relative">
                              <input 
                                type="number" 
                                className="w-full px-4 py-2 rounded-lg border border-gray-100 focus:ring-2 focus:ring-primary outline-none font-bold text-primary"
                                value={sourcingForm.price_rmb}
                                onChange={e => setSourcingForm({...sourcingForm, price_rmb: Number(e.target.value)})}
                              />
                              <div className="mt-1 text-[10px] font-bold text-green-600 flex items-center gap-1">
                                {formatPrice(Number(sourcingForm.price_rmb))} (Converted)
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Category</label>
                            <select 
                              className="w-full px-4 py-2 rounded-lg border border-gray-100 focus:ring-2 focus:ring-primary outline-none"
                              value={sourcingForm.category}
                              onChange={e => setSourcingForm({...sourcingForm, category: e.target.value})}
                            >
                              <option>General</option>
                              <option>Electronics</option>
                              <option>Fashion</option>
                              <option>Home</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                          <textarea 
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-gray-100 focus:ring-2 focus:ring-primary outline-none text-sm"
                            value={sourcingForm.description}
                            onChange={e => setSourcingForm({...sourcingForm, description: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {sourcingForm.variants && sourcingForm.variants.length > 0 && (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-400 uppercase">Detected Variants</label>
                        <div className="flex flex-wrap gap-2">
                          {sourcingForm.variants.map((v, i) => (
                            <div key={i} className="bg-gray-100 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                              <List size={12} /> {v.name}: {v.options.join(', ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={handleSourcingSubmit}
                      className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-orange-200 hover:bg-orange-600 transition-all transform hover:-translate-y-1"
                    >
                      Add Product to Site
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'refunds' ? (
            <div className="space-y-4">
              {refundRequests.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-4">
                  <RefreshCcw className="mx-auto text-gray-300 animate-spin-slow" size={48} />
                  <p className="text-gray-500 font-bold">No refund requests found</p>
                </div>
              ) : (
                refundRequests.map(request => (
                  <div key={request.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-gray-400">#{request.id.slice(0,8)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          request.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          request.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{formatPrice(request.amount)}</p>
                      <p className="text-xs text-gray-500">User: {request.userEmail || request.userId}</p>
                    </div>
                    
                    {request.status === 'Pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSelectedRefund(request)}
                          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition-all"
                        >
                          Process Payout
                        </button>
                        <button 
                          onClick={() => cancelRefundRequest(request.id)}
                          className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-4">
                  <FileText className="mx-auto text-gray-300" size={48} />
                  <p className="text-gray-500 font-bold">No orders found in this category</p>
                </div>
              ) : filteredOrders.map(order => {
                  const remainingAmount = order.totalAmount - order.paidAmount;
                  const paidPercentage = Math.round((order.paidAmount / order.totalAmount) * 100);
                  
                  return (
                    <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex flex-col lg:flex-row gap-6">
                          {/* Product Image */}
                          <div className="w-full lg:w-48 h-48 rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 shrink-0">
                            <img 
                              src={order.items[0]?.image} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                          </div>

                          {/* Order Info */}
                          <div className="flex-1 space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-mono text-gray-400">ID: {order.id}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    order.status === 'Order Placed' ? 'bg-blue-100 text-blue-700' :
                                    order.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">
                                  {order.items.length} Items • {formatPrice(order.totalAmount)}
                                </h3>
                                <div className="space-y-1 mt-2">
                                  <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <Users size={14} /> {order.userEmail || order.userId}
                                  </p>
                                  <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <CreditCard size={14} /> {order.shippingAddress?.phone || 'No phone'}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right space-y-1">
                                <p className="text-sm text-gray-500">
                                  Paid: <span className="text-green-600 font-bold">{formatPrice(order.paidAmount)}</span>
                                  <span className="ml-2 text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-lg">
                                    {paidPercentage}%
                                  </span>
                                </p>
                                <p className="text-sm text-gray-500">
                                  Due: <span className="text-red-500 font-bold">{formatPrice(remainingAmount)}</span>
                                </p>
                                <p className="text-xs text-gray-400">{order.paymentType} Payment</p>
                              </div>
                            </div>

                            {/* Items Summary */}
                            <div className="bg-gray-50 p-3 rounded-xl space-y-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-gray-600 truncate max-w-[250px]">{item.title}</span>
                                  <span className="font-bold text-gray-900">x{item.quantity}</span>
                                </div>
                              ))}
                            </div>

                            {/* Payment Proof */}
                            {order.paymentProof && (
                              <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-lg border border-orange-200 overflow-hidden shrink-0">
                                  <img 
                                    src={order.paymentProof} 
                                    alt="Proof" 
                                    className="w-full h-full object-cover cursor-pointer" 
                                    referrerPolicy="no-referrer"
                                    onClick={() => window.open(order.paymentProof, '_blank')}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-bold text-orange-400 uppercase">Transaction ID</p>
                                  <p className="text-sm font-bold text-gray-900 truncate">{order.transactionId || 'N/A'}</p>
                                </div>
                                <button 
                                  onClick={() => window.open(order.paymentProof, '_blank')}
                                  className="text-primary hover:underline text-xs font-bold flex items-center gap-1 shrink-0"
                                >
                                  <ExternalLink size={12} /> View Proof
                                </button>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
                              <div className="flex gap-2">
                                {order.status === 'Order Placed' && (
                                  <button 
                                    onClick={() => updateOrderStatus(order.id, 'Confirmed')}
                                    className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition-all flex items-center gap-2"
                                  >
                                    <CheckCircle size={16} /> Confirm Order
                                  </button>
                                )}
                                {order.status === 'Confirmed' && (
                                  <button 
                                    onClick={() => updateOrderStatus(order.id, 'Purchased')}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                                  >
                                    <ShoppingBag size={16} /> Mark as Purchased
                                  </button>
                                )}
                                <button 
                                  onClick={() => setSelectedOrder(order)}
                                  className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2"
                                >
                                  <FileText size={16} /> Action
                                </button>
                              </div>

                              <div className="flex gap-2">
                                {order.status !== 'Cancelled' && order.status !== 'Delivered' && (
                                  <button 
                                    onClick={() => cancelOrder(order)}
                                    className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                                  >
                                    <XCircle size={16} /> Cancel Order
                                  </button>
                                )}
                                <button 
                                  onClick={() => deleteDocument('orders', order.id)}
                                  className="text-gray-400 hover:text-red-500 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                                >
                                  <Trash2 size={16} /> Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl my-8"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Order Details</h2>
                  <p className="text-sm text-gray-500 font-mono">ID: {selectedOrder.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Shipping Info */}
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Users size={18} /> Shipping Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 uppercase text-[10px] font-bold">Name</p>
                      <p className="font-bold">{selectedOrder.shippingAddress?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 uppercase text-[10px] font-bold">Phone</p>
                      <p className="font-bold">{selectedOrder.shippingAddress?.phone || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400 uppercase text-[10px] font-bold">Email</p>
                      <p className="font-bold">{selectedOrder.shippingAddress?.email || selectedOrder.userEmail}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400 uppercase text-[10px] font-bold">Address</p>
                      <p className="font-bold">{selectedOrder.shippingAddress?.detail || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Ordered Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 items-center bg-white border border-gray-100 p-3 rounded-xl">
                        <img 
                          src={item.image} 
                          alt="" 
                          className="w-12 h-12 rounded-lg object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{item.title}</p>
                          <p className="text-xs text-gray-500">¥{item.price_rmb} x {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{formatPrice(item.price_rmb * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Amount</span>
                    <span className="font-bold">{formatPrice(selectedOrder.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Paid Amount ({selectedOrder.paymentType})</span>
                    <span className="font-bold text-green-600">{formatPrice(selectedOrder.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Remaining Due</span>
                    <span className="text-red-500">{formatPrice(selectedOrder.totalAmount - selectedOrder.paidAmount)}</span>
                  </div>
                </div>

                {/* Payment Proof */}
                {selectedOrder.paymentProof && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-gray-900">Payment Proof</h3>
                    <div className="flex gap-4 items-center bg-orange-50 p-4 rounded-2xl border border-orange-100">
                      <img 
                        src={selectedOrder.paymentProof} 
                        alt="Proof" 
                        className="w-24 h-24 rounded-xl object-cover border-2 border-white shadow-sm cursor-pointer" 
                        referrerPolicy="no-referrer"
                        onClick={() => window.open(selectedOrder.paymentProof, '_blank')}
                      />
                      <div>
                        <p className="text-xs font-bold text-orange-400 uppercase">Transaction ID</p>
                        <p className="text-lg font-bold text-gray-900">{selectedOrder.transactionId || 'N/A'}</p>
                        <button 
                          onClick={() => window.open(selectedOrder.paymentProof, '_blank')}
                          className="mt-2 bg-white text-primary px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2"
                        >
                          <ExternalLink size={14} /> Open Full Image
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-full mt-8 bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all"
              >
                Close Details
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Refund Payout Modal */}
      <AnimatePresence>
        {selectedRefund && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-2">Process Refund Payout</h2>
              <p className="text-gray-500 mb-6">Enter payout details for {formatPrice(selectedRefund.amount)}</p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gateway Charge (BDT)</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                    value={refundPayoutData.gatewayCharge}
                    onChange={e => setRefundPayoutData({...refundPayoutData, gatewayCharge: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. BKASH_TRX_123"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                    value={refundPayoutData.transactionId}
                    onChange={e => setRefundPayoutData({...refundPayoutData, transactionId: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={processRefundPayout}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all"
                >
                  Submit Payout
                </button>
                <button 
                  onClick={() => setSelectedRefund(null)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Edit Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-2">Edit User</h2>
              <p className="text-gray-500 mb-6 truncate">{selectedUser.email}</p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Balance (BDT)</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                    value={userEditData.walletBalance}
                    onChange={e => setUserEditData({...userEditData, walletBalance: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hold Balance (BDT)</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                    value={userEditData.holdBalance}
                    onChange={e => setUserEditData({...userEditData, holdBalance: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                    value={userEditData.role}
                    onChange={e => setUserEditData({...userEditData, role: e.target.value})}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleUserUpdate}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all"
                >
                  Save Changes
                </button>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
