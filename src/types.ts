export interface Product {
  id: string;
  title: string;
  price_rmb: number;
  image: string;
  source_url: string;
  category?: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariant?: string;
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

export type OrderStatus = 'Order Placed' | 'Confirmed' | 'Purchased' | 'BD Warehouse' | 'Delivered' | 'Cancelled';

export interface Order {
  id: string;
  userId: string;
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
}

export interface RefundRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'Pending' | 'Completed' | 'Cancelled';
  gatewayCharge?: number;
  payoutTransactionId?: string;
  createdAt: any;
}
