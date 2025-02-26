import {
  dbdev,
  dbServer,
  onMessage,
  collection,
  messaging,
  getToken,
  doc,
  addDoc,
  arrayUnion,
  reloadPage,
  updateDoc,
  dbUsers,
  setDoc,
  serverTimestamp,
  startAfter,
  onSnapshot,
  limit,
  query,
  orderBy,
  getDocs,
  getDoc,
  dbInfo,
  deleteDoc, // 削除操作のために追加
} from "../firebase-setup.js";
import {
  addLog,
  setProfileImageFromLocalStorage,
  updateCacheIfNeeded,
  copyToClipboard,
  hash,
} from "../helper.js";
import { ChatMessaging } from "./modules/chat-messaging.js";
import { ChatListManager } from "./modules/chat-list-manager.js";
import { FileUploader } from "./modules/file-uploader.js";
import { GroupManager } from "./modules/group-manager.js";
import { UIManager } from "./modules/ui-manager.js";
import { CallManager } from "./modules/call-manager.js";
import { ChatDeletionManager } from "./modules/chat-deletion-manager.js"; // 新しいモジュールをインポート

// グローバル変数の初期化
const username = localStorage.getItem("username");
const myuserId = localStorage.getItem("userID");
const rawMyUserId = localStorage.getItem("userIdShow");

// メインのUIコンポーネント
const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
let selectedChatId = null;

// モジュールのインスタンス化
const chatMessaging = new ChatMessaging(
  chatBox, 
  chatInput, 
  sendButton, 
  dbdev, 
  dbServer,
  dbInfo, 
  myuserId, 
  username
);

const chatListManager = new ChatListManager(
  myuserId,
  rawMyUserId,
  dbUsers,
  dbServer,
  dbInfo
);

const fileUploader = new FileUploader(
  selectedChatId,
  myuserId,
  dbdev
);

const uiManager = new UIManager();
const callManager = new CallManager(selectedChatId, myuserId, username, dbdev, dbInfo);

// チャット削除マネージャーのインスタンス化
const chatDeletionManager = new ChatDeletionManager(
  myuserId,
  dbInfo,
  dbUsers,
  dbdev,
  () => {
    // チャット削除後の処理
    selectedChatId = null;
    localStorage.removeItem("selectedChatId");
    chatMessaging.updateOtherChatListeners();
    chatListManager.updateChatList(selectChat);
    
    // 右パネルを閉じる
    const rightPanel = document.getElementById("right-panel");
    rightPanel.classList.remove("open");
  }
);

// Firebase メッセージングの初期化
onMessage(messaging, (payload) => {
  console.log("フォアグラウンドメッセージ受信:", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };
  if (!document.location.href.includes("talk.html")) {
    new Notification(notificationTitle, notificationOptions);
  }
});

// イベントリスナー設定
chatInput.addEventListener("keydown", function (event) {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && chatInput.value) {
    sendButton.click();
  }
});

sendButton.addEventListener("click", async () => {
  await chatMessaging.sendMessage(selectedChatId);
});

// 電話ボタンのイベントリスナー
const callButton = document.getElementById("call");
callButton.addEventListener("click", function () {
  if (!selectedChatId) {
    addLog("チャットが選択されていません。", "b");
    return;
  } else {
    callManager.callSend(selectedChatId);
  }
});

// チャット選択時の処理
function selectChat(chatId) {
  if (selectedChatId === chatId) return;
  
  selectedChatId = chatId;
  localStorage.setItem("selectedChatId", chatId);
  chatMessaging.loadMessages(chatId);
  fileUploader.updateChatId(chatId);
  callManager.updateChatId(chatId);
}

// ウィンドウロード時の初期化
window.onload = async () => {
  // デバッグ情報を出力
  console.log("User information at startup:");
  console.log("username:", username);
  console.log("myuserId (hashed):", myuserId);
  console.log("rawMyUserId:", rawMyUserId);
  
  updateCacheIfNeeded();
  await saveuserToken();
  await chatListManager.updateChatList(selectChat);
  document.querySelector('.sloader').style.display = "none";
  
  // 初期化時にリストアップしておく
  console.log("Available chat IDs:", chatListManager.chatIdList.map(item => item.chatId).join(', '));
  
  // グループ関連のイベントリスナー設定
  const groupManager = new GroupManager(
    rawMyUserId, 
    chatListManager.rowFriendList, 
    dbUsers, 
    dbInfo
  );
  
  const createGroupButton = document.getElementById("create-group-button");
  createGroupButton.addEventListener("click", () => 
    groupManager.createGroup(chatListManager.updateChatList.bind(chatListManager)));
  
  // フォント設定の復元
  const savedFont = localStorage.getItem("font");
  if (savedFont) {
    document.getElementById("chat-box").style.fontFamily = savedFont;
  }
  
  await profileIcon();
  fileUploader.initFileUpload();
  setupNavigationEvents();
  
  // 前回選択していたチャットがあれば再選択
  const lastSelectedChatId = localStorage.getItem("selectedChatId");
  if (lastSelectedChatId) {
    console.log("Restoring last selected chat:", lastSelectedChatId);
    // DOMが準備されるのを少し待ってから選択
    setTimeout(() => {
      const chatItem = document.querySelector(`.chat-item[data-chat-id="${lastSelectedChatId}"]`);
      if (chatItem) {
        chatItem.click();
      }
    }, 500);
  }
};

