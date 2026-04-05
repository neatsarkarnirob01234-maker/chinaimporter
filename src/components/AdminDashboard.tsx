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
  Edit,
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
  Settings,
  HardDrive,
  Download,
  Phone
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
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
  writeBatch
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
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [refundPayoutData, setRefundPayoutData] = useState({ gatewayCharge: 0, transactionId: '' });
  const [userEditData, setUserEditData] = useState({ walletBalance: 0, holdBalance: 0, role: 'user' });
  const [paymentSettings, setPaymentSettings] = useState({
    bkash: '01789-456123',
    nagad: '01789-456123',
    bank: 'Account Name: ...\nAccount Number: ...\nBank Name: ...\nBranch: ...'
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'payment'), (doc) => {
      if (doc.exists()) {
        setPaymentSettings(doc.data() as any);
      }
    }, (error) => {
      console.error("Error fetching payment settings:", error);
      handleFirestoreError(error, OperationType.GET, 'settings/payment');
    });
    return () => unsub();
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
    specs: []
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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the product page at this URL: ${sourcingForm.source_url}.
        
        Your task is to extract all relevant product information for an e-commerce site.
        
        Return a JSON object with the following fields:
        - title: The full product name.
        - price_rmb: The unit price in RMB (as a number).
        - image: The main high-resolution product image URL.
        - images: An array of ALL gallery image URLs found on the page.
        - description: A comprehensive product description. Look for it in the 'Product Details', 'Overview', or 'Description' tabs. If it's in Chinese, translate it to English. BE VERY AGGRESSIVE: look for any text that describes the product features, materials, or usage. If you find multiple sections, combine them into one detailed description.
        - video: A URL to the product video if available.
        - category: A suitable category for this product.
        - specs: An array of objects with {label, value} for product specifications. Look for these in the 'Specifications' or 'Details' table.
        - variants: An array of objects with {name, options[]} for product options (e.g., Color, Size). Look for these in the selection area.
        
        CRITICAL INSTRUCTIONS FOR ALIBABA/1688:
        1. Look for 'window.detailData', 'window.detailConfig', or 'iDetailData' in the script tags of the HTML source. These often contain the real image URLs and descriptions.
        2. Look for images in the main product slider, description body, and detail sections.
        3. CLEAN ALL IMAGE URLs: Remove any thumbnail or resizing suffixes like '_50x50.jpg', '_Q90.jpg', '_300x300.jpg', '_640x640.jpg', etc. We need the ORIGINAL high-res images.
        4. Ensure all URLs start with 'https:'.
        5. If you find images in the description that are relevant, add them to the images array.
        
        If you cannot find a specific field, return an empty string or empty array for that field. DO NOT use placeholder or mock data.`,
        config: {
          tools: [{ urlContext: {} }],
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

      let text = response.text;
      if (text.includes('```json')) {
        text = text.split('```json')[1].split('```')[0];
      } else if (text.includes('```')) {
        text = text.split('```')[1].split('```')[0];
      }
      
      const data = JSON.parse(text.trim());
      
      // Advanced Image Cleaning Function
      const cleanImageUrl = (url: string) => {
        if (!url) return '';
        let cleaned = url.trim();
        
        // Handle protocol-relative URLs
        if (cleaned.startsWith('//')) cleaned = 'https:' + cleaned;
        
        // Remove common Alibaba/1688 thumbnail suffixes while keeping the extension
        // Matches things like _400x400.jpg, _Q90.jpg, _sum.jpg, etc.
        // Also handles .webp and other formats
        cleaned = cleaned.replace(/(_\d+x\d+|_Q\d+|_sum|_640x640|_300x300|_50x50|_100x100|_200x200)(\.jpg|\.png|\.webp|\.jpeg).*$/, '$2');
        
        // Also handle cases where the suffix is after the extension like .jpg_400x400.jpg
        cleaned = cleaned.replace(/(\.jpg|\.png|\.webp|\.jpeg)_\d+x\d+.*$/, '$1');
        cleaned = cleaned.replace(/(\.jpg|\.png|\.webp|\.jpeg)_Q\d+.*$/, '$1');
        
        // Remove any query parameters that might interfere with loading
        if (cleaned.includes('?')) {
          cleaned = cleaned.split('?')[0];
        }
        
        return cleaned;
      };

      if (data.image) data.image = cleanImageUrl(data.image);
      if (data.images) data.images = data.images.map((img: string) => cleanImageUrl(img)).filter((img: string) => img);

      if (!data.image && data.images && data.images.length > 0) {
        data.image = data.images[0];
      }

      setSourcingForm(prev => ({
        ...prev,
        ...data,
        source_url: prev.source_url
      }));
      setShowReview(true);
      toast.success('Product details fetched successfully');
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
      specs: product.specs || []
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
        specs: []
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
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const seedCategories = async () => {
    if (!window.confirm('This will add all common categories to your store. Continue?')) return;
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
    
    const confirmDelete = window.confirm('Are you sure you want to delete this?');
    if (!confirmDelete) {
      console.log('Delete cancelled by user');
      return;
    }

    try {
      console.log('Sending delete request to Firestore...');
      await deleteDoc(doc(db, coll, id));
      console.log('Delete request successful');
      toast.success('Deleted successfully');
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
    { id: 'google-drive', label: 'Google Drive', icon: HardDrive },
    { id: 'payment-settings', label: 'Payment Settings', icon: CreditCard },
    { id: 'footer-settings', label: 'Footer Settings', icon: FileText },
    { id: 'page-content', label: 'Page Content', icon: FileText },
  ];

  useEffect(() => {
    checkDriveStatus();
  }, []);

  const safeFetch = async (url: string, options?: RequestInit) => {
    return await window.fetch(url, options);
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
                    {categories.map(cat => (
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
                        {categories.sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
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
                          {showReview ? 'Re-Fetch' : 'Review'}
                        </button>
                      </div>
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
                          <div className="space-y-3">
                            <p className="text-xs font-bold text-blue-800 uppercase">Primary Image</p>
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
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    // Trigger a re-render by slightly modifying the URL if possible or just toast
                                    toast.info("Refreshing image...");
                                    const current = sourcingForm.image;
                                    setSourcingForm(prev => ({...prev, image: ''}));
                                    setTimeout(() => setSourcingForm(prev => ({...prev, image: current})), 100);
                                  }}
                                  className="bg-white p-2 rounded-full shadow-lg text-blue-600"
                                >
                                  <RefreshCcw size={20} />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <p className="text-xs font-bold text-blue-800 uppercase">Gallery ({sourcingForm.images?.length || 0})</p>
                            <div className="grid grid-cols-3 gap-2">
                              {sourcingForm.images?.slice(0, 6).map((img, i) => (
                                <div key={i} className="aspect-square rounded-lg overflow-hidden border border-blue-200 bg-white">
                                  <img 
                                    src={fixDriveUrl(img) || "https://placehold.co/100x100/f3f4f6/94a3b8?text=No+Img"} 
                                    alt="" 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://placehold.co/100x100/f3f4f6/94a3b8?text=Error";
                                    }}
                                  />
                                </div>
                              ))}
                              {sourcingForm.images && sourcingForm.images.length > 6 && (
                                <div className="aspect-square rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                  +{sourcingForm.images.length - 6}
                                </div>
                              )}
                            </div>
                            <div className="pt-2">
                              <p className="text-xs font-bold text-blue-800 uppercase mb-1">Variants Found</p>
                              <div className="flex flex-wrap gap-1">
                                {sourcingForm.variants?.map((v, i) => (
                                  <span key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                    {v.name} ({v.options.length})
                                  </span>
                                ))}
                                {(!sourcingForm.variants || sourcingForm.variants.length === 0) && (
                                  <span className="text-[10px] text-blue-400 italic">No variants detected</span>
                                )}
                              </div>
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
                            specs: []
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
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                <Search className="text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Search by Order ID, Email, or Transaction ID..."
                  className="flex-1 bg-transparent outline-none text-sm font-medium"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-4">
                    <FileText className="mx-auto text-gray-300" size={48} />
                    <p className="text-gray-500 font-bold">No orders found in this category</p>
                  </div>
                ) : (
                  filteredOrders.map(order => {
                    const remainingAmount = order.totalAmount - order.paidAmount;
                    const paidPercentage = Math.round((order.paidAmount / order.totalAmount) * 100);
                    
                    return (
                    <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex flex-col lg:flex-row gap-6">
                          {/* Product Image */}
                          <div className="w-full lg:w-48 h-48 rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 shrink-0">
                            <img 
                              src={fixDriveUrl(order.items[0]?.image)} 
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
                                  <span className="text-sm font-bold text-primary">ID: #{order.orderNumber || order.id.slice(0, 8)}</span>
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
                                    src={fixDriveUrl(order.paymentProof)} 
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
                  })
                )}
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-6xl w-full shadow-2xl my-8 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-4 border-b">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                  <span className="text-sm font-bold text-orange-600">ID: #{selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)}</span>
                  <span className="text-[10px] text-gray-400 font-mono">Internal ID: {selectedOrder.id}</span>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-all"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Top Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Client Details */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b">
                      <h3 className="text-sm font-bold text-blue-900">Client Details</h3>
                    </div>
                    <div className="p-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Name :</span>
                        <span className="text-right">{selectedOrder.shippingAddress?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Phone :</span>
                        <span className="text-right">{selectedOrder.shippingAddress?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Emergency Phone :</span>
                        <span className="text-right">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Email :</span>
                        <span className="text-right truncate max-w-[150px]">{selectedOrder.shippingAddress?.email || selectedOrder.userEmail}</span>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b">
                      <h3 className="text-sm font-bold text-blue-900">Shipping Address</h3>
                    </div>
                    <div className="p-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Address :</span>
                        <span className="text-right">{selectedOrder.shippingAddress?.detail || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">District :</span>
                        <span className="text-right">Dhaka</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">City/Upazila :</span>
                        <span className="text-right">Dhaka</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Delivery Method :</span>
                        <span className="text-right">Steadfast</span>
                      </div>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b">
                      <h3 className="text-sm font-bold text-blue-900">Grand Total</h3>
                    </div>
                    <div className="p-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Total Product Price :</span>
                        <span className="text-right">{formatBDT(selectedOrder.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Payment Status :</span>
                        <span className="text-right">{selectedOrder.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Coupon :</span>
                        <span className="text-right">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Partial Paid :</span>
                        <span className="text-right">{formatBDT(selectedOrder.paidAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Bars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden rounded-lg">
                  <div className="bg-emerald-600 p-3 flex justify-between items-center">
                    <span className="text-white text-xs font-bold uppercase tracking-wider">CS RESPONSE : Order Confirm</span>
                    <button className="bg-emerald-700 text-white p-1.5 rounded-lg hover:bg-emerald-800 transition-all">
                      <RefreshCcw size={14} />
                    </button>
                  </div>
                  <div className="bg-rose-600 p-3 flex justify-between items-center">
                    <div className="text-white">
                      <p className="text-[10px] font-bold uppercase opacity-80">Key Accounts Manager</p>
                      <p className="text-xs font-bold">Shahriar Kazim</p>
                      <p className="text-[10px]">01896300505</p>
                    </div>
                    <div className="bg-rose-900/30 p-2 rounded-full">
                      <Phone size={16} className="text-white" />
                    </div>
                  </div>
                </div>

                {/* Product Details Header */}
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-gray-900">Product Details</h3>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-gray-700 uppercase tracking-wider">Order ID : {selectedOrder.id}</p>
                    <p className="font-bold text-gray-700 uppercase tracking-wider">Tracking ID : N/A</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-rose-800 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white border-b border-rose-800">
                        <th className="p-2 border-r border-rose-800 w-24 text-center text-rose-900 font-bold">Image</th>
                        <th className="p-2 border-r border-rose-800 text-center text-rose-900 font-bold">Variation</th>
                        <th className="p-2 border-r border-rose-800 w-16 text-center text-rose-900 font-bold">Qty</th>
                        <th className="p-2 border-r border-rose-800 w-32 text-center text-rose-900 font-bold">Price</th>
                        <th className="p-2 w-32 text-center text-rose-900 font-bold">Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-rose-800 last:border-0">
                          <td className="p-2 border-r border-rose-800">
                            <div className="w-16 h-16 mx-auto bg-gray-50 rounded border overflow-hidden">
                              <img 
                                src={fixDriveUrl(item.image)} 
                                alt="" 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                              />
                            </div>
                          </td>
                          <td className="p-3 border-r border-rose-800">
                            <p className="font-bold text-gray-900 mb-1">{item.title}</p>
                            {item.selectedVariants && Object.entries(item.selectedVariants).map(([key, value]) => (
                              <p key={key} className="text-gray-600"><span className="font-bold">{key}:</span> {value}</p>
                            ))}
                          </td>
                          <td className="p-2 border-r border-rose-800 text-center font-bold text-lg">
                            {item.quantity}
                          </td>
                          <td className="p-2 border-r border-rose-800 text-center">
                            <p className="text-rose-600 font-bold">{formatBDT(item.price_bdt || (item.price_rmb * 18))}</p>
                            <p className="text-gray-400 line-through text-[10px]">¥{item.price_rmb}</p>
                          </td>
                          <td className="p-2 text-center font-bold text-gray-900">
                            {formatBDT((item.price_bdt || (item.price_rmb * 18)) * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Payment Proof Section */}
                {selectedOrder.paymentProof && (
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <h3 className="text-sm font-bold text-orange-900 mb-3 uppercase tracking-wider">Payment Proof</h3>
                    <div className="flex gap-4 items-center">
                      <div className="w-24 h-24 bg-white rounded-lg border-2 border-white shadow-sm overflow-hidden shrink-0">
                        <img 
                          src={fixDriveUrl(selectedOrder.paymentProof)} 
                          alt="Proof" 
                          className="w-full h-full object-cover cursor-pointer" 
                          referrerPolicy="no-referrer"
                          onClick={() => window.open(selectedOrder.paymentProof, '_blank')}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-orange-400 uppercase">Transaction ID</p>
                        <p className="text-lg font-black text-orange-900 tracking-tight">{selectedOrder.transactionId || 'N/A'}</p>
                        <button 
                          onClick={() => window.open(selectedOrder.paymentProof, '_blank')}
                          className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:text-orange-700 bg-white px-3 py-1.5 rounded-lg border border-orange-200"
                        >
                          <ExternalLink size={14} /> Open Full Image
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Final Totals Summary */}
                <div className="flex justify-end">
                  <div className="w-full md:w-64 space-y-2 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-bold uppercase">Total Amount</span>
                      <span className="font-black text-gray-900">{formatBDT(selectedOrder.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-bold uppercase">Paid Amount</span>
                      <span className="font-black text-emerald-600">{formatBDT(selectedOrder.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black pt-2 border-t border-gray-900">
                      <span className="uppercase tracking-tight">Remaining Due</span>
                      <span className="text-rose-600">{formatBDT(selectedOrder.totalAmount - selectedOrder.paidAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-4">
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-900 transition-all uppercase tracking-widest"
                  >
                    Close Details
                  </button>
                </div>
              </div>
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
