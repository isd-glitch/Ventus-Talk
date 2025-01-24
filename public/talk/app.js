import {
  dbdev,onMessage,collection,messaging,getToken,doc,addDoc,arrayUnion,reloadPage,
  updateDoc,dbUsers,setDoc,serverTimestamp,startAfter,onSnapshot,limit,
  query,orderBy,getDocs,getDoc,
} from "../firebase-setup.js";
import { addLog } from "../log.js";
import { setProfileImageFromLocalStorage } from "../log.js";
const username = localStorage.getItem("username");
const myuserId = localStorage.getItem("userID");

const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
let selectedChatId = null;

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

chatInput.addEventListener("keydown", function (event) {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    sendButton.click();
  }
});

let unsubscribeMessages = null; // 現在のチャットのスナップショットリスナーを解除するための関数
let otherChatListeners = {}; // その他のチャットのスナップショットリスナーを保持するオブジェクト
// ランダムな16文字の英数字の文字列を生成する関数
function generateRandomId() {
  return Math.random().toString(36).substring(2, 18);
}
sendButton.addEventListener("click", async () => {
  const message = chatInput.value.trim();
  if (!message || !selectedChatId) {
    alert(
      !selectedChatId
        ? "チャットが選択されていません。"
        : "メッセージが空です。"
    );
    return;
  }
  const formattedMessage = message.replace(/\n/g, "<br>");
  const timestamp = new Date().toISOString();
  const messageId = generateRandomId();
  const newMessage = {
    timestamp: timestamp,
    message: formattedMessage,
    messageId: messageId,
    sender: myuserId,
  };
  try {
    const chatRef = doc(dbdev, `ChatGroup/${selectedChatId}`);
    const chatDoc = await getDoc(chatRef);
    if (chatDoc.exists()) {
      let messages = chatDoc.data().messages || [];
      messages.push(newMessage);
      // メッセージの数が100を超えた場合、古いメッセージを削除する
      if (messages.length > 100) {
        messages = messages.slice(-100);
      }
      await setDoc(chatRef, { messages }, { merge: true });
    } else {
      await setDoc(chatRef, { messages: [newMessage] });
    }
    chatInput.value = "";
  } catch (error) {
    console.error("Error adding document: ", error);
    alert("メッセージ送信中にエラーが発生しました: " + error.message);
    addLog("メッセージ送信中にエラーが発生しました: " + error.message, error);
    reloadPage();
  }
});

