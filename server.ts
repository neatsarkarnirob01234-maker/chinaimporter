import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Readable } from 'stream';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import fs from 'fs';

dotenv.config();

// Load Firebase Config safely
let firebaseConfig: any = {};
try {
  const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    console.log("Firebase config loaded successfully");
  } else {
    console.warn("firebase-applet-config.json not found, using empty config");
  }
} catch (error) {
  console.error("Error loading firebase-applet-config.json:", error);
}

// Initialize Firebase Admin
let adminApp: any;
let db: any;

try {
  if (firebaseConfig.projectId) {
    adminApp = admin.apps.length === 0 
      ? admin.initializeApp({
          projectId: firebaseConfig.projectId,
        })
      : admin.app();
    
    db = admin.firestore(adminApp);
    console.log("Firebase Admin and Firestore initialized");
  } else {
    console.warn("No projectId found in config, Firebase Admin not initialized");
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
];

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // OTP Password Reset Routes
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      // Check if user exists
      try {
        await admin.auth().getUserByEmail(email);
      } catch (e) {
        return res.status(404).json({ error: "User not found with this email" });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store in Firestore
      await db.collection("password_reset_otps").doc(email).set({
        otp,
        expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Send Email
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: `"China-BD Sourcing" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Password Reset OTP",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
            <h2 style="color: #f97316; text-align: center;">Password Reset</h2>
            <p>Hello,</p>
            <p>You requested to reset your password. Use the following OTP code to proceed. This code is valid for 10 minutes.</p>
            <div style="background: #fff7ed; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #f97316;">${otp}</span>
            </div>
            <p>If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">China-BD Sourcing Team</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: "OTP sent successfully" });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ error: "Failed to send OTP", details: error.message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    try {
      const doc = await db.collection("password_reset_otps").doc(email).get();
      if (!doc.exists) return res.status(400).json({ error: "No OTP found for this email" });

      const data = doc.data();
      if (data?.otp !== otp) return res.status(400).json({ error: "Invalid OTP code" });
      if (Date.now() > data?.expiresAt) return res.status(400).json({ error: "OTP has expired" });

      res.json({ success: true, message: "OTP verified" });
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: "Missing required fields" });

    try {
      // Verify OTP again for security
      const doc = await db.collection("password_reset_otps").doc(email).get();
      if (!doc.exists || doc.data()?.otp !== otp || Date.now() > doc.data()?.expiresAt) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Get user
      const user = await admin.auth().getUserByEmail(email);
      
      // Update password
      await admin.auth().updateUser(user.uid, {
        password: newPassword
      });

      // Delete OTP
      await db.collection("password_reset_otps").doc(email).delete();

      res.json({ success: true, message: "Password reset successful" });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password", details: error.message });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
