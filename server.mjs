import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import bodyParser from "body-parser";
import https from "https";
import cors from "cors";
import { drive_v3 } from "@googleapis/drive";
import { JWT } from "google-auth-library";
import fs from "fs";

// __dirname の代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "loading.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

// **Google Drive 認証**
const driveKeys = JSON.parse(fs.readFileSync("./ventus-talk-dev-1d6a05c348be.json", "utf-8"));
const driveClient = new JWT({
  email: driveKeys.client_email,
  key: driveKeys.private_key,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

async function DRIVEgetAccessToken() {
  try {
    const token = await driveClient.authorize();
    return token.access_token;
  } catch (error) {
    console.error("Error authorizing Drive client:", error);
    throw error;
  }
}

app.get("/get-token", async (req, res) => {
  try {
    const token = await DRIVEgetAccessToken();
    res.json({ token });
  } catch (error) {
    res.status(500).send("Error getting access token");
  }
});

// **Firebase 初期化**
const serviceAccountFCM = JSON.parse(fs.readFileSync("./ventus-talk-dev-firebase-adminsdk-1iv00-9d4ecb0874.json", "utf-8"));
const serviceAccountServer = JSON.parse(fs.readFileSync("./ventus-talk-server-firebase-adminsdk-fbsvc-d615ebb661.json", "utf-8"));
const serviceAccountInfo = JSON.parse(fs.readFileSync("./ventus-talk-info-firebase-adminsdk-fbsvc-99baed7dfa.json", "utf-8"));

const appServer = admin.initializeApp(
  {
    credential: admin.credential.cert(serviceAccountServer),
    databaseURL: "https://ventus-talk-users.firebaseio.com",
  },
  "appServer"
);
const dbServer = appServer.firestore();

const appInfo = admin.initializeApp(
  {
    credential: admin.credential.cert(serviceAccountInfo),
    databaseURL: "https://ventus-talk-info.firebaseio.com",
  },
  "appInfo"
);
const dbInfo = appInfo.firestore();

// **FCM 認証**
const fcmClient = new JWT({
  email: serviceAccountFCM.client_email,
  key: serviceAccountFCM.private_key,
  scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
});

const getAccessToken = async () => {
  try {
    const token = await fcmClient.authorize();
    return token.access_token;
  } catch (error) {
    console.error("Error getting FCM access token:", error);
    throw error;
  }
};
const sendPushNotification = (accessToken, token, message, chatId, senderUsername) => {
  const data = JSON.stringify({
    message: {
      token: token,
      notification: {
        title: `新しいメッセージ-${senderUsername}`,
        body: message,
      },
      data: {
        chatId: chatId,
      },
    },
  });

  const options = {
    hostname: "fcm.googleapis.com",
    path: `/v1/projects/ventus-talk-dev/messages:send`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      console.log("FCM Response:", data);
    });
  });

  req.on("error", (error) => {
    console.error("Error sending notification:", error);
  });

  req.write(data);
  req.end();
};

let initialLoad = true;
dbInfo.collection("ChatGroup").onSnapshot((snapshot) => {
  if (initialLoad) {
    initialLoad = false;
    return;
  }

  snapshot.docChanges().forEach((change) => {
    if (change.type === "modified") {
      const chatId = change.doc.id;
      const data = change.doc.data();

      if (data.sender && data.message) {
        notifyUsers(chatId, data.sender, data.message, data.usernames || [], data.senderUsername);
      }
    }
  });
});

const notifyUsers = async (chatId, sender, message, usernames, senderUsername) => {
  for (const userId of usernames) {
    if (userId === sender) continue; // Don't notify the sender
    const userDoc = await dbServer.collection("users").doc(userId).get();
    if (!userDoc.exists) continue;
    const userToken = userDoc.data().token;
    const accessToken = await getAccessToken();
    sendPushNotification(accessToken, userToken, message, chatId, senderUsername);
  }
};

app.get("/sleep", (req, res) => {
  res.json({ iam: "awake" });
});

/*
const { promisify } = require("util");
const authorizeAsync = promisify(client.authorize).bind(client);

async function DRIVEgetAccessToken() {
  try {
    await authorizeAsync();
    const token = client.credentials?.access_token;
    if (!token) throw new Error("No access token received.");
    return token;
  } catch (error) {
    console.error("Error authorizing Drive client:", error);
    throw error;
  }
}*/

/*
const startMonitoringMessages = () => {
  dbInfo.collection("ChatGroup").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "modified") {
        const chatId = change.doc.id;
        const data = change.doc.data();
        if (data.sender) {
          const sender = data.sender;
          const message = data.message;
          const senderUsername = data.senderUsername;
          const usernames = data.usernames || [];
          
          notifyUsers(chatId, sender, message, usernames, senderUsername);
        }
      }
    });
  });
};
*/
//startMonitoringMessages();