async function loadMessages(chatId) {
  chatBox.innerHTML = "";
  if (!chatId) {
    chatBox.innerHTML = "<p>チャットを選択してください。</p>";
    return;
  }
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }
  selectedChatId = chatId;
  let added_message_id = [];
  const chatRef = doc(dbdev, `ChatGroup/${chatId}`);
  let lastDate = "";
  let isinit = true;
  let senderCache = {};
  unsubscribeMessages = onSnapshot(
    chatRef,
    async (docSnapshot) => {
      if (!docSnapshot.exists()) {
        chatBox.innerHTML = "<p>メッセージはまだありません。</p>";
        return;
      }
      const messages = docSnapshot.data().messages || [];
      if (messages.length === 0) {
        chatBox.innerHTML = "<p>メッセージはまだありません。</p>";
        return;
      }

      const messageHtmlArray = [];
      for (const message of messages) {
        const {
          timestamp,
          sender,
          message: messageText,
          messageId,
          filename,
          resourceFileId,
          extension,
        } = message;

        console.log(`Processing message from sender: ${sender}`);

        if (added_message_id.includes(messageId)) {
          continue;
        } else {
          added_message_id.push(messageId);
        }

        if (!senderCache[sender]) {
          console.log(`Sender ${sender} not found in cache`);

          if (sender !== myuserId) {
            console.log("Fetching user data from database");
            const userRef = doc(dbUsers, "users", sender);
            const userDoc = await getDoc(userRef);
            //if (sender===myuserId && !userDoc){localStorage.clear()}
            if (userDoc.exists()) {
              const userData = userDoc.data();
              senderCache[sender] = {
                userName: userData.username || "Unknown",
                userIcon: userData.profile_ico || "default-icon.png",
              };
              console.log(senderCache[sender]);
            }
          } else {
            console.log("Sender is the current user");
            senderCache[sender] = {
              userName: username,
              userIcon: "null",
            };
          }
        } else {
          console.log("Found cache for sender");
        }

        if (senderCache[sender]) {
          const { userName, userIcon } = senderCache[sender];
          const messageTimestamp = new Date(timestamp);
          const messageDate = messageTimestamp.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          let dateDivider = "";
          if (messageDate !== lastDate) {
            lastDate = messageDate;
            dateDivider = `<div class="date-divider"><span>${messageDate}</span></div>`;
          }
          let previousTimestamp = null;
          let icon_html;
          let username_html;
          let margin_style = "";
          if (sender === myuserId) {
            icon_html = "";
            username_html = "";
            margin_style = "margin-top: 0;";
          } else if (
            previousTimestamp &&
            messageTimestamp - previousTimestamp <= 15 * 60 * 1000
          ) {
            icon_html = '<img class="icon noicon" alt="" style="border:none">';
            username_html = "";
            margin_style = "margin-top: 0;";
          } else {
            icon_html = `<img class="icon" src="${userIcon}" alt="${userName}のアイコン">`;
            username_html = `<div class="username">${userName}</div>`;
          }

          let message_html = `
                    ${dateDivider}
                    <div class="message-item ${
                      sender === myuserId ? "self" : "other"
                    }">
                        ${icon_html}
                        <div class="message-content" style="${margin_style}">
                            ${username_html}`;
          if (resourceFileId) {
            const fileType = getFileType(extension);
            if (fileType === "image") {
              message_html += `<a href="https://drive.google.com/uc?id=${resourceFileId}"><img src="https://drive.google.com/thumbnail?id=${resourceFileId}" alt="画像" class="message-image"></a>`;
            } else if (fileType === "video") {
              message_html += `
                        <iframe src="https://drive.google.com/file/d/${resourceFileId}/preview?controls=0" class="message-bubble" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                        <div class="message-bubble">
                          <a href="https://drive.google.com/file/d/${resourceFileId}/view?usp=drivesdk" target="_blank">ビデオを見る 動画は再生できるまでに時間がかかることがあります。</a>
                        </div>
                      `;
            } else {
              message_html += `<a href="https://drive.google.com/file/d/${resourceFileId}" class="message-bubble">${filename}ファイルを開く</a>`;
            }
          } else {
            const escapedMessageText = escapeHtml(messageText);
            const formattedMessageText =
              insertWbrEvery100Chars(escapedMessageText);
            const linkedMessageText = linkify(formattedMessageText);
            message_html += `<div class="message-bubble">${linkedMessageText}</div>`;
          }
          message_html += `</div><div class="timestamp">${messageTimestamp.toLocaleTimeString(
            "ja-JP",
            { hour: "2-digit", minute: "2-digit" }
          )}</div></div>`;
          const youtubeEmbed = extractYoutubeEmbedUrl(linkify(messageText));
          if (youtubeEmbed) {
            message_html += `<div class="youtube-embed"><iframe width="560" height="315" src="${youtubeEmbed}" frameborder="0" allowfullscreen></iframe></div>`;
          }
          previousTimestamp = messageTimestamp;
          messageHtmlArray.push(message_html);
        }
      }

      messageHtmlArray.forEach(function(messageHtml) {
          chatBox.insertAdjacentHTML('beforeend', messageHtml);
      });
      chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" });
    },
    (error) => {
      console.error("メッセージ取得中にエラーが発生しました: ", error);
      addLog(
        `メッセージ取得中にエラーが発生しました:${error.message}`,
        "error"
      );
    }
  );
  updateOtherChatListeners();
}

