import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface Category {
  id: string;
  name: string;
  sub?: string[];
  createdAt?: any;
}

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, "categories"), orderBy("createdAt", "asc"));
      const snapshot = await getDocs(q);
      const fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      
      if (fetchedCategories.length > 0) {
        setCategories(fetchedCategories);
      } else {
        // Fallback to default categories if none in DB
        const defaultCategories = [
          { id: '1', name: "Electronics", sub: ["Mobile", "Laptop", "Accessories"] },
          { id: '2', name: "Fashion", sub: ["Men", "Women", "Kids"] },
          { id: '3', name: "Watch & Jewelry", sub: ["Smart Watch", "Analog", "Jewelry"] },
          { id: '4', name: "Home & Living", sub: ["Kitchen", "Decor", "Furniture"] },
          { id: '5', name: "Gadgets", sub: ["Power Bank", "Headphone", "Speaker"] },
          { id: '6', name: "Gift Items", sub: ["Birthday", "Wedding", "Others"] },
        ];
        setCategories(defaultCategories);
      }
    } catch (error) {
      console.error("Error fetching categories in context:", error);
      // Don't throw here to avoid breaking the app, but log it
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <CategoryContext.Provider value={{ categories, loading, refreshCategories: fetchCategories }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
}
