import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CreditCard, Truck, ShieldCheck, Upload, CheckCircle2, AlertCircle, ShoppingBag } from "lucide-react";
import { formatPrice } from "../lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile, CartItem } from "../types";
import { useNavigate } from "react-router-dom";

interface CheckoutProps {
  userProfile: UserProfile | null;
}

export default function Checkout({ userProfile }: CheckoutProps) {
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState<'Full' | 'Partial'>('Full');
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Bank'>('bKash');
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [address, setAddress] = useState({ name: "", phone: "", detail: "" });

  // Mock cart items (in a real app, these would come from a cart context)
  const cartItems: CartItem[] = [
    { id: "1", title: "Premium Wireless Earbuds", price_rmb: 85, quantity: 1, image: "https://picsum.photos/seed/p1/100/100", source_url: "https://1688.com/1" }
  ];

  const subtotalRMB = cartItems.reduce((acc, item) => acc + (item.price_rmb * item.quantity), 0);
  const exchangeRate = 15.5;
  const shippingBDT = 500;
  const totalBDT = (subtotalRMB * exchangeRate) + shippingBDT;
  const partialAmount = totalBDT * 0.7;

  const handleCheckout = () => {
    if (!userProfile) {
      toast.error("Please login to place an order");
      navigate("/login");
      return;
    }
    if (!address.name || !address.phone || !address.detail) {
      toast.error("Please fill in the shipping address");
      return;
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleSubmitPayment = async (e: any) => {
    e.preventDefault();
    if (!userProfile) return;
    
    setIsSubmitting(true);
    
    try {
      const orderData = {
        userId: userProfile.uid,
        items: cartItems,
        totalAmount: totalBDT,
        paidAmount: paymentType === 'Full' ? totalBDT : partialAmount,
        paymentType,
        status: 'Order Placed',
        transactionId,
        paymentProof: "https://picsum.photos/seed/proof/400/600", // Placeholder for actual upload
        shippingAddress: address,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "orders"), orderData);
      
      setIsSubmitting(false);
      setStep(3);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      toast.success("Payment submitted successfully!");
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("There was a problem submitting your order");
      setIsSubmitting(false);
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
          <p className="text-sm text-gray-500">Order ID: <span className="font-bold text-gray-900">#SP-98234</span></p>
          <p className="text-sm text-gray-500">Status: <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg font-bold">Pending Verification</span></p>
        </div>
        <div className="flex gap-4 w-full">
          <button className="flex-1 bg-primary text-white h-14 rounded-2xl font-bold shadow-xl">Track Order</button>
          <button className="flex-1 border-2 border-gray-200 h-14 rounded-2xl font-bold">Return to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {step === 1 ? (
            <>
              {/* Shipping Address */}
              <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Truck className="text-primary" />
                  Shipping Address
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Your Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter full name" 
                      className="w-full bg-gray-50 h-12 px-4 rounded-xl outline-none focus:ring-2 ring-primary" 
                      value={address.name}
                      onChange={e => setAddress({...address, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="017XXXXXXXX" 
                      className="w-full bg-gray-50 h-12 px-4 rounded-xl outline-none focus:ring-2 ring-primary" 
                      value={address.phone}
                      onChange={e => setAddress({...address, phone: e.target.value})}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-gray-600">Detailed Address</label>
                    <textarea 
                      placeholder="House No, Road No, Area, District" 
                      className="w-full bg-gray-50 p-4 rounded-xl outline-none focus:ring-2 ring-primary min-h-[100px]" 
                      value={address.detail}
                      onChange={e => setAddress({...address, detail: e.target.value})}
                    />
                  </div>
                </div>
              </section>

              {/* Payment Type Selection */}
              <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <CreditCard className="text-primary" />
                  Payment Option
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setPaymentType('Full')}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      paymentType === 'Full' ? 'border-primary bg-orange-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold">100% Full Payment</span>
                      {paymentType === 'Full' && <CheckCircle2 className="text-primary" size={20} />}
                    </div>
                    <p className="text-xs text-gray-500">Pay the full amount at the time of order.</p>
                  </button>
                  
                  <button 
                    onClick={() => setPaymentType('Partial')}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      paymentType === 'Partial' ? 'border-primary bg-orange-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold">70% Partial Payment</span>
                      {paymentType === 'Partial' && <CheckCircle2 className="text-primary" size={20} />}
                    </div>
                    <p className="text-xs text-gray-500">Pay the remaining 30% after the product reaches Bangladesh.</p>
                  </button>
                </div>
              </section>
            </>
          ) : (
            /* Payment Verification Step */
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Payment Verification</h2>
                <button onClick={() => setStep(1)} className="text-sm text-primary font-bold">Change</button>
              </div>

              <div className="bg-blue-50 p-6 rounded-2xl space-y-4">
                <p className="text-sm font-bold text-blue-900">Make payment through any of the following methods:</p>
                <div className="grid grid-cols-3 gap-4">
                  {['bKash', 'Nagad', 'Bank'].map((m) => (
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
                <div className="bg-white p-4 rounded-xl border border-blue-100">
                  <p className="text-xs text-gray-500 mb-1">{paymentMethod} Number (Personal):</p>
                  <p className="text-lg font-bold text-secondary">01789-456123</p>
                </div>
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-6">
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
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center space-y-2 hover:border-primary transition-colors cursor-pointer">
                    <Upload className="mx-auto text-gray-400" size={32} />
                    <p className="text-sm text-gray-500">Click or drag file here</p>
                    <p className="text-[10px] text-gray-400">JPG, PNG (Max 2MB)</p>
                  </div>
                </div>

                <button 
                  disabled={isSubmitting}
                  className="w-full bg-primary text-white h-14 rounded-2xl font-bold shadow-xl shadow-orange-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Submit Payment"}
                </button>
              </form>
            </section>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6 sticky top-28">
            <h2 className="text-xl font-bold border-b pb-4">Order Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-gray-500 text-sm">
                <span>Product Price</span>
                <span>{formatPrice(subtotalRMB * exchangeRate, 1)}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-sm">
                <span>Shipping Charge</span>
                <span>{formatPrice(shippingBDT, 1)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-4 border-t">
                <span>Total</span>
                <span className="text-primary">{formatPrice(totalBDT, 1)}</span>
              </div>
            </div>

            {paymentType === 'Partial' && (
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-orange-800 font-bold">Pay Now (70%)</span>
                  <span className="text-orange-800 font-bold">{formatPrice(partialAmount, 1)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-orange-600">
                  <span>Remaining (30%)</span>
                  <span>{formatPrice(totalBDT - partialAmount, 1)}</span>
                </div>
              </div>
            )}

            {step === 1 && (
              <button 
                onClick={handleCheckout}
                className="w-full bg-secondary text-white h-14 rounded-2xl font-bold shadow-xl shadow-blue-200"
              >
                Go to Next Step
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
