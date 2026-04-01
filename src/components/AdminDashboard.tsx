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
  X,
  FileText,
  DollarSign,
  ArrowRight,
  Users,
  Edit2,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Video,
  List,
  Building2,
  CheckSquare,
  CheckCheck,
  Banknote,
  ShoppingCart,
  Wallet,
  LayoutDashboard,
  Settings
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
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order, OrderStatus, RefundRequest, UserProfile, Product } from '../types';
import { formatPrice, formatBDT } from '../lib/utils';
import { toast } from 'sonner';

type AdminTab = 
  | 'pending-confirm'
  | 'confirmed'
  | 'pending-purchase'
  | 'bd-warehouse'
  | 'refunds-stock-out'
  | 'withdrawals'
  | 'sourcing'
  | 'products'
  | 'footer-settings'
  | 'page-content'
  | 'dashboard'
  | 'bank-payments' 
  | 'approved-bank-payments' 
  | 'refund-list' 
  | 'already-refunded' 
  | 'pending-rmb' 
  | 'all-orders' 
  | 'old-balance'
  | 'users' 
  | 'banners'
  | 'categories';

interface AdminDashboardProps {
  userProfile: UserProfile | null;
}

export default function AdminDashboard({ userProfile }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [refundPayoutData, setRefundPayoutData] = useState({ gatewayCharge: 0, transactionId: '' });
  const [userEditData, setUserEditData] = useState({ walletBalance: 0, holdBalance: 0, role: 'user' });
  const [newCategory, setNewCategory] = useState({ name: '', subCategories: [] });
  const [newBanner, setNewBanner] = useState({ title: '', subtitle: '', image: '', link: '', color: 'bg-primary' });

  // Sourcing form state
  const [sourcingForm, setSourcingForm] = useState<Partial<Product>>({
    title: '',
    price_rmb: 0,
    image: '',
    images: [],
    source_url: '',
    category: 'General',
    description: '',
    video: '',
    variants: [],
    specs: []
  });
  const [isFetching, setIsFetching] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [profitMargin, setProfitMargin] = useState(0);

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
        Return JSON with: title, price_rmb (number), image (url), images (array of urls), description, video (url or empty), 
        variants (array of {name: string, options: string[]}), category, specs (array of {label: string, value: string}).
        IMPORTANT: 
        1. The 'image' field MUST be the primary high-resolution product image.
        2. The 'images' array should contain at least 4 high-quality gallery images.
        3. If you cannot access the URL, provide realistic mock data based on the URL context.
        4. Ensure all image URLs are direct links (e.g., ending in .jpg, .png).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              price_rmb: { type: Type.NUMBER },
              image: { type: Type.STRING },
              images: { type: Type.ARRAY, items: { type: Type.STRING } },
              description: { type: Type.STRING },
              video: { type: Type.STRING },
              category: { type: Type.STRING },
              specs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING }
                  }
                }
              },
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
      
      // Ensure image URLs have protocol
      if (data.image && data.image.startsWith('//')) {
        data.image = 'https:' + data.image;
      }
      if (data.images) {
        data.images = data.images.map((img: string) => img.startsWith('//') ? 'https:' + img : img);
      }

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
    }, (error) => handleFirestoreError(error, OperationType.GET, 'orders'));

    const refundsQuery = query(collection(db, 'refundRequests'), orderBy('createdAt', 'desc'));
    const unsubscribeRefunds = onSnapshot(refundsQuery, (snapshot) => {
      const refundsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RefundRequest));
      setRefundRequests(refundsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'refundRequests'));

    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(usersData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'products'));

    return () => {
      unsubscribeOrders();
      unsubscribeRefunds();
      unsubscribeUsers();
      unsubscribeProducts();
    };
  }, []);

  useEffect(() => {
    const unsubscribeBanners = onSnapshot(collection(db, "banners"), (snapshot) => {
      setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'banners'));
    const unsubscribeCategories = onSnapshot(collection(db, "categories"), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'categories'));
    return () => {
      unsubscribeBanners();
      unsubscribeCategories();
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

  const confirmBankPayment = async (order: Order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        paidAmount: order.totalAmount,
        status: 'Confirmed',
        updatedAt: serverTimestamp()
      });
      toast.success('Bank payment confirmed and order status updated');
    } catch (error) {
      toast.error('Failed to confirm bank payment');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourcingForm(prev => ({ ...prev, image: reader.result as string }));
        toast.success('Image uploaded successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSourcingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcingForm.title || !sourcingForm.price_rmb || !sourcingForm.image) {
      toast.error('Please fill in all required fields (Title, Price, Image)');
      return;
    }

    try {
      // Check if image is a base64 string and potentially too large
      if (sourcingForm.image.startsWith('data:image') && sourcingForm.image.length > 800000) {
        toast.error('Image is too large. Please use a smaller image or a URL.');
        return;
      }

      const finalPriceRmb = Number(sourcingForm.price_rmb) * (1 + profitMargin / 100);
      
      await addDoc(collection(db, 'products'), {
        ...sourcingForm,
        price_rmb: finalPriceRmb,
        price_bdt: sourcingForm.price_bdt || Math.round(finalPriceRmb * 18.0),
        createdAt: serverTimestamp()
      });
      setSourcingForm({ 
        title: '', 
        price_rmb: 0, 
        price_bdt: undefined,
        image: '', 
        images: [],
        source_url: '', 
        category: 'General', 
        description: '', 
        video: '', 
        variants: [],
        specs: []
      });
      setShowReview(false);
      toast.success('Product added successfully to site');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product. If using an uploaded image, it might be too large.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name) return;
    try {
      await addDoc(collection(db, 'categories'), {
        ...newCategory,
        createdAt: serverTimestamp()
      });
      setNewCategory({ name: '', subCategories: [] });
      toast.success('Category added successfully');
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanner.image) return;
    try {
      await addDoc(collection(db, 'banners'), {
        ...newBanner,
        createdAt: serverTimestamp()
      });
      setNewBanner({ title: '', subtitle: '', image: '', link: '', color: 'bg-primary' });
      toast.success('Banner added successfully');
    } catch (error) {
      toast.error('Failed to add banner');
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
    if (activeTab === 'confirmed') return order.status === 'Confirmed';
    if (activeTab === 'pending-purchase') return order.status === 'Confirmed'; // Assuming confirmed means ready to purchase
    if (activeTab === 'bd-warehouse') return order.status === 'BD Warehouse';
    if (activeTab === 'refunds-stock-out') return order.status === 'Stock Out' || order.status === 'Refunded';
    if (activeTab === 'bank-payments') return order.paymentProof && order.status === 'Order Placed';
    if (activeTab === 'approved-bank-payments') return order.paymentProof && order.status !== 'Order Placed' && order.status !== 'Cancelled';
    return false;
  });

  const filteredRefunds = refundRequests.filter(refund => {
    if (activeTab === 'refunds-stock-out') return true;
    if (activeTab === 'withdrawals') return refund.status === 'Pending';
    if (activeTab === 'refund-list' || activeTab === 'refunds') return refund.status === 'Pending';
    if (activeTab === 'already-refunded') return refund.status === 'Completed';
    return true;
  });

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'header', label: 'CONTROL CENTER' },
    { id: 'pending-confirm', label: 'Pending Confirm', icon: Clock },
    { id: 'confirmed', label: 'Confirmed', icon: CheckCheck },
    { id: 'pending-purchase', label: 'Pending Purchase', icon: RefreshCcw },
    { id: 'bd-warehouse', label: 'BD Warehouse', icon: Building2 },
    { id: 'refunds-stock-out', label: 'Refunds/Stock Out', icon: XCircle },
    { id: 'withdrawals', label: 'Withdrawals', icon: Edit2 },
    { id: 'sourcing', label: 'Add Product', icon: Plus },
    { id: 'products', label: 'Manage Products', icon: ShoppingBag },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'categories', label: 'Categories', icon: List },
    { id: 'footer-settings', label: 'Footer Settings', icon: FileText },
    { id: 'page-content', label: 'Page Content', icon: FileText },
  ];

  const handleRefreshData = () => {
    setLoading(true);
    // Snapshot listeners will handle the actual data update
    setTimeout(() => setLoading(false), 1000);
    toast.success('Data refreshed');
  };

  const handleExitAdmin = () => {
    window.location.href = '/';
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {sidebarItems.map((item, idx) => {
            if (item.type === 'header') {
              return (
                <p key={idx} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 pt-6 pb-2">
                  {item.label}
                </p>
              );
            }
            const Icon = item.icon!;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as AdminTab)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id 
                    ? 'bg-primary text-white shadow-lg shadow-orange-200' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
          
          <div className="pt-8 space-y-1">
            <button
              onClick={handleRefreshData}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all"
            >
              <RefreshCcw size={18} />
              Refresh Data
            </button>
            <button
              onClick={handleExitAdmin}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
            >
              <XCircle size={18} />
              Exit Admin Panel
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Admin Panel</h2>
          <select 
            className="text-sm border-none bg-gray-50 rounded-lg px-2 py-1"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as AdminTab)}
          >
            {sidebarItems.filter(i => i.id).map(i => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </select>
        </header>

        <main className="p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {sidebarItems.find(i => i.id === activeTab)?.label || 'Admin Control Center'}
                </h1>
                <p className="text-sm text-gray-500">Manage your business operations efficiently</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {activeTab === 'dashboard' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Pending Confirmation</p>
                    <p className="text-2xl font-bold text-red-600">{orders.filter(o => o.status === 'Order Placed').length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Total Wallet</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatBDT(users.reduce((acc, u) => acc + (u.walletBalance || 0), 0))}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Total Hold</p>
                    <p className="text-2xl font-bold text-orange-600">{formatBDT(users.reduce((acc, u) => acc + (u.holdBalance || 0), 0))}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Pending Refunds</p>
                    <p className="text-2xl font-bold text-red-600">{refundRequests.filter(r => r.status === 'Pending').length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Total Products</p>
                    <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                  </div>
                </div>
              ) :
 activeTab === 'banners' ? (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold mb-4">Add New Banner</h3>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                      const subtitle = (form.elements.namedItem('subtitle') as HTMLInputElement).value;
                      const image = (form.elements.namedItem('image') as HTMLInputElement).value;
                      const link = (form.elements.namedItem('link') as HTMLInputElement).value;
                      
                      try {
                        await addDoc(collection(db, "banners"), {
                          title, subtitle, image, link,
                          createdAt: serverTimestamp()
                        });
                        toast.success("Banner added successfully");
                        form.reset();
                      } catch (error) {
                        toast.error("Failed to add banner");
                      }
                    }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input name="title" placeholder="Banner Title" className="px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 ring-primary" required />
                      <input name="subtitle" placeholder="Banner Subtitle" className="px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 ring-primary" required />
                      <input name="image" placeholder="Image URL" className="px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 ring-primary col-span-2" required />
                      <input name="link" placeholder="Redirect Link (Optional)" className="px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 ring-primary col-span-2" />
                      <button type="submit" className="bg-primary text-white py-2 rounded-xl font-bold hover:bg-orange-600 transition-all col-span-2">Add Banner</button>
                    </form>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {banners.map(banner => (
                      <div key={banner.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm group">
                        <div className="aspect-[3/1] relative">
                          <img src={banner.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => deleteDocument('banners', banner.id)}
                              className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-all"
                            >
                              <Trash2 size={24} />
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-gray-900">{banner.title}</h4>
                          <p className="text-sm text-gray-500">{banner.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTab === 'categories' ? (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold mb-4">Add New Category</h3>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                      const sub = (form.elements.namedItem('sub') as HTMLInputElement).value.split(',').map(s => s.trim()).filter(s => s);
                      
                      try {
                        await addDoc(collection(db, "categories"), {
                          name, sub,
                          createdAt: serverTimestamp()
                        });
                        toast.success("Category added successfully");
                        form.reset();
                      } catch (error) {
                        toast.error("Failed to add category");
                      }
                    }} className="space-y-4">
                      <input name="name" placeholder="Category Name (e.g. Electronics)" className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 ring-primary" required />
                      <input name="sub" placeholder="Sub-categories (comma separated: Mobile, Laptop, Accessories)" className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 ring-primary" />
                      <button type="submit" className="w-full bg-primary text-white py-2 rounded-xl font-bold hover:bg-orange-600 transition-all">Add Category</button>
                    </form>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map(cat => (
                      <div key={cat.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900">{cat.name}</h4>
                          <p className="text-xs text-gray-500">{cat.sub?.join(', ') || 'No sub-categories'}</p>
                        </div>
                        <button 
                          onClick={() => deleteDocument('categories', cat.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTab === 'users' || activeTab === 'old-balance' ? (
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
                        {users.filter(u => activeTab === 'old-balance' ? (u.holdBalance > 0 || u.walletBalance > 0) : true).map(user => (
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
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => window.open(`/product/${product.id}`, '_blank')}
                                className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                title="View on Site"
                              >
                                <ExternalLink size={18} />
                              </button>
                              <button 
                                onClick={() => deleteDocument('products', product.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'sourcing' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
                >
                  <h2 className="text-xl font-bold mb-8 flex items-center gap-2 text-secondary">
                    <Plus className="text-primary" size={24} /> Link 1688/Alibaba Product
                  </h2>
                  
                  <form onSubmit={handleSourcingSubmit} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Product Title</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all"
                        value={sourcingForm.title}
                        onChange={e => setSourcingForm({...sourcingForm, title: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Product Description</label>
                      <textarea 
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                        value={sourcingForm.description}
                        onChange={e => setSourcingForm({...sourcingForm, description: e.target.value})}
                      />
                    </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Price (RMB)</label>
                          <input 
                            type="number" 
                            required
                            step="0.01"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all"
                            value={sourcingForm.price_rmb}
                            onChange={e => setSourcingForm({...sourcingForm, price_rmb: Number(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Profit (%)</label>
                          <input 
                            type="number" 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all"
                            value={profitMargin}
                            onChange={e => setProfitMargin(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Manual BDT</label>
                          <input 
                            type="number" 
                            placeholder="Optional"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all"
                            value={sourcingForm.price_bdt || ''}
                            onChange={e => setSourcingForm({...sourcingForm, price_bdt: e.target.value ? Number(e.target.value) : undefined})}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Final BDT</label>
                          <div className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 font-bold flex items-center">
                            {sourcingForm.price_bdt 
                              ? formatBDT(sourcingForm.price_bdt) 
                              : formatBDT(Math.round(Number(sourcingForm.price_rmb) * 18.0 * (1 + profitMargin / 100)))}
                          </div>
                        </div>
                      </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Category</label>
                      <select 
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none bg-white appearance-none"
                        value={sourcingForm.category}
                        onChange={e => setSourcingForm({...sourcingForm, category: e.target.value})}
                      >
                        <option value="Electronics">Electronics</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Product Image</label>
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Paste Image URL or use Review button below"
                              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all"
                              value={sourcingForm.image}
                              onChange={e => setSourcingForm({...sourcingForm, image: e.target.value})}
                            />
                            <div className="relative">
                              <input 
                                type="file" 
                                className="hidden" 
                                id="product-file" 
                                accept="image/*"
                                onChange={handleFileUpload}
                              />
                              <label htmlFor="product-file" className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-pointer hover:bg-gray-100 transition-all block whitespace-nowrap">
                                {sourcingForm.image?.startsWith('data:') ? 'Image selected' : 'Choose file'}
                              </label>
                            </div>
                          </div>
                        </div>
                        {sourcingForm.image && (
                          <div className="relative group">
                            <div className="w-24 h-24 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 flex-shrink-0">
                              <img 
                                src={sourcingForm.image} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://picsum.photos/seed/error/100/100";
                                }}
                              />
                            </div>
                            <button 
                              type="button"
                              onClick={() => setSourcingForm({...sourcingForm, image: ''})}
                              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Source URL (1688/Alibaba)</label>
                      <div className="flex gap-2">
                        <input 
                          type="url" 
                          required
                          placeholder="Paste product link here..."
                          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all"
                          value={sourcingForm.source_url}
                          onChange={e => setSourcingForm({...sourcingForm, source_url: e.target.value})}
                        />
                        <button 
                          type="button"
                          onClick={handleFetchDetails}
                          disabled={isFetching}
                          className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          {isFetching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                          Review
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => {
                          setSourcingForm({
                            title: '',
                            description: '',
                            price_rmb: 0,
                            category: 'Electronics',
                            image: '',
                            source_url: '',
                            images: [],
                            specs: []
                          });
                          setProfitMargin(15);
                        }}
                        className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                      >
                        Clear Form
                      </button>
                      <button 
                        type="submit"
                        className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-orange-200 hover:bg-orange-600 transition-all transform hover:-translate-y-1"
                      >
                        Add to Site
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-orange-50/50 p-8 rounded-3xl border border-orange-100 sticky top-8">
                  <h3 className="text-lg font-bold text-orange-800 mb-6">Sourcing Instructions</h3>
                  <ul className="space-y-6">
                    {[
                      "Find a product on 1688.com or Alibaba.com",
                      "Copy the image URL and product link",
                      "Calculate BDT price (RMB * Rate + Profit)",
                      "Fill the form and click \"Add to Site\""
                    ].map((step, i) => (
                      <li key={i} className="flex gap-4">
                        <span className="w-6 h-6 bg-orange-200 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm text-orange-900 font-medium leading-relaxed">{step}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : activeTab === 'products' ? (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingBag className="text-primary" /> Product Management
                </h2>
                <button 
                  onClick={() => setActiveTab('sourcing')}
                  className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition-all flex items-center gap-2"
                >
                  <Plus size={18} /> Add New
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-gray-500">
                    No products found in the database.
                  </div>
                ) : (
                  products.map(product => (
                    <div key={product.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex gap-4 group">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-white shrink-0">
                        <img src={product.image} alt={product.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{product.title}</h3>
                        <p className="text-primary font-bold text-sm mt-1">
                          {product.price_bdt ? formatBDT(product.price_bdt) : formatBDT(product.price_rmb * 18)}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button 
                            onClick={() => deleteDocument('products', product.id)}
                            className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Product"
                          >
                            <Trash2 size={16} />
                          </button>
                          <a 
                            href={product.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-400 p-2 hover:bg-gray-100 rounded-lg transition-all"
                            title="View Source"
                          >
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === 'categories' ? (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <List className="text-primary" /> Category Management
              </h2>
              <form onSubmit={handleAddCategory} className="flex gap-4 mb-8">
                <input 
                  type="text" 
                  placeholder="Category Name"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                  value={newCategory.name}
                  onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                />
                <button type="submit" className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all">
                  Add Category
                </button>
              </form>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map(cat => (
                  <div key={cat.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between group">
                    <span className="font-medium">{cat.name}</span>
                    <button onClick={() => deleteDocument('categories', cat.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'banners' ? (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ImageIcon className="text-primary" /> Banner Management
              </h2>
              <form onSubmit={handleAddBanner} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <input 
                  type="text" 
                  placeholder="Banner Title"
                  className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                  value={newBanner.title}
                  onChange={e => setNewBanner({...newBanner, title: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Banner Subtitle"
                  className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                  value={newBanner.subtitle || ''}
                  onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Image URL"
                  className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                  value={newBanner.image}
                  onChange={e => setNewBanner({...newBanner, image: e.target.value})}
                />
                <select 
                  className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none bg-white"
                  value={newBanner.color || 'bg-primary'}
                  onChange={e => setNewBanner({...newBanner, color: e.target.value})}
                >
                  <option value="bg-primary">Orange (Primary)</option>
                  <option value="bg-secondary">Slate (Secondary)</option>
                  <option value="bg-green-600">Green</option>
                  <option value="bg-blue-600">Blue</option>
                  <option value="bg-red-600">Red</option>
                </select>
                <button type="submit" className="md:col-span-2 bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all">
                  Add Banner
                </button>
              </form>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {banners.map(banner => (
                  <div key={banner.id} className="relative rounded-2xl overflow-hidden group aspect-video">
                    <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => deleteDocument('banners', banner.id)} className="bg-white text-red-500 p-3 rounded-full">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'footer-settings' ? (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Settings className="text-primary" /> Footer Configuration
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Company Name</label>
                    <input type="text" defaultValue="China-BD Sourcing Pro" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Contact Email</label>
                    <input type="email" defaultValue="support@sourcingpro.bd" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">WhatsApp Number</label>
                    <input type="text" defaultValue="+8801234567890" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Facebook Page URL</label>
                    <input type="text" defaultValue="https://facebook.com/sourcingpro" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                </div>
                <button className="mt-8 bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all">
                  Save Footer Settings
                </button>
              </div>
            </div>
          ) : activeTab === 'page-content' ? (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <FileText className="text-primary" /> Page Content Management
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">About Us Page</label>
                    <textarea rows={6} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none text-sm" defaultValue="We are the leading sourcing agent in Bangladesh, connecting you directly with Chinese suppliers..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Terms & Conditions</label>
                    <textarea rows={6} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none text-sm" defaultValue="By using our services, you agree to the following terms..." />
                  </div>
                </div>
                <button className="mt-8 bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all">
                  Update Content
                </button>
              </div>
            </div>
          ) : activeTab === 'withdrawals' || activeTab === 'refunds' || activeTab === 'refund-list' || activeTab === 'already-refunded' ? (
            <div className="space-y-4">
              {filteredRefunds.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-4">
                  <RefreshCcw className="mx-auto text-gray-300 animate-spin-slow" size={48} />
                  <p className="text-gray-500 font-bold">No refund requests found</p>
                </div>
              ) : (
                filteredRefunds.map(request => (
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
                      <p className="text-lg font-bold text-gray-900">{formatBDT(request.amount)}</p>
                      <p className="text-xs text-gray-500">User: {request.userEmail || request.userId}</p>
                      {request.paymentMethod && (
                        <p className="text-xs font-bold text-primary mt-1">
                          {request.paymentMethod}: {request.paymentNumber}
                        </p>
                      )}
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
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="bg-gray-50 border border-gray-100 rounded-lg p-2 text-[10px] space-y-1">
                                      <p className="font-bold truncate max-w-[150px]">{item.title}</p>
                                      {item.selectedVariants && Object.entries(item.selectedVariants).length > 0 && (
                                        <p className="text-gray-400">
                                          {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                        </p>
                                      )}
                                      <p className="text-gray-500">Qty: {item.quantity}</p>
                                    </div>
                                  ))}
                                </div>
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
                                {activeTab === 'bank-payments' && order.paidAmount === 0 && (
                                  <button 
                                    onClick={() => confirmBankPayment(order)}
                                    className="bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-700 transition-all flex items-center gap-2"
                                  >
                                    <CheckCircle size={16} /> Confirm Payment
                                  </button>
                                )}
                                {order.status === 'Order Placed' && activeTab !== 'bank-payments' && (
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
                                    <Building2 size={16} /> Mark as BD Warehouse
                                  </button>
                                )}
                                {order.status === 'BD Warehouse' && (
                                  <button 
                                    onClick={() => updateOrderStatus(order.id, 'Delivered')}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
                                  >
                                    <CheckCircle size={16} /> Mark as Delivered
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
    </main>
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
