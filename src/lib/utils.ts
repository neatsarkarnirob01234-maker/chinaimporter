import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(rmb: number, multiplier: number = 18.0, shipping: number = 0) {
  const bdt = Math.round((rmb * multiplier) + shipping);
  return formatBDT(bdt);
}

export function formatBDT(amount: number) {
  const bdt = Math.round(amount);
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const formattedNumber = bdt.toString().split('').map(digit => {
    const d = parseInt(digit);
    return isNaN(d) ? digit : bengaliDigits[d];
  }).join('');
  return `${formattedNumber}৳`;
}

export function compressImage(base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
}
