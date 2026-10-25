import express from "express";
import { createServer as createViteServer } from "vite";
import cron from "node-cron";
import admin from "firebase-admin";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const configPath = path.join(__dirname, "firebase-applet-config.json");
let projectId = "demo-project";
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  projectId = config.projectId;
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: projectId,
  });
}

const db = admin.firestore();

// WhatsApp API Configuration
async function getWhatsAppConfig() {
  try {
    const doc = await db.collection("system_settings").doc("whatsapp").get();
    if (doc.exists) {
      return doc.data();
    }
  } catch (error: any) {
    if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
      console.warn("Server-side Firestore access requires a service account key. WhatsApp config cannot be loaded.");
    } else {
      console.error("Error fetching WhatsApp config:", error);
    }
  }
  return null;
}

async function sendWhatsAppMessage(phone: string, message: string) {
  const config = await getWhatsAppConfig();
  
  if (!config || !config.accessToken || !config.apiUrl || config.status !== 'Connected') {
    console.log(`[WhatsApp Mock] To: ${phone} | Message: ${message}`);
    return true;
  }

  try {
    // Format phone number (remove leading zeros, ensure country code)
    let formattedPhone = phone.replace(/[^0-9]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "88" + formattedPhone; // Assuming Bangladesh
    } else if (!formattedPhone.startsWith("88")) {
      formattedPhone = "88" + formattedPhone;
    }

    await axios.post(
      config.apiUrl,
      {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return true;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return false;
  }
}

async function checkRenewalsAndSendReminders() {
  console.log("Running daily renewal check...");
  try {
    const driversSnap = await db.collection("drivers").get();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const batch = db.batch();
    let updatesCount = 0;

    for (const doc of driversSnap.docs) {
      const data = doc.data();
      if (!data.expiryDate) continue;

      const expiryDate = data.expiryDate.toDate();
      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let reminderType = null;
      let message = null;
      const dateStr = expiryDate.toLocaleDateString('en-US');

      if (daysLeft === 7) {
        reminderType = "7";
        message = `Hello ${data.name}, your Jhotpot Service subscription will expire on ${dateStr}. Please renew your account to continue receiving rides.`;
      } else if (daysLeft === 3) {
        reminderType = "3";
        message = `Hello ${data.name}, your Jhotpot Service subscription will expire on ${dateStr}. Please renew your account to continue receiving rides.`;
      } else if (daysLeft === 1) {
        reminderType = "1";
        message = `Hello ${data.name}, your Jhotpot Service subscription will expire very soon on ${dateStr}. Please renew immediately.`;
      } else if (daysLeft < 0 && data.isActive) {
        reminderType = "expired";
        message = `Hello ${data.name}, your Jhotpot Service subscription has expired on ${dateStr}. Please renew to restore your service.`;
      }

      if (reminderType && message) {
        // Check if we already sent this exact reminder type today
        if (data.lastReminderSentDate === todayStr && data.reminderType === reminderType) {
          continue; // Already sent
        }

        const success = await sendWhatsAppMessage(data.phone, message);
        
        if (success) {
          batch.update(doc.ref, {
            lastReminderSentDate: todayStr,
            reminderType: reminderType,
            messageStatus: "sent"
          });
          updatesCount++;
        } else {
          batch.update(doc.ref, {
            lastReminderSentDate: todayStr,
            reminderType: reminderType,
            messageStatus: "failed"
          });
          updatesCount++;
        }
      }
    }

    if (updatesCount > 0) {
      await batch.commit();
      console.log(`Updated ${updatesCount} driver records with reminder status.`);
    }

  } catch (error: any) {
    if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
      console.warn("Server-side Firestore access requires a service account key. Renewal reminders cannot be processed.");
    } else {
      console.error("Error in renewal cron job:", error);
    }
  }
}

// Schedule cron job to run every day at 9:00 AM
cron.schedule("0 9 * * *", () => {
  checkRenewalsAndSendReminders();
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Manual trigger for testing
  app.post("/api/trigger-reminders", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Since we don't have service account credentials for the user's custom Firebase project,
      // we cannot query Firestore directly from the server using admin SDK.
      // We will rely on the default admin email check.
      if (decodedToken.email?.toLowerCase() !== 's.m.anonto5@gmail.com') {
        return res.status(403).json({ error: "Forbidden: Admins only" });
      }
      
      // Run in background
      checkRenewalsAndSendReminders();
      res.json({ status: "started" });
    } catch (error) {
      console.error("Error verifying auth token:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // WhatsApp Config Test Endpoint
  app.post("/api/whatsapp-test", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      if (decodedToken.email?.toLowerCase() !== 's.m.anonto5@gmail.com') {
        return res.status(403).json({ error: "Forbidden: Admins only" });
      }
      
      const { apiUrl, accessToken, officialNumber, testPhoneNumber } = req.body;

      if (!apiUrl || !accessToken || !testPhoneNumber) {
        return res.status(400).json({ error: "Missing API URL, Access Token, or Test Phone Number" });
      }

      // Format phone number
      let formattedPhone = testPhoneNumber.replace(/[^0-9]/g, "");
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "88" + formattedPhone;
      } else if (!formattedPhone.startsWith("88")) {
        formattedPhone = "88" + formattedPhone;
      }

      const response = await axios.post(
        apiUrl,
        {
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "text",
          text: { body: "This is a test message from Jhotpot Admin Dashboard." },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      res.json({ status: "success", data: response.data });
    } catch (error: any) {
      console.error("Error testing WhatsApp connection:", error.response?.data || error.message);
      res.status(400).json({ error: "Invalid WhatsApp API credentials or failed to send message", details: error.response?.data || error.message });
    }
  });

  // Helper to log WhatsApp messages to Firestore
  async function logWhatsAppMessageToFirestore(phone: string, text: string, direction: 'inbound' | 'outbound') {
    try {
      const sessionId = phone.replace(/[^0-9]/g, "");
      const sessionRef = db.collection('whatsapp_sessions').doc(sessionId);
      
      const sessionDoc = await sessionRef.get();
      if (!sessionDoc.exists) {
        await sessionRef.set({
          phone: sessionId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastMessage: text,
          unread: direction === 'inbound',
          status: 'open'
        });
      } else {
        await sessionRef.update({
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastMessage: text,
          unread: direction === 'inbound' ? true : sessionDoc.data()?.unread || false,
        });
      }

      await sessionRef.collection('messages').add({
        text,
        sender: direction === 'inbound' ? 'user' : 'admin',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.error("Error logging WA message to Firestore", e);
    }
  }

  // WhatsApp Webhook Verification
  app.get("/api/whatsapp/webhook", (req, res) => {
    // Note: 'verify_token' should ideally be stored in settings or env. We'll use a default fallback or check if they match.
    // To make it easy to configure, we will accept any token or we can hardcode 'jhotpot_wa_token_123'
    const verify_token = "jhotpot_wa_token_123";
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === verify_token) {
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  });

  // WhatsApp Webhook to Receive Messages
  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const body = req.body;
      if (body.object) {
        if (
          body.entry &&
          body.entry[0].changes &&
          body.entry[0].changes[0] &&
          body.entry[0].changes[0].value.messages &&
          body.entry[0].changes[0].value.messages[0]
        ) {
          const phoneNumber = body.entry[0].changes[0].value.messages[0].from;
          const textMsg = body.entry[0].changes[0].value.messages[0].text?.body;
          
          if (textMsg) {
            console.log(`[WhatsApp Incoming] From: ${phoneNumber} | Message: ${textMsg}`);
            await logWhatsAppMessageToFirestore(phoneNumber, textMsg, 'inbound');
          }
        }
        res.sendStatus(200);
      } else {
        res.sendStatus(404);
      }
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.sendStatus(500);
    }
  });

  // Direct WhatsApp Message Endpoint for Sub-Admins and Admins
  app.post("/api/whatsapp-send-direct", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    try {
      await admin.auth().verifyIdToken(idToken);
      
      const { phone, message } = req.body;

      if (!phone || !message) {
        return res.status(400).json({ error: "Missing Phone Number or Message" });
      }

      const success = await sendWhatsAppMessage(phone, message);
      if (success) {
        await logWhatsAppMessageToFirestore(phone, message, 'outbound');
        res.json({ status: "success" });
      } else {
        res.status(500).json({ error: "Failed to send WhatsApp message. Check server logs." });
      }
    } catch (error: any) {
      console.error("Error verifying auth token or sending message:", error);
      res.status(401).json({ error: "Invalid token or server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
