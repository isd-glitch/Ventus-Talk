const express = require('express');
const app = express();
const path = require('path');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const https = require('https');
const cors = require('cors');
app.use(cors());
// 公開フォルダを設定
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'loading.html'));
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});

app.use(bodyParser.json());

const keys = require('./ventus-talk-dev-1d6a05c348be.json');

const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key,
    ['https://www.googleapis.com/auth/drive']
);

async function DRIVEgetAccessToken() {
    await client.authorize();
    return client.credentials.access_token;
}

app.get('/get-token', async (req, res) => {
    const token = await DRIVEgetAccessToken();
    res.json({ token });
});









const serviceAccount = require('./ventus-talk-dev-firebase-adminsdk-1iv00-9d4ecb0874.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const getAccessToken = () => {
  return new Promise((resolve, reject) => {
    const jwtClient = new google.auth.JWT(
      serviceAccount.client_email,
      null,
      serviceAccount.private_key,
      ['https://www.googleapis.com/auth/firebase.messaging'],
      null
    );
    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Access Token:', tokens.access_token);
      resolve(tokens.access_token);
    });
  });
};

const sendPushNotification = (accessToken, token, message, chatId) => {
  const data = JSON.stringify({
    message: {
      token: token,
      notification: {
        title: `新しいメッセージ-${message.sender}`,
        body: message.message
      },
      data: {
        chatId: chatId,
        messageId: message.messageId
      }
    }
  });

  const options = {
    hostname: 'fcm.googleapis.com',
    path: `/v1/projects/ventus-talk-dev/messages:send`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  };

  const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('FCM Response:', data);
    });
  });

  req.on('error', error => {
    console.error('Error sending notification:', error);
  });

  req.write(data);
  req.end();
};

const startMonitoringMessages = () => {
  db.collection('ChatGroup').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'modified') {
        const chatId = change.doc.id;
        const data = change.doc.data();

        if (data.messages) {
          const messages = data.messages;
          const lastMessage = Object.values(messages).pop();
          notifyUsers(chatId, lastMessage);
        }
      }
    });
  });
};

const notifyUsers = async (chatId, lastMessage) => {
  const chatGroupDoc = await db.collection('ChatGroup').doc(chatId).get();
  if (!chatGroupDoc.exists) return;

  const senderId = lastMessage.sender; // 送信者のIDを取得
  const usernames = chatGroupDoc.data().usernames || [];
  
  usernames.forEach(async (userId) => {
    if (userId === senderId) return; // 送信者には通知を送らない

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;

    const userToken = userDoc.data().token;
    const userChatIdList = userDoc.data().chatIdList || [];

    const updatedChatIdList = userChatIdList.map(chat => {
      if (chat.chatId === chatId) {
        return { ...chat, lastMessageId: lastMessage.messageId };
      }
      return chat;
    });

    const accessToken = await getAccessToken();
    sendPushNotification(accessToken, userToken, lastMessage, chatId);

    await db.collection('users').doc(userId).update({
      chatIdList: updatedChatIdList
    });
  });
};


/*
const notifyUsers = async (chatId, lastMessage) => {
  const chatGroupDoc = await db.collection('ChatGroup').doc(chatId).get();
  if (!chatGroupDoc.exists) return;

  const usernames = chatGroupDoc.data().usernames || [];
  usernames.forEach(async (userId) => {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;

    const userToken = userDoc.data().token;
    const userChatIdList = userDoc.data().chatIdList || [];
    const userStatus = userDoc.data().status;

    // ユーザーがオフラインの場合のみ通知を送信
    if (userStatus === 'offline') {
      const updatedChatIdList = userChatIdList.map(chat => {
        if (chat.chatId === chatId) {
          return { ...chat, lastMessageId: lastMessage.messageId };
        }
        return chat;
      });

      const accessToken = await getAccessToken();
      sendPushNotification(accessToken, userToken, lastMessage, chatId);

      await db.collection('users').doc(userId).update({
        chatIdList: updatedChatIdList
      });
    }
  });
};
*/

startMonitoringMessages();

app.get('/push', async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const t = "csErGDUqV45rUopRM4u6qn:APA91bFJ4DV_tIrnSTVFKzq9krc0yRe7ThNFJrrVcVIudrW0OFmald7rfRRP_ro-7q2BvbS8xSd5SiMnto5IfGACrVWorc2wg5dmaUzc6LCFPOg1HDLsHBg";
    const message = {
      sender: "System",
      message: "This is a test message."
    };
    sendPushNotification(accessToken, t, message, "gt3lty99wzn");
    res.json({ status: "success" });
  } catch (error) {
    res.json({ status: `${error}` });
  }
});