function getFileType(extension) {
  const imageExtensions = ["jpg", "jpeg", "png", "gif"];
  const videoExtensions = ["mp4", "webm"];
  if (imageExtensions.includes(extension)) {
    return "image";
  } else if (videoExtensions.includes(extension)) {
    return "video";
  } else {
    return "file";
  }
}

function escapeHtml(text) {
  if (text) {
    return text
      .replace(/<br\s*\/?>/gi, "__BR__")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/__BR__/g, "<br>");
  } else {
    return text;
  }
}

function linkify(text) {
  const urlPattern = /((https?|ftp):\/\/[^\s/$.?#].[^\s]*)/g;
  return text.replace(urlPattern, (match) => {
    const decodedUrl = decodeURIComponent(match);
    let modifiedUrl = decodedUrl;
    if (decodedUrl.includes("youtube.com") || decodedUrl.includes("youtu.be")) {
      modifiedUrl = extractYoutubeEmbedUrl(decodedUrl);
    }
    if (
      !decodedUrl.includes("youtube.com") &&
      !decodedUrl.includes("youtu.be")
    ) {
      return `<a href="${modifiedUrl}" target="_blank">${splitLongUrl(
        modifiedUrl
      )}</a><br><br><br><a href="https://edu-open-4step.glitch.me." target="_blank">規制回避用url</a><br>`;
    } else {
      return `<a href="${modifiedUrl}" target="_blank">${splitLongUrl(
        modifiedUrl
      )}</a>`;
    }
  });
}

function splitLongUrl(url, maxLength = 30) {
  const parts = url.match(new RegExp(".{1," + maxLength + "}", "g"));
  return parts.join("<wbr>"); // <wbr>タグを使用して適切な位置で改行
}

// YouTubeの埋め込みリンクを抽出する関数
function extractYoutubeEmbedUrl(text) {
  const youtubePattern =
    /https?:\/\/(www\.)?(youtube-nocookie\.com|youtube\.com|youtu\.be)\/(watch\?v=|embed\/)?([^\s&]+)/;
  const match = text.match(youtubePattern);
  if (match) {
    return `https://www.youtube-nocookie.com/embed/${match[4]}`;
  }
  return null;
}

// 開業位置を調整する関数
function insertWbrEvery100Chars(text) {
  return text.replace(/(.{50})/g, "$1<wbr>");
}

async function updateOtherChatListeners() {
  console.log("update other chat list");
  const userDocRef = doc(dbUsers, "users", myuserId);
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore request timed out")), 8000)
    );
    const userDoc = await Promise.race([getDoc(userDocRef), timeoutPromise]);
    if (!userDoc.exists()) {
      console.error("User document not found.");
      return;
    }
    const chatIdList = userDoc.data().chatIdList || [];
    if (chatIdList.length === 0) {
      console.log("ChatIdListが空です。");
      return;
    }
    chatIdList.forEach(({ chatId }) => {
      if (chatId !== selectedChatId && !otherChatListeners[chatId]) {
        const chatRef = doc(dbdev, `ChatGroup/${chatId}`);
        otherChatListeners[chatId] = onSnapshot(
          chatRef,
          (doc) => {
            if (doc.exists()) {
              const messages = doc.data().messages || [];
              if (messages.length > 0) {
                const newMessage = messages[messages.length - 1];
                const { messageId, sender, message: messageText } = newMessage;
                const lastSeenMessageId = localStorage.getItem(
                  `LastMessageId_${chatId}`
                );
                if (
                  messageId !== lastSeenMessageId &&
                  selectedChatId !== chatId
                ) {
                  console.log(
                    `New message in chat ${chatId}:`,
                    messageText,
                    `from ${sender}`
                  );
                  localStorage.setItem(`LastMessageId_${chatId}`, messageId);
                  const chatItem = document.querySelector(
                    `.chat-item[data-chat-id="${chatId}"]`
                  );
                  if (chatItem && !chatItem.classList.contains("new-message")) {
                    chatItem.classList.add("new-message");
                    const newMark = document.createElement("span");
                    newMark.classList.add("new-mark");
                    newMark.textContent = "New!";
                    chatItem.appendChild(newMark);
                  }
                }
              }
            }
          },
          (error) => {
            console.error(`Error fetching messages for chat ${chatId}:`, error);
          }
        );
      }
    });
  } catch (error) {
    console.error("Error updating chat list:", error);
    alert("エラーが発生しました。再試行してください: " + error.message);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  setProfileImageFromLocalStorage();
  ini_fileUpload();
  init_profile_ico();
  const rightPanel = document.getElementById("right-panel");
  const backButton = document.getElementById("back-button");
  backButton.addEventListener("click", function () {
    rightPanel.classList.remove("open");
    selectedChatId = "";
    updateOtherChatListeners();
  });
});
// Object to store chat IDs and their corresponding group names
//-------------------------------------------------------select------------------------
const chatGroupNameMap = {};
function addEventListenersToChatItems() {
  document.querySelectorAll(".chat-item").forEach((chatItem) => {
    chatItem.addEventListener("click", () => {
      const chatId = chatItem.getAttribute("data-chat-id");
      // チャットを選択した際にNew!マーク削除
      if (chatItem.classList.contains("new-message")) {
        chatItem.classList.remove("new-message");
        const newMark = chatItem.querySelector(".new-mark");
        if (newMark) {
          chatItem.removeChild(newMark);
        }
      }
      writeChatId(chatId);
      const rightPanel = document.getElementById("right-panel");
      rightPanel.classList.toggle("open");

      // Update the chat group name span tag
      const chatGroupName = chatGroupNameMap[chatId] || "Chat Group Name";
      document.getElementById("chat-group-name").textContent = chatGroupName;
      if (selectedChatId == chatId) {
        return;
      } else {
        loadMessages(chatId);
      }
    });
  });
}
function writeChatId(chatId) {
  var chatInfoButton = document.getElementById("chat-info");
  chatInfoButton.innerHTML = " (ID: " + chatId + ")";
}
async function updateChatList() {
  const chatList = document.getElementById("chat-list");
  const userDocRef = doc(dbUsers, "users", myuserId);
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore request timed out")), 8000)
    );
    const userDoc = await Promise.race([getDoc(userDocRef), timeoutPromise]);
    if (!userDoc.exists()) {
      alert("User document not found");
      localStorage.clear();
      window.location.href = "/login/login.html";
      return;
    }
    const chatIdList = userDoc.data().chatIdList || [];
    if (chatIdList.length === 0) {
      addLog("ChatIdListが空です。");
      return;
    }
    console.log("chatIdList:", chatIdList);
    const chatItems = chatIdList.map(
      ({ chatId, pinned, serverId, timestamp }) => ({
        chatId,
        pinned,
        serverId,
        timestamp,
      })
    );
    // ソート: pinnedがtrueなら優先、その後timestampで新しい順に並び替え
    chatItems.sort((a, b) => {
      if (a.pinned && !b.pinned) {
        return -1;
      } else if (!a.pinned && b.pinned) {
        return 1;
      } else {
        return b.timestamp - a.timestamp;
      }
    });
    chatList.innerHTML = chatItems
      .map(
        ({ chatId }) => `
      <div class="chat-item" data-chat-id="${chatId}">
        <div class="chat-details">
          <div class="chat-group-name">Chat ID: ${chatId}</div>
          <div class="chat-last-message">No messages yet</div>
        </div>
      </div>
    `
      )
      .join("");
    addEventListenersToChatItems();
    for (const { chatId } of chatItems) {
      if (!chatId) {
        console.error("Invalid chatId:", chatId);
        continue;
      }
      const chatGroupRef = doc(dbdev, `ChatGroup/${chatId}`);
      const chatGroupDoc = await getDoc(chatGroupRef);
      if (chatGroupDoc.exists()) {
        const { chatGroupName, mantwo } = chatGroupDoc.data();
        // Store the chat group name in the map
        chatGroupNameMap[chatId] = chatGroupName;
        const chatItem = document.querySelector(
          `.chat-item[data-chat-id="${chatId}"] .chat-group-name`
        );
        if (chatItem && chatGroupName) {
          chatItem.textContent = chatGroupName;
        }
      } else {
        console.error("ChatGroup document does not exist:", chatId);
      }
    }
  } catch (error) {
    console.error("Error updating chat list:", error);
    addLog(
      "エラーが発生しました。アプリを開き直してください: " + error.message
    );
    //reloadPage();
  }
}

