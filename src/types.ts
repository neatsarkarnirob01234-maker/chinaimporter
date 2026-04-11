export interface Product {
  id: string;
  title: string;
  price_rmb: number;
  price_bdt?: number;
  image: string;
  images?: string[];
  source_url: string;
  category?: string;
  description?: string;
  video?: string;
  specs?: { label: string; value: string }[];
  reviews?: string;
  attributes?: { label: string; value: string }[];
  packing?: string;
  details?: string;
  htmlSource?: string;
  variants?: {
    name: string;
    options: string[];
  }[];
  createdAt?: any;
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariants?: Record<string, string>;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  walletBalance: number;
  holdBalance: number;
  role: 'user' | 'admin';
}

export type OrderStatus = 'Order Placed' | 'Confirmed' | 'Purchased' | 'Shipped' | 'BD Warehouse' | 'Delivered' | 'Cancelled' | 'Stock Out' | 'Refunded';

export interface Order {
  id: string;
  userId: string;
  userEmail?: string;
  items: CartItem[];
  totalAmount: number;
  paidAmount: number;
  paymentType: 'Full' | 'Partial';
  status: OrderStatus;
  paymentProof?: string;
  transactionId?: string;
  createdAt: any;
  updatedAt: any;
  invoiceUrl?: string;
  purchaseOrderId?: string;
  csResponse?: string;
  purchaseNote?: string;
  shippingAddress?: {
    name: string;
    phone: string;
    email: string;
    emergencyPhone?: string;
    district?: string;
    city?: string;
    detail: string;
    deliveryMethod?: string;
    note?: string;
  };
}

export interface RefundRequest {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  orderId?: string;
  amount: number;
  status: 'Pending' | 'Completed' | 'Cancelled';
  gatewayCharge?: number;
  payoutTransactionId?: string;
  paymentMethod?: string;
  paymentNumber?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  reason?: string;
  note?: string;
  createdAt: any;
  updatedAt?: any;
}
