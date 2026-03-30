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
  ArrowRight
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  getDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { Order, OrderStatus, RefundRequest, UserProfile, Product } from '../types';
import { formatPrice } from '../lib/utils';
import { toast } from 'sonner';

type AdminTab = 'pending-confirm' | 'pending-purchase' | 'payments' | 'refunds' | 'sourcing';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('pending-confirm');
  const [orders, setOrders] = useState<Order[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [refundPayoutData, setRefundPayoutData] = useState({ gatewayCharge: 0, transactionId: '' });

  // Sourcing form state
  const [sourcingForm, setSourcingForm] = useState({
    title: '',
    price_rmb: '',
    image: '',
    source_url: '',
    category: 'General'
  });

  useEffect(() => {
    const ordersQuery = query(collection(db, 'orders'));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);
      setLoading(false);
    });

    const refundsQuery = query(collection(db, 'refundRequests'));
    const unsubscribeRefunds = onSnapshot(refundsQuery, (snapshot) => {
      const refundsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RefundRequest));
      setRefundRequests(refundsData);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeRefunds();
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
        price_rmb: Number(sourcingForm.price_rmb),
        createdAt: serverTimestamp()
      });
      setSourcingForm({ title: '', price_rmb: '', image: '', source_url: '', category: 'General' });
      toast.success('Product added successfully');
    } catch (error) {
      toast.error('Failed to add product');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'pending-confirm') return order.status === 'Order Placed';
    if (activeTab === 'pending-purchase') return order.status === 'Confirmed';
    if (activeTab === 'payments') return order.paymentProof && order.status !== 'Cancelled';
    return false;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Control Center</h1>
          <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
            {[
              { id: 'pending-confirm', label: 'Pending Confirm', icon: Clock },
              { id: 'pending-purchase', label: 'Pending Purchase', icon: ShoppingBag },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'refunds', label: 'Refunds', icon: RefreshCcw },
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
          {activeTab === 'sourcing' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-2xl mx-auto w-full"
            >
              <h2 className="text-xl font-bold mb-6">Link Product from 1688/Alibaba</h2>
              <form onSubmit={handleSourcingSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                    value={sourcingForm.title}
                    onChange={e => setSourcingForm({...sourcingForm, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (RMB)</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                      value={sourcingForm.price_rmb}
                      onChange={e => setSourcingForm({...sourcingForm, price_rmb: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input 
                    type="url" 
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                    value={sourcingForm.image}
                    onChange={e => setSourcingForm({...sourcingForm, image: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source URL (1688/Alibaba)</label>
                  <input 
                    type="url" 
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                    value={sourcingForm.source_url}
                    onChange={e => setSourcingForm({...sourcingForm, source_url: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all"
                >
                  Add Product to Site
                </button>
              </form>
            </motion.div>
          ) : activeTab === 'refunds' ? (
            <div className="space-y-4">
              {refundRequests.map(request => (
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
                    <p className="text-xs text-gray-500">User ID: {request.userId}</p>
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
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-gray-400">#{order.id.slice(0,8)}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                          {order.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900">{order.items.length} Items • {formatPrice(order.totalAmount)}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Paid: <span className="text-green-600 font-bold">{formatPrice(order.paidAmount)}</span></p>
                      <p className="text-xs text-gray-400">{order.paymentType} Payment</p>
                    </div>
                  </div>

                  {order.paymentProof && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <img src={order.paymentProof} alt="Proof" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Transaction ID</p>
                        <p className="text-sm font-bold text-gray-900">{order.transactionId || 'N/A'}</p>
                      </div>
                      <button className="ml-auto text-primary hover:underline text-xs font-bold flex items-center gap-1">
                        <ExternalLink size={12} /> View Proof
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex-shrink-0 w-12 h-12 rounded-lg border border-gray-100 overflow-hidden">
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
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
                      {order.status === 'Purchased' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'BD Warehouse')}
                          className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 transition-all flex items-center gap-2"
                        >
                          <ArrowRight size={16} /> Received in BD
                        </button>
                      )}
                      {order.status === 'BD Warehouse' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleMakeInvoice(order.id)}
                            className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2"
                          >
                            <FileText size={16} /> {order.invoiceUrl ? 'View Invoice' : 'Make Invoice'}
                          </button>
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'Delivered')}
                            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition-all flex items-center gap-2"
                          >
                            <CheckCircle size={16} /> Mark Delivered
                          </button>
                        </div>
                      )}
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
                      {order.status === 'Cancelled' && (
                        <button 
                          onClick={() => handleMoveToWallet(order)}
                          className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-200 transition-all flex items-center gap-2"
                        >
                          <RefreshCcw size={16} /> Move to Wallet
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
}
