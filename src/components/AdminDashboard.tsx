import React, { useState, useEffect, useMemo } from 'react';
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
  Edit,
  Edit2,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Video,
  List,
  Building2,
  Smartphone,
  Edit3,
  Truck,
  Phone,
  CheckSquare,
  CheckCheck,
  Banknote,
  ShoppingCart,
  Wallet,
  LayoutDashboard,
  Settings,
  HardDrive,
  Download,
  Eye,
  Ban,
  AlertCircle,
  PackageCheck,
  Package,
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  collection, 
  query, 
  where, 
  doc, 
  setDoc,
  updateDoc, 
  addDoc, 
  getDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  increment,
  orderBy,
  writeBatch,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order, OrderStatus, RefundRequest, UserProfile, Product } from '../types';
import { formatPrice, formatBDT } from '../lib/utils';
import { toast } from 'sonner';
import { useCategories } from '../contexts/CategoryContext';

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
  | 'purchased'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'old-balance'
  | 'users' 
  | 'banners'
  | 'categories'
  | 'payment-settings';

interface AdminDashboardProps {
  userProfile: UserProfile | null;
}

const COMMON_CATEGORIES = [
  { name: "Electronics & Gadgets", sub: ["Smartphones", "Laptops", "Accessories", "Audio", "Cameras", "Smart Watches", "Power Banks", "Tablets", "Drones"] },
  { name: "Computer & Office", sub: ["Computer Components", "Monitors", "Printers", "Networking", "Storage", "Office Electronics", "3D Printers"] },
  { name: "Security & Smart Home", sub: ["Security Cameras", "Smart Locks", "Smart Lighting", "Sensors", "Intercoms"] },
  { name: "Men's Fashion", sub: ["T-Shirts", "Shirts", "Pants", "Suits", "Activewear", "Underwear", "Jackets", "Traditional Wear"] },
  { name: "Women's Fashion", sub: ["Dresses", "Tops", "Skirts", "Sarees", "Salwar Kameez", "Lingerie", "Abayas", "Kurtis"] },
  { name: "Men's Shoes", sub: ["Sneakers", "Formal Shoes", "Boots", "Sandals", "Loafers", "Slippers"] },
  { name: "Women's Shoes", sub: ["Heels", "Flats", "Sneakers", "Boots", "Sandals", "Wedges"] },
  { name: "Bags & Luggage", sub: ["Backpacks", "Handbags", "Suitcases", "Wallets", "Travel Bags", "Messenger Bags", "Crossbody Bags"] },
  { name: "Watches & Accessories", sub: ["Men's Watches", "Women's Watches", "Sunglasses", "Belts", "Hats", "Scarves", "Gloves"] },
  { name: "Jewelry", sub: ["Necklaces", "Earrings", "Rings", "Bracelets", "Jewelry Sets", "Anklets", "Brooches"] },
  { name: "Home & Living", sub: ["Furniture", "Decor", "Bedding", "Kitchenware", "Lighting", "Storage & Organization", "Bath"] },
  { name: "Home Appliances", sub: ["Refrigerators", "Washing Machines", "Air Conditioners", "Microwaves", "TVs", "Vacuum Cleaners", "Air Purifiers"] },
  { name: "Kitchen Appliances", sub: ["Blenders", "Coffee Makers", "Air Fryers", "Rice Cookers", "Toasters", "Electric Kettles"] },
  { name: "Beauty & Personal Care", sub: ["Skincare", "Makeup", "Haircare", "Fragrance", "Grooming Tools", "Oral Care", "Bath & Body"] },
  { name: "Health & Wellness", sub: ["Supplements", "Medical Supplies", "Fitness Equipment", "Personal Care", "Massage & Relaxation"] },
  { name: "Baby & Kids", sub: ["Baby Clothing", "Toys", "Diapering", "Kids Fashion", "Baby Gear", "Maternity", "Feeding"] },
  { name: "Toys & Hobbies", sub: ["Action Figures", "Dolls", "Puzzles", "Remote Control", "Collectibles", "Board Games", "Building Blocks"] },
  { name: "Sports & Outdoors", sub: ["Exercise & Fitness", "Camping", "Cycling", "Team Sports", "Water Sports", "Fishing", "Hiking"] },
  { name: "Automotive", sub: ["Car Parts", "Car Electronics", "Car Accessories", "Motorcycle Parts", "Tools", "Maintenance"] },
  { name: "Tools & Hardware", sub: ["Hand Tools", "Power Tools", "Safety Gear", "Electrical", "Plumbing", "Measuring Tools"] },
  { name: "Industrial & Scientific", sub: ["Machinery", "Lab Supplies", "Packaging", "Office Supplies", "Solar Energy", "Test & Measurement"] },
  { name: "Pet Supplies", sub: ["Dog Supplies", "Cat Supplies", "Fish & Aquatic", "Bird Supplies", "Small Animal Supplies"] },
  { name: "Stationery & Craft", sub: ["Office Supplies", "School Supplies", "Art Supplies", "Crafting", "Gift Wrapping", "Party Supplies"] },
  { name: "Groceries & Food", sub: ["Snacks", "Beverages", "Cooking Essentials", "Breakfast", "Chocolates", "Dry Fruits"] },
  { name: "Musical Instruments", sub: ["Guitars", "Keyboards", "Drums", "Recording Gear", "Wind Instruments", "String Instruments"] },
  { name: "Books & Media", sub: ["English Books", "Bengali Books", "Educational", "Magazines", "Comics"] }
];