const createGroupWindow = document.getElementById("create-group-window");
const statusButton = document.getElementById("status");
const closeButton = document.getElementById("close-window");

statusButton.addEventListener("click", () => {
  createGroupWindow.classList.remove("hidden");
  createGroupWindow.classList.add("show");
  updateFriendList();
});

closeButton.addEventListener("click", () => {
  createGroupWindow.classList.remove("show");
  createGroupWindow.classList.add("hidden");
});

window.onload = async () => {
  await saveuserToken();
  await updateChatList();
  const createGroupButton = document.getElementById("create-group-button");
  createGroupButton.addEventListener("click", createGroup);
  const savedFont = localStorage.getItem("font");
  if (savedFont) {
    document.getElementById("chat-box").style.fontFamily = savedFont;
  }
  updateOtherChatListeners();
};

async function updateFriendList() {
  const friendListContainer = document.getElementById("friend-list");
  const selectedFriendsContainer = document.getElementById("selected-friends");
  const selectedFriends = new Set(); // 選択された友達のセット
  const userDocRef = doc(dbUsers, `users/${myuserId}`);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists) {
    friendListContainer.innerHTML = "<p>No user data found.</p>";
    return;
  }

  const userData = userDoc.data();
  const friends = userData.friendList || [];

  if (friends.length === 0) {
    friendListContainer.innerHTML = "<p>No friends found.</p>";
    return;
  }

  friendListContainer.innerHTML = "";
  friends.forEach((userId) => {
    const friendItem = document.createElement("div");
    friendItem.classList.add("friend-item");
    friendItem.textContent = userId;

    // イベントリスナーを追加
    friendItem.addEventListener("click", () => {
      if (selectedFriends.has(userId)) {
        // 選択されている場合は削除
        selectedFriends.delete(userId);
        const selectedFriendElement = [
          ...selectedFriendsContainer.children,
        ].find((child) => child.textContent === userId);
        if (selectedFriendElement) {
          selectedFriendsContainer.removeChild(selectedFriendElement);
        }
      } else {
        // 選択されていない場合は追加
        selectedFriends.add(userId);
        const selectedFriend = document.createElement("div");
        selectedFriend.textContent = userId;
        selectedFriendsContainer.appendChild(selectedFriend);
      }
    });
    friendListContainer.appendChild(friendItem);
  });
}

