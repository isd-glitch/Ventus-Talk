const admin = require('firebase-admin');

// サービスアカウントキーを読み込む
const serviceAccount = require('./ventus-talk-dev-firebase-adminsdk-1iv00-9d4ecb0874.json');

// Firebase アプリを初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;


/*
const corsOptions = {
  origin: "https://ventus-talk-t.glitch.me",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));*/

/*
async function hash(string){
    if (!string){
        throw new Error('パスワードを入力してください');
    }
    try {
        const hash = crypto.createHash('sha256');
        hash.update(string);
        const hashedPassword = hash.digest('hex');

        console.log(hashedPassword);
        return hashedPassword;
    } catch (error) {
        console.error('エラー:', error);
        throw new Error('エラーが発生しました');
    }
}


app.get('/hash',async (req,res)=>{
  const string = req.query;
  const hashedPassword = hash(string);
  return res.status(200).json({ hashedPassword });
})
*/
//let cacheTokenUser = [];
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

/*
app.get('/push', async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const t = "caYhK7G0VOLfZDAAlOq2Z0:APA91bEXxvHMHtNSFRNwAW4sY_kYlX0Q_igIWj6zPX6bFbUsm5ENpNjGXfAewx4NZR7u_w_c8qsX5iHKMmN2H9Qr3wYM2L4aHF0ZgouCHLqSnbfbAk-MjOM";
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
*/


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