import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(rmb: number, multiplier: number = 18.0, shipping: number = 0) {
  const bdt = Math.round((rmb * multiplier) + shipping);
  
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const formattedNumber = bdt.toString().split('').map(digit => {
    const d = parseInt(digit);
    return isNaN(d) ? digit : bengaliDigits[d];
  }).join('');

  // Add comma for thousands if needed (optional but good for readability)
  // For simplicity, let's just use the digits for now as requested in the example "৯৬৫৳"
  
  return `${formattedNumber}৳`;
}