async function createGroup() {
  const groupNameInput = document.getElementById("group-name-input");
  const selectedFriendsContainer = document.getElementById("selected-friends");
  const groupName = groupNameInput.value;
  const selectedFriends = [...selectedFriendsContainer.children].map(
    (child) => child.textContent
  );
  if (groupName === "" || selectedFriends.length === 0) {
    alert("グループ名と友達を選択してください。");
    return;
  }
  const chatId = generateRandomId();
  const allMembers = [myuserId, ...selectedFriends];
  for (const userId of allMembers) {
    const userDocRef = doc(dbUsers, `users/${userId}`);
    await updateDoc(userDocRef, {
      chatIdList: arrayUnion({
        pinned: false,
        serverId: "dev",
        chatId: chatId,
      }),
    });
  }
  const chatGroupRef = doc(dbdev, `ChatGroup/${chatId}`);
  await setDoc(chatGroupRef, {
    chatGroupName: groupName,
    messages: [],
    timestamp: new Date().toISOString(),
    usernames: allMembers,
  });
  addLog("グループが作成されました！");
  groupNameInput.value = "";
  selectedFriendsContainer.innerHTML = "";
  document.getElementById("create-group-window").classList.toggle("visible");
}

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
      await setDoc(doc(dbUsers, "users", myuserId), { token }, { merge: true });
      console.log("通知トークンが保存されました:", token);
      localStorage.setItem("TokenLastUpdate", currentDate.toISOString());
    } else {
      console.warn("通知トークンを取得できませんでした");
    }
  } catch (error) {
    console.error("通知トークン保存中にエラーが発生しました:", error);
  }
}