// ナビゲーション関連のイベントをセットアップ
function setupNavigationEvents() {
  const rightPanel = document.getElementById("right-panel");
  const backButton = document.getElementById("back-button");
  backButton.addEventListener("click", function () {
    rightPanel.classList.remove("open");
    selectedChatId = "";
    chatMessaging.updateOtherChatListeners();
  });
  
  // トーク削除ボタンのイベントリスナーを追加
  const deleteChatButton = document.getElementById("delete-chat-button");
  if (deleteChatButton) {
    deleteChatButton.addEventListener("click", () => {
      if (!selectedChatId) {
        addLog("チャットが選択されていません。", "b");
        return;
      }
      
      chatDeletionManager.deleteChat(selectedChatId);
    });
  }
  
  // グループ作成モーダル
  const createGroupWindow = document.getElementById("create-group-window");
  const statusButton = document.getElementById("status");
  const closeButton = document.getElementById("close-window");
  
  statusButton.addEventListener("click", async () => {
    console.log("グループ作成ボタンがクリックされました");
    createGroupWindow.classList.remove("hidden");
    createGroupWindow.classList.add("show");
    
    // 友達リストの更新前に既存のコンテンツをクリア
    document.getElementById("friend-list").innerHTML = '<div class="loading">Loading...</div>';
    document.getElementById("selected-friends").innerHTML = '';
    
    // カウント要素もリセット
    const countElem = document.getElementById("selection-count");
    if (countElem) countElem.textContent = "(0人選択中)";
    
    try {
      // 最新のフレンドリストを取得するため再度データをロード
      const userDocRef = doc(dbUsers, "users", myuserId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        chatListManager.rowFriendList = userDoc.data().rowFriendList || [];
        console.log("Updated rowFriendList:", chatListManager.rowFriendList);
      }
      
      // 友達リストを更新
      await chatListManager.updateFriendList();
    } catch (error) {
      console.error("Failed to update friend list:", error);
      document.getElementById("friend-list").innerHTML = 
        '<div class="error">フレンドリストの読み込みに失敗しました</div>';
    }
  });

  closeButton.addEventListener("click", () => {
    createGroupWindow.classList.remove("show");
    createGroupWindow.classList.add("hidden");
    document.getElementById("selected-friends").innerHTML = '';
    
    // 友達リストもクリア
    document.getElementById("friend-list").innerHTML = '';
    
    // カウンター要素も削除
    const countElem = document.getElementById("selection-count");
    if (countElem) countElem.remove();
  });
}

// プロフィールアイコンを取得
async function profileIcon() {
  const userInfoDocRef = doc(dbServer, "users", myuserId);
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore request timed out")), 8000)
    );
    const userDoc = await Promise.race([getDoc(userInfoDocRef), timeoutPromise]);
    if (!userDoc.exists()) {
      addLog("not foundICON", "b");
      return;
    }
    localStorage.setItem("profileImage", userDoc.data().profile_ico);
    const username = userDoc.data().username;
    localStorage.setItem("username", username);
    setProfileImageFromLocalStorage();
    document.getElementById("username").textContent = username;
  } catch (error) {
    addLog(error, "error");
  }
}

// ユーザートークンを保存
async function saveuserToken() {
  try {
    const currentDate = new Date();
    const lastUpdate = localStorage.getItem("TokenLastUpdate");
    if (
      lastUpdate &&
      currentDate - new Date(lastUpdate) <= 30 * 24 * 60 * 60 * 1000
    ) {
      console.log("トークンはまだ有効です。更新は不要です。");
      return;
    }
    const token = await getToken(messaging, {
      vapidKey:
        "BKUDfUUeYgn8uWaWW1_d94Xyt03iBIHoLvyu1MNGPPrc72J2m5E3ckzxLqwHrsCQ9uJ5m-VhuHEjxquWqyKzTGE",
    });
    console.log(token);
    if (token) {
      await setDoc(
        doc(dbServer, "users", myuserId),
        { token },
        { merge: true }
      );
      console.log("通知トークンが保存されました:", token);
      localStorage.setItem("TokenLastUpdate", currentDate.toISOString());
    } else {
      console.warn("通知トークンを取得できませんでした");
    }
  } catch (error) {
    console.error("通知トークン保存中にエラーが発生しました:", error);
  }
}
