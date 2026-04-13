import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDocs, query, collection, where, limit } from "firebase/firestore";
import { db } from "../firebase";
import { motion } from "motion/react";
import { ChevronRight, Home, Loader2, AlertCircle } from "lucide-react";

export default function StaticPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      console.log("Fetching page for slug:", slug);
      setLoading(true);
      try {
        const q = query(collection(db, "pages"), where("slug", "==", slug), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          console.log("Page found:", data);
          setPage(data);
        } else {
          console.log("No page found for slug:", slug);
          setPage(null);
        }
      } catch (error) {
        console.error("Error fetching page:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPage();
    }
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Loading Content...</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="text-red-500" size={64} />
        <h1 className="text-2xl font-bold text-gray-900">Page Not Found</h1>
        <p className="text-gray-500">The page you are looking for does not exist.</p>
        <Link to="/" className="bg-primary text-white px-6 py-2 rounded-xl font-bold">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">
        <Link to="/" className="hover:text-primary flex items-center gap-1">
          <Home size={14} /> Home
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-900">{page.title}</span>
      </nav>

      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 min-h-[400px]">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-8 border-b border-gray-100 pb-8">
          {page.title}
        </h1>
        
        <div 
          className="prose prose-orange max-w-none text-gray-600 leading-relaxed space-y-4 font-bangla whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </div>
  );
}
