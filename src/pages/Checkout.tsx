import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CreditCard, Truck, ShieldCheck, Upload, CheckCircle2, AlertCircle, ShoppingBag, ChevronLeft } from "lucide-react";
import { formatPrice, formatBDT, compressImage } from "../lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { collection, addDoc, serverTimestamp, doc, getDoc, runTransaction, increment } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { UserProfile, CartItem } from "../types";
import { useNavigate, Link } from "react-router-dom";

interface CheckoutProps {
  userProfile: UserProfile | null;
  cart: CartItem[];
  clearCart: () => void;
}

export default function Checkout({ userProfile, cart, clearCart }: CheckoutProps) {
  const navigate = useNavigate();
  const [paymentPercentage, setPaymentPercentage] = useState<80 | 100>(80);
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Bank' | 'Wallet'>('bKash');
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [address, setAddress] = useState({ 
    name: "", 
    phone: "", 
    email: "", 
    emergencyPhone: "",
    district: "",
    city: "",
    detail: "",
    deliveryMethod: "",
    note: ""
  });
  const [paymentSettings, setPaymentSettings] = useState({
    bkash: '01789-456123',
    nagad: '01789-456123',
    bank: 'Account Name: ...\nAccount Number: ...'
  });

  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'payment'));
        if (docSnap.exists()) {
          setPaymentSettings(docSnap.data() as any);
        }
      } catch (error) {
        console.error("Error fetching payment settings:", error);
        handleFirestoreError(error, OperationType.GET, 'settings/payment');
      }
    };
    fetchSettings();
  }, []);

  const subtotalBDT = cart.reduce((acc, item) => {
    const price = item.price_bdt || (item.price_rmb * 18.0);
    return acc + (price * item.quantity);
  }, 0);
  
  const shippingBDT = 0; // In the image, shipping is shown as part of "Pay on Delivery"
  const totalBDT = subtotalBDT + shippingBDT;
  const payNowAmount = totalBDT * (paymentPercentage / 100);
  const payOnDeliveryAmount = totalBDT - payNowAmount;

  const formatPriceBDT = (amount: number) => {
    return `${amount.toFixed(2)} ৳`;
  };

  const handleCheckout = () => {
    if (!userProfile) {
      toast.error("Please login to place an order");
      navigate("/login");
      return;
    }
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      navigate("/");
      return;
    }
    if (!address.name || !address.phone || !address.email || !address.detail || !address.district || !address.city || !address.deliveryMethod) {
      toast.error("Please fill in all required fields (*)");
      return;
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleSubmitPayment = async (e: any) => {
    e.preventDefault();
    if (!userProfile) return;
    
    if (paymentMethod !== 'Wallet') {
      if (!transactionId) {
        toast.error("Please enter Transaction ID");
        return;
      }
      if (!paymentProof) {
        toast.error("Please upload payment screenshot");
        return;
      }
    } else {
      if (userProfile.walletBalance < payNowAmount) {
        toast.error("Insufficient wallet balance");
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      let nextOrderNumber = 1001;

      await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'settings', 'counters');
        const counterDoc = await transaction.get(counterRef);
        
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { orderCount: 1001 });
          nextOrderNumber = 1001;
        } else {
          nextOrderNumber = (counterDoc.data().orderCount || 1000) + 1;
          transaction.update(counterRef, { orderCount: nextOrderNumber });
        }

        // Deduct from wallet if payment method is Wallet
        if (paymentMethod === 'Wallet') {
          const userRef = doc(db, 'users', userProfile.uid);
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) throw new Error("User not found");
          const currentBalance = userDoc.data().walletBalance || 0;
          if (currentBalance < payNowAmount) throw new Error("Insufficient wallet balance");
          
          transaction.update(userRef, {
            walletBalance: currentBalance - payNowAmount,
            updatedAt: serverTimestamp()
          });
        }

        const orderData = {
          userId: userProfile.uid,
          userEmail: userProfile.email,
          items: cart,
          totalAmount: totalBDT,
          paidAmount: payNowAmount,
          paymentPercentage,
          status: paymentMethod === 'Wallet' ? 'Processing' : 'Order Placed',
          paymentMethod,
          transactionId: paymentMethod === 'Wallet' ? `WALLET-${Date.now()}` : transactionId,
          paymentProof: paymentMethod === 'Wallet' ? 'WALLET_PAYMENT' : paymentProof,
          shippingAddress: address,
          orderNumber: nextOrderNumber,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const newOrderRef = doc(collection(db, "orders"));
        transaction.set(newOrderRef, orderData);
        setOrderNumber(nextOrderNumber);
      });
      
      clearCart();
      setIsSubmitting(false);
      setStep(3);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      toast.success(paymentMethod === 'Wallet' ? "Order placed successfully!" : "Payment submitted successfully!");
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error(error.message || "There was a problem submitting your order");
      setIsSubmitting(false);
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }
  };

  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center max-w-lg mx-auto">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600"
        >
          <CheckCircle2 size={64} />
        </motion.div>
        <h2 className="text-3xl font-bold">Order placed successfully!</h2>
        <p className="text-gray-500 leading-relaxed">
          Your payment information has reached us. You will receive a confirmation message once verification is complete from our admin panel.
        </p>
        <div className="bg-gray-50 p-6 rounded-3xl w-full space-y-2">
          <p className="text-sm text-gray-500">Order ID: <span className="font-bold text-gray-900">#{orderNumber || '...'}</span></p>
          <p className="text-sm text-gray-500">Status: <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg font-bold">Pending Verification</span></p>
        </div>
        <div className="flex gap-4 w-full">
          <button 
            onClick={() => navigate("/dashboard")}
            className="flex-1 bg-primary text-white h-14 rounded-2xl font-bold shadow-xl hover:bg-orange-600 transition-all"
          >
            Track Order
          </button>
          <button 
            onClick={() => navigate("/")}
            className="flex-1 border-2 border-gray-200 h-14 rounded-2xl font-bold hover:bg-gray-50 transition-all"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/cart" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-primary">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {step === 1 ? (
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-800 flex items-center gap-1">
                    <span className="text-red-500">*</span> Name
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter full name" 
                    className="w-full bg-white border border-gray-200 h-11 px-4 rounded-lg outline-none focus:ring-1 ring-primary" 
                    value={address.name}
                    onChange={e => setAddress({...address, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-800 flex items-center gap-1">
                    <span className="text-red-500">*</span> Phone
                  </label>
                  <input 
                    type="tel" 
                    placeholder="+8801838044098" 
                    className="w-full bg-white border border-gray-200 h-11 px-4 rounded-lg outline-none focus:ring-1 ring-primary" 
                    value={address.phone}
                    onChange={e => setAddress({...address, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-800 flex items-center gap-1">
                    <span className="text-red-500">*</span> Email
                  </label>
                  <input 
                    type="email" 
                    placeholder="example@mail.com" 
                    className="w-full bg-white border border-gray-200 h-11 px-4 rounded-lg outline-none focus:ring-1 ring-primary" 
                    value={address.email}
                    onChange={e => setAddress({...address, email: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-800">Emergency Number</label>
                  <input 
                    type="tel" 
                    placeholder="e.g. 017xxxxxxxx" 
                    className="w-full bg-white border border-gray-200 h-11 px-4 rounded-lg outline-none focus:ring-1 ring-primary" 
                    value={address.emergencyPhone}
                    onChange={e => setAddress({...address, emergencyPhone: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-800 flex items-center gap-1">
                    <span className="text-red-500">*</span> District
                  </label>
                  <select 
                    className="w-full bg-white border border-gray-200 h-11 px-4 rounded-lg outline-none focus:ring-1 ring-primary appearance-none"
                    value={address.district}
                    onChange={e => setAddress({...address, district: e.target.value})}
                  >
                    <option value="">Select district</option>
                    <option value="Dhaka">Dhaka</option>
                    <option value="Chittagong">Chittagong</option>
                    <option value="Rajshahi">Rajshahi</option>
                    <option value="Khulna">Khulna</option>
                    <option value="Barisal">Barisal</option>
                    <option value="Sylhet">Sylhet</option>
                    <option value="Rangpur">Rangpur</option>
                    <option value="Mymensingh">Mymensingh</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-800 flex items-center gap-1">
                    <span className="text-red-500">*</span> City
                  </label>
                  <input 
                    type="text" 
                    placeholder="Uttarakhan, Uttara" 
                    className="w-full bg-white border border-gray-200 h-11 px-4 rounded-lg outline-none focus:ring-1 ring-primary" 
                    value={address.city}
                    onChange={e => setAddress({...address, city: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-800 flex items-center gap-1">
                    <span className="text-red-500">*</span> Address
                  </label>
                  <input 
                    type="text" 
                    placeholder="RM Level Factory Chanpara" 
                    className="w-full bg-white border border-gray-200 h-11 px-4 rounded-lg outline-none focus:ring-1 ring-primary" 
                    value={address.detail}
                    onChange={e => setAddress({...address, detail: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-800 flex items-center gap-1">
                    <span className="text-red-500">*</span> Delivery Method
                  </label>
                  <select 
                    className="w-full bg-white border border-gray-200 h-11 px-4 rounded-lg outline-none focus:ring-1 ring-primary appearance-none"
                    value={address.deliveryMethod}
                    onChange={e => setAddress({...address, deliveryMethod: e.target.value})}
                  >
                    <option value="">Select delivery method</option>
                    <option value="Steadfast">Steadfast</option>
                    <option value="RedX">RedX</option>
                    <option value="Pathao">Pathao</option>
                    <option value="Sundarban">Sundarban</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-sm font-bold text-gray-800">Note</label>
                  <textarea 
                    placeholder="Enter your note" 
                    className="w-full bg-white border border-gray-200 p-4 rounded-lg outline-none focus:ring-1 ring-primary min-h-[100px]" 
                    value={address.note}
                    onChange={e => setAddress({...address, note: e.target.value})}
                  />
                </div>
              </div>
            </section>
          ) : (
            /* Payment Verification Step */
            <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Payment Verification</h2>
                <button onClick={() => setStep(1)} className="text-sm text-primary font-bold">Change</button>
              </div>

              <div className="bg-blue-50 p-6 rounded-2xl space-y-4">
                <p className="text-sm font-bold text-blue-900">Make payment through any of the following methods:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['bKash', 'Nagad', 'Bank', 'Wallet'].map((m) => (
                    <button 
                      key={m}
                      onClick={() => setPaymentMethod(m as any)}
                      className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                        paymentMethod === m ? 'border-secondary bg-white text-secondary' : 'border-blue-100 text-blue-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {paymentMethod === 'Wallet' ? (
                  <div className="bg-white p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Your Wallet Balance:</p>
                      <p className="text-lg font-bold text-secondary">{formatBDT(userProfile?.walletBalance || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Amount to Pay:</p>
                      <p className="text-lg font-bold text-primary">{formatBDT(payNowAmount)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-xl border border-blue-100">
                    <p className="text-xs text-gray-500 mb-1">
                      {paymentMethod === 'Bank' ? 'Bank Details:' : `${paymentMethod} Number (Personal):`}
                    </p>
                    <p className="text-lg font-bold text-secondary whitespace-pre-line">
                      {(paymentMethod === 'bKash' ? paymentSettings.bkash : 
                        paymentMethod === 'Nagad' ? paymentSettings.nagad : 
                        paymentSettings.bank) || 'Not set by admin'}
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-6">
                {paymentMethod !== 'Wallet' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">Transaction ID</label>
                      <input 
                        required 
                        type="text" 
                        placeholder="e.g. 8N7X6W5V" 
                        className="w-full bg-gray-50 h-12 px-4 rounded-xl outline-none focus:ring-2 ring-primary" 
                        value={transactionId}
                        onChange={e => setTransactionId(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">Upload Payment Screenshot</label>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden" 
                          id="payment-upload"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error("File size must be less than 5MB");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const base64 = reader.result as string;
                                const compressed = await compressImage(base64);
                                setPaymentProof(compressed);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <label 
                          htmlFor="payment-upload"
                          className={`border-2 border-dashed rounded-2xl p-8 text-center space-y-2 transition-colors cursor-pointer block ${
                            paymentProof ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-primary'
                          }`}
                        >
                          {paymentProof ? (
                            <div className="space-y-2">
                              <CheckCircle2 className="mx-auto text-green-500" size={32} />
                              <p className="text-sm text-green-700 font-bold">Screenshot Uploaded</p>
                              <img src={paymentProof} alt="Preview" className="w-20 h-20 object-cover mx-auto rounded-lg border border-green-200" />
                              <p className="text-[10px] text-green-600">Click to change</p>
                            </div>
                          ) : (
                            <>
                              <Upload className="mx-auto text-gray-400" size={32} />
                              <p className="text-sm text-gray-500">Click to upload screenshot</p>
                              <p className="text-[10px] text-gray-400">JPG, PNG (Max 2MB)</p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <button 
                  disabled={isSubmitting || (paymentMethod === 'Wallet' && (userProfile?.walletBalance || 0) < payNowAmount)}
                  className="w-full bg-primary text-white h-14 rounded-2xl font-bold shadow-xl shadow-orange-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : (paymentMethod === 'Wallet' && (userProfile?.walletBalance || 0) < payNowAmount ? "Insufficient Balance" : "Submit Payment")}
                </button>
              </form>
            </section>
          )}

          {/* Items List at Bottom */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 space-y-4">
              {cart.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start py-4 first:pt-0 last:pb-0 border-b last:border-0 border-gray-50">
                  <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] text-gray-400 font-mono">Order ID: #COBD-004986</p>
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2">{item.title}</h3>
                    <div className="flex justify-between items-end pt-2">
                      <div className="space-y-1">
                        {item.selectedVariants && Object.entries(item.selectedVariants).map(([key, val]) => (
                          <p key={key} className="text-[11px] text-gray-500">{key}: {val}</p>
                        ))}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-900">{item.quantity} X {formatPriceBDT(item.price_bdt || (item.price_rmb * 18))}</p>
                        <p className="text-sm font-bold text-gray-900">{formatPriceBDT((item.price_bdt || (item.price_rmb * 18)) * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-end items-center gap-4 pt-2">
                <span className="text-xs font-bold border rounded px-2 py-0.5">{cart.length} Items</span>
                <span className="text-lg font-bold">{formatPriceBDT(subtotalBDT)}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Order Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 sticky top-28">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Product Price</span>
                <span className="font-bold">{formatPriceBDT(subtotalBDT)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-900 font-bold">Grand Price</span>
                <span className="font-bold">{formatPriceBDT(totalBDT)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-600">Pay now <span className="bg-emerald-50 text-emerald-600 text-[10px] px-1.5 py-0.5 rounded border border-emerald-100 ml-1">{paymentPercentage}%</span></span>
                <span className="font-bold">{formatPriceBDT(payNowAmount)}</span>
              </div>
            </div>

            <div className="bg-white border border-dashed border-gray-300 rounded-lg p-4 text-center space-y-1">
              <p className="text-xs font-bold text-gray-800">Pay on Delivery</p>
              <div className="flex items-center justify-center gap-1 text-sm font-bold">
                <span>{formatPriceBDT(payOnDeliveryAmount)}</span>
                <AlertCircle size={14} className="text-gray-400" />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-bold text-gray-600 text-center">নিচের রেঞ্জ থেকে আপনার অগ্রিম পেমেন্ট পার্সেন্ট সিলেক্ট করুন</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPaymentPercentage(80)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    paymentPercentage === 80 ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  Pay Now 80%
                </button>
                <button 
                  onClick={() => setPaymentPercentage(100)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    paymentPercentage === 100 ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  Pay Now 100%
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Coupon Code" 
                className="flex-1 bg-white border border-gray-200 h-11 px-4 rounded-lg outline-none text-sm"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
              />
              <button className="bg-[#0f172a] text-white px-6 rounded-lg font-bold text-sm hover:bg-black transition-all">
                Apply
              </button>
            </div>

            {step === 1 && (
              <button 
                onClick={handleCheckout}
                className="w-full bg-[#d81b60] text-white h-12 rounded-lg font-bold shadow-lg hover:bg-[#ad1457] transition-all"
              >
                Place Order & Pay
              </button>
            )}

            <div className="flex items-center gap-2 text-[10px] text-gray-400 justify-center">
              <ShieldCheck size={14} />
              Your payment is 100% secure
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
