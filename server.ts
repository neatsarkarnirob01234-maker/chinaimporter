import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "China-BD Sourcing API is running" });
  });

  // Mock 1688 API Proxy
  app.get("/api/products/search", (req, res) => {
    const { q } = req.query;
    // In a real app, this would call OTCommerce or RapidAPI
    res.json({
      items: [
        {
          id: "1688_1",
          title: `Premium Quality ${q || "Product"} from China`,
          price_rmb: 50,
          image: "https://picsum.photos/seed/product1/400/400",
          source_url: "https://1688.com/example-1",
        },
        {
          id: "1688_2",
          title: `Wholesale ${q || "Gadget"} - Best Price`,
          price_rmb: 120,
          image: "https://picsum.photos/seed/product2/400/400",
          source_url: "https://1688.com/example-2",
        },
      ],
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