async function getAccessToken() {
  const response = await fetch("/get-token");
  const data = await response.json();
  return data.token;
}

async function createFolderIfNotExists(folderName, parentId) {
  const accessToken = await getAccessToken();
  const query = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const json = await response.json();
  if (json.files.length > 0) {
    return json.files[0].id;
  }

  const metadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: [parentId],
  };
  const createResponse = await fetch(
    "https://www.googleapis.com/drive/v3/files",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!createResponse.ok) {
    throw new Error(`フォルダの作成に失敗しました: ${createResponse.status}`);
  }

  const createJson = await createResponse.json();
  return createJson.id;
}

function updateProgressBar(percentage) {
  const progressBar = document.getElementById("progress-bar");
  progressBar.style.width = percentage + "%";
  console.log(percentage, "progress bar check");
  progressBar.textContent = Math.round(percentage) + "%";
}

function showProgressBar() {
  document.getElementById("progress-container").style.display = "block";
}

function hideProgressBar() {
  document.getElementById("progress-container").style.display = "none";
}

async function uploadFile(file) {
  const accessToken = await getAccessToken();
  const parentFolderId = "1QsqLlsAp5MUSHbn7Cibh9WQ8DG-oKdzl";
  const folderId = await createFolderIfNotExists(
    selectedChatId,
    parentFolderId
  );
  let fileData;

  if (file.size > 5 * 1024 * 1024) {
    // 5MB以上の場合
    fileData = await resumableUpload(file, accessToken, folderId);
  } else {
    // 5MB未満の場合
    fileData = await simpleUpload(file, accessToken, folderId);
  }

  console.log(fileData); // ここでfileDataの内容を確認
  return fileData;
}

async function simpleUpload(file, accessToken, folderId) {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);

  const xhr = new XMLHttpRequest();
  xhr.open(
    "POST",
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    true
  );
  xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);

  xhr.upload.onprogress = function (event) {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      updateProgressBar(percentComplete);
    }
  };

  xhr.onload = function () {
    if (xhr.status === 200) {
      console.log("アップロードに成功しました");
      updateProgressBar(100); // 完了時にプログレスバーを100%にする
    } else {
      console.error("アップロードに失敗しました: " + xhr.status);
    }
  };

  xhr.onerror = function () {
    console.error("ネットワークエラーが発生しました: " + xhr.status);
  };

  xhr.send(form);
  const response = await new Promise((resolve, reject) => {
    xhr.onload = () => resolve(xhr.responseText);
    xhr.onerror = () => reject(xhr.statusText);
  });

  return JSON.parse(response);
}

