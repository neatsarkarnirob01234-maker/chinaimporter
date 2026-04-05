import React from 'react';
import { motion } from 'motion/react';
import { 
  Package, 
  CheckCircle2, 
  ShoppingBag, 
  Ship, 
  Truck, 
  CheckCircle,
  Building2
} from 'lucide-react';
import { OrderStatus } from '../types';

interface OrderTrackingProps {
  status: OrderStatus;
}

const steps: { status: OrderStatus; label: string; icon: any }[] = [
  { status: 'Order Placed', label: 'Order Placed', icon: Package },
  { status: 'Confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { status: 'Purchased', label: 'Purchased', icon: ShoppingBag },
  { status: 'Shipped', label: 'Shipped', icon: Ship },
  { status: 'BD Warehouse', label: 'BD Warehouse', icon: Building2 },
  { status: 'Delivered', label: 'Delivered', icon: Truck },
];

export default function OrderTracking({ status }: OrderTrackingProps) {
  const currentStepIndex = steps.findIndex(step => step.status === status);
  const isCancelled = status === 'Cancelled';

  if (isCancelled) {
    return (
      <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-3 text-red-700">
        <CheckCircle className="text-red-500" />
        <span className="font-bold">This order has been cancelled.</span>
      </div>
    );
  }

  return (
    <div className="relative py-8">
      {/* Progress Line */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
          className="h-full bg-primary"
        />
      </div>

      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isActive = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          
          return (
            <div key={step.status} className="flex flex-col items-center">
              <motion.div 
                initial={false}
                animate={{ 
                  scale: isCurrent ? 1.2 : 1,
                  backgroundColor: isActive ? '#FF6321' : '#F3F4F6',
                  color: isActive ? '#FFFFFF' : '#9CA3AF'
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm z-10`}
              >
                <step.icon size={20} />
              </motion.div>
              <div className="mt-3 text-center">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {isCurrent && (
                  <motion.div 
                    layoutId="active-dot"
                    className="w-1 h-1 bg-primary rounded-full mx-auto mt-1"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
