import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Readable } from 'stream';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
];

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // CORS headers for credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  const getOAuthClient = (req: express.Request) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error("CRITICAL: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set in environment variables.");
    }
    
    // Use APP_URL from env if available, otherwise construct from request
    const baseUrl = process.env.APP_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}`;
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/auth/google/callback`;
    
    console.log("Using Redirect URI:", redirectUri);
    
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "China-BD Sourcing API is running" });
  });

  // Google Auth Routes
  app.get("/api/auth/google/url", (req, res) => {
    const oauth2Client = getOAuthClient(req);
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
    res.json({ url });
  });

  app.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const oauth2Client = getOAuthClient(req);

    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      
      // Store tokens in a secure, cross-origin cookie
      res.cookie('google_drive_tokens', JSON.stringify(tokens), {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/admin';
              }
            </script>
            <p>Authentication successful. You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error getting tokens:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/auth/google/status", (req, res) => {
    const tokens = req.cookies.google_drive_tokens;
    res.json({ connected: !!tokens });
  });

  app.post("/api/drive/upload", async (req, res) => {
    const tokens = req.cookies.google_drive_tokens;
    if (!tokens) {
      return res.status(401).json({ error: "Not connected to Google Drive" });
    }

    const { fileName, mimeType, base64Data } = req.body;
    const oauth2Client = getOAuthClient(req);
    oauth2Client.setCredentials(JSON.parse(tokens));

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    try {
      // 1. Create/Find "ChinaImporter_Assets" folder
      let folderId = "";
      const folderRes = await drive.files.list({
        q: "name='ChinaImporter_Assets' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id)',
      });

      if (folderRes.data.files && folderRes.data.files.length > 0) {
        folderId = folderRes.data.files[0].id!;
      } else {
        const newFolder = await drive.files.create({
          requestBody: {
            name: 'ChinaImporter_Assets',
            mimeType: 'application/vnd.google-apps.folder',
          },
          fields: 'id',
        });
        folderId = newFolder.data.id!;
      }

      // 2. Upload file
      const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };
      const media = {
        mimeType: mimeType,
        body: Readable.from(buffer),
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      // 3. Make file public (so website can display it)
      await drive.permissions.create({
        fileId: file.data.id!,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Get the direct link
      // Note: webContentLink is often better for direct display, but might need some tweaks
      // Or use the standard thumbnail/view link
      res.json({ 
        id: file.data.id, 
        link: file.data.webViewLink,
        directLink: `https://drive.google.com/uc?export=view&id=${file.data.id}` 
      });
    } catch (error) {
      console.error("Drive upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.post("/api/drive/backup", async (req, res) => {
    let tokens = req.cookies.google_drive_tokens;
    
    // Fallback: try to parse from raw cookie header if cookie-parser fails
    if (!tokens && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc: any, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {});
      if (cookies.google_drive_tokens) {
        try {
          tokens = JSON.parse(decodeURIComponent(cookies.google_drive_tokens));
        } catch (e) {
          console.error("Error parsing tokens from raw cookie:", e);
        }
      }
    }

    if (!tokens) {
      return res.status(401).json({ 
        error: "Not connected to Google Drive", 
        details: "Please connect your Google Drive account from the Admin Dashboard first." 
      });
    }

    const { data, fileName } = req.body;
    if (!data || !fileName) {
      return res.status(400).json({ 
        error: "Missing data", 
        details: "Backup data or file name is missing." 
      });
    }

    const oauth2Client = getOAuthClient(req);
    try {
      oauth2Client.setCredentials(JSON.parse(tokens));
    } catch (e) {
      return res.status(401).json({ 
        error: "Invalid tokens", 
        details: "Your Google Drive session has expired. Please reconnect." 
      });
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    try {
      console.log("Starting backup to Drive for file:", fileName);
      // 1. Create/Find "ChinaImporter_Backups" folder
      let folderId = "";
      const folderRes = await drive.files.list({
        q: "name='ChinaImporter_Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id)',
      });

      if (folderRes.data.files && folderRes.data.files.length > 0) {
        folderId = folderRes.data.files[0].id!;
        console.log("Found existing backup folder:", folderId);
      } else {
        console.log("Creating new backup folder...");
        const newFolder = await drive.files.create({
          requestBody: {
            name: 'ChinaImporter_Backups',
            mimeType: 'application/vnd.google-apps.folder',
          },
          fields: 'id',
        });
        folderId = newFolder.data.id!;
        console.log("Created new backup folder:", folderId);
      }

      // 2. Upload JSON file
      console.log("Uploading JSON file...");
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };
      const media = {
        mimeType: 'application/json',
        body: Readable.from(JSON.stringify(data, null, 2)),
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
      });

      console.log("Backup successful! File ID:", file.data.id);
      res.json({ id: file.data.id, link: file.data.webViewLink });
    } catch (error: any) {
      console.error("Drive backup error:", error);
      res.status(500).json({ error: "Backup failed", details: error.message });
    }
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

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