async function resumableUpload(file, accessToken, folderId) {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };
  const init = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!init.ok) {
    throw new Error(`アップロードの初期化に失敗しました: ${init.status}`);
  }

  const uploadUrl = init.headers.get("Location");
  const CHUNK_SIZE = 256 * 1024; // 256KB
  let start = 0;
  const fileSize = file.size;
  let response;

  while (start < fileSize) {
    const end = Math.min(start + CHUNK_SIZE, fileSize);
    const chunk = file.slice(start, end);

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader(
      "Content-Range",
      `bytes ${start}-${end - 1}/${fileSize}`
    );
    xhr.upload.onprogress = function (event) {
      if (event.lengthComputable) {
        const percentComplete = ((start + event.loaded) / fileSize) * 100;
        updateProgressBar(percentComplete);
      }
    };
    xhr.onload = function () {
      if (xhr.status === 200 || xhr.status === 308) {
        start = end;
      } else {
        console.error("アップロードに失敗しました: " + xhr.status);
      }
    };
    xhr.send(chunk);
    response = await new Promise((resolve, reject) => {
      xhr.onload = () => resolve(xhr.responseText);
      xhr.onerror = () => reject(xhr.statusText);
    });
  }
  const finalResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Range": `bytes */${fileSize}`,
    },
  });

  if (!finalResponse.ok) {
    throw new Error(`アップロードに失敗しました: ${finalResponse.status}`);
  }

  const json = await finalResponse.json();
  updateProgressBar(100); // 完了時にプログレスバーを100%にする
  return json;
}

function ini_fileUpload() {
  const fileUploadImage = document.getElementById("file-upload");
  const fileInput = document.getElementById("fileInput");
  const result = document.getElementById("chat-box");
  fileUploadImage.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    console.log("upload start");
    if (fileInput.files.length === 0) return;

    showProgressBar();
    const files = Array.from(fileInput.files); // 複数ファイル対応
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExtension = file.name.split(".").pop();
        addLog(`アップロード中: ${file.name}`, "b");
        const fileData = await uploadFile(file);
        console.log(fileData); // ここでfileDataの内容を確認

        const timestamp = new Date().toISOString();
        const messageId = generateRandomId();
        const newMessage = {
          timestamp: timestamp,
          message: `${myuserId}から新規ファイル`,
          extension: fileExtension,
          filename: file.name,
          resourceFileId: fileData.id,
          messageId: messageId,
          sender: myuserId,
        };
        const docRef = doc(dbdev, "ChatGroup", selectedChatId);
        await updateDoc(docRef, {
          messages: arrayUnion(newMessage),
        });
        addLog(`アップロード成功: ${file.name}`, "info");
        const messageItem = document.createElement("div");
        messageItem.className = "message-item";
        console.log(fileData.id);
      }
    } catch (error) {
      addLog(`エラー: ${error.message}`, "error");
    } finally {
      fileInput.value = "";
      updateProgressBar(0); // 完了後にプログレスバーをリセットする
      hideProgressBar();
    }
  });
}

// プロファイル画像を取得してローカルストレージに保存する関数
const saveProfileImageToLocalStorage = async (myUserId) => {
  try {
    const userDocRef = doc(dbUsers, `users/${myUserId}/profile_ico`);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const profileImage = userDocSnap.data().profileImage;
      localStorage.setItem("profileImage", profileImage);
      console.log("Profile image saved to local storage");
    } else {
      console.log("No such document!");
      //localStorage.clear();
      //window.location.href = "/login/login.html";      
    }
  } catch (error) {
    console.error("Error getting document:", error);
  }
};
function init_profile_ico() {
  if (localStorage.getItem("profileImage") === "init") {
    saveProfileImageToLocalStorage();
  }
}

/*
window.addEventListener('scroll', function() {
  console.log('scroll');
  const chatBox = document.getElementById('chat-box');
  const scrollToBottomButton = document.getElementById('scroll-to-bottom');
  
  // チャットボックスが画面に表示されているかどうかを確認
  const chatBoxBottom = chatBox.getBoundingClientRect().bottom;
  const windowHeight = window.innerHeight;
  
  if (chatBoxBottom > windowHeight) {
    scrollToBottomButton.style.display = 'block';
  } else {
    scrollToBottomButton.style.display = 'none';
  }
});

// ボタンがクリックされたときに一番下にスクロールする
document.getElementById('scroll-to-bottom').addEventListener('click', function() {
  document.getElementById('chat-box').scrollIntoView({ behavior: 'smooth', block: 'end' });
});

*/