export default function AdminDashboard({ userProfile }: AdminDashboardProps) {
  const { categories: contextCategories, refreshCategories } = useCategories();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [refundPayoutData, setRefundPayoutData] = useState({ amount: 0, note: '', gatewayCharge: 0, transactionId: '' });
  const [userEditData, setUserEditData] = useState({ walletBalance: 0, holdBalance: 0, role: 'user' });
  const [paymentSettings, setPaymentSettings] = useState({
    bkash: '01789-456123',
    nagad: '01789-456123',
    bank: 'Account Name: ...\nAccount Number: ...\nBank Name: ...\nBranch: ...'
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [csResponse, setCsResponse] = useState('');
  const [purchaseNote, setPurchaseNote] = useState('');
  const [modalStatus, setModalStatus] = useState<OrderStatus>('Order Placed');

  useEffect(() => {
    if (selectedOrder) {
      setCsResponse(selectedOrder.csResponse || '');
      setPurchaseNote(selectedOrder.purchaseNote || '');
      setModalStatus(selectedOrder.status);
    }
  }, [selectedOrder]);

  useEffect(() => {
    if (selectedRefund) {
      const isWithdrawal = !selectedRefund.orderId;
      const user = users.find(u => u.uid === selectedRefund.userId);
      const currentBalance = user?.walletBalance || 0;

      setRefundPayoutData({
        amount: isWithdrawal ? (selectedRefund.amount + currentBalance) : (selectedRefund.amount || 0),
        note: selectedRefund.note || '',
        gatewayCharge: selectedRefund.gatewayCharge || 0,
        transactionId: selectedRefund.payoutTransactionId || ''
      });
    }
  }, [selectedRefund, users]);

  const handleUpdateOrderDetails = async () => {
    if (!selectedOrder) return;
    try {
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        csResponse,
        purchaseNote,
        status: modalStatus,
        updatedAt: serverTimestamp()
      });

      // Automatically create refund request if cancelled or stock out
      if ((modalStatus === 'Cancelled' || modalStatus === 'Stock Out') && selectedOrder.paidAmount > 0) {
        // Check if a refund request already exists for this order to prevent duplicates
        const existingRefunds = await getDocs(query(
          collection(db, 'refundRequests'), 
          where('orderId', '==', selectedOrder.id)
        ));

        if (existingRefunds.empty) {
          await addDoc(collection(db, 'refundRequests'), {
            userId: selectedOrder.userId,
            userEmail: selectedOrder.userEmail,
            userName: selectedOrder.shippingAddress?.name || 'N/A',
            userPhone: selectedOrder.shippingAddress?.phone || 'N/A',
            orderId: selectedOrder.id,
            amount: selectedOrder.paidAmount,
            status: 'Pending',
            createdAt: serverTimestamp(),
            reason: `Order ${modalStatus}: #${selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)}`
          });
          toast.success('Refund request created automatically');
        }
      }

      toast.success('Order details updated');
      setSelectedOrder(null);
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update order details');
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch Orders - Limit to latest 100
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);

      // Fetch Refunds - Limit to latest 100
      const refundsQuery = query(collection(db, 'refundRequests'), orderBy('createdAt', 'desc'), limit(100));
      const refundsSnapshot = await getDocs(refundsQuery);
      const refundsData = refundsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RefundRequest));
      setRefundRequests(refundsData);

      // Fetch Users - Limit to latest 100
      const usersQuery = query(collection(db, 'users'), limit(100));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(usersData);

      // Fetch Products - Limit to latest 100
      const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(100));
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);

      // Fetch Banners
      const bannersSnapshot = await getDocs(collection(db, "banners"));
      setBanners(bannersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch Payment Settings
      const paymentDoc = await getDoc(doc(db, 'settings', 'payment'));
      if (paymentDoc.exists()) {
        setPaymentSettings(paymentDoc.data() as any);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
      handleFirestoreError(error, OperationType.GET, 'admin_data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Attempting to save payment settings:", paymentSettings);
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'payment'), paymentSettings);
      console.log("Payment settings saved successfully");
      toast.success('Payment settings updated successfully');
    } catch (error: any) {
      console.error("Error saving payment settings:", error);
      toast.error('Failed to save settings: ' + (error.message || 'Unknown error'));
      handleFirestoreError(error, OperationType.WRITE, 'settings/payment');
    } finally {
      setSavingSettings(false);
    }
  };
  const [newCategory, setNewCategory] = useState({ name: '', sub: [] as string[] });
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
    specs: [],
    reviews: '',
    attributes: [],
    packing: '',
    details: '',
    htmlSource: ''
  });
  const [isFetching, setIsFetching] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [profitMargin, setProfitMargin] = useState(0);

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

  const handleFetchDetails = async () => {
    if (!sourcingForm.source_url) {
      toast.error('Please enter a source URL');
      return;
    }

    setIsFetching(true);
    try {
      // Clean URL: remove tracking parameters and handle mobile links
      let cleanUrl = sourcingForm.source_url;
      try {
        const urlObj = new URL(cleanUrl);
        // Handle mobile 1688 links
        if (urlObj.hostname === 'm.1688.com') {
          urlObj.hostname = 'detail.1688.com';
        }
        // Keep essential parameters for 1688/Alibaba if any, but usually they are not needed for detail pages
        // For 1688 detail pages, the offer ID is in the path
        cleanUrl = urlObj.origin + urlObj.pathname;
      } catch (e) {
        // Fallback to original if URL parsing fails
      }

      const apiKey = process.env.GEMINI_API_KEY || ((import.meta as any).env?.VITE_GEMINI_API_KEY as string);
      if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please check your environment variables.");
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        generationConfig: {
          responseMimeType: "application/json",
        }
      });
      
      let sourceToAnalyze = sourcingForm.htmlSource || '';
      let extractedDataHint = '';
      
      if (sourceToAnalyze) {
        // Try to extract critical JSON data blocks to help the AI focus
        const patterns = [
          /window\.detailData\s*=\s*(\{[\s\S]*?\});/, 
          /iDetailData\s*=\s*(\{[\s\S]*?\});/, 
          /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/,
          /window\.detailConfig\s*=\s*(\{[\s\S]*?\});/,
          /iDetailConfig\s*=\s*(\{[\s\S]*?\});/
        ];
        
        const foundBlocks = [];
        for (const pattern of patterns) {
          const match = sourceToAnalyze.match(pattern);
          if (match) foundBlocks.push(match[1]);
        }
        
        if (foundBlocks.length > 0) {
          extractedDataHint = `\n\nCRITICAL DATA BLOCKS FOUND IN SOURCE (USE THESE FOR IMAGES AND VARIANTS):\n${foundBlocks.join('\n---\n')}\n`;
        }
      }

      let prompt = `Analyze the product page. `;
      if (sourcingForm.htmlSource) {
        prompt += `I have provided the HTML source code of the page below. Use it as the primary source of information. ${extractedDataHint}`;
      } else {
        prompt += `Use the URL ${cleanUrl} to fetch the information. If the URL is blocked or requires login, use Google Search to find the product details (images, title, price, description) for the same product. `;
      }
      
      prompt += `Your task is to extract all relevant product information for an e-commerce site.
        
        Return a JSON object with the following fields:
        - title: The full product name.
        - price_rmb: The unit price in RMB (as a number).
        - image: The main high-resolution product image URL.
        - images: An array of ALL gallery image URLs found on the page.
        - description: A comprehensive product description. Look for it in the 'Product Details', 'Overview', or 'Description' tabs. If it's in Chinese, translate it to English. BE VERY AGGRESSIVE: look for any text that describes the product features, materials, or usage. If you find multiple sections, combine them into one detailed description.
        - video: A URL to the product video if available.
        - category: A suitable category for this product.
        - specs: An array of objects with {label, value} for product specifications. Look for these in the 'Specifications' or 'Details' table.
        - variants: An array of objects with {name, options[]} for product options (e.g., Color, Size). 
        
        CRITICAL INSTRUCTIONS FOR ALIBABA/1688 VARIANTS:
        1. Look for 'skuProps', 'skuMap', 'sku', 'item.skuProps', or 'skuConfig'.
        2. Look for Chinese terms and translate them:
           - "颜色" -> "Color"
           - "尺码" or "尺寸" -> "Size"
           - "规格" -> "Specification"
        3. For each variant type (Color, Size, etc.), extract ALL available options.
        4. If the options have specific prices in the 'skuMap', you can include the price in the option string (e.g., "Red - 25.3 RMB").
        5. If you find image URLs associated with variants (like color swatches), add them to the 'images' array.
        
        CRITICAL INSTRUCTIONS FOR ALIBABA/1688 IMAGES:
        1. Look for images in 'window.detailData', 'iDetailData', or 'window.__INITIAL_STATE__'.
        2. Look for 'item.images', 'detailGallery', or 'images' arrays in the JSON blocks.
        3. CLEAN ALL IMAGE URLs: Remove any thumbnail or resizing suffixes like '_50x50.jpg', '_Q90.jpg', '_300x300.jpg', '_640x640.jpg', '_400x400.jpg', '_80x80.jpg', '_60x60.jpg', etc. We need the ORIGINAL high-res images.
        4. Ensure all URLs start with 'https:'. If they start with '//', prepend 'https:'.
        
        Return ONLY the raw JSON object. Do not wrap it in markdown blocks or add any other text.`;

      const contents = sourcingForm.htmlSource 
        ? [prompt, `HTML SOURCE CODE (TRUNCATED IF TOO LARGE):\n${sourceToAnalyze.substring(0, 100000)}`]
        : prompt;

      const result = await model.generateContent(contents);
      const response = await result.response;
      let text = response.text();
      console.log("AI Raw Response:", text);
      if (!text) throw new Error("Empty response from AI");

      if (text.includes('```json')) {
        text = text.split('```json')[1].split('```')[0];
      } else if (text.includes('```')) {
        text = text.split('```')[1].split('```')[0];
      }
      
      let data;
      try {
        data = JSON.parse(text.trim());
      } catch (e) {
        console.error("JSON Parse Error. Raw text:", text);
        // Try to find JSON in the text if it's not pure JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not parse AI response as JSON");
        }
      }
      
      // Advanced Image Cleaning Function
      const cleanImageUrl = (url: string) => {
        if (!url) return '';
        let cleaned = url.trim();
        
        // Handle protocol-relative URLs
        if (cleaned.startsWith('//')) cleaned = 'https:' + cleaned;
        
        // Remove common Alibaba/1688 thumbnail suffixes while keeping the extension
        // Matches things like _400x400.jpg, _Q90.jpg, _sum.jpg, etc.
        // Also handles .webp and other formats
        // We use a more comprehensive regex to catch various patterns
        cleaned = cleaned.replace(/(_\d+x\d+|_Q\d+|_sum|_640x640|_300x300|_50x50|_100x100|_200x200|_80x80|_40x40|_60x60|_720x720|_960x960)(\.jpg|\.png|\.webp|\.jpeg).*$/, '$2');
        
        // Handle cases where the suffix is after the extension like .jpg_400x400.jpg
        cleaned = cleaned.replace(/(\.jpg|\.png|\.webp|\.jpeg)_\d+x\d+.*$/, '$1');
        cleaned = cleaned.replace(/(\.jpg|\.png|\.webp|\.jpeg)_Q\d+.*$/, '$1');
        cleaned = cleaned.replace(/(\.jpg|\.png|\.webp|\.jpeg)_sum.*$/, '$1');
        cleaned = cleaned.replace(/(\.jpg|\.png|\.webp|\.jpeg)_\.webp.*$/, '$1');
        
        // Remove any query parameters that might interfere with loading
        if (cleaned.includes('?')) {
          cleaned = cleaned.split('?')[0];
        }
        
        // Ensure it's a valid URL string
        if (!cleaned.startsWith('http')) return '';
        
        return cleaned;
      };

      if (data.image) data.image = cleanImageUrl(data.image);
      if (data.images && Array.isArray(data.images)) {
        data.images = data.images.map((img: string) => cleanImageUrl(img)).filter((img: string) => img);
      } else {
        data.images = [];
      }

      if (!data.image && data.images && data.images.length > 0) {
        data.image = data.images[0];
      }

      setSourcingForm(prev => ({
        ...prev,
        ...data,
        source_url: prev.source_url,
        htmlSource: ''
      }));
      setShowReview(true);
      toast.success('Product details fetched successfully');
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch details. If the URL is blocked, please try the "Advanced: Paste Page Source" method below.', {
        duration: 6000
      });
    } finally {
      setIsFetching(false);
    }
  };


  const handleEditProduct = (product: Product) => {
    setSourcingForm({
      title: product.title,
      price_rmb: product.price_rmb,
      price_bdt: product.price_bdt,
      image: product.image,
      images: product.images || [],
      source_url: product.source_url || '',
      category: product.category || 'General',
      description: product.description || '',
      video: product.video || '',
      variants: product.variants || [],
      specs: product.specs || [],
      reviews: product.reviews || '',
      attributes: product.attributes || [],
      packing: product.packing || '',
      details: product.details || '',
      htmlSource: ''
    });
    setEditingProductId(product.id);
    setActiveTab('sourcing');
    setShowReview(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      const batch = writeBatch(db);
      const isWithdrawal = !selectedRefund.orderId;
      
      // 1. Update refund request status
      const refundRef = doc(db, 'refundRequests', selectedRefund.id);
      batch.update(refundRef, {
        status: 'Completed',
        amount: Number(refundPayoutData.amount),
        gatewayCharge: Number(refundPayoutData.gatewayCharge || 0),
        payoutTransactionId: refundPayoutData.transactionId,
        note: refundPayoutData.note,
        updatedAt: serverTimestamp()
      });

      // 2. Update user wallet balance
      const userRef = doc(db, 'users', selectedRefund.userId);
      const user = users.find(u => u.uid === selectedRefund.userId);
      const currentWalletBalance = user?.walletBalance || 0;

      if (!isWithdrawal) {
        // Refund logic: add to wallet
        batch.update(userRef, {
          walletBalance: increment(Number(refundPayoutData.amount)),
          updatedAt: serverTimestamp()
        });
      } else {
        // Withdrawal logic: sum send amount + charge, return remaining to wallet
        const totalToSettle = selectedRefund.amount + currentWalletBalance;
        const totalPaidOut = Number(refundPayoutData.amount) + Number(refundPayoutData.gatewayCharge || 0);
        const remaining = Math.max(0, totalToSettle - totalPaidOut);

        batch.update(userRef, {
          walletBalance: remaining,
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();

      setSelectedRefund(null);
      setRefundPayoutData({ amount: 0, note: '', gatewayCharge: 0, transactionId: '' });
      toast.success(isWithdrawal ? 'Withdrawal processed successfully' : 'Refund processed and added to user wallet');
    } catch (error) {
      console.error('Refund error:', error);
      toast.error('Failed to process refund');
    }
  };

  const cancelRefundRequest = async (requestId: string) => {
    if (!selectedRefund) return;
    try {
      const batch = writeBatch(db);
      const isWithdrawal = !selectedRefund.orderId;

      // 1. Update status
      batch.update(doc(db, 'refundRequests', requestId), {
        status: 'Cancelled',
        updatedAt: serverTimestamp()
      });

      // 2. If it was a withdrawal, refund the money back to the wallet
      if (isWithdrawal) {
        const userRef = doc(db, 'users', selectedRefund.userId);
        batch.update(userRef, {
          walletBalance: increment(selectedRefund.amount),
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
      setSelectedRefund(null);
      toast.success(isWithdrawal ? 'Withdrawal rejected and funds returned to wallet' : 'Refund request cancelled');
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
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files) as File[];
      fileList.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          if (result.length > 800000) {
            toast.error(`Image ${file.name} is too large. Please use a smaller image.`);
            return;
          }
          setSourcingForm(prev => {
            const newImages = [...(prev.images || [])];
            if (!newImages.includes(result)) {
              newImages.push(result);
            }
            return { 
              ...prev, 
              image: prev.image || result, // Set as primary if none exists
              images: newImages 
            };
          });
        };
        reader.readAsDataURL(file);
      });
      toast.success('Images uploaded successfully');
    }
  };

  const handleSourcingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcingForm.title || !sourcingForm.price_rmb || !sourcingForm.image) {
      toast.error('Please fill in all required fields (Title, Price, Image)');
      return;
    }

    try {
      let mainImageUrl = sourcingForm.image;
      let galleryUrls = sourcingForm.images || [];

      if (isDriveConnected) {
        toast.info("Uploading images to Google Drive...");
        
        // Upload main image if it's base64
        if (mainImageUrl.startsWith('data:image')) {
          mainImageUrl = await uploadToDrive(mainImageUrl, `product_${Date.now()}_main`, 'image/jpeg');
        }

        // Upload gallery images if they are base64
        const uploadedGallery = [];
        for (let i = 0; i < galleryUrls.length; i++) {
          const img = galleryUrls[i];
          if (img.startsWith('data:image')) {
            const url = await uploadToDrive(img, `product_${Date.now()}_gallery_${i}`, 'image/jpeg');
            uploadedGallery.push(url);
          } else {
            uploadedGallery.push(img);
          }
        }
        galleryUrls = uploadedGallery;
      } else {
        // Check if image is a base64 string and potentially too large for Firestore
        if (sourcingForm.image.startsWith('data:image') && sourcingForm.image.length > 800000) {
          toast.error('Image is too large for database. Please connect Google Drive or use a smaller image.');
          return;
        }
      }

      const finalPriceRmb = Number(sourcingForm.price_rmb) * (1 + profitMargin / 100);
      
      const productData = {
        ...sourcingForm,
        image: mainImageUrl,
        images: galleryUrls,
        price_rmb: finalPriceRmb,
        price_bdt: sourcingForm.price_bdt || Math.round(finalPriceRmb * 18.0),
        updatedAt: serverTimestamp()
      };

      if (editingProductId) {
        await updateDoc(doc(db, 'products', editingProductId), productData);
        toast.success('Product updated successfully');
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp()
        });
        toast.success('Product added successfully to site');
      }

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
        specs: [],
        reviews: '',
        attributes: [],
        packing: '',
        details: '',
        htmlSource: ''
      });
      setEditingProductId(null);
      setShowReview(false);
      setActiveTab('products');
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product. If using an uploaded image, it might be too large.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name) return;
    try {
      let imageUrl = newCategory.image;
      if (isDriveConnected && imageUrl && imageUrl.startsWith('data:image')) {
        toast.info("Uploading category image to Google Drive...");
        imageUrl = await uploadToDrive(imageUrl, `category_${Date.now()}`, 'image/jpeg');
      }

      await addDoc(collection(db, 'categories'), {
        ...newCategory,
        image: imageUrl,
        createdAt: serverTimestamp()
      });
      setNewCategory({ name: '', sub: [], image: '' });
      toast.success('Category added successfully');
      await refreshCategories();
      await fetchAllData();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const seedCategories = async () => {
    try {
      const batch = writeBatch(db);
      COMMON_CATEGORIES.forEach(cat => {
        const newDocRef = doc(collection(db, "categories"));
        batch.set(newDocRef, {
          name: cat.name,
          sub: cat.sub,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      toast.success('Categories seeded successfully!');
      await refreshCategories();
      await fetchAllData();
    } catch (error) {
      toast.error('Failed to seed categories');
    }
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanner.image) return;
    try {
      let imageUrl = newBanner.image;
      if (isDriveConnected && imageUrl.startsWith('data:image')) {
        toast.info("Uploading banner to Google Drive...");
        imageUrl = await uploadToDrive(imageUrl, `banner_${Date.now()}`, 'image/jpeg');
      }

      await addDoc(collection(db, 'banners'), {
        ...newBanner,
        image: imageUrl,
        createdAt: serverTimestamp()
      });
      setNewBanner({ title: '', subtitle: '', image: '', link: '', color: 'bg-primary' });
      toast.success('Banner added successfully');
    } catch (error) {
      console.error('Error adding banner:', error);
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
    console.log('--- DELETE ATTEMPT START ---');
    console.log('Collection:', coll);
    console.log('ID:', id);
    
    try {
      console.log('Sending delete request to Firestore...');
      await deleteDoc(doc(db, coll, id));
      console.log('Delete request successful');
      toast.success('Deleted successfully');
      if (coll === 'categories') {
        await refreshCategories();
      }
      await fetchAllData();
    } catch (error) {
      console.error('CRITICAL DELETE ERROR:', error);
      toast.error('Failed to delete');
      handleFirestoreError(error, OperationType.DELETE, `${coll}/${id}`);
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
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        order.orderNumber?.toString().includes(q) ||
        order.id.toLowerCase().includes(q) ||
        order.userEmail?.toLowerCase().includes(q) ||
        order.transactionId?.toLowerCase().includes(q);
      
      if (!matchesSearch) return false;
    }

    if (activeTab === 'all-orders') return true;
    if (activeTab === 'pending-confirm') return order.status === 'Order Placed';
    if (activeTab === 'confirmed') return order.status === 'Confirmed';
    if (activeTab === 'pending-purchase') return order.status === 'Confirmed';
    if (activeTab === 'purchased') return order.status === 'Purchased';
    if (activeTab === 'shipped') return order.status === 'Shipped';
    if (activeTab === 'bd-warehouse') return order.status === 'BD Warehouse';
    if (activeTab === 'delivered') return order.status === 'Delivered';
    if (activeTab === 'cancelled') return order.status === 'Cancelled';
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

  // Search filter for refunds
  const finalFilteredRefunds = filteredRefunds.filter(refund => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      refund.userPhone?.toLowerCase().includes(q) ||
      refund.orderId?.toLowerCase().includes(q) ||
      refund.id.toLowerCase().includes(q) ||
      refund.userEmail?.toLowerCase().includes(q) ||
      refund.userName?.toLowerCase().includes(q)
    );
  });

  const groupedWithdrawals = useMemo(() => {
    const groups: { [key: string]: { userId: string; userName: string; userPhone: string; currentBalance: number; requests: RefundRequest[] } } = {};
    
    refundRequests.forEach(req => {
      if (!groups[req.userId]) {
        const user = users.find(u => u.uid === req.userId);
        groups[req.userId] = {
          userId: req.userId,
          userName: user?.displayName || req.userName || 'N/A',
          userPhone: user?.phoneNumber || req.userPhone || 'N/A',
          currentBalance: user?.walletBalance || 0,
          requests: []
        };
      }
      groups[req.userId].requests.push(req);
    });

    // Sort requests within each group by date desc
    Object.values(groups).forEach(group => {
      group.requests.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
    });

    return Object.values(groups).filter(group => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return group.userPhone.toLowerCase().includes(query) || 
             group.userName.toLowerCase().includes(query) ||
             group.userId.toLowerCase().includes(query);
    });
  }, [refundRequests, users, searchQuery]);

  const pendingTotal = useMemo(() => {
    return refundRequests
      .filter(r => r.status === 'Pending')
      .reduce((acc, r) => acc + r.amount, 0);
  }, [refundRequests]);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'header', label: 'CONTROL CENTER' },
    { id: 'all-orders', label: 'All Orders', icon: ShoppingCart },
    { id: 'pending-confirm', label: 'Pending Confirm', icon: Clock },
    { id: 'confirmed', label: 'Confirmed', icon: CheckCheck },
    { id: 'pending-purchase', label: 'Pending Purchase', icon: RefreshCcw },
    { id: 'purchased', label: 'Purchased', icon: PackageCheck },
    { id: 'shipped', label: 'Shipped', icon: Truck },
    { id: 'bd-warehouse', label: 'BD Warehouse', icon: Building2 },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle },
    { id: 'cancelled', label: 'Cancelled', icon: Ban },
    { id: 'refunds-stock-out', label: 'Refunds/Stock Out', icon: XCircle },
    { id: 'withdrawals', label: 'Withdrawals', icon: Edit2 },
    { id: 'sourcing', label: 'Add Product', icon: Plus },
    { id: 'products', label: 'Manage Products', icon: ShoppingBag },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'categories', label: 'Categories', icon: List },
    { id: 'google-drive', label: 'Google Drive', icon: HardDrive },
    { id: 'payment-settings', label: 'Payment Settings', icon: CreditCard },
    { id: 'footer-settings', label: 'Footer Settings', icon: FileText },
    { id: 'page-content', label: 'Page Content', icon: FileText },
  ];

  useEffect(() => {
    checkDriveStatus();
  }, []);

  const safeFetch = async (url: string, options?: RequestInit) => {
    return await fetch(url, options);
  };

  const checkDriveStatus = async () => {
    try {
      const response = await safeFetch('/api/auth/google/status', { credentials: 'include' });
      const data = await response.json();
      setIsDriveConnected(data.connected);
    } catch (error) {
      console.error("Error checking drive status:", error);
    }
  };

  const handleConnectDrive = async () => {
    try {
      const response = await safeFetch('/api/auth/google/url', { credentials: 'include' });
      const { url } = await response.json();
      const authWindow = window.open(url, 'google_auth', 'width=600,height=700');
      
      if (!authWindow) {
        toast.error("Popup blocked! Please allow popups.");
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
          setIsDriveConnected(true);
          toast.success("Google Drive connected successfully!");
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (error) {
      toast.error("Failed to connect Google Drive");
    }
  };

  const handleBackupToDrive = async () => {
    await checkDriveStatus();
    if (!isDriveConnected) {
      toast.error("Please connect your Google Drive account first.");
      return;
    }
    setIsBackingUp(true);
    try {
      // Collect all data from Firestore
      const productsSnap = await getDocs(collection(db, 'products'));
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const categoriesSnap = await getDocs(collection(db, 'categories'));
      const bannersSnap = await getDocs(collection(db, 'banners'));
      const usersSnap = await getDocs(collection(db, 'users'));

      const backupData = {
        products: productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        orders: ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        categories: categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        banners: bannersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        users: usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        timestamp: new Date().toISOString()
      };

      const response = await safeFetch('/api/drive/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          data: backupData, 
          fileName: `ChinaImporter_Backup_${new Date().toISOString().split('T')[0]}.json` 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Backup failed");
      }
      
      const data = await response.json();
      toast.success("Full database backup saved to Google Drive!");
      window.open(data.link, '_blank');
    } catch (error: any) {
      console.error("Backup error:", error);
      toast.error(`Backup failed: ${error.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const uploadToDrive = async (base64Data: string, fileName: string, mimeType: string) => {
    if (!isDriveConnected) return base64Data;
    
    setIsUploadingToDrive(true);
    try {
      const response = await safeFetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ base64Data, fileName, mimeType })
      });
      
      if (!response.ok) throw new Error("Upload failed");
      
      const data = await response.json();
      return data.directLink;
    } catch (error) {
      console.error("Drive upload error:", error);
      toast.error("Failed to upload to Google Drive. Using local data instead.");
      return base64Data;
    } finally {
      setIsUploadingToDrive(false);
    }
  };
  const handleRefreshData = async () => {
    await fetchAllData();
    toast.success('Data refreshed');
  };

  const handleExitAdmin = () => {
    window.location.href = '/';
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-8 border-b border-gray-100">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Admin<span className="text-primary">Pro</span></h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-6 space-y-1.5">
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
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === item.id 
                    ? 'bg-primary text-white shadow-xl shadow-orange-200/50 scale-[1.02]' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={20} />
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

        <main className="p-6 lg:p-10 overflow-y-auto">
          <div className="w-full">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
                  {sidebarItems.find(i => i.id === activeTab)?.label || 'Admin Control Center'}
                </h1>
                <p className="text-base text-gray-500 font-medium tracking-wide">Manage your business operations efficiently</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {activeTab === 'dashboard' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
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
                      required
                      value={newBanner.title}
                      onChange={e => setNewBanner({...newBanner, title: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Banner Subtitle"
                      className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                      required
                      value={newBanner.subtitle}
                      onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})}
                    />
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        id="banner-img" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setNewBanner({...newBanner, image: reader.result as string});
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label htmlFor="banner-img" className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-pointer hover:bg-gray-100 transition-all flex items-center gap-2">
                        <ImageIcon size={16} /> {newBanner.image?.startsWith('data:image') ? 'Image Selected' : 'Upload Banner Image'}
                      </label>
                      <input 
                        type="text" 
                        placeholder="Or Image URL"
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                        value={newBanner.image?.startsWith('data:image') ? '' : newBanner.image}
                        onChange={e => setNewBanner({...newBanner, image: e.target.value})}
                      />
                    </div>
                    <select 
                      className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none bg-white font-bold"
                      value={newBanner.color}
                      onChange={e => setNewBanner({...newBanner, color: e.target.value})}
                    >
                      <option value="bg-primary">Orange (Primary)</option>
                      <option value="bg-secondary">Slate (Secondary)</option>
                      <option value="bg-green-600">Green</option>
                      <option value="bg-blue-600">Blue</option>
                      <option value="bg-red-600">Red</option>
                      <option value="bg-purple-600">Purple</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Redirect Link (Optional)"
                      className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none md:col-span-2"
                      value={newBanner.link}
                      onChange={e => setNewBanner({...newBanner, link: e.target.value})}
                    />
                    <button type="submit" disabled={isUploadingToDrive} className="md:col-span-2 bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50">
                      {isUploadingToDrive ? 'Uploading to Drive...' : 'Add Banner'}
                    </button>
                  </form>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {banners.map(banner => (
                      <div key={banner.id} className="relative rounded-2xl overflow-hidden group aspect-video shadow-sm border border-gray-100">
                        <img src={fixDriveUrl(banner.image)} alt={banner.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all p-4 text-center">
                          <h4 className="text-white font-bold mb-1">{banner.title}</h4>
                          <p className="text-white/80 text-xs mb-4">{banner.subtitle}</p>
                          <button onClick={() => deleteDocument('banners', banner.id)} className="bg-white text-red-500 p-3 rounded-full hover:bg-red-50 transition-all">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTab === 'categories' ? (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <List className="text-primary" /> Category Management
                    </h2>
                    <button 
                      onClick={seedCategories}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                      <RefreshCcw size={14} /> Seed All Categories
                    </button>
                  </div>
                  <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <input 
                      type="text" 
                      placeholder="Category Name"
                      className="md:col-span-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                      required
                      value={newCategory.name}
                      onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Sub-categories (comma separated)"
                      className="md:col-span-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                      value={newCategory.sub.join(', ')}
                      onChange={e => setNewCategory({...newCategory, sub: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                    />
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        id="cat-img" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setNewCategory({...newCategory, image: reader.result as string});
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label htmlFor="cat-img" className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-pointer hover:bg-gray-100 transition-all flex items-center gap-2">
                        <ImageIcon size={16} /> {newCategory.image ? 'Image Selected' : 'Upload Icon'}
                      </label>
                      <button type="submit" disabled={isUploadingToDrive} className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50">
                        {isUploadingToDrive ? 'Uploading...' : 'Add'}
                      </button>
                    </div>
                  </form>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {contextCategories.map(cat => (
                      <div key={cat.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                        <div>
                          <span className="font-bold text-gray-900 block">{cat.name}</span>
                          <span className="text-[10px] text-gray-400 uppercase font-bold">{cat.sub?.length || 0} Sub-categories</span>
                        </div>
                        <button onClick={() => deleteDocument('categories', cat.id)} className="text-gray-400 hover:text-red-500 transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTab === 'google-drive' ? (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <HardDrive className="text-primary" /> Google Drive Integration
                  </h2>
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8">
                    <p className="text-blue-900 font-medium mb-4">
                      Connect your Google Drive to store all product images, banners, and website data directly in your own cloud storage.
                    </p>
                    <div className="flex items-center gap-4">
                      {isDriveConnected ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                          <CheckCircle size={20} /> Connected to Google Drive
                        </div>
                      ) : (
                        <button 
                          onClick={handleConnectDrive}
                          className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center gap-2"
                        >
                          <HardDrive size={20} /> Connect Google Drive
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900">How it works:</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        A folder named <span className="font-bold">"ChinaImporter_Assets"</span> will be created in your drive.
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        All uploaded images will be stored there and automatically shared as "Public" for display.
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        This ensures you own all your data and never lose your images.
                      </li>
                    </ul>
                  </div>

                  {isDriveConnected && (
                    <div className="mt-12 pt-8 border-t border-gray-100">
                      <h3 className="font-bold text-gray-900 mb-4">Database Backup</h3>
                      <p className="text-sm text-gray-500 mb-6">
                        Export all your current website data (Products, Orders, Users, etc.) to a JSON file in your Google Drive.
                      </p>
                      <button 
                        onClick={handleBackupToDrive}
                        disabled={isBackingUp}
                        className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isBackingUp ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                        {isBackingUp ? 'Backing up...' : 'Backup All Data to Drive'}
                      </button>
                    </div>
                  )}
                </div>
              ) : activeTab === 'payment-settings' ? (
                <div className="max-w-2xl mx-auto space-y-8">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <CreditCard className="text-primary" /> Payment Settings
                    </h2>
                    <form onSubmit={handleSavePaymentSettings} className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-600">bKash Number (Personal)</label>
                          <input 
                            type="text" 
                            className="w-full bg-gray-50 h-12 px-4 rounded-xl outline-none focus:ring-2 ring-primary" 
                            value={paymentSettings.bkash}
                            onChange={e => setPaymentSettings({...paymentSettings, bkash: e.target.value})}
                            placeholder="e.g. 017XXXXXXXX"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-600">Nagad Number (Personal)</label>
                          <input 
                            type="text" 
                            className="w-full bg-gray-50 h-12 px-4 rounded-xl outline-none focus:ring-2 ring-primary" 
                            value={paymentSettings.nagad}
                            onChange={e => setPaymentSettings({...paymentSettings, nagad: e.target.value})}
                            placeholder="e.g. 017XXXXXXXX"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-600">Bank Details</label>
                          <textarea 
                            className="w-full bg-gray-50 p-4 rounded-xl outline-none focus:ring-2 ring-primary min-h-[150px]" 
                            value={paymentSettings.bank}
                            onChange={e => setPaymentSettings({...paymentSettings, bank: e.target.value})}
                            placeholder="Account Name: ...&#10;Account Number: ...&#10;Bank Name: ...&#10;Branch: ..."
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={savingSettings}
                        className="w-full bg-primary text-white h-14 rounded-2xl font-bold shadow-xl shadow-orange-200 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {savingSettings ? "Saving..." : "Save Payment Settings"}
                      </button>
                    </form>
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
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                        <ShoppingBag className="text-primary" size={28} /> Product Management
                      </h2>
                      <p className="text-gray-500 text-sm mt-1">Manage your store products, edit details or remove items.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingProductId(null);
                        setSourcingForm({
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
                        setActiveTab('sourcing');
                      }}
                      className="bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-100"
                    >
                      <Plus size={20} /> Add New Product
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product</th>
                          <th className="text-left py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</th>
                          <th className="text-left py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Price</th>
                          <th className="text-right py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {products.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-gray-500">
                              No products found in the database.
                            </td>
                          </tr>
                        ) : (
                          products.map(product => (
                            <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                                    <img src={fixDriveUrl(product.image)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{product.title}</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono uppercase">{product.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase">
                                  {product.category || 'General'}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-bold text-sm text-primary">
                                  {product.price_bdt ? formatBDT(product.price_bdt) : formatBDT(product.price_rmb * 18)}
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  ¥{product.price_rmb.toFixed(2)}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => handleEditProduct(product)}
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                    title="Edit Product"
                                  >
                                    <Edit size={18} />
                                  </button>
                                  <button 
                                    onClick={() => deleteDocument('products', product.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    title="Delete Product"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                  <a 
                                    href={product.source_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                                    title="View Source"
                                  >
                                    <ExternalLink size={18} />
                                  </a>
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
                    {editingProductId ? (
                      <><Edit className="text-primary" size={24} /> Update Product Details</>
                    ) : (
                      <><Plus className="text-primary" size={24} /> Link 1688/Alibaba Product</>
                    )}
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
                        <option value="General">General</option>
                        {contextCategories.sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Product Reviews</label>
                        <textarea 
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                          placeholder="Paste or edit product reviews..."
                          value={sourcingForm.reviews}
                          onChange={e => setSourcingForm({...sourcingForm, reviews: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Packing Info</label>
                        <textarea 
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                          placeholder="Packing details (e.g., weight, dimensions)..."
                          value={sourcingForm.packing}
                          onChange={e => setSourcingForm({...sourcingForm, packing: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Product Details (Rich Content)</label>
                      <textarea 
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                        placeholder="Additional detailed information..."
                        value={sourcingForm.details}
                        onChange={e => setSourcingForm({...sourcingForm, details: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Product Attributes</label>
                      <div className="space-y-2">
                        {(sourcingForm.attributes || []).map((attr, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Label (e.g. Material)"
                              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm"
                              value={attr.label}
                              onChange={e => {
                                const newAttrs = [...(sourcingForm.attributes || [])];
                                newAttrs[idx].label = e.target.value;
                                setSourcingForm({...sourcingForm, attributes: newAttrs});
                              }}
                            />
                            <input 
                              type="text" 
                              placeholder="Value (e.g. Cotton)"
                              className="flex-[2] px-4 py-2 rounded-lg border border-gray-200 text-sm"
                              value={attr.value}
                              onChange={e => {
                                const newAttrs = [...(sourcingForm.attributes || [])];
                                newAttrs[idx].value = e.target.value;
                                setSourcingForm({...sourcingForm, attributes: newAttrs});
                              }}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                const newAttrs = (sourcingForm.attributes || []).filter((_, i) => i !== idx);
                                setSourcingForm({...sourcingForm, attributes: newAttrs});
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button"
                          onClick={() => setSourcingForm({
                            ...sourcingForm, 
                            attributes: [...(sourcingForm.attributes || []), { label: '', value: '' }]
                          })}
                          className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                        >
                          <Plus size={14} /> Add Attribute
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Product Variants (e.g. Color, Size)</label>
                      <div className="space-y-4">
                        {(sourcingForm.variants || []).map((variant, vIdx) => (
                          <div key={vIdx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                            <div className="flex items-center justify-between">
                              <input 
                                type="text" 
                                placeholder="Variant Name (e.g. Color)"
                                className="bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-primary transition-all"
                                value={variant.name}
                                onChange={e => {
                                  const newVariants = [...(sourcingForm.variants || [])];
                                  newVariants[vIdx].name = e.target.value;
                                  setSourcingForm({...sourcingForm, variants: newVariants});
                                }}
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  const newVariants = (sourcingForm.variants || []).filter((_, i) => i !== vIdx);
                                  setSourcingForm({...sourcingForm, variants: newVariants});
                                }}
                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {variant.options.map((option, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded-lg text-xs">
                                  <span>{option}</span>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newVariants = [...(sourcingForm.variants || [])];
                                      newVariants[vIdx].options = variant.options.filter((_, i) => i !== oIdx);
                                      setSourcingForm({...sourcingForm, variants: newVariants});
                                    }}
                                    className="text-gray-400 hover:text-red-500"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                              <input 
                                type="text" 
                                placeholder="Add option..."
                                className="bg-transparent text-xs outline-none border-b border-gray-200 focus:border-primary w-24"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = (e.target as HTMLInputElement).value.trim();
                                    if (val) {
                                      const newVariants = [...(sourcingForm.variants || [])];
                                      newVariants[vIdx].options = [...variant.options, val];
                                      setSourcingForm({...sourcingForm, variants: newVariants});
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ))}
                        <button 
                          type="button"
                          onClick={() => setSourcingForm({
                            ...sourcingForm, 
                            variants: [...(sourcingForm.variants || []), { name: '', options: [] }]
                          })}
                          className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                        >
                          <Plus size={14} /> Add Variant Group
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Product Images (Gallery)</label>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Add Image URL to Gallery"
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const url = (e.target as HTMLInputElement).value;
                                if (url) {
                                  setSourcingForm(prev => ({
                                    ...prev,
                                    image: prev.image || url,
                                    images: [...(prev.images || []), url]
                                  }));
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                          />
                          <div className="relative">
                            <input 
                              type="file" 
                              className="hidden" 
                              id="product-files" 
                              multiple
                              accept="image/*"
                              onChange={handleFileUpload}
                            />
                            <label htmlFor="product-files" className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-pointer hover:bg-gray-100 transition-all block whitespace-nowrap">
                              Upload More
                            </label>
                          </div>
                        </div>

                        {sourcingForm.images && sourcingForm.images.length > 0 && (
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                            {sourcingForm.images.map((img, idx) => (
                              <div key={idx} className={`relative group aspect-square rounded-xl border-2 overflow-hidden bg-gray-50 ${sourcingForm.image === img ? 'border-primary' : 'border-transparent hover:border-gray-200'}`}>
                                <img 
                                  src={fixDriveUrl(img)} 
                                  alt={`Gallery ${idx}`} 
                                  className="w-full h-full object-cover cursor-pointer"
                                  onClick={() => setSourcingForm({...sourcingForm, image: img})}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://picsum.photos/seed/error/100/100";
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                  <button 
                                    type="button"
                                    onClick={() => setSourcingForm({...sourcingForm, image: img})}
                                    className="p-1 bg-white text-primary rounded-lg shadow-lg"
                                    title="Set as Primary"
                                  >
                                    <CheckCircle size={14} />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newImages = sourcingForm.images?.filter((_, i) => i !== idx);
                                      setSourcingForm({
                                        ...sourcingForm,
                                        images: newImages,
                                        image: sourcingForm.image === img ? (newImages?.[0] || '') : sourcingForm.image
                                      });
                                    }}
                                    className="p-1 bg-white text-red-500 rounded-lg shadow-lg"
                                    title="Remove"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                {sourcingForm.image === img && (
                                  <div className="absolute top-1 left-1 bg-primary text-white text-[8px] font-bold px-1 rounded shadow-sm">
                                    PRIMARY
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase">Source URL (1688/Alibaba)</label>
                        <button 
                          type="button"
                          onClick={() => setSourcingForm({...sourcingForm, source_url: '', htmlSource: '', image: '', images: []})}
                          className="text-[10px] text-red-500 hover:underline font-bold"
                        >
                          Clear All
                        </button>
                      </div>
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
                          {showReview ? 'Re-Fetch' : 'Review'}
                        </button>
                      </div>
                      {(sourcingForm.source_url.includes('1688.com') || sourcingForm.source_url.includes('alibaba.com')) && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                            <AlertCircle size={12} />
                            Tip: Alibaba/1688 links are often blocked. Use the "Advanced" method below.
                          </p>
                          <p className="text-[10px] text-amber-600 font-medium font-bangla">
                            টিপ: আলিবাবা/১৬৮৮ লিঙ্কগুলো সরাসরি কাজ না করলে নিচের "Advanced" পদ্ধতি ব্যবহার করুন।
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase">
                          <FileText size={14} />
                          Advanced: Paste Page Source (Recommended for Alibaba/1688)
                        </div>
                        <button 
                          type="button"
                          onClick={() => setSourcingForm({...sourcingForm, htmlSource: ''})}
                          className="text-[10px] text-amber-600 hover:underline font-bold"
                        >
                          Clear Source
                        </button>
                      </div>
                      <p className="text-[10px] text-amber-700 leading-relaxed">
                        Alibaba and 1688 have strong security that often blocks direct links. For best results:
                        <br />
                        1. Open the product on Alibaba/1688.
                        <br />
                        2. Right-click anywhere and select <b>"View Page Source"</b>.
                        <br />
                        3. Copy everything (Ctrl+A, Ctrl+C) and paste it below.
                        <br />
                        4. Click <b>Review</b> again.
                      </p>
                      <p className="text-[10px] text-amber-700 leading-relaxed font-bangla border-t border-amber-100 pt-2 mt-2">
                        আলিবাবা/১৬৮৮ লিঙ্ক সরাসরি কাজ না করলে:
                        <br />
                        ১. পন্যের পেজটি ওপেন করুন।
                        <br />
                        ২. মাউসের রাইট ক্লিক করে <b>"View Page Source"</b> সিলেক্ট করুন।
                        <br />
                        ৩. সব কোড কপি করে (Ctrl+A, Ctrl+C) নিচের বক্সে পেস্ট করুন।
                        <br />
                        ৪. পন্যের ছবি না আসলে ছবির ওপর রাইট ক্লিক করে <b>"Copy Image Address"</b> করে নিচের বক্সে পেস্ট করুন।
                        <br />
                        ৫. তারপর আবার <b>Review</b> বাটনে ক্লিক করুন।
                      </p>
                      <textarea 
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-[10px] font-mono bg-white/50"
                        placeholder="Paste HTML source code here..."
                        value={sourcingForm.htmlSource}
                        onChange={e => setSourcingForm({...sourcingForm, htmlSource: e.target.value})}
                      />
                    </div>

                    {showReview && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-6 bg-blue-50 rounded-3xl border border-blue-100 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                            <CheckCircle size={16} className="text-blue-500" /> AI Review Results
                          </h3>
                          <button 
                            type="button"
                            onClick={() => setShowReview(false)}
                            className="text-blue-400 hover:text-blue-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-blue-800 uppercase">Product Title</p>
                              <input 
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                                value={sourcingForm.title}
                                onChange={e => setSourcingForm({...sourcingForm, title: e.target.value})}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-blue-800 uppercase">Price (RMB)</p>
                              <input 
                                type="number"
                                className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                                value={sourcingForm.price_rmb}
                                onChange={e => setSourcingForm({...sourcingForm, price_rmb: Number(e.target.value)})}
                              />
                            </div>

                            <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-blue-800 uppercase">Primary Image</p>
                            </div>
                            <div className="aspect-square rounded-2xl overflow-hidden bg-white border border-blue-200 relative group">
                              <img 
                                src={fixDriveUrl(sourcingForm.image) || "https://placehold.co/400x400/f3f4f6/94a3b8?text=No+Image+Found"} 
                                alt="Preview" 
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://placehold.co/400x400/f3f4f6/94a3b8?text=Image+Error";
                                }}
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    toast.info("Refreshing image...");
                                    const current = sourcingForm.image;
                                    setSourcingForm(prev => ({...prev, image: ''}));
                                    setTimeout(() => setSourcingForm(prev => ({...prev, image: current})), 100);
                                  }}
                                  className="bg-white p-2 rounded-full shadow-lg text-blue-600 hover:scale-110 transition-transform"
                                  title="Refresh"
                                >
                                  <RefreshCcw size={20} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    if (sourcingForm.image) {
                                      window.open(sourcingForm.image, '_blank');
                                    }
                                  }}
                                  className="bg-white p-2 rounded-full shadow-lg text-blue-600 hover:scale-110 transition-transform"
                                  title="Open Original"
                                >
                                  <ExternalLink size={20} />
                                </button>
                              </div>
                            </div>
                            <input 
                              type="text"
                              placeholder="Primary Image URL"
                              className="w-full px-3 py-2 text-[10px] rounded-lg border border-blue-200 bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none"
                              value={sourcingForm.image}
                              onChange={e => setSourcingForm(prev => ({...prev, image: e.target.value}))}
                            />
                            <div className="p-3 bg-blue-100/50 rounded-xl border border-blue-200">
                              <p className="text-[10px] text-blue-700 leading-relaxed font-bangla">
                                টিপ: ছবি না আসলে পন্যের পেজ থেকে ছবির ওপর রাইট ক্লিক করে <b>"Copy Image Address"</b> করে উপরের বক্সে পেস্ট করুন।
                              </p>
                            </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-blue-800 uppercase">Gallery ({sourcingForm.images?.length || 0})</p>
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Add Gallery Image URL"
                                className="flex-1 px-3 py-2 text-[10px] rounded-lg border border-blue-200 bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    const url = (e.target as HTMLInputElement).value;
                                    if (url) {
                                      setSourcingForm(prev => ({...prev, images: [...(prev.images || []), url]}));
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }
                                }}
                              />
                              <button 
                                type="button"
                                onClick={(e) => {
                                  const input = (e.currentTarget.previousSibling as HTMLInputElement);
                                  const url = input.value;
                                  if (url) {
                                    setSourcingForm(prev => ({...prev, images: [...(prev.images || []), url]}));
                                    input.value = '';
                                  }
                                }}
                                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-[10px] font-bold"
                              >
                                Add
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {sourcingForm.images?.slice(0, 6).map((img, i) => (
                                <div key={i} className="aspect-square rounded-lg overflow-hidden border border-blue-200 bg-white relative group/item">
                                  <img 
                                    src={fixDriveUrl(img) || "https://placehold.co/100x100/f3f4f6/94a3b8?text=No+Img"} 
                                    alt="" 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://placehold.co/100x100/f3f4f6/94a3b8?text=Error";
                                    }}
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setSourcingForm(prev => ({
                                        ...prev,
                                        images: prev.images?.filter((_, index) => index !== i)
                                      }));
                                    }}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity shadow-sm"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                              {sourcingForm.images && sourcingForm.images.length > 6 && (
                                <div className="aspect-square rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                  +{sourcingForm.images.length - 6}
                                </div>
                              )}
                            </div>
                            <div className="p-3 bg-blue-100/50 rounded-xl border border-blue-200">
                              <p className="text-[10px] text-blue-700 leading-relaxed font-bangla">
                                টিপ: গ্যালারি ছবি যোগ করতে ছবির অ্যাড্রেস কপি করে উপরের বক্সে পেস্ট করে <b>Add</b> বাটনে ক্লিক করুন।
                              </p>
                            </div>
                            <div className="pt-2 space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-blue-800 uppercase">Variants Found</p>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const name = window.prompt("Variant Name (e.g. Color, Size):");
                                    if (name) {
                                      setSourcingForm(prev => ({
                                        ...prev,
                                        variants: [...(prev.variants || []), { name, options: [] }]
                                      }));
                                    }
                                  }}
                                  className="text-[10px] text-blue-600 hover:underline font-bold"
                                >
                                  Add Variant
                                </button>
                              </div>
                              
                              <div className="space-y-3">
                                {sourcingForm.variants?.map((v, i) => (
                                  <div key={i} className="p-3 bg-white rounded-xl border border-blue-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <input 
                                        type="text"
                                        className="text-[10px] font-bold text-blue-900 bg-transparent border-none focus:ring-0 p-0 w-1/2"
                                        value={v.name}
                                        onChange={e => {
                                          const newVariants = [...(sourcingForm.variants || [])];
                                          newVariants[i].name = e.target.value;
                                          setSourcingForm({...sourcingForm, variants: newVariants});
                                        }}
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          setSourcingForm(prev => ({
                                            ...prev,
                                            variants: prev.variants?.filter((_, index) => index !== i)
                                          }));
                                        }}
                                        className="text-red-400 hover:text-red-600"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-1">
                                      {v.options.map((opt, optIdx) => (
                                        <span key={optIdx} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                          {opt}
                                          <button 
                                            type="button"
                                            onClick={() => {
                                              const newVariants = [...(sourcingForm.variants || [])];
                                              newVariants[i].options = newVariants[i].options.filter((_, idx) => idx !== optIdx);
                                              setSourcingForm({...sourcingForm, variants: newVariants});
                                            }}
                                            className="hover:text-red-500"
                                          >
                                            <X size={8} />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                    
                                    <div className="flex gap-1">
                                      <input 
                                        type="text"
                                        placeholder="Add option..."
                                        className="flex-1 text-[10px] px-2 py-1 rounded border border-blue-50 outline-none focus:border-blue-200"
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (val) {
                                              const newVariants = [...(sourcingForm.variants || [])];
                                              newVariants[i].options = [...newVariants[i].options, val];
                                              setSourcingForm({...sourcingForm, variants: newVariants});
                                              (e.target as HTMLInputElement).value = '';
                                            }
                                          }
                                        }}
                                      />
                                      <button 
                                        type="button"
                                        onClick={(e) => {
                                          const input = (e.currentTarget.previousSibling as HTMLInputElement);
                                          const val = input.value;
                                          if (val) {
                                            const newVariants = [...(sourcingForm.variants || [])];
                                            newVariants[i].options = [...newVariants[i].options, val];
                                            setSourcingForm({...sourcingForm, variants: newVariants});
                                            input.value = '';
                                          }
                                        }}
                                        className="bg-blue-500 text-white px-2 py-1 rounded text-[10px] font-bold"
                                      >
                                        Add
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                
                                {(!sourcingForm.variants || sourcingForm.variants.length === 0) && (
                                  <div className="p-4 bg-white/50 rounded-xl border border-dashed border-blue-200 text-center">
                                    <p className="text-[10px] text-blue-400 italic">No variants detected. Click "Add Variant" to add manually.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="p-3 bg-blue-100/50 rounded-xl border border-blue-200">
                              <p className="text-[10px] text-blue-700 leading-relaxed font-bangla">
                                টিপ: ভেরিয়েন্ট (যেমন: কালার, সাইজ) না আসলে <b>Add Variant</b> বাটনে ক্লিক করে ম্যানুয়ালি যোগ করুন।
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

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
                            specs: [],
                            reviews: '',
                            attributes: [],
                            packing: '',
                            details: '',
                            htmlSource: ''
                          });
                          setProfitMargin(15);
                          setEditingProductId(null);
                          if (editingProductId) setActiveTab('products');
                        }}
                        className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                      >
                        {editingProductId ? 'Cancel' : 'Clear Form'}
                      </button>
                      <button 
                        type="submit"
                        disabled={isUploadingToDrive}
                        className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-orange-200 hover:bg-orange-600 transition-all transform hover:-translate-y-1 disabled:opacity-50"
                      >
                        {isUploadingToDrive ? 'Uploading to Drive...' : (editingProductId ? 'Update Product' : 'Add to Site')}
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

          ) : activeTab === 'withdrawals' ? (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-gray-900">Withdrawals</h2>
                  <p className="text-gray-500 text-sm">Manage your business operations efficiently</p>
                </div>
                <div className="bg-rose-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-rose-100 flex items-center gap-4">
                  <span className="text-sm font-bold">Pending</span>
                  <span className="text-xl font-black">{formatBDT(pendingTotal)}</span>
                </div>
              </div>

              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search by phone"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-rose-500 transition-all text-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-50 bg-gray-50/50">
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Phone</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Client Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Current Balance</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Withdrawal History</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {groupedWithdrawals.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-bold">No withdrawal requests found</td>
                        </tr>
                      ) : (
                        groupedWithdrawals.map(group => (
                          <tr key={group.userId} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-8 text-center font-bold text-gray-900">{group.userPhone}</td>
                            <td className="px-6 py-8 text-center text-gray-600 font-medium">{group.userName}</td>
                            <td className="px-6 py-8 text-center font-bold text-gray-900">{formatBDT(group.currentBalance)}</td>
                            <td className="px-6 py-8">
                              <div className="border border-gray-100 rounded-xl overflow-hidden">
                                <table className="w-full border-collapse">
                                  <thead className="bg-gray-50">
                                    <tr className="text-[9px] font-black text-gray-500 uppercase tracking-wider">
                                      <th className="px-4 py-2 border-r border-gray-100 text-center">Withdrawal Amount</th>
                                      <th className="px-4 py-2 border-r border-gray-100 text-center">Requested Gateway</th>
                                      <th className="px-4 py-2 border-r border-gray-100 text-center">RequestedTime</th>
                                      <th className="px-4 py-2 border-r border-gray-100 text-center">Status</th>
                                      <th className="px-4 py-2 text-center">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {group.requests.map(req => (
                                      <tr key={req.id} className={req.status === 'Pending' ? 'bg-orange-500 text-white' : 'text-gray-600'}>
                                        <td className={`px-4 py-2 text-center font-bold border-r ${req.status === 'Pending' ? 'border-orange-400' : 'border-gray-100'}`}>
                                          {formatBDT(req.amount + (req.gatewayCharge || 0))}
                                        </td>
                                        <td className={`px-4 py-2 text-center border-r ${req.status === 'Pending' ? 'border-orange-400' : 'border-gray-100'}`}>
                                          <div className="flex items-center justify-center gap-4">
                                            <div className="flex flex-col items-center">
                                              <span className={`text-[8px] font-black uppercase ${req.status === 'Pending' ? 'text-orange-100' : 'text-gray-400'}`}>Details</span>
                                              <span className="text-[10px] font-bold">{req.paymentNumber || req.bankAccountNumber || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                              <span className={`text-[8px] font-black uppercase ${req.status === 'Pending' ? 'text-orange-100' : 'text-gray-400'}`}>Method</span>
                                              <span className="text-[10px] font-bold">{req.paymentMethod || 'BKash'}</span>
                                            </div>
                                          </div>
                                        </td>
                                        <td className={`px-4 py-2 text-center border-r text-[10px] ${req.status === 'Pending' ? 'border-orange-400' : 'border-gray-100'}`}>
                                          {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString() : 'N/A'}
                                        </td>
                                        <td className={`px-4 py-2 text-center border-r ${req.status === 'Pending' ? 'border-orange-400' : 'border-gray-100'}`}>
                                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                            req.status === 'Pending' ? 'bg-white/20 text-white' : 
                                            req.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                                            req.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                          }`}>
                                            {req.status === 'Pending' ? 'HOLD' : req.status}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                          <button 
                                            onClick={() => setSelectedRefund(req)} 
                                            className={`p-1.5 rounded-lg transition-all ${req.status === 'Pending' ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-100 text-gray-400'}`}
                                          >
                                            <Edit size={14} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'refunds-stock-out' || activeTab === 'refunds' || activeTab === 'refund-list' || activeTab === 'already-refunded' ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-72">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                    <Search size={16} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search by phone or Order Id" 
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-10 pr-8 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Phone</th>
                        <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Client Name</th>
                        <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Order ID</th>
                        <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Refund Amount</th>
                        <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Gateway</th>
                        <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Status</th>
                        <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {finalFilteredRefunds.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-bold">
                            No refund requests found
                          </td>
                        </tr>
                      ) : (
                        finalFilteredRefunds.map(request => (
                          <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-gray-900 text-center">{request.userPhone || 'N/A'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 text-center">{request.userName || 'N/A'}</td>
                            <td className="px-6 py-4 text-xs font-mono text-gray-400 text-center">
                              {request.orderId || request.id}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900 text-center">{request.amount} BDT</td>
                            <td className="px-6 py-4 text-sm text-gray-600 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-bold">{request.paymentMethod || 'BKash'}</span>
                                {request.paymentMethod === 'bKash' && (
                                  <span className="text-[10px] text-primary font-bold">{request.paymentNumber}</span>
                                )}
                                {request.paymentMethod === 'Bank' && (
                                  <span className="text-[10px] text-primary font-bold">{request.bankName}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                request.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                                request.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  request.status === 'Pending' ? 'bg-orange-500' :
                                  request.status === 'Completed' ? 'bg-green-500' :
                                  'bg-red-500'
                                }`} />
                                {request.status === 'Pending' ? 'HOLD' : request.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => setSelectedRefund(request)}
                                className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-gray-200 transition-all border border-gray-200"
                              >
                                <Edit size={14} />
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Pagination Placeholder */}
              <div className="flex justify-end mt-4">
                <div className="flex items-center gap-1">
                  <button className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-500 hover:bg-gray-50">Previous</button>
                  <button className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold">1</button>
                  <button className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-500 hover:bg-gray-50">2</button>
                  <button className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-500 hover:bg-gray-50">3</button>
                  <button className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-500 hover:bg-gray-50">4</button>
                  <button className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-500 hover:bg-gray-50">5</button>
                  <span className="px-2 text-gray-400">...</span>
                  <button className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-500 hover:bg-gray-50">664</button>
                  <button className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-500 hover:bg-gray-50">Next</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                    {sidebarItems.find(i => i.id === activeTab)?.label || 'All Orders'}
                  </h2>
                  <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Manage your business operations efficiently</p>
                </div>
                <div className="flex gap-3">
                  <button className="bg-primary/10 text-primary px-6 py-3 rounded-2xl font-bold hover:bg-primary/20 transition-all flex items-center gap-2 border border-primary/20">
                    <RefreshCcw size={18} />
                    Sync Orders
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                  <Search size={20} />
                </div>
                <input 
                  type="text" 
                  placeholder="Search by Order ID, Email, or Transaction ID..." 
                  className="w-full bg-white border-2 border-gray-100 rounded-[2rem] py-5 pl-16 pr-6 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all font-bold text-gray-900 shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Orders Table */}
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center border-r border-gray-100">Child ID</th>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center border-r border-gray-100">1688 Order ID</th>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center border-r border-gray-100">Product Status</th>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center border-r border-gray-100">Order time</th>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center border-r border-gray-100">Product Image</th>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100">Product Name</th>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100">Name</th>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100">Phone</th>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center border-r border-gray-100">Gateway</th>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center border-r border-gray-100">CS Response</th>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center border-r border-gray-100">Purchase Note</th>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center border-r border-gray-100">Last Update</th>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center border-r border-gray-100">Update Status</th>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <FileText className="text-gray-200" size={64} />
                              <p className="text-gray-500 font-bold">No orders found in this category</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50/30 transition-colors group">
                            <td className="px-3 py-2 text-center border-r border-gray-100">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xs font-black text-primary">#{order.orderNumber || order.id.slice(0, 8)}</span>
                                <span className="text-[9px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{order.id.slice(0, 10)}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center border-r border-gray-100">
                              <span className="text-xs font-bold text-gray-600">{order.purchaseOrderId || 'N/A'}</span>
                            </td>
                            <td className="px-3 py-2 text-center border-r border-gray-100">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                order.status === 'Order Placed' ? 'bg-blue-100 text-blue-700' :
                                order.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                                order.status === 'Purchased' ? 'bg-amber-100 text-amber-700' :
                                order.status === 'Shipped' ? 'bg-purple-100 text-purple-700' :
                                order.status === 'BD Warehouse' ? 'bg-indigo-100 text-indigo-700' :
                                order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                                order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                order.status === 'Stock Out' ? 'bg-rose-100 text-rose-700' :
                                order.status === 'Refunded' ? 'bg-gray-100 text-gray-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center border-r border-gray-100">
                              <span className="text-xs font-bold text-gray-600">
                                {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center border-r border-gray-100">
                              <div className="w-12 h-12 mx-auto bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm p-0.5">
                                <img 
                                  src={fixDriveUrl(order.items[0]?.image)} 
                                  alt="" 
                                  className="w-full h-full object-contain" 
                                  referrerPolicy="no-referrer" 
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2 border-r border-gray-100 max-w-[150px]">
                              <p className="text-xs font-bold text-gray-900 truncate">{order.items[0]?.title}</p>
                              {order.items.length > 1 && (
                                <p className="text-[9px] font-black text-primary uppercase mt-0.5">+{order.items.length - 1} more items</p>
                              )}
                            </td>
                            <td className="px-3 py-2 border-r border-gray-100">
                              <span className="text-xs font-bold text-gray-900">{order.shippingAddress?.name || 'N/A'}</span>
                            </td>
                            <td className="px-3 py-2 border-r border-gray-100">
                              <span className="text-xs font-bold text-gray-600">{order.shippingAddress?.phone || 'N/A'}</span>
                            </td>
                            <td className="px-3 py-2 text-center border-r border-gray-100">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xs font-bold text-gray-900">{order.paymentType || 'Manual'}</span>
                                <CheckCircle size={12} className="text-emerald-500" />
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center border-r border-gray-100">
                              {order.csResponse ? (
                                <button 
                                  onClick={() => setSelectedOrder(order)}
                                  className="bg-gray-900 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest hover:bg-black transition-all"
                                >
                                  See Note
                                </button>
                              ) : (
                                <span className="text-[9px] font-bold text-gray-300 uppercase">No Response</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center border-r border-gray-100">
                              {order.purchaseNote ? (
                                <button 
                                  onClick={() => setSelectedOrder(order)}
                                  className="bg-gray-900 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest hover:bg-black transition-all"
                                >
                                  See Note
                                </button>
                              ) : (
                                <span className="text-[9px] font-bold text-gray-300 uppercase">No Note</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center border-r border-gray-100">
                              <span className="text-xs font-bold text-gray-600">
                                {order.updatedAt?.toDate ? order.updatedAt.toDate().toLocaleDateString() : 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center border-r border-gray-100">
                              <button 
                                onClick={() => setSelectedOrder(order)}
                                className="bg-gray-900 text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-200"
                              >
                                Update Status
                              </button>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button 
                                onClick={() => setSelectedOrder(order)}
                                className="p-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-all shadow-lg shadow-gray-200 inline-flex items-center justify-center"
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] max-w-6xl w-full shadow-2xl my-8 overflow-hidden border border-gray-100"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-50 bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Order Details</h2>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-sm font-bold text-primary">ID: #{selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)}</span>
                      <span className="text-[10px] text-gray-400 font-mono bg-white px-2 py-0.5 rounded border border-gray-100 uppercase tracking-wider">Internal: {selectedOrder.id}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-white hover:text-red-500 rounded-xl transition-all text-gray-400 border border-transparent hover:border-red-100"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                {/* Top Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Client Details */}
                  <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-blue-50/50 px-5 py-3 border-b border-blue-50">
                      <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                        <Users size={14} /> Client Details
                      </h3>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Name</span>
                        <span className="text-sm font-bold text-gray-900">{selectedOrder.shippingAddress?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Phone</span>
                        <span className="text-sm font-bold text-gray-900">{selectedOrder.shippingAddress?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Emergency</span>
                        <span className="text-sm font-bold text-gray-900">{selectedOrder.shippingAddress?.emergencyPhone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Email</span>
                        <span className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{selectedOrder.shippingAddress?.email || selectedOrder.userEmail}</span>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-emerald-50/50 px-5 py-3 border-b border-emerald-50">
                      <h3 className="text-xs font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">
                        <Truck size={14} /> Shipping Address
                      </h3>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-gray-400 uppercase mt-1">Address</span>
                        <span className="text-sm font-bold text-gray-900 text-right max-w-[180px] leading-tight">{selectedOrder.shippingAddress?.detail || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">District</span>
                        <span className="text-sm font-bold text-gray-900">{selectedOrder.shippingAddress?.district || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">City</span>
                        <span className="text-sm font-bold text-gray-900">{selectedOrder.shippingAddress?.city || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Method</span>
                        <span className="text-sm font-bold text-primary">{selectedOrder.shippingAddress?.deliveryMethod || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-orange-50/50 px-5 py-3 border-b border-orange-50">
                      <h3 className="text-xs font-black text-orange-900 uppercase tracking-widest flex items-center gap-2">
                        <DollarSign size={14} /> Grand Total
                      </h3>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Total Price</span>
                        <span className="text-sm font-black text-gray-900">{formatBDT(selectedOrder.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
                        <select 
                          value={modalStatus}
                          onChange={(e) => setModalStatus(e.target.value as OrderStatus)}
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider outline-none border-none cursor-pointer ${
                            modalStatus === 'Order Placed' ? 'bg-blue-100 text-blue-700' :
                            modalStatus === 'Confirmed' ? 'bg-green-100 text-green-700' :
                            modalStatus === 'Purchased' ? 'bg-amber-100 text-amber-700' :
                            modalStatus === 'Shipped' ? 'bg-purple-100 text-purple-700' :
                            modalStatus === 'BD Warehouse' ? 'bg-indigo-100 text-indigo-700' :
                            modalStatus === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                            modalStatus === 'Cancelled' ? 'bg-red-100 text-red-700' :
                            modalStatus === 'Stock Out' ? 'bg-rose-100 text-rose-700' :
                            modalStatus === 'Refunded' ? 'bg-gray-100 text-gray-700' :
                            'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <option value="Order Placed">Order Placed</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Purchased">Purchased</option>
                          <option value="Shipped">Shipped</option>
                          <option value="BD Warehouse">BD Warehouse</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Stock Out">Stock Out</option>
                          <option value="Refunded">Refunded</option>
                        </select>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Coupon</span>
                        <span className="text-sm font-bold text-gray-900">N/A</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Partial Paid</span>
                        <span className="text-sm font-black text-emerald-600">{formatBDT(selectedOrder.paidAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Bars / Editable Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-emerald-600 p-6 rounded-3xl shadow-lg shadow-emerald-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <CheckCheck size={80} />
                    </div>
                    <div className="relative z-10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white/80 text-[10px] font-black uppercase tracking-widest">CS RESPONSE</span>
                        <RefreshCcw size={16} className="text-white/60" />
                      </div>
                      <input 
                        type="text"
                        placeholder="Enter CS Response..."
                        className="w-full bg-emerald-700/50 border border-emerald-500/30 text-white placeholder:text-emerald-300/50 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-white/20 font-bold text-sm"
                        value={csResponse}
                        onChange={e => setCsResponse(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-rose-600 p-6 rounded-3xl shadow-lg shadow-rose-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Edit3 size={80} />
                    </div>
                    <div className="relative z-10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white/80 text-[10px] font-black uppercase tracking-widest">PURCHASE NOTE</span>
                        <FileText size={16} className="text-white/60" />
                      </div>
                      <input 
                        type="text"
                        placeholder="Enter Purchase Note..."
                        className="w-full bg-rose-700/50 border border-rose-500/30 text-white placeholder:text-rose-300/50 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-white/20 font-bold text-sm"
                        value={purchaseNote}
                        onChange={e => setPurchaseNote(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Product Details Table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <List size={20} className="text-primary" /> Product Details
                    </h3>
                    <div className="flex gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span>Order ID: {selectedOrder.id}</span>
                      <span>Tracking: N/A</span>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-32">Image</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product & Variation</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-24">Qty</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right w-40">Unit Price</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right w-40">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedOrder.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="w-20 h-20 mx-auto bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm p-1">
                                <img 
                                  src={fixDriveUrl(item.image)} 
                                  alt="" 
                                  className="w-full h-full object-contain" 
                                  referrerPolicy="no-referrer" 
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-gray-900 text-sm mb-1.5">{item.title}</p>
                              <div className="flex flex-wrap gap-2">
                                {item.selectedVariants && Object.entries(item.selectedVariants).map(([key, value]) => (
                                  <span key={key} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-gray-200">
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl font-black text-gray-900">
                                {item.quantity}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <p className="text-sm font-bold text-gray-900">{formatBDT(item.price_bdt || (item.price_rmb * 18))}</p>
                              <p className="text-[10px] text-gray-400 font-medium">¥{item.price_rmb.toFixed(2)}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <p className="text-sm font-black text-primary">{formatBDT((item.price_bdt || (item.price_rmb * 18)) * item.quantity)}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payment Proof Section */}
                {selectedOrder.paymentProof && (
                  <div className="bg-white p-8 rounded-[2rem] border border-orange-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <CreditCard size={120} className="text-orange-500" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                      <div className="w-40 h-40 bg-white rounded-3xl border-4 border-orange-50 shadow-xl overflow-hidden shrink-0 transform group-hover:scale-105 transition-transform">
                        <img 
                          src={fixDriveUrl(selectedOrder.paymentProof)} 
                          alt="Proof" 
                          className="w-full h-full object-cover cursor-pointer" 
                          referrerPolicy="no-referrer"
                          onClick={() => window.open(selectedOrder.paymentProof, '_blank')}
                        />
                      </div>
                      <div className="flex-1 space-y-4 text-center md:text-left">
                        <div>
                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Transaction ID</p>
                          <p className="text-2xl font-black text-gray-900 tracking-tight">{selectedOrder.transactionId || 'N/A'}</p>
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                          <button 
                            onClick={() => window.open(selectedOrder.paymentProof, '_blank')}
                            className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 transition-all"
                          >
                            <ExternalLink size={14} /> Open Full Image
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Final Totals Summary */}
                <div className="flex justify-end pt-4">
                  <div className="w-full md:w-80 bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</span>
                      <span className="text-sm font-bold text-gray-900">{formatBDT(selectedOrder.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid Amount</span>
                      <span className="text-sm font-bold text-emerald-600">{formatBDT(selectedOrder.paidAmount)}</span>
                    </div>
                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Remaining Due</span>
                      <span className="text-xl font-black text-primary">{formatBDT(selectedOrder.totalAmount - selectedOrder.paidAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-50/50 border-t border-gray-50 flex gap-4">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 bg-white text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all border border-gray-200 uppercase tracking-widest text-xs"
                >
                  Close
                </button>
                <button 
                  onClick={handleUpdateOrderDetails}
                  className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-orange-200 hover:bg-orange-600 transition-all transform hover:-translate-y-1 uppercase tracking-widest text-xs"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Refund Payout Modal */}
      <AnimatePresence>
        {selectedRefund && (() => {
          const relatedOrder = orders.find(o => o.id === selectedRefund.orderId);
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-center border-b border-gray-50">
                  <h2 className="text-xl font-black text-[#003049] tracking-tight">Send Money</h2>
                  <button onClick={() => setSelectedRefund(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  {/* Withdrawal Info */}
                  {!selectedRefund.orderId && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-1">
                      <div className="flex justify-between text-xs font-bold text-blue-800">
                        <span>Requested Amount:</span>
                        <span>{formatBDT(selectedRefund.amount)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-blue-800">
                        <span>Current Wallet Balance:</span>
                        <span>{formatBDT(users.find(u => u.uid === selectedRefund.userId)?.walletBalance || 0)}</span>
                      </div>
                      <div className="pt-1 border-t border-blue-200 flex justify-between text-sm font-black text-blue-900">
                        <span>Total to Clear Wallet:</span>
                        <span>{formatBDT(selectedRefund.amount + (users.find(u => u.uid === selectedRefund.userId)?.walletBalance || 0))}</span>
                      </div>
                    </div>
                  )}

                  {/* Gateway Selection */}
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-[#003049]">Gateway :</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${selectedRefund.paymentMethod === 'bKash' ? 'border-rose-500 bg-rose-50/30' : 'border-gray-100'}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedRefund.paymentMethod === 'bKash' ? 'border-rose-500' : 'border-gray-300'}`}>
                          {selectedRefund.paymentMethod === 'bKash' && <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700">bKash</span>
                          <img src="https://www.logo.wine/a/logo/BKash/BKash-Logo.wine.svg" alt="bKash" className="h-8" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                      <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${selectedRefund.paymentMethod === 'Bank' ? 'border-rose-500 bg-rose-50/30' : 'border-gray-100'}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedRefund.paymentMethod === 'Bank' ? 'border-rose-500' : 'border-gray-300'}`}>
                          {selectedRefund.paymentMethod === 'Bank' && <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700">Bank</span>
                          <Building2 className="text-rose-500" size={24} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-[#003049]">Send Amount</label>
                      <input 
                        type="number" 
                        value={refundPayoutData.amount}
                        onChange={e => setRefundPayoutData({...refundPayoutData, amount: Number(e.target.value)})}
                        className="w-full border border-rose-500 rounded-lg px-4 py-2.5 outline-none text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-[#003049]">Method</label>
                      <input 
                        type="text" 
                        readOnly
                        value={selectedRefund.paymentMethod || 'Bkash'}
                        className="w-full border border-rose-500 rounded-lg px-4 py-2.5 outline-none text-sm font-medium bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-[#003049]">Gateway Charge</label>
                      <input 
                        type="number" 
                        placeholder="Gateway Charge"
                        value={refundPayoutData.gatewayCharge}
                        onChange={e => setRefundPayoutData({...refundPayoutData, gatewayCharge: Number(e.target.value)})}
                        className="w-full border border-rose-500 rounded-lg px-4 py-2.5 outline-none text-sm font-medium placeholder:text-gray-300"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-[#003049]">Transaction ID</label>
                      <input 
                        type="text" 
                        placeholder="Transaction ID"
                        value={refundPayoutData.transactionId}
                        onChange={e => setRefundPayoutData({...refundPayoutData, transactionId: e.target.value})}
                        className="w-full border border-rose-500 rounded-lg px-4 py-2.5 outline-none text-sm font-medium placeholder:text-gray-300"
                      />
                    </div>
                  </div>

                  {/* Note Section */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm font-bold text-[#003049]">Note (Optional)</label>
                      {!selectedRefund.orderId && (
                        <div className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                          Total Payout: {formatBDT(Number(refundPayoutData.amount) + Number(refundPayoutData.gatewayCharge || 0))}
                        </div>
                      )}
                    </div>
                    <textarea 
                      placeholder="Add a note..."
                      value={refundPayoutData.note}
                      onChange={e => setRefundPayoutData({...refundPayoutData, note: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none text-sm font-medium h-20 resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={processRefundPayout}
                      className="bg-rose-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-rose-700 transition-all text-sm"
                    >
                      Send
                    </button>
                    <button 
                      onClick={() => cancelRefundRequest(selectedRefund.id)}
                      className="bg-rose-400 text-white px-8 py-2 rounded-lg font-bold hover:bg-rose-500 transition-all text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
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
